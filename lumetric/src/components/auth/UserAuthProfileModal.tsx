'use client';

import React, { useState, useEffect } from 'react';
import { StatusBadge, Button, Input } from '@/components/ui';
import { LumetricAuthService, AuthUser, validateEmailAuthenticity } from '@/lib/auth';
import { useApp } from '@/contexts/AppContext';

export function UserAuthProfileModal({
  isOpen,
  onClose,
  initialMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'profile' | 'login' | 'register' | 'admin-dashboard' | 'connectors' | 'audit' | 'profile-db' | 'forgot-password';
}) {
  const {
    setRole,
    serverStatus,
    serverLatency,
    reconnectServer,
    logout,
    flushMemoryState,
    setCurrentUser,
    currentUser,
    datasets,
    activeDataset,
    setActiveDataset,
    deleteDataset,
    documentFiles,
    activeDocument,
    setActiveDocument,
    deleteDocumentFile,
    storageFootprintBytes,
    currentWorkspace,
    updateWorkspace,
    loadSampleDataIntoProfile,
    clearProfileData,
    setActiveView,
    setIsAuthenticated,
  } = useApp();
  const [mode, setMode] = useState<'profile' | 'workspace' | 'login' | 'register' | 'admin-dashboard' | 'connectors' | 'audit' | 'profile-db' | 'forgot-password'>(initialMode || 'profile');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Workspace state
  const [wsName, setWsName] = useState(currentWorkspace?.name || '');
  const [wsIcon, setWsIcon] = useState(currentWorkspace?.icon || '⚡');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'administrator' | 'builder' | 'reviewer' | 'viewer'>('builder');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwMsg, setChangePwMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);

  // MFA / 2FA state
  const [totpToken, setTotpToken] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret?: string; qrCodeDataUrl?: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  // Password Reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetBannerOtp, setResetBannerOtp] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetEmailPreview, setResetEmailPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<string | null>(null);

  // Admin Dashboard State
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<string | null>(null);

  // Cloud Connectors State
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Live DataStore verification state
  const [dataStoreStatus, setDataStoreStatus] = useState<{
    loaded: boolean;
    tableExists: boolean;
    error?: string;
  }>({ loaded: false, tableExists: false });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const emailValidation = email.trim() ? validateEmailAuthenticity(email) : null;

  useEffect(() => {
    if (isOpen) {
      LumetricAuthService.checkDataStoreStatus().then((res) => {
        setDataStoreStatus({
          loaded: true,
          tableExists: Boolean(res.tableExists),
          error: res.error
        });
      }).catch(() => {
        setDataStoreStatus({ loaded: true, tableExists: false });
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const existing = LumetricAuthService.getStoredUser();
    if (existing) {
      setAuthUser(existing);
      setName(existing.name || '');
      setOrg(existing.organization || '');
      setSelectedRole(existing.role);
    }
    if (initialMode) {
      setMode(initialMode);
    } else if (existing) {
      setMode('profile');
    } else {
      setMode('login');
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (mode === 'admin-dashboard' && authUser && (authUser.role === 'owner' || authUser.role === 'administrator')) {
      loadWorkspaceUsers();
    } else if (mode === 'connectors') {
      loadConnectors();
    } else if (mode === 'audit') {
      loadAuditLogs();
    }
  }, [mode, authUser]);

  const loadWorkspaceUsers = async () => {
    setLoadingUsers(true);
    const res = await LumetricAuthService.fetchWorkspaceUsers();
    setLoadingUsers(false);
    if (res.success && res.users) {
      setAllUsers(res.users);
    }
  };

  const loadConnectors = async () => {
    setLoadingConnectors(true);
    const res = await LumetricAuthService.fetchConnectors();
    setLoadingConnectors(false);
    if (res.success && res.connectors) {
      setConnectors(res.connectors);
    }
  };

  const handleSyncConnector = async (id: string) => {
    setSyncNotice(`Triggering enterprise data ingestion...`);
    const res = await LumetricAuthService.syncConnector(id);
    if (res.success) {
      setSyncNotice(`✓ ${res.message}`);
      loadConnectors();
      setTimeout(() => setSyncNotice(null), 4000);
    } else {
      setSyncNotice(`⚠ ${res.error}`);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    const res = await LumetricAuthService.fetchAuditLogs();
    setLoadingAudit(false);
    if (res.success && res.logs) {
      setAuditLogs(res.logs);
    }
  };

  const handleSetup2FA = async () => {
    setLoading(true);
    const res = await LumetricAuthService.setup2FA();
    setLoading(false);
    if (res.success && res.qrCodeDataUrl) {
      setMfaSetupData({ secret: res.secret, qrCodeDataUrl: res.qrCodeDataUrl });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to initialize 2FA.' });
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await LumetricAuthService.verify2FA(mfaVerifyCode, mfaSetupData?.secret);
    setLoading(false);
    if (res.success) {
      setMfaSetupData(null);
      setMfaVerifyCode('');
      setAuthUser(prev => prev ? { ...prev, mfaEnabled: true } : null);
      setFeedback({ type: 'success', message: 'Two-Factor Authentication is now active and protecting your account!' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Invalid 6-digit code.' });
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await LumetricAuthService.disable2FA({
      password: disable2FAPassword.trim() || undefined,
      token: mfaVerifyCode.trim() || undefined
    });
    setLoading(false);
    if (res.success) {
      setShowDisable2FA(false);
      setDisable2FAPassword('');
      setMfaVerifyCode('');
      setAuthUser(prev => prev ? { ...prev, mfaEnabled: false } : null);
      setFeedback({ type: 'success', message: 'Two-Factor Authentication disabled successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to disable 2FA. Verify password or code.' });
    }
  };

  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (resetEmail || email).trim().toLowerCase();
    const check = validateEmailAuthenticity(targetEmail);
    if (!check.valid) {
      setResetFeedback({ type: 'error', message: check.message || 'Please enter a genuine, valid email address.' });
      return;
    }

    setResetLoading(true);
    setResetFeedback(null);
    const res = await LumetricAuthService.requestPasswordReset(targetEmail);
    setResetLoading(false);

    if (res.success) {
      setResetStep(2);
      if (res.resetOtp) {
        setResetBannerOtp(res.resetOtp);
        setResetOtp(res.resetOtp);
      }
      if (res.emailPreview) {
        setResetEmailPreview(res.emailPreview);
      }
      if (res.deliveryChannel) {
        setDeliveryChannel(res.deliveryChannel);
      }
      setResetFeedback({
        type: 'success',
        message: res.message || `Password recovery email dispatched to ${targetEmail}. Please check your inbox!`
      });
    } else {
      setResetFeedback({ type: 'error', message: res.error || 'Failed to send reset code.' });
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (resetEmail || email).trim().toLowerCase();

    if (!resetOtp || resetOtp.trim().length !== 6) {
      setResetFeedback({ type: 'error', message: 'Please enter the 6-digit verification code.' });
      return;
    }

    if (resetNewPassword.length < 8) {
      setResetFeedback({ type: 'error', message: 'Password must be at least 8 characters in length.' });
      return;
    }

    const hasLetter = /[a-zA-Z]/.test(resetNewPassword);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(resetNewPassword);
    if (!hasLetter || !hasNumberOrSymbol) {
      setResetFeedback({ type: 'error', message: 'Password must contain at least one letter and one number or special character.' });
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setResetLoading(true);
    setResetFeedback(null);
    const res = await LumetricAuthService.resetPassword({
      email: targetEmail,
      otp: resetOtp.trim(),
      newPassword: resetNewPassword
    });
    setResetLoading(false);

    if (res.success) {
      setResetFeedback({ type: 'success', message: 'Password updated successfully! Returning to sign in...' });
      setPassword(resetNewPassword);
      setEmail(targetEmail);
      setTimeout(() => {
        setMode('login');
        setResetStep(1);
        setResetOtp('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setResetBannerOtp(null);
        setResetFeedback(null);
        setFeedback({ type: 'success', message: 'Password reset successful. Sign in with your new password.' });
      }, 1500);
    } else {
      setResetFeedback({ type: 'error', message: res.error || 'Failed to reset password.' });
    }
  };

  const handleRoleChangeForUser = async (targetEmail: string, newRole: string) => {
    setRoleUpdateMsg(`Updating ${targetEmail}...`);
    const res = await LumetricAuthService.updateUserRole(targetEmail, newRole);
    if (res.success) {
      setRoleUpdateMsg(`✓ Role updated to ${newRole.toUpperCase()} in database.`);
      loadWorkspaceUsers();
      if (authUser && authUser.email === targetEmail) {
        setAuthUser({ ...authUser, role: newRole as any });
        setRole(newRole as any);
      }
      setTimeout(() => setRoleUpdateMsg(null), 3500);
    } else {
      setRoleUpdateMsg(`⚠ Error: ${res.error || 'Failed to update user role'}`);
      setTimeout(() => setRoleUpdateMsg(null), 4000);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleExportBackup = () => {
    try {
      const emailToUse = authUser?.email || currentUser.email || 'user';
      const backupData = {
        userEmail: emailToUse,
        exportedAt: new Date().toISOString(),
        datasets,
        documentFiles,
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `lumetric_backup_${emailToUse.replace(/[^a-z0-9]/gi, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setFeedback({ type: 'success', message: 'Profile database backup exported as JSON.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (e) {
      setFeedback({ type: 'error', message: 'Failed to export backup.' });
    }
  };

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateEmailAuthenticity(email);
    if (!emailCheck.valid) {
      setFeedback({ type: 'error', message: emailCheck.message || 'Please enter a genuine, valid email address.' });
      return;
    }

    if (requiresMfa && (!totpToken || totpToken.trim().length !== 6)) {
      setFeedback({ type: 'error', message: 'Please enter the 6-digit Authenticator OTP code.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res: any = await LumetricAuthService.login({
      email,
      password,
      totpToken: requiresMfa ? totpToken.trim() : undefined
    });
    setLoading(false);

    if (res.requiresMfa) {
      setRequiresMfa(true);
      setFeedback({ type: 'success', message: 'Two-Factor Authentication code required. Open Google Authenticator or 1Password.' });
      return;
    }

    if (res.success && res.user) {
      flushMemoryState();
      setAuthUser(res.user);
      setCurrentUser(res.user);
      setRole(res.user.role);
      setIsAuthenticated(true);
      if (res.user.settings?.subscription) {
        try {
          localStorage.setItem('lumetric_active_subscription', JSON.stringify(res.user.settings.subscription));
        } catch {}
      }
      setRequiresMfa(false);
      setTotpToken('');
      setFeedback({ type: 'success', message: 'Signed in successfully. Live session active.' });
      setTimeout(() => {
        setMode('profile');
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Login failed. Please check credentials.' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailCheck = validateEmailAuthenticity(email);
    if (!emailCheck.valid) {
      setFeedback({ type: 'error', message: emailCheck.message || 'Please enter a genuine, valid email address.' });
      return;
    }

    if (password.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters in length.' });
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    if (!hasLetter || !hasNumberOrSymbol) {
      setFeedback({ type: 'error', message: 'Password must contain at least one letter and one number or special character.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await LumetricAuthService.register({
      email,
      password,
      name,
      organization: org,
      role: selectedRole
    });
    setLoading(false);

    if (res.success && res.user) {
      flushMemoryState();
      setAuthUser(res.user);
      setCurrentUser(res.user);
      setRole(res.user.role);
      setIsAuthenticated(true);
      if (res.user.settings?.subscription) {
        try {
          localStorage.setItem('lumetric_active_subscription', JSON.stringify(res.user.settings.subscription));
        } catch {}
      }
      setFeedback({ type: 'success', message: 'Account registered and persisted to database!' });
      setTimeout(() => {
        setMode('profile');
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Registration failed.' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    // Save workspace name if modified
    if (wsName.trim() && currentWorkspace && (wsName.trim() !== currentWorkspace.name || wsIcon !== currentWorkspace.icon)) {
      updateWorkspace(currentWorkspace.id, {
        name: wsName.trim(),
        icon: wsIcon,
      });
    }

    const res = await LumetricAuthService.updateProfile({
      name,
      organization: org
    });
    setLoading(false);

    if (res.success && res.user) {
      setAuthUser(res.user);
      setCurrentUser(res.user);
      setFeedback({ type: 'success', message: 'Profile & workspace branding updated in cloud database.' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update profile.' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 8) {
      setChangePwMsg({ type: 'error', message: 'New password must be at least 8 characters in length.' });
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);
    if (!hasLetter || !hasNumberOrSymbol) {
      setChangePwMsg({ type: 'error', message: 'New password must contain at least one letter and one number or special character.' });
      return;
    }

    setChangePwLoading(true);
    setChangePwMsg(null);
    const res = await LumetricAuthService.changePassword({ currentPassword, newPassword });
    setChangePwLoading(false);
    if (res.success) {
      setChangePwMsg({ type: 'success', message: 'Password updated successfully in database.' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => {
        setShowChangePw(false);
        setChangePwMsg(null);
      }, 2500);
    } else {
      setChangePwMsg({ type: 'error', message: res.error || 'Failed to update password.' });
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setAuthUser(null);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--lm-border-default)] bg-gradient-to-r from-[#059669]/15 via-[#FAF8F5]/5 to-transparent dark:from-[#059669]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#059669] via-[#10B981] to-[#E34234] text-[#FAF8F5] flex items-center justify-center font-bold text-sm shadow-md">
              {authUser ? authUser.name.charAt(0).toUpperCase() : 'L'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                {mode === 'profile'
                  ? 'Enterprise Profile & Security'
                  : mode === 'profile-db'
                  ? 'Isolated Profile Database & Files'
                  : mode === 'admin-dashboard'
                  ? 'Admin Governance & Role Dashboard'
                  : mode === 'connectors'
                  ? 'Cloud Ingestion Connectors'
                  : mode === 'audit'
                  ? 'SOC-2 Cryptographic Audit Ledger'
                  : mode === 'login'
                  ? 'Sign In to Lumetric'
                  : 'Create Cloud Account'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-[var(--lm-text-secondary)] font-mono">
                  Enterprise Security &amp; Private Storage Vault
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        {authUser && (
          <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)]/50 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setMode('profile')}
              className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                mode === 'profile'
                  ? 'border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399]'
                  : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={() => setMode('workspace')}
              className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                mode === 'workspace'
                  ? 'border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399]'
                  : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              <span>{wsIcon}</span>
              <span>Workspace &amp; Branding</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('profile-db')}
              className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1 ${
                mode === 'profile-db'
                  ? 'border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399]'
                  : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              <span>Profile Database &amp; Files</span>
              <span className="px-1.5 py-0.2 bg-[#059669]/10 text-[#059669] dark:text-[#34D399] rounded text-[9px] font-mono">Isolated</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('connectors')}
              className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                mode === 'connectors'
                  ? 'border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399]'
                  : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              Cloud Connectors
            </button>
            {(authUser.role === 'owner' || authUser.role === 'administrator') && (
              <button
                type="button"
                onClick={() => setMode('admin-dashboard')}
                className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1 ${
                  mode === 'admin-dashboard'
                    ? 'border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399]'
                    : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <span>Roles Dashboard</span>
                <span className="px-1.5 py-0.2 bg-[#059669]/10 text-[#059669] dark:text-[#34D399] rounded text-[9px] font-mono">RBAC</span>
              </button>
            )}
            {(authUser.role === 'owner' || authUser.role === 'administrator' || authUser.role === 'reviewer') && (
              <button
                type="button"
                onClick={() => setMode('audit')}
                className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1 ${
                  mode === 'audit'
                    ? 'border-[#059669] text-[#059669] dark:text-[#34D399] dark:border-[#34D399]'
                    : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <span>Audit Logs</span>
                <span className="px-1.5 py-0.2 bg-[#059669]/10 text-[#059669] dark:text-[#34D399] rounded text-[9px] font-mono">SOC-2</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {feedback && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}
            >
              <span>{feedback.type === 'success' ? '✓' : '⚠'}</span>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* VIEW 1: PROFILE & 2FA SECURITY */}
          {mode === 'profile' && authUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--lm-text-secondary)]">Database Persistence</span>
                  <StatusBadge variant="emerald" dot>Cloud Database Synced</StatusBadge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Account ID</span>
                  <span className="font-mono text-[var(--lm-text-primary)] font-medium text-[11px]">{authUser.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Active Role Grant</span>
                  <span className="font-mono uppercase font-bold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-md border border-[#059669]/25">
                    {authUser.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Subscription Plan</span>
                  <span className="font-mono font-bold text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-md border border-[#059669]/25">
                    {authUser.settings?.subscription?.planName || (authUser.settings?.subscription?.tier === 'pro' || authUser.role === 'owner' ? 'Pro Studio' : 'Basic Free')}
                  </span>
                </div>
              </div>

              {/* 2FA Authenticator Section */}
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-[var(--lm-text-primary)]">Two-Factor Authentication (2FA)</h4>
                      {authUser.mfaEnabled ? (
                        <StatusBadge variant="emerald" dot>Active</StatusBadge>
                      ) : (
                        <StatusBadge variant="neutral">Disabled</StatusBadge>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--lm-text-secondary)]">
                      {authUser.mfaEnabled
                        ? 'Your account is secured with Google Authenticator / 1Password OTP.'
                        : 'Protect your account with Google Authenticator, Microsoft Authenticator, or 1Password.'}
                    </p>
                  </div>
                  {authUser.mfaEnabled ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setShowDisable2FA(!showDisable2FA)}
                    >
                      {showDisable2FA ? 'Cancel' : 'Disable 2FA'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleSetup2FA}
                      loading={loading}
                    >
                      Configure 2FA
                    </Button>
                  )}
                </div>

                {/* Disable 2FA Form */}
                {authUser.mfaEnabled && showDisable2FA && (
                  <form onSubmit={handleDisable2FA} className="pt-3 border-t border-red-500/10 space-y-3 animate-fade-in">
                    <p className="text-xs text-[var(--lm-text-secondary)]">
                      Confirm your current account password or enter the 6-digit Authenticator code to turn off 2FA:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label="Account Password"
                        type="password"
                        value={disable2FAPassword}
                        onChange={(e) => setDisable2FAPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <Input
                        label="OR 6-Digit Authenticator Code"
                        value={mfaVerifyCode}
                        onChange={(e) => setMfaVerifyCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                    <Button type="submit" size="sm" variant="danger" className="w-full" loading={loading}>
                      Confirm & Turn Off 2FA
                    </Button>
                  </form>
                )}

                {/* Configure 2FA Setup Form */}
                {!authUser.mfaEnabled && mfaSetupData && (
                  <form onSubmit={handleConfirm2FA} className="pt-2 border-t border-blue-500/10 space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {mfaSetupData.qrCodeDataUrl && (
                        <img src={mfaSetupData.qrCodeDataUrl} alt="2FA QR Code" className="w-28 h-28 rounded-xl border border-[var(--lm-border-default)] bg-white p-1" />
                      )}
                      <div className="space-y-1.5 text-xs flex-1">
                        <span className="font-semibold text-[var(--lm-text-primary)]">Scan code in Google Authenticator or enter key:</span>
                        <div className="p-1.5 bg-black/10 dark:bg-white/10 rounded-lg font-mono text-[10px] break-all select-all">{mfaSetupData.secret}</div>
                        <Input
                          label="Enter 6-Digit Verification Code"
                          value={mfaVerifyCode}
                          onChange={(e) => setMfaVerifyCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="font-mono tracking-widest text-center font-bold"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm" className="w-full" loading={loading}>
                      Activate Two-Factor Protection
                    </Button>
                  </form>
                )}
              </div>

              {/* Change Password Section */}
              <div className="p-4 rounded-2xl border border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--lm-text-primary)]">Account Security & Password</h4>
                    <p className="text-[11px] text-[var(--lm-text-secondary)]">Bcrypt 12-round salted encryption with complexity verification.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setShowChangePw(!showChangePw)}
                  >
                    {showChangePw ? 'Cancel' : 'Change Password'}
                  </Button>
                </div>

                {changePwMsg && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold ${
                      changePwMsg.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                    }`}
                  >
                    {changePwMsg.message}
                  </div>
                )}

                {showChangePw && (
                  <form onSubmit={handleChangePassword} className="pt-2 border-t border-[var(--lm-border-default)] space-y-3 animate-fade-in">
                    <Input
                      label="Current Password"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Input
                      label="New Password"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters with letter & number"
                      hint="Must be at least 8 characters with a letter and a number or symbol"
                    />
                    <Button type="submit" size="sm" loading={changePwLoading} className="w-full">
                      Update Password in Database
                    </Button>
                  </form>
                )}
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] font-mono">
                    Workspace Branding
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{wsIcon}</span>
                    <Input
                      label="Workspace Name"
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="e.g. Acme Analytics, Growth Studio"
                      className="flex-1"
                      required
                    />
                  </div>
                </div>

                <Input
                  label="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name (e.g. Jazz Patel)"
                  required
                />
                <Input
                  label="Organization / Company"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                />

                <div className="pt-2 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="vermilion"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </Button>
                  <Button type="submit" size="sm" variant="emerald" loading={loading}>
                    Save Profile &amp; Workspace
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW: WORKSPACE & BRANDING STUDIO */}
          {mode === 'workspace' && authUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--lm-text-tertiary)] font-mono">
                  Active Workspace Live Preview
                </span>
                <div className="flex items-center gap-2 text-xs py-1">
                  <span className="font-bold text-[var(--lm-text-primary)] flex items-center gap-1.5 bg-[var(--lm-bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--lm-border-default)]">
                    <span className="text-base">{wsIcon}</span>
                    <span>{wsName.trim() || 'My Studio'}</span>
                  </span>
                  <span className="text-[var(--lm-text-tertiary)]">/</span>
                  <span className="text-[var(--lm-text-secondary)] font-medium bg-[var(--lm-bg-elevated)] px-2.5 py-1.5 rounded-xl border border-[var(--lm-border-default)]">
                    📁 Executive Intelligence
                  </span>
                  <span className="text-[var(--lm-text-tertiary)]">/</span>
                  <span className="text-[var(--lm-text-tertiary)]">Studio Overview</span>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-3.5">
                <Input
                  label="Workspace Name"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. Acme Analytics, Growth Intelligence"
                  required
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--lm-text-primary)]">
                    Workspace Icon &amp; Badge
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['⚡', '📊', '🚀', '🔬', '🧠', '🏢', '💎', '🎯', '💡', '🌐', '🛡️', '📈'].map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setWsIcon(emoji)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition-all cursor-pointer ${
                          wsIcon === emoji
                            ? 'border-[#059669] bg-[#059669]/15 shadow-sm scale-105'
                            : 'border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] hover:border-slate-400'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[var(--lm-text-secondary)]">
                    Quick Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Executive Intelligence', 'Growth Analytics Hub', 'FinTech Science Lab', 'Product Studio', 'Personal Research Vault'].map((sug) => (
                      <button
                        type="button"
                        key={sug}
                        onClick={() => setWsName(sug)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:border-[#059669] border border-transparent transition-colors cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Your Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jazz Patel"
                  required
                />

                <Input
                  label="Organization / Company"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                />

                <div className="pt-2 flex items-center justify-end">
                  <Button type="submit" size="sm" variant="emerald" loading={loading}>
                    Save Workspace &amp; Branding
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW: ISOLATED PROFILE DATABASE & FILES */}
          {mode === 'profile-db' && authUser && (
            <div className="space-y-4">
              {/* Tenant Isolation Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#059669]/10 via-[var(--lm-bg-secondary)] to-[#E34234]/5 border border-[#059669]/25 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="font-bold text-xs text-[var(--lm-text-primary)]">
                      Private Tenant Multi-Tenancy Active
                    </span>
                  </div>
                  <StatusBadge variant="emerald" dot>Isolated Storage</StatusBadge>
                </div>
                <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                  Your account has a dedicated, segregated database sandbox. Datasets and files uploaded here cannot be viewed, accessed, or altered by other user profiles.
                </p>
                <div className="pt-2 border-t border-[var(--lm-border-default)]/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] block">Storage Engine</span>
                    <span className="font-mono text-[11px] text-[var(--lm-text-primary)] font-semibold truncate block">
                      IndexedDB & Catalyst
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] block">Storage Footprint</span>
                    <span className="font-mono text-[11px] text-[#059669] dark:text-[#34D399] font-bold block">
                      {formatBytes(storageFootprintBytes)}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] block">Cloud Sync Status</span>
                    <span className="font-mono text-[11px] text-[var(--lm-text-primary)] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Private Vault Synced
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-3.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2.5">
                <span className="text-xs font-bold text-[var(--lm-text-primary)] block">
                  Profile Workspace Controls
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loadSampleDataIntoProfile();
                      setFeedback({ type: 'success', message: 'Loaded benchmark sample dataset and document into your profile!' });
                      setTimeout(() => setFeedback(null), 3500);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#059669]/15 hover:bg-[#059669]/25 text-[#059669] dark:text-[#34D399] text-xs font-semibold border border-[#059669]/30 transition-all cursor-pointer"
                  >
                    <span>⚡ Load Benchmark</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--lm-bg-primary)] hover:bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-primary)] text-xs font-semibold border border-[var(--lm-border-default)] transition-all cursor-pointer"
                  >
                    <span>💾 Export JSON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to wipe all datasets and documents from your profile? This cannot be undone.')) {
                        clearProfileData();
                        setFeedback({ type: 'success', message: 'Profile database wiped. Workspace is now completely clean.' });
                        setTimeout(() => setFeedback(null), 3500);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF1F0] hover:bg-[#FFE4E1] text-[#E34234] text-xs font-semibold border border-[#E34234]/30 transition-all cursor-pointer"
                  >
                    <span>🗑️ Wipe Database</span>
                  </button>
                </div>
              </div>

              {/* Tabular Datasets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[var(--lm-text-primary)]">
                      Ingested Datasets ({datasets.length})
                    </span>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">CSVs &amp; SQL</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveView('data');
                    }}
                    className="text-xs font-semibold text-[#059669] dark:text-[#34D399] hover:underline cursor-pointer"
                  >
                    + Upload New CSV
                  </button>
                </div>

                {datasets.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-dashed border-[var(--lm-border-default)] text-center text-xs text-[var(--lm-text-secondary)]">
                    No datasets uploaded in this profile yet.
                    <div className="mt-2">
                      <Button size="sm" variant="emerald" onClick={loadSampleDataIntoProfile}>
                        Load Benchmark Sample Data
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {datasets.map((ds) => {
                      const isActive = activeDataset?.id === ds.id;
                      return (
                        <div
                          key={ds.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            isActive
                              ? 'bg-[#059669]/5 border-[#059669]/40'
                              : 'bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)]'
                          } flex items-center justify-between gap-2`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[var(--lm-text-primary)] truncate">
                                {ds.fileName}
                              </span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#059669]/15 text-[#059669] dark:text-[#34D399] text-[9px] font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--lm-text-secondary)] font-mono mt-0.5">
                              {ds.rowCount} rows • {ds.columnCount} cols • {new Date(ds.uploadedAt).toLocaleDateString()}
                            </div>
                            {ds.sha256 && (
                              <div className="text-[9px] font-mono text-[var(--lm-text-tertiary)] truncate mt-0.5">
                                SHA-256: {ds.sha256.slice(0, 16)}...
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => setActiveDataset(ds)}
                                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--lm-bg-primary)] hover:bg-[#059669] hover:text-white border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] transition-colors cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteDataset(ds.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-[#E34234] hover:bg-[#FFF1F0] transition-colors cursor-pointer text-xs"
                              title="Delete dataset from profile"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Document Files */}
              <div className="space-y-2 pt-2 border-t border-[var(--lm-border-default)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[var(--lm-text-primary)]">
                      Uploaded Documents ({documentFiles.length})
                    </span>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">PDF, DOCX, TXT</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveView('analysis');
                    }}
                    className="text-xs font-semibold text-[#059669] dark:text-[#34D399] hover:underline cursor-pointer"
                  >
                    + Upload Document
                  </button>
                </div>

                {documentFiles.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-dashed border-[var(--lm-border-default)] text-center text-xs text-[var(--lm-text-secondary)]">
                    No documents uploaded in this profile yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {documentFiles.map((doc) => {
                      const isActive = activeDocument?.id === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            isActive
                              ? 'bg-indigo-500/5 border-indigo-500/40'
                              : 'bg-[var(--lm-bg-secondary)] border-[var(--lm-border-default)]'
                          } flex items-center justify-between gap-2`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[var(--lm-text-primary)] truncate">
                                {doc.fileName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-md bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] text-[9px] font-mono uppercase">
                                {doc.fileType}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--lm-text-secondary)] font-mono mt-0.5">
                              {doc.wordCount} words • {doc.tokenCount} tokens • {doc.treatments?.length || 0} treatments
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive && (
                              <button
                                type="button"
                                onClick={() => setActiveDocument(doc)}
                                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--lm-bg-primary)] hover:bg-indigo-600 hover:text-white border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] transition-colors cursor-pointer"
                              >
                                Select
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteDocumentFile(doc.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-[#E34234] hover:bg-[#FFF1F0] transition-colors cursor-pointer text-xs"
                              title="Delete document from profile"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: CLOUD CONNECTORS */}
          {mode === 'connectors' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-xs text-[var(--lm-text-secondary)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)]">⚡ Enterprise Cloud Storage & Data Lakes</span>
                <p className="text-[11px] leading-relaxed">Continuous ingestion pipelines connecting directly to Snowflake, AWS S3 Parquet, and Google BigQuery with automated schema sync.</p>
              </div>

              {syncNotice && (
                <div className="p-2.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  {syncNotice}
                </div>
              )}

              {loadingConnectors ? (
                <div className="text-center py-6 text-xs text-[var(--lm-text-secondary)]">Loading connectors...</div>
              ) : (
                <div className="space-y-2.5">
                  {connectors.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[var(--lm-text-primary)]">{c.name}</span>
                          <StatusBadge variant="info">{c.type}</StatusBadge>
                        </div>
                        <div className="text-[11px] text-[var(--lm-text-secondary)] mt-0.5 font-mono">
                          {c.host || c.bucket || c.dataset}
                        </div>
                        <div className="text-[10px] text-[var(--lm-text-tertiary)] mt-1">
                          Records Synced: <span className="font-semibold text-emerald-600">{c.recordsSyncCount?.toLocaleString()}</span> • Last: {c.lastSync}
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleSyncConnector(c.id)}>
                        Sync Now
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: SOC-2 AUDIT LOGS */}
          {mode === 'audit' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-[var(--lm-text-secondary)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)]">🛡️ Cryptographic Tamper-Evident Ledger</span>
                <p className="text-[11px] leading-relaxed">Every administrative role change, 2FA event, and database sync is fingerprinted with SHA-256 for SOC-2 compliance.</p>
              </div>

              {loadingAudit ? (
                <div className="text-center py-6 text-xs text-[var(--lm-text-secondary)]">Loading audit ledger...</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--lm-text-primary)]">{log.action}</span>
                        <span className="text-[10px] font-mono text-[var(--lm-text-tertiary)]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[11px] text-[var(--lm-text-secondary)]">{log.details}</div>
                      <div className="text-[9px] font-mono text-[var(--lm-text-tertiary)] truncate">SHA-256: {log.sha256Hash}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: ADMIN ROLE DASHBOARD */}
          {mode === 'admin-dashboard' && authUser && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-xs text-[var(--lm-text-secondary)] space-y-1">
                <span className="font-bold text-[var(--lm-text-primary)]">👑 Administrator Role Governance</span>
                <p className="text-[11px] leading-relaxed">Elevate or modify team member privileges in real time. Changes write directly to the database.</p>
              </div>

              {roleUpdateMsg && (
                <div className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {roleUpdateMsg}
                </div>
              )}

              {loadingUsers ? (
                <div className="text-center py-6 text-xs text-[var(--lm-text-secondary)]">Loading accounts...</div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {allUsers.map((u) => (
                    <div key={u.id} className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--lm-text-primary)] truncate">{u.name}</div>
                        <div className="text-[11px] text-[var(--lm-text-secondary)] truncate">{u.email}</div>
                      </div>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChangeForUser(u.email, e.target.value)}
                        className="text-xs px-2 py-1 rounded-xl bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] font-semibold shadow-xs"
                      >
                        <option value="owner">OWNER</option>
                        <option value="administrator">ADMIN</option>
                        <option value="builder">BUILDER</option>
                        <option value="reviewer">REVIEWER</option>
                        <option value="viewer">VIEWER</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 5: LOGIN WITH MFA SUPPORT */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <Input
                  label="Work Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (feedback) setFeedback(null);
                  }}
                  placeholder="name@company.com"
                  hint={email.length === 0 ? "Genuine work or personal email required" : undefined}
                  error={email.length > 0 && emailValidation && !emailValidation.valid ? emailValidation.message : undefined}
                />
                {emailValidation && emailValidation.valid && (
                  <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span>✓</span>
                    <span>Domain <span className="font-mono">{emailValidation.domain}</span> verified authentic</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  label="Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (feedback) setFeedback(null);
                  }}
                  placeholder="••••••••"
                />
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setResetEmail(email);
                      setFeedback(null);
                      setResetFeedback(null);
                      setResetStep(1);
                    }}
                    className="text-xs text-[var(--lm-accent-primary)] hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {requiresMfa && (
                <div className="animate-fade-in space-y-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs font-bold text-[var(--lm-text-primary)]">
                      Authenticator OTP Required (2FA)
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                    Open your authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password) and enter the 6-digit verification code.
                  </p>
                  <Input
                    label="6-Digit Authenticator Code"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center font-mono text-lg tracking-[0.25em] font-bold"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresMfa(false);
                      setTotpToken('');
                      setFeedback(null);
                    }}
                    className="text-[11px] text-[var(--lm-text-tertiary)] hover:underline block text-center w-full pt-1"
                  >
                    ← Re-enter password or switch account
                  </button>
                </div>
              )}

              <div className="p-2.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex items-center justify-between text-[11px] text-[var(--lm-text-secondary)]">
                <span className="flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Bcrypt 12 • Encrypted Cloud Storage
                </span>
                <span className="font-mono text-[10px]">Cloud Synced</span>
              </div>

              <Button type="submit" size="md" className="w-full" loading={loading}>
                {requiresMfa ? 'Verify OTP & Sign In' : 'Sign In with Account Auth'}
              </Button>

              <div className="pt-3 border-t border-[var(--lm-border-default)] flex items-center justify-between text-xs text-[var(--lm-text-secondary)]">
                <span>Don&apos;t have an account?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setFeedback(null);
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD & OTP RESET */}
          {mode === 'forgot-password' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--lm-border-default)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--lm-text-primary)]">Password Recovery & Reset</h3>
                  <p className="text-[11px] text-[var(--lm-text-secondary)]">
                    {resetStep === 1
                      ? 'Enter your registered email address to receive a 6-digit verification code.'
                      : 'Verify your code and enter your new account password.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetFeedback(null);
                    setResetStep(1);
                  }}
                  className="text-xs text-[var(--lm-accent-primary)] hover:underline font-bold"
                >
                  Back to Sign In
                </button>
              </div>

              {resetFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                    resetFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${resetFeedback.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="flex-1">{resetFeedback.message}</span>
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleRequestResetOtp} className="space-y-3.5">
                  <Input
                    label="Account Email Address"
                    type="email"
                    required
                    value={resetEmail || email}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (resetFeedback) setResetFeedback(null);
                    }}
                    placeholder="name@company.com"
                    hint="We will dispatch a secure 6-digit recovery code to this email address."
                  />

                  <div className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-xs text-[var(--lm-text-secondary)] space-y-1">
                    <span className="font-bold text-[var(--lm-text-primary)] block">Zero-Data-Loss Security:</span>
                    <p className="text-[11px] leading-relaxed">
                      Resetting your password will re-encrypt your access credentials without affecting your saved workspaces, uploaded files, or custom models.
                    </p>
                  </div>

                  <Button type="submit" size="md" className="w-full" loading={resetLoading}>
                    Send Password Recovery Email
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5 animate-fade-in">
                  {/* Email Dispatch Notice */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Recovery Email Dispatched
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                        {deliveryChannel || 'Cloud Mail Gateway'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                      We dispatched a 6-digit verification code to <span className="font-semibold text-[var(--lm-text-primary)]">{resetEmail || email}</span>. Please check your inbox and spam folder.
                    </p>

                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                      {resetEmailPreview && (
                        <button
                          type="button"
                          onClick={() => setShowEmailPreviewModal(!showEmailPreviewModal)}
                          className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <span>📨</span>
                          <span>{showEmailPreviewModal ? 'Hide Email Preview' : 'View Sent Email Preview'}</span>
                        </button>
                      )}
                      {resetBannerOtp && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetOtp(resetBannerOtp);
                            navigator.clipboard?.writeText(resetBannerOtp);
                          }}
                          className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-2 py-1 rounded-lg font-mono font-bold"
                        >
                          Auto-fill: {resetBannerOtp}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rendered Email Preview Drawer */}
                  {showEmailPreviewModal && resetEmailPreview && (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--lm-border-default)] shadow-sm space-y-2.5 animate-fade-in text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--lm-border-default)]">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-[var(--lm-text-tertiary)] block font-mono">SUBJECT</span>
                          <span className="font-bold text-[var(--lm-text-primary)]">{resetEmailPreview.subject}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--lm-text-secondary)] bg-[var(--lm-bg-secondary)] px-2 py-0.5 rounded">
                          To: {resetEmail || email}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FDFBF7] dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-[11px] leading-relaxed">
                          Hello <strong>{(resetEmail || email).split('@')[0]}</strong>, we received a request to recover and reset the password for your Lumetric account.
                        </p>
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">Verification Code</span>
                          <span className="font-mono text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 tracking-widest block my-1">
                            {resetBannerOtp || resetOtp}
                          </span>
                          <span className="text-[10px] text-emerald-600">Valid for 15 minutes</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Input
                    label="6-Digit Verification Code"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    required
                    className="text-center font-mono text-lg tracking-[0.25em] font-bold"
                  />

                  <Input
                    label="New Password"
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    hint="Must contain letters and numbers or special characters"
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />

                  <Button type="submit" size="md" className="w-full" loading={resetLoading}>
                    Reset Password & Sign In
                  </Button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep(1);
                        setShowEmailPreviewModal(false);
                      }}
                      className="text-[var(--lm-text-secondary)] hover:underline"
                    >
                      ← Change Email
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestResetOtp}
                      className="text-[var(--lm-accent-primary)] hover:underline font-semibold"
                    >
                      Resend Email
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* VIEW 6: REGISTER VIEW */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <Input
                label="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rajveer Singh"
              />
              <div>
                <Input
                  label="Work Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (feedback) setFeedback(null);
                  }}
                  placeholder="name@company.com"
                  hint={email.length === 0 ? "Must be a genuine domain (e.g. name@company.com). Numeric/disposable domains rejected." : undefined}
                  error={email.length > 0 && emailValidation && !emailValidation.valid ? emailValidation.message : undefined}
                />
                {emailValidation && emailValidation.valid && (
                  <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span>✓</span>
                    <span>Domain <span className="font-mono">{emailValidation.domain}</span> verified authentic</span>
                  </div>
                )}
              </div>
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="At least 8 characters"
                hint={password.length === 0 ? "Must contain >= 8 chars with a letter and a number or symbol" : undefined}
                error={
                  password.length > 0 &&
                  (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password))
                    ? "Password must be >= 8 chars and include a letter & number/symbol"
                    : undefined
                }
              />
              <Input
                label="Organization"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Lumetric Labs"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--lm-text-primary)]">
                  Select Initial Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)]"
                >
                  <option value="owner">Owner (Full Governance & Spending)</option>
                  <option value="administrator">Administrator</option>
                  <option value="builder">Builder (Model & Pipeline Author)</option>
                  <option value="reviewer">Reviewer (Auditor)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <Button type="submit" size="md" className="w-full mt-2" loading={loading}>
                Create Account & Save to Database
              </Button>

              <div className="pt-3 border-t border-[var(--lm-border-default)] flex items-center justify-between text-xs text-[var(--lm-text-secondary)]">
                <span>Already registered?</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setFeedback(null);
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
