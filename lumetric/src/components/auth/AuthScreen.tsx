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
    reconnectServer
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('builder');
  const [organization, setOrganization] = useState('Enterprise Analytics');

  // Google Modal / Quick Gmail Input state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick 1-click Google sign in handler
  const handleGoogleSignIn = async (targetEmail?: string, targetName?: string) => {
    const finalEmail = targetEmail || googleEmail;
    const finalName = targetName || googleName;

    if (!finalEmail || !finalEmail.includes('@')) {
      setErrorMessage('Please provide a valid Gmail / Google email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await LumetricAuthService.loginWithGoogle({
        email: finalEmail,
        name: finalName || finalEmail.split('@')[0],
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalEmail)}`
      });

      if (res.success && res.user) {
        setSuccessMessage('Google authentication verified. Entering Lumetric Studio...');
        setCurrentUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: res.user.role as UserRole,
          createdAt: res.user.createdAt
        });
        setIsAuthenticated(true);
      } else {
        setErrorMessage(res.error || 'Google authentication failed. Please verify connection.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Cannot reach Catalyst server for Google authentication.');
    } finally {
      setIsLoading(false);
      setShowGoogleModal(false);
    }
  };

  // Email / Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await LumetricAuthService.login({ email, password });
      if (res.success && res.user) {
        setSuccessMessage('Welcome back! Loading your analytics workspace...');
        setCurrentUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: res.user.role as UserRole,
          createdAt: res.user.createdAt
        });
        setIsAuthenticated(true);
      } else {
        setErrorMessage(res.error || 'Invalid credentials or user not found.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Error communicating with Catalyst server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email / Password Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setErrorMessage('Please complete all required fields (Name, Email, Password).');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await LumetricAuthService.register({
        email,
        password,
        name: fullName,
        organization,
        role
      });

      if (res.success && res.user) {
        setSuccessMessage('Account registered in Catalyst Datastore! Welcome to Lumetric.');
        setCurrentUser({
          id: res.user.id,
          email: res.user.email,
          name: res.user.name,
          role: res.user.role as UserRole,
          createdAt: res.user.createdAt
        });
        setIsAuthenticated(true);
      } else {
        setErrorMessage(res.error || 'Could not complete registration. Check email format.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Server error during account registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-tap demo credentials
  const selectQuickProfile = (profileRole: UserRole, profileName: string, profileEmail: string) => {
    handleGoogleSignIn(profileEmail, profileName);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-x-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-rose-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 p-[1px] shadow-lg shadow-rose-950/40">
            <div className="w-full h-full bg-[#0D1322] rounded-[11px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              </svg>
            </div>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">LUMETRIC</span>
            <span className="text-[10px] block text-rose-400 font-mono tracking-wider uppercase">Enterprise Studio</span>
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-300 font-medium hidden sm:inline">
            {serverStatus === 'connected' ? 'Catalyst Server Connected' : 'Checking Server...'}
          </span>
          {serverLatency && (
            <span className="text-slate-400 font-mono text-[10px]">({serverLatency}ms)</span>
          )}
          <button
            onClick={() => reconnectServer()}
            title="Ping Catalyst Server"
            className="text-[11px] text-rose-400 hover:text-rose-300 underline ml-1 cursor-pointer"
          >
            Ping
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6 z-10">
        <div className="bg-[#10172A]/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          
          {/* Welcome heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {mode === 'signin' ? 'Sign in to Lumetric' : 'Create Gmail / Cloud Account'}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              {mode === 'signin'
                ? 'Access your analytics workbench, telemetry pipelines & executive dashboards'
                : 'Save credentials directly in Zoho Catalyst encrypted datastore'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* PRIMARY ACTION: Sign In with Google / Gmail */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              disabled={isLoading}
              className="w-full h-12 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-md shadow-white/5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {/* Google Multicolor G Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google / Gmail</span>
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">or email password</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>

          {/* Form Mode Toggle Tabs */}
          <div className="flex rounded-xl bg-slate-900/90 p-1 mb-5 border border-white/5">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* FORM: Sign In Mode */}
          {mode === 'signin' && (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address / Gmail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille.dubois@gmail.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <span className="text-[11px] text-rose-400 hover:underline cursor-pointer">Forgot?</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Authenticating with Server...</span>
                  </>
                ) : (
                  <span>Sign In & Launch Workbench</span>
                )}
              </button>
            </form>
          )}

          {/* FORM: Create Account Mode */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Camille Dubois"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Gmail / Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="camille.dubois@gmail.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Organization / Fleet Team
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Enterprise Logistics & Analytics"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password (min. 8 characters)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Assigned Workspace Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
                >
                  <option value="owner">Executive / Owner (Full Authority)</option>
                  <option value="administrator">Administrator (Cluster Governance)</option>
                  <option value="builder">Data Engineer / Builder (ETL & SQL)</option>
                  <option value="reviewer">Reviewer / Analyst (Audit & Validation)</option>
                  <option value="viewer">Viewer (Read-only Dashboards)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Saving to Catalyst Datastore...</span>
                  </>
                ) : (
                  <span>Create Account & Save to Database</span>
                )}
              </button>
            </form>
          )}

          {/* Quick 1-Tap Team Identity Pills */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <span className="block text-[11px] font-semibold text-slate-400 mb-2.5 uppercase tracking-wider text-center">
              One-Tap Executive Test Profiles
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectQuickProfile('owner', 'Camille Dubois', 'camille.dubois@gmail.com')}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/40 text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-rose-600/20 text-rose-400 font-bold text-xs flex items-center justify-center mb-1 group-hover:scale-105">
                  CD
                </div>
                <div className="text-[11px] font-medium text-white truncate">Camille</div>
                <div className="text-[9px] text-rose-400 font-mono">Executive</div>
              </button>

              <button
                type="button"
                onClick={() => selectQuickProfile('builder', 'Alex Chen', 'alex.chen@gmail.com')}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-indigo-950/40 border border-white/5 hover:border-indigo-500/40 text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-indigo-600/20 text-indigo-400 font-bold text-xs flex items-center justify-center mb-1 group-hover:scale-105">
                  AC
                </div>
                <div className="text-[11px] font-medium text-white truncate">Alex</div>
                <div className="text-[9px] text-indigo-400 font-mono">Data Eng</div>
              </button>

              <button
                type="button"
                onClick={() => selectQuickProfile('administrator', 'Sarah Lin', 'sarah.lin@gmail.com')}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-emerald-950/40 border border-white/5 hover:border-emerald-500/40 text-center transition-all cursor-pointer group"
              >
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600/20 text-emerald-400 font-bold text-xs flex items-center justify-center mb-1 group-hover:scale-105">
                  SL
                </div>
                <div className="text-[11px] font-medium text-white truncate">Sarah</div>
                <div className="text-[9px] text-emerald-400 font-mono">Admin</div>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Google Sign In Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#131B2E] border border-white/15 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              &times;
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Sign in with Google</h3>
              <p className="text-xs text-slate-400 mt-1">Enter your Gmail account to validate with Catalyst Server</p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Your Full Name</label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Camille Dubois"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Gmail Address</label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="camille.dubois@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-md shadow-rose-950 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Verifying with Catalyst...' : 'Authenticate Gmail'}
              </button>

              <div className="text-[11px] text-slate-400 text-center pt-2">
                Or quick test:
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn('camille.dubois@gmail.com', 'Camille Dubois')}
                  className="flex-1 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-rose-300 font-medium border border-rose-500/20"
                >
                  Camille (Gmail)
                </button>
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn('alex.chen@gmail.com', 'Alex Chen')}
                  className="flex-1 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg text-indigo-300 font-medium border border-indigo-500/20"
                >
                  Alex (Gmail)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="w-full max-w-md mx-auto text-center text-[11px] text-slate-500 z-10 py-2">
        <p>Zoho Catalyst Serverless Backend • SOC-2 Type II Certified</p>
        <p className="mt-1">Lumetric v1.6.0 Enterprise • All rights reserved</p>
      </footer>
    </div>
  );
}
