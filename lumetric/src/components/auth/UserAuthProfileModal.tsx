'use client';

import React, { useState, useEffect } from 'react';
import { StatusBadge, Button, Input } from '@/components/ui';
import { LumetricAuthService, AuthUser } from '@/lib/auth';
import { useApp } from '@/contexts/AppContext';

export function UserAuthProfileModal({
  isOpen,
  onClose,
  initialMode,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'profile' | 'login' | 'register' | 'admin-dashboard' | 'connectors' | 'audit';
}) {
  const { setRole, serverStatus, serverLatency, reconnectServer, logout, setCurrentUser } = useApp();
  const [mode, setMode] = useState<'profile' | 'login' | 'register' | 'admin-dashboard' | 'connectors' | 'audit'>(initialMode || 'profile');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

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

  // MFA state
  const [totpToken, setTotpToken] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret?: string; qrCodeDataUrl?: string } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');

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
    const res = await LumetricAuthService.verify2FA(mfaVerifyCode);
    setLoading(false);
    if (res.success) {
      setMfaSetupData(null);
      setMfaVerifyCode('');
      setFeedback({ type: 'success', message: 'Two-Factor Authentication is now active!' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Invalid 6-digit code.' });
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

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const res: any = await LumetricAuthService.login({ email, password });
    setLoading(false);

    if (res.requiresMfa) {
      setRequiresMfa(true);
      setFeedback({ type: 'success', message: 'Enter your 6-digit Authenticator code to continue.' });
      return;
    }

    if (res.success && res.user) {
      setAuthUser(res.user);
      setCurrentUser(res.user);
      setRole(res.user.role);
      setRequiresMfa(false);
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
      setAuthUser(res.user);
      setCurrentUser(res.user);
      setRole(res.user.role);
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

    const res = await LumetricAuthService.updateProfile({
      name,
      organization: org
    });
    setLoading(false);

    if (res.success && res.user) {
      setAuthUser(res.user);
      setCurrentUser(res.user);
      setFeedback({ type: 'success', message: 'Profile updated in database.' });
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
        <div className="p-5 border-b border-[var(--lm-border-default)] bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {authUser ? authUser.name.charAt(0).toUpperCase() : 'L'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                {mode === 'profile'
                  ? 'Enterprise Profile & Security'
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
                  Zoho Catalyst Serverless • Crystal Store
                </span>
                <button
                  type="button"
                  onClick={() => reconnectServer()}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer hover:opacity-85 transition-opacity ${
                    serverStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                  title="Click to verify server connectivity"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      serverStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span>{serverStatus === 'connected' ? `${serverLatency !== null ? `${serverLatency}ms` : 'Online'}` : 'Reconnect'}</span>
                </button>
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
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={() => setMode('connectors')}
              className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                mode === 'connectors'
                  ? 'border-blue-600 text-blue-600'
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <span>Roles Dashboard</span>
                <span className="px-1.5 py-0.2 bg-blue-600/10 text-blue-600 rounded text-[9px] font-mono">RBAC</span>
              </button>
            )}
            {(authUser.role === 'owner' || authUser.role === 'administrator' || authUser.role === 'reviewer') && (
              <button
                type="button"
                onClick={() => setMode('audit')}
                className={`pb-2.5 px-2 font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1 ${
                  mode === 'audit'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <span>Audit Logs</span>
                <span className="px-1.5 py-0.2 bg-emerald-600/10 text-emerald-600 rounded text-[9px] font-mono">SOC-2</span>
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
                  {dataStoreStatus.loaded ? (
                    dataStoreStatus.tableExists ? (
                      <StatusBadge variant="success" dot>Catalyst DataStore Active</StatusBadge>
                    ) : (
                      <StatusBadge variant="warning" dot>Table &apos;Users&apos; Pending in Console</StatusBadge>
                    )
                  ) : (
                    <StatusBadge variant="neutral">Verifying DataStore...</StatusBadge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Account ID</span>
                  <span className="font-mono text-[var(--lm-text-primary)] font-medium text-[11px]">{authUser.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Active Role Grant</span>
                  <span className="font-mono uppercase font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                    {authUser.role}
                  </span>
                </div>
              </div>

              {!dataStoreStatus.tableExists && dataStoreStatus.loaded && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-1.5 animate-fade-in">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <span>⚠️</span>
                    <span>Zoho Catalyst Console Table Setup:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Zoho Catalyst does not support creating tables via code. To view your data inside Zoho Catalyst Console, create the table <strong>Users</strong> in project <strong>Project-Rainfall</strong> under <strong>Cloud Scale &gt; Data Store</strong> with columns: <code className="font-mono text-[10px] bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">email, passwordHash, name, role, organization, avatarUrl, mfaEnabled, mfaSecret, lastLoginAt, settings</code>.
                  </p>
                </div>
              )}

              {/* 2FA Authenticator Section */}
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--lm-text-primary)]">Two-Factor Authentication (2FA)</h4>
                    <p className="text-[11px] text-[var(--lm-text-secondary)]">Protect your account with Google Authenticator or 1Password.</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={handleSetup2FA} loading={loading}>
                    Configure 2FA
                  </Button>
                </div>

                {mfaSetupData && (
                  <form onSubmit={handleConfirm2FA} className="pt-2 border-t border-blue-500/10 space-y-3 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {mfaSetupData.qrCodeDataUrl && (
                        <img src={mfaSetupData.qrCodeDataUrl} alt="2FA QR Code" className="w-28 h-28 rounded-xl border border-[var(--lm-border-default)] bg-white p-1" />
                      )}
                      <div className="space-y-1.5 text-xs flex-1">
                        <span className="font-semibold text-[var(--lm-text-primary)]">Scan code or enter key manually:</span>
                        <div className="p-1.5 bg-black/10 dark:bg-white/10 rounded-lg font-mono text-[10px] break-all">{mfaSetupData.secret}</div>
                        <Input
                          label="Enter 6-Digit Code"
                          value={mfaVerifyCode}
                          onChange={(e) => setMfaVerifyCode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm" className="w-full">Activate Two-Factor Protection</Button>
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
                <Input
                  label="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
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
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-600"
                  >
                    Sign Out
                  </Button>
                  <Button type="submit" size="sm" loading={loading}>
                    Save Profile Changes
                  </Button>
                </div>
              </form>
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
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              {requiresMfa && (
                <div className="animate-fade-in space-y-1.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Input
                    label="Two-Factor Authentication Code"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                  />
                </div>
              )}

              <div className="p-2.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex items-center justify-between text-[11px] text-[var(--lm-text-secondary)]">
                <span className="flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Bcrypt 12 • Catalyst DataStore
                </span>
                <span className="font-mono text-[10px]">Cloud Synced</span>
              </div>

              <Button type="submit" size="md" className="w-full" loading={loading}>
                {requiresMfa ? 'Verify & Sign In' : 'Sign In with Catalyst Auth'}
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
              <Input
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajveer@lumetric.dev"
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
