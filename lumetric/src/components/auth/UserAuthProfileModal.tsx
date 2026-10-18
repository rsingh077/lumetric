'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, StatusBadge, Button, Input } from '@/components/ui';
import { LumetricAuthService, AuthUser } from '@/lib/auth';
import { useApp } from '@/contexts/AppContext';

export function UserAuthProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { currentUser, setRole } = useApp();
  const [mode, setMode] = useState<'profile' | 'login' | 'register'>('profile');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [role, setSelectedRole] = useState<'owner' | 'administrator' | 'builder' | 'reviewer' | 'viewer'>('builder');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const existing = LumetricAuthService.getStoredUser();
    if (existing) {
      setAuthUser(existing);
      setMode('profile');
      setName(existing.name || '');
      setOrg(existing.organization || '');
    } else {
      setMode('login');
    }
  }, [isOpen]);

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
      setFeedback({ type: 'success', message: 'Signed in successfully to Catalyst Cloud.' });
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
      role
    });
    setLoading(false);

    if (res.success && res.user) {
      setAuthUser(res.user);
      setRole(res.user.role);
      setFeedback({ type: 'success', message: 'Account registered and authenticated on Zoho Catalyst.' });
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
      setFeedback({ type: 'success', message: 'Profile updated on server.' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update profile.' });
    }
  };

  const handleLogout = async () => {
    await LumetricAuthService.logout();
    setAuthUser(null);
    setMode('login');
    setFeedback({ type: 'success', message: 'Logged out from cloud server.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--lm-border-default)] bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {authUser ? authUser.name.charAt(0).toUpperCase() : 'L'}
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--lm-text-primary)]">
                {mode === 'profile' ? 'Cloud Profile & Account' : mode === 'login' ? 'Sign In to Lumetric' : 'Create Cloud Account'}
              </h3>
              <p className="text-[11px] text-[var(--lm-text-secondary)] font-mono">
                Zoho Catalyst Serverless • Project-Rainfall
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

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

          {/* PROFILE VIEW */}
          {mode === 'profile' && authUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--lm-text-secondary)]">Authentication State</span>
                  <StatusBadge variant="success" dot>Live Catalyst Session</StatusBadge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">User ID</span>
                  <span className="font-mono text-[var(--lm-text-primary)] font-medium text-[11px]">{authUser.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Assigned Role</span>
                  <span className="font-mono uppercase font-bold text-blue-600">{authUser.role}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lm-text-secondary)]">Email</span>
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

          {/* LOGIN VIEW */}
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
                💡 <span className="font-semibold text-[var(--lm-text-primary)]">Preloaded Admin:</span> <code className="font-mono text-blue-600">admin@lumetric.dev</code> / <code className="font-mono text-blue-600">LumetricAdmin2026!</code>
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

          {/* REGISTER VIEW */}
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
                  value={role}
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
                Create Account & Establish Session
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
