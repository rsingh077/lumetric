'use client';

import React, { useState, useEffect } from 'react';
import { StatusBadge, Button, Input } from '@/components/ui';
import { LumetricAuthService, AuthUser } from '@/lib/auth';
import { useApp } from '@/contexts/AppContext';

export function UserAuthProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { setRole } = useApp();
  const [mode, setMode] = useState<'profile' | 'login' | 'register' | 'admin-dashboard'>('profile');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'administrator' | 'builder' | 'reviewer' | 'viewer'>('builder');

  // Admin Dashboard State
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [roleUpdateMsg, setRoleUpdateMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const existing = LumetricAuthService.getStoredUser();
    if (existing) {
      setAuthUser(existing);
      setMode('profile');
      setName(existing.name || '');
      setOrg(existing.organization || '');
      setSelectedRole(existing.role);
    } else {
      setMode('login');
    }
  }, [isOpen]);

  // Load all users when opening the admin dashboard
  useEffect(() => {
    if (mode === 'admin-dashboard' && authUser && (authUser.role === 'owner' || authUser.role === 'administrator')) {
      loadWorkspaceUsers();
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

    const res = await LumetricAuthService.login({ email, password });
    setLoading(false);

    if (res.success && res.user) {
      setAuthUser(res.user);
      setRole(res.user.role);
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
      setFeedback({ type: 'success', message: 'Profile updated in database.' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update profile.' });
    }
  };

  const handleLogout = async () => {
    await LumetricAuthService.logout();
    setAuthUser(null);
    setMode('login');
    setFeedback({ type: 'success', message: 'Logged out successfully.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--lm-border-default)] bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {authUser ? authUser.name.charAt(0).toUpperCase() : 'L'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                {mode === 'profile'
                  ? 'User Profile & Account'
                  : mode === 'admin-dashboard'
                  ? 'Admin Governance & Role Dashboard'
                  : mode === 'login'
                  ? 'Sign In to Lumetric'
                  : 'Create Cloud Account'}
              </h3>
              <p className="text-[11px] text-[var(--lm-text-secondary)] font-mono">
                Zoho Catalyst Serverless • Crystal Data Store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs for Authenticated Users */}
        {authUser && (
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--lm-border-default)] bg-[var(--lm-bg-secondary)]/50 text-xs">
            <button
              type="button"
              onClick={() => setMode('profile')}
              className={`pb-2.5 font-semibold transition-colors border-b-2 ${
                mode === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              My Profile
            </button>
            {(authUser.role === 'owner' || authUser.role === 'administrator') && (
              <button
                type="button"
                onClick={() => setMode('admin-dashboard')}
                className={`pb-2.5 font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                  mode === 'admin-dashboard'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <span>Admin Role Dashboard</span>
                <span className="px-1.5 py-0.2 bg-blue-600/10 text-blue-600 rounded text-[9px] font-mono">RBAC</span>
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

          {/* VIEW 1: PROFILE VIEW */}
          {mode === 'profile' && authUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--lm-text-secondary)]">Database Persistence</span>
                  <StatusBadge variant="success" dot>Crystal Data Store Synced</StatusBadge>
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Primary Email</span>
                  <span className="font-medium text-[var(--lm-text-primary)]">{authUser.email}</span>
                </div>
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

              <div className="pt-3 border-t border-[var(--lm-border-default)] flex justify-between items-center text-xs text-[var(--lm-text-secondary)]">
                <span>Switch accounts?</span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Log into another account
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: ADMIN PROFILE & ROLE DASHBOARD */}
          {mode === 'admin-dashboard' && authUser && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-xs text-[var(--lm-text-secondary)] space-y-1">
                <div className="font-bold text-[var(--lm-text-primary)] flex items-center gap-1.5">
                  <span>👑 Administrator Role & Permission Control</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  As an Administrator or Owner, you can view all registered tenant profiles and elevate/modify roles in real time. Changes are immediately saved in the database.
                </p>
              </div>

              {roleUpdateMsg && (
                <div className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {roleUpdateMsg}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--lm-text-primary)]">All Registered Team Members</span>
                  <button
                    type="button"
                    onClick={loadWorkspaceUsers}
                    className="text-blue-600 hover:underline text-[11px] font-semibold"
                  >
                    Refresh List
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-6 text-xs text-[var(--lm-text-secondary)]">
                    Loading accounts from database...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {allUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--lm-text-primary)] truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-[var(--lm-text-secondary)] truncate">
                            {u.email}
                          </div>
                          <div className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">
                            {u.organization || 'Workspace Team'}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: LOGIN VIEW */}
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

              <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/15 text-[11px] text-[var(--lm-text-secondary)] leading-relaxed">
                💡 <span className="font-semibold text-[var(--lm-text-primary)]">Preloaded Admin:</span>{' '}
                <code className="font-mono text-blue-600">admin@lumetric.dev</code> /{' '}
                <code className="font-mono text-blue-600">LumetricAdmin2026!</code>
              </div>

              <Button type="submit" size="md" className="w-full" loading={loading}>
                Sign In with Catalyst Auth
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

          {/* VIEW 4: REGISTER VIEW */}
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
