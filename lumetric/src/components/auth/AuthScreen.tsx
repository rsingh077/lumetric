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
    <div className="min-h-screen bg-[#0A110E] text-[#FAF8F5] flex flex-col justify-between p-3.5 sm:p-6 md:p-8 relative overflow-y-auto">
      {/* Background ambient radial glows (Emerald + Vermilion) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[550px] h-[340px] bg-[#059669]/18 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-[#E34234]/14 blur-[130px] rounded-full pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-10 py-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#059669] via-[#10B981] to-[#E34234] p-[1.5px] shadow-lg shadow-emerald-950/60">
            <div className="w-full h-full bg-[#0D1612] rounded-[14px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#FAF8F5]" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" stroke="#10B981" />
                <circle cx="12" cy="12" r="3" fill="#E34234" />
              </svg>
            </div>
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[#FAF8F5] block leading-tight">LUMETRIC</span>
            <span className="text-[10px] text-[#10B981] font-mono tracking-wider uppercase font-semibold">Data &amp; Document Studio</span>
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131F19]/90 border border-[#E5D9C8]/15 text-xs shadow-xs">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-[#10B981] animate-pulse shadow-xs shadow-emerald-500' : 'bg-[#E34234]'}`} />
          <span className="text-[#CFD8D2] font-medium text-[11px]">
            {serverStatus === 'connected' ? 'Lumi Cloud Online' : 'Connecting...'}
          </span>
          {serverLatency && (
            <span className="text-[#84968C] font-mono text-[10px]">({serverLatency}ms)</span>
          )}
          <button
            onClick={() => reconnectServer()}
            title="Ping Server"
            className="text-[11px] text-[#10B981] hover:text-[#34D399] ml-1 cursor-pointer"
          >
            ↻
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto py-2 z-10">
        <div className="bg-[#111C17]/95 backdrop-blur-2xl border border-[#E5D9C8]/20 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/95">
          
          {/* Segmented Mode Selector: Sign In vs Create Account */}
          <div className="grid grid-cols-2 p-1 bg-[#0A110E] rounded-2xl border border-[#E5D9C8]/15 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-[#E34234] text-[#FAF8F5] shadow-md shadow-[#E34234]/30'
                  : 'text-[#84968C] hover:text-[#FAF8F5]'
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
                  ? 'bg-[#059669] text-[#FAF8F5] shadow-md shadow-emerald-950/40'
                  : 'text-[#84968C] hover:text-[#FAF8F5]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Heading */}
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FAF8F5]">
              {mode === 'signin' ? 'Sign In to Studio' : 'Create Your Account'}
            </h2>
            <p className="mt-1 text-xs text-[#CFD8D2]">
              {mode === 'signin'
                ? 'Enter your credentials to access your data models and documents'
                : 'Join Lumetric to build data pipelines and document NLP treatments'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#E34234]/15 border border-[#E34234]/35 text-[#FF8577] text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-[#FF5442] font-bold shrink-0">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#059669]/15 border border-[#059669]/35 text-[#34D399] text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-[#10B981] font-bold shrink-0">✓</span>
              <span className="flex-1">{successMessage}</span>
            </div>
          )}

          {/* Form: Register or Sign In */}
          <form onSubmit={mode === 'signup' ? handleRegister : handleLogin} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                  Full Name <span className="text-[#E34234]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Alexander Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                Work Email Address <span className="text-[#E34234]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ fontSize: '16px' }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#CFD8D2]">
                  Password <span className="text-[#E34234]">*</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] text-[#E34234] hover:text-[#FF6655] cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84968C] hover:text-[#FAF8F5] text-xs cursor-pointer"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-[11px] text-[#84968C]">
                  Password must be at least 8 characters and include a letter and a number or symbol.
                </p>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                    Data Science &amp; Governance Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    style={{ fontSize: '16px' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all cursor-pointer"
                  >
                    <option value="owner">Lead Data Scientist (Owner)</option>
                    <option value="administrator">Data Platform Engineer (Administrator)</option>
                    <option value="builder">Machine Learning Engineer (Builder)</option>
                    <option value="reviewer">Model Risk &amp; Compliance (Reviewer)</option>
                    <option value="viewer">Executive Stakeholder (Viewer)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Analytics Lab"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    style={{ fontSize: '16px' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-[#059669] bg-[#0D1612] border-[#E5D9C8]/30 focus:ring-[#059669]"
                  />
                  <label htmlFor="termsCheck" className="text-[11px] text-[#CFD8D2] cursor-pointer">
                    I agree to the Data Governance, Privacy &amp; SOC-2 security policies.
                  </label>
                </div>
              </>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-[#CFD8D2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#059669] bg-[#0D1612] border-[#E5D9C8]/30"
                  />
                  <span>Remember me for 30 days</span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#022C22] text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create Account & Enter Studio →' : 'Sign in to Lumetric Studio →'}</span>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-[#E5D9C8]/15"></div>
            <span className="flex-shrink mx-3 text-[11px] text-[#84968C] uppercase tracking-wider">or continue with</span>
            <div className="flex-grow border-t border-[#E5D9C8]/15"></div>
          </div>

          {/* Google Sign In */}
          <div className="space-y-2">
            {!showGoogleInput ? (
              <button
                type="button"
                onClick={() => setShowGoogleInput(true)}
                disabled={isLoading}
                className="w-full h-11 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F4ECE1] text-[#15221B] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
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
              <form onSubmit={handleGoogleSubmit} className="space-y-2 p-3 bg-[#0A110E] border border-[#E5D9C8]/15 rounded-2xl animate-in fade-in">
                <span className="text-xs font-semibold text-[#FAF8F5] block">Google / Gmail Account</span>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/25 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] font-bold text-xs text-[#FAF8F5] cursor-pointer disabled:opacity-50"
                  >
                    Authenticate Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInput(false)}
                    className="px-3 py-2 rounded-xl bg-[#131F19] text-xs text-[#CFD8D2] hover:text-[#FAF8F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Security & Data Governance Footer */}
          <div className="mt-4 pt-3 border-t border-[#E5D9C8]/15 flex items-center justify-between text-[11px] text-[#CFD8D2]">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Bcrypt 12 • SOC-2 Tamper-Evident</span>
            </div>
            <span className="font-mono text-[#84968C] text-[10px]">Zoho Catalyst Lumi Cloud</span>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111C17] border border-[#E5D9C8]/25 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-[#FAF8F5] mb-1">Reset Your Password</h3>
            <p className="text-xs text-[#CFD8D2] mb-4">
              Enter your work email address to receive password reset instructions.
            </p>
            {forgotFeedback ? (
              <div className="p-3 rounded-xl bg-[#059669]/20 border border-[#059669]/40 text-[#34D399] text-xs">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-3.5 py-2 rounded-xl bg-[#192821] text-xs text-[#CFD8D2] hover:text-[#FAF8F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-xs font-bold text-[#FAF8F5]"
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
      <footer className="w-full max-w-md mx-auto text-center py-2 text-[11px] text-[#84968C] z-10">
        <span>Lumetric AI Data &amp; Document Studio • Zoho Catalyst Cloud Engine</span>
      </footer>
    </div>
  );
}
