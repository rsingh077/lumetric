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

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [organization, setOrganization] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Google quick sign in
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Forgot password modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotFeedback, setForgotFeedback] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real Email + Password Sign In
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const res = await LumetricAuthService.login({ email: cleanEmail, password });
    setIsLoading(false);

    if (res.success && res.user) {
      setSuccessMessage('Signed in successfully. Launching Lumetric Studio...');
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } else {
      setErrorMessage(res.error || 'Invalid credentials or user not found. Please verify your email and password.');
    }
  };

  // Real Account Registration / Sign Up
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) {
      setErrorMessage('Full name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters in length.');
      return;
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
    if (!hasLetter || !hasNumberOrSymbol) {
      setErrorMessage('Password must contain at least one letter and one number or special character.');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage('Please accept the Data Governance & Privacy Terms to register.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanOrg = organization.trim() || 'Data Intelligence Lab';

    const res = await LumetricAuthService.register({
      email: cleanEmail,
      password,
      name: cleanName,
      organization: cleanOrg,
      role
    });

    setIsLoading(false);

    if (res.success && res.user) {
      setSuccessMessage(res.message || 'Account successfully created! Entering Studio...');
      setCurrentUser(res.user);
      setIsAuthenticated(true);
    } else {
      if (res.error?.includes('already exists') || (res as any).code === 'USER_EXISTS') {
        // Attempt login if password matches existing account
        const loginRes = await LumetricAuthService.login({ email: cleanEmail, password });
        if (loginRes.success && loginRes.user) {
          setSuccessMessage('Account authenticated successfully.');
          setCurrentUser(loginRes.user);
          setIsAuthenticated(true);
          return;
        }
        setErrorMessage('An account with this email address already exists. Please sign in or use a different email.');
      } else {
        setErrorMessage(res.error || 'Server error creating account. Please check your network or try again.');
      }
    }
  };

  // Google / OAuth sign in
  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setErrorMessage('Please enter your Google / Workspace email address.');
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
      setErrorMessage(res.error || 'Unable to authenticate with Google. Please use standard email login.');
    }
  };

  // Password Reset simulation / request
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotFeedback(`Password reset link dispatched to ${forgotEmail.trim()}. If an account exists, check your inbox.`);
    setTimeout(() => {
      setShowForgotPassword(false);
      setForgotFeedback(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between p-3.5 sm:p-6 md:p-8 relative overflow-y-auto">
      {/* Background ambient radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[320px] bg-rose-600/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[280px] h-[280px] bg-indigo-600/10 blur-[110px] rounded-full pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 py-2 mb-2">
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
          
          {/* Segmented Mode Selector: Sign In vs Create Account */}
          <div className="grid grid-cols-2 p-1 bg-white/5 rounded-2xl border border-white/10 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Heading */}
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {mode === 'signin' ? 'Sign In to Studio' : 'Create Your Account'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {mode === 'signin'
                ? 'Enter your credentials to access your data models and documents'
                : 'Join Lumetric to build data pipelines and document NLP treatments'}
            </p>
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

          {/* Form: Register or Sign In */}
          <form onSubmit={mode === 'signup' ? handleRegister : handleLogin} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
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
                Work Email Address <span className="text-rose-400">*</span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Password <span className="text-rose-400">*</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Password must be at least 8 characters and include a letter and a number or symbol.
                </p>
              )}
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
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Analytics Lab"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    style={{ fontSize: '16px' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-500 bg-slate-900 border-slate-700 focus:ring-rose-500"
                  />
                  <label htmlFor="termsCheck" className="text-[11px] text-slate-400 cursor-pointer">
                    I agree to the Data Governance, Privacy &amp; SOC-2 security policies.
                  </label>
                </div>
              </>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-rose-500 bg-slate-900 border-slate-700"
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/50 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create Account & Enter Studio →' : 'Sign in to Lumetric Studio →'}</span>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase tracking-wider">or continue with</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Google Sign In */}
          <div className="space-y-2">
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
                <span className="text-xs font-semibold text-slate-200 block">Google / Gmail Account</span>
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
                    Authenticate Account
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

          {/* Security & Data Governance Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bcrypt 12 • SOC-2 Tamper-Evident</span>
            </div>
            <span className="font-mono text-slate-500 text-[10px]">Zoho Catalyst Cloud</span>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[#10172A] border border-white/15 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Reset Your Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your work email address to receive password reset instructions.
            </p>
            {forgotFeedback ? (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs">
                {forgotFeedback}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 text-xs text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white"
                  >
                    Send Instructions
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-2 text-[11px] text-slate-400 z-10">
        <span>Lumetric AI Data &amp; Document Studio • Zoho Catalyst Cloud Engine</span>
      </footer>
    </div>
  );
}
