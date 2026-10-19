'use client';

import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LumetricAuthService } from '@/lib/auth';
import { UserRole } from '@/types';

export function AuthScreen() {
  const {
    setCurrentUser,
    setIsAuthenticated,
    serverStatus,
    serverLatency,
    reconnectServer,
  } = useApp();

  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [organization, setOrganization] = useState('Lumetric Intelligence Lab');

  // Google quick sign in
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1-Click Instant Bypass / Demo Access
  const handleInstantBypass = (
    targetRole: UserRole = 'owner',
    name: string = 'Dr. Alexander Vance',
    userEmail: string = 'alex.vance@lumetric.io'
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage('Instant access validated...');

    const user = {
      id: `usr_${Date.now()}`,
      email: userEmail,
      name,
      role: targetRole,
      createdAt: new Date().toISOString()
    };

    LumetricAuthService.setSession(`token_instant_${Date.now()}`, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    });

    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  // Google / Gmail sign in
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setErrorMessage('Please enter your Google/Gmail address.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    const displayName = googleName.trim() || googleEmail.split('@')[0];
    const res = await LumetricAuthService.loginWithGoogle({
      email: googleEmail.trim(),
      name: displayName,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`
    });

    setIsLoading(false);
    if (res.success && res.user) {
      setSuccessMessage('Google authentication validated.');
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } else {
      setErrorMessage(res.error || 'Unable to authenticate with Google. You can use Instant Access.');
    }
  };

  // Standard Email + Password Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim() || cleanEmail.split('@')[0];

    const res = await LumetricAuthService.register({
      email: cleanEmail,
      password,
      name: cleanName,
      organization: organization.trim() || 'Lumetric Intelligence Lab',
      role
    });

    setIsLoading(false);

    if (res.success && res.user) {
      setSuccessMessage(res.message || 'Account created successfully.');
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } else {
      if (res.error?.includes('already exists') || (res as any).code === 'USER_EXISTS') {
        const loginRes = await LumetricAuthService.login({ email: cleanEmail, password });
        if (loginRes.success && loginRes.user) {
          setSuccessMessage('Account authenticated successfully.');
          setCurrentUser(loginRes.user);
          setIsAuthenticated(true);
          return;
        }
        setErrorMessage('An account with this email already exists. Please verify your password or sign in.');
      } else {
        setErrorMessage(res.error || 'Server error creating account. You can use Instant Access.');
      }
    }
  };

  // Standard Email + Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const res = await LumetricAuthService.login({ email: cleanEmail, password });
    setIsLoading(false);

    if (res.success && res.user) {
      setSuccessMessage('Signed in successfully.');
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } else {
      setErrorMessage(res.error || 'Invalid credentials or user not found.');
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between p-3.5 sm:p-6 md:p-8 relative overflow-y-auto">
      {/* Background ambient radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[260px] h-[260px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 py-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 p-[1.5px] shadow-lg shadow-rose-950/40">
            <div className="w-full h-full bg-[#0D1322] rounded-[10px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              </svg>
            </div>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-tight">LUMETRIC</span>
            <span className="text-[10px] text-rose-400 font-mono tracking-wider uppercase">Data &amp; Document Studio</span>
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300 font-medium text-[11px]">
            {serverStatus === 'connected' ? 'Cloud Online' : 'Connecting...'}
          </span>
          {serverLatency && (
            <span className="text-slate-400 font-mono text-[10px]">({serverLatency}ms)</span>
          )}
          <button
            onClick={() => reconnectServer()}
            title="Ping Server"
            className="text-[11px] text-rose-400 hover:text-rose-300 ml-1 cursor-pointer"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto py-2 z-10">
        <div className="bg-[#10172A]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/90">
          
          {/* Welcome heading */}
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {mode === 'signup' ? 'Create Your Account' : 'Sign in to Studio'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'signup'
                ? 'Register your profile in the secure Zoho Catalyst Cloud'
                : 'Access your datasets, document treatments & predictive models'}
            </p>
          </div>

          {/* 1-TAP INSTANT ACCESS BUTTON (Zero-Friction Access) */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => handleInstantBypass('owner', 'Dr. Alexander Vance', 'alex.vance@lumetric.io')}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>⚡</span>
              <span>Instant Access (Dr. Alexander Vance • Lead Data Scientist)</span>
            </button>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-rose-400 font-bold shrink-0">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-emerald-400 font-bold shrink-0">✓</span>
              <span className="flex-1">{successMessage}</span>
            </div>
          )}

          {/* 1-Click Google Sign In */}
          <div className="space-y-2 mb-4">
            {!showGoogleInput ? (
              <button
                type="button"
                onClick={() => setShowGoogleInput(true)}
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            ) : (
              <form onSubmit={handleGoogleSubmit} className="space-y-2 p-3 bg-white/5 border border-white/10 rounded-2xl animate-in fade-in">
                <span className="text-xs font-semibold text-slate-200 block">Google / Gmail Authentication</span>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-xs text-white cursor-pointer disabled:opacity-50"
                  >
                    Validate Google Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInput(false)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase tracking-wider">or email access</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Form: Register or Sign In */}
          <form onSubmit={mode === 'signup' ? handleRegister : handleLogin} className="space-y-3.5 mt-2">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Alexander Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Work Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ fontSize: '16px' }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password {mode === 'signup' && <span className="text-slate-400 text-[10px]">(min 4 characters)</span>}
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ fontSize: '16px' }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Data Science &amp; Governance Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    style={{ fontSize: '16px' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
                  >
                    <option value="owner">Lead Data Scientist (Owner)</option>
                    <option value="administrator">Data Platform Engineer (Administrator)</option>
                    <option value="builder">Machine Learning Engineer (Builder)</option>
                    <option value="reviewer">Model Risk &amp; Compliance (Reviewer)</option>
                    <option value="viewer">Executive Stakeholder (Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Organization / Lab Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lumetric Intelligence Lab"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    style={{ fontSize: '16px' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/50 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Register & Enter Studio →' : 'Sign in to Studio →'}</span>
              )}
            </button>
          </form>

          {/* Toggle between Signup and Signin */}
          <div className="mt-4 pt-3 border-t border-white/10 text-center">
            {mode === 'signup' ? (
              <p className="text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMessage(null); }}
                  className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline ml-1"
                >
                  Sign in here
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMessage(null); }}
                  className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline ml-1"
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Quick Demo Persona Badges */}
        <div className="mt-4 text-center">
          <span className="text-[11px] text-slate-400 block mb-2 font-medium">Quick Demo Personas (1-Click Switch):</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Lead Data Scientist', role: 'owner', name: 'Dr. Alexander Vance', email: 'alex.vance@lumetric.io' },
              { label: 'ML Engineer', role: 'builder', name: 'Marcus Brody', email: 'dev.marcus@lumetric.io' },
              { label: 'Platform Engineer', role: 'administrator', name: 'Sarah Lin', email: 'sarah.lin@lumetric.io' },
              { label: 'Executive Viewer', role: 'viewer', name: 'James Harrison', email: 'director.harrison@lumetric.io' },
            ].map((p) => (
              <button
                key={p.role}
                type="button"
                onClick={() => handleInstantBypass(p.role as UserRole, p.name, p.email)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-2 text-[11px] text-slate-400 z-10">
        <span>Lumetric Data &amp; Document Studio • Version 2.0.2 • Zoho Catalyst Cloud</span>
      </footer>
    </div>
  );
}
