'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { LumetricAuthService, validateEmailAuthenticity, OtpResponse } from '@/lib/auth';
import { UserRole } from '@/types';

export type AuthMode = 'signin' | 'signup' | 'otp-verify' | 'forgot-password';
export type SignInMethod = 'password' | 'otp';

export interface AuthScreenProps {
  initialMode?: AuthMode;
  initialEmail?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export function AuthScreen({
  initialMode = 'signin',
  initialEmail = '',
  onClose,
  isModal = false,
}: AuthScreenProps = {}) {
  const {
    setCurrentUser,
    setIsAuthenticated,
    flushMemoryState,
    serverStatus,
    serverLatency,
    reconnectServer,
  } = useApp();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('password');

  // Form Fields
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      setResetEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (!isModal || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [organization, setOrganization] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // 6-Digit OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'login' | 'reset-password'>('signup');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [deliveryChannel, setDeliveryChannel] = useState<string | null>(null);
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 2FA / TOTP Authenticator State
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [totpToken, setTotpToken] = useState('');

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Status feedback & Real-Time Presence Detection
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'old_user' | 'new_user'>('idle');
  const [detectedUserName, setDetectedUserName] = useState<string | null>(null);
  const [isUserExistsError, setIsUserExistsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Real-time as-you-type email check (distinguishing Old User vs New User)
  useEffect(() => {
    const clean = email.trim().toLowerCase();

    // Reset status if incomplete email
    if (!clean || !clean.includes('@') || clean.length < 5) {
      setEmailStatus('idle');
      setIsUserExistsError(false);
      setDetectedUserName(null);
      return;
    }

    const atParts = clean.split('@');
    if (atParts.length !== 2 || !atParts[1].includes('.') || atParts[1].split('.')[1].length < 2) {
      setEmailStatus('idle');
      return;
    }

    const checkSyntax = validateEmailAuthenticity(clean);
    if (!checkSyntax.valid) {
      setEmailStatus('idle');
      return;
    }

    // Debounce for 250ms for snappy real-time feedback
    setEmailStatus('checking');
    setIsCheckingEmail(true);

    const timer = setTimeout(async () => {
      try {
        const res = await LumetricAuthService.checkEmail(clean);
        if (res && res.success) {
          if (res.exists) {
            setEmailStatus('old_user');
            setDetectedUserName(res.name || null);
            if (mode === 'signup') {
              setIsUserExistsError(true);
              setErrorMessage('Registered account found (Old User). Please sign in instead.');
            } else {
              setIsUserExistsError(false);
            }
          } else {
            setEmailStatus('new_user');
            setDetectedUserName(null);
            setIsUserExistsError(false);
            if (mode === 'signup' && errorMessage?.includes('already exists')) {
              setErrorMessage(null);
            }
          }
        } else {
          setEmailStatus('idle');
        }
      } catch {
        setEmailStatus('idle');
      } finally {
        setIsCheckingEmail(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [email, mode]);

  useEffect(() => {
    LumetricAuthService.pruneLocalStorageQuota();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Real-time email validation
  const isEmailTouched = email.trim().length > 0;
  const emailValidation = isEmailTouched ? validateEmailAuthenticity(email) : null;

  // Real-time password validation (for registration & reset)
  const isPasswordTouched = password.length > 0;
  const passwordHasLength = password.length >= 8;
  const passwordHasLetter = /[a-zA-Z]/.test(password);
  const passwordHasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  const isPasswordValid = passwordHasLength && passwordHasLetter && passwordHasNumberOrSymbol;

  const currentOtpString = otpDigits.join('');

  // Helper to handle OTP digit changes with auto-advance and clipboard pasting
  const handleOtpChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, '');

    // Handle paste of multiple digits
    if (sanitized.length > 1) {
      const pasteDigits = sanitized.slice(0, 6).split('');
      const newOtp = [...otpDigits];
      pasteDigits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpDigits(newOtp);
      const focusIndex = Math.min(pasteDigits.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    const newOtp = [...otpDigits];
    newOtp[index] = sanitized;
    setOtpDigits(newOtp);

    // Auto-advance
    if (sanitized && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const autoFillPreviewCode = () => {
    if (!verificationPreview || verificationPreview.length !== 6) return;
    const digits = verificationPreview.split('');
    setOtpDigits(digits);
    inputRefs.current[5]?.focus();
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const digits = text.replace(/\D/g, '').slice(0, 6);
        if (digits.length > 0) {
          const newOtp = ['', '', '', '', '', ''];
          digits.split('').forEach((d, i) => { newOtp[i] = d; });
          setOtpDigits(newOtp);
          const focusIndex = Math.min(digits.length, 5);
          inputRefs.current[focusIndex]?.focus();
        }
      }
    } catch (_) {
      inputRefs.current[0]?.focus();
    }
  };

  // 1. Password Sign In Handler
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    const emailCheck = validateEmailAuthenticity(cleanEmail);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.message || 'Please enter a genuine, valid work email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await LumetricAuthService.login({
      email: cleanEmail,
      password,
      totpToken: requiresMfa ? totpToken.trim() : undefined
    });
    setIsLoading(false);

    if (res.success && res.user) {
      setSuccessMessage('Signed in successfully. Launching Lumetric Studio...');
      flushMemoryState();
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      if (res.user.settings?.subscription) {
        try {
          localStorage.setItem('lumetric_active_subscription', JSON.stringify(res.user.settings.subscription));
        } catch {}
      }
    } else if (res.requiresMfa) {
      setRequiresMfa(true);
      setErrorMessage('Two-Factor Authentication is enabled for your account. Please enter your 6-digit authenticator code.');
    } else if (res.requiresOtp || res.error?.includes('OTP_REQUIRED') || (res as any).code === 'OTP_REQUIRED') {
      // Mandatory OTP challenge for all logins (new & old users)
      setOtpPurpose('login');
      setOtpDigits(['', '', '', '', '', '']);
      setMode('otp-verify');
      setSuccessMessage(res.message || 'Password verified! Enter the 6-digit code sent to your email.');
      setResendCooldown(30);
      if (res.challengeToken) {
        try {
          sessionStorage.setItem('lumetric_login_challenge', res.challengeToken);
        } catch {}
      }
    } else if (res.error?.includes('USER_NOT_FOUND') || (res as any).code === 'USER_NOT_FOUND') {
      setErrorMessage('No account registered with this email address. Please switch to "Create Account" to get started.');
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Incorrect password.');
    }
  };

  // 2. Dispatch OTP for Any Purpose (Signup, Passwordless Login, Reset)
  const handleSendOtpForPurpose = async (
    targetEmail: string,
    purpose: 'signup' | 'login' | 'reset-password',
    customSuccessMsg?: string
  ) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const emailCheck = validateEmailAuthenticity(cleanEmail);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.message || 'Please enter a genuine work email address.');
      return false;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = purpose === 'signup'
      ? { name: fullName.trim(), password, role, organization: organization.trim() }
      : undefined;

    const res = await LumetricAuthService.sendOtp({
      email: cleanEmail,
      purpose,
      payload
    });
    setIsLoading(false);

    if (res.success) {
      setOtpDigits(['', '', '', '', '', '']);
      setOtpPurpose(purpose);
      setDeliveryChannel(res.deliveryChannel || 'Email Dispatcher');
      setVerificationPreview(res.verificationPreview || null);
      setResendCooldown(res.cooldownSeconds || 45);
      setSuccessMessage(customSuccessMsg || res.message || `6-digit verification code sent to ${cleanEmail}.`);
      setMode('otp-verify');
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
      return true;
    } else {
      if ((res as any).code === 'USER_EXISTS' || res.error?.includes('already exists')) {
        setIsUserExistsError(true);
        setErrorMessage('An account with this email address already exists. Please sign in or use a different email.');
      } else if ((res as any).code === 'USER_NOT_FOUND') {
        setIsUserExistsError(false);
        setErrorMessage('No account found with this email. Please click "Create Account" to register.');
      } else {
        setIsUserExistsError(false);
        setErrorMessage(res.error || 'Failed to dispatch verification code. Please try again.');
      }
      return false;
    }
  };

  // 3. Initiate Registration (Sends OTP before account creation)
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) {
      setErrorMessage('Full name, work email, and password are required.');
      return;
    }

    const emailCheck = validateEmailAuthenticity(email);
    if (!emailCheck.valid) {
      setErrorMessage(emailCheck.message || 'Please enter a genuine, valid work email address.');
      return;
    }

    // Pre-emptively check if account already exists before dispatching OTP
    setIsCheckingEmail(true);
    const availCheck = await LumetricAuthService.checkEmail(email);
    setIsCheckingEmail(false);
    if (availCheck && availCheck.success && availCheck.exists) {
      setIsUserExistsError(true);
      setErrorMessage('An account with this email address already exists. Please sign in instead.');
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

    await handleSendOtpForPurpose(
      email,
      'signup',
      `Verification code dispatched to ${email.trim().toLowerCase()}. Enter code to complete registration.`
    );
  };

  // 4. Initiate Passwordless Sign In (Sends OTP)
  const handleInitiateOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your work email address.');
      return;
    }
    await handleSendOtpForPurpose(
      email,
      'login',
      `One-time sign-in code sent to ${email.trim().toLowerCase()}.`
    );
  };

  // 5. Complete OTP Verification & Finalize Authentication
  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = (otpPurpose === 'reset-password' ? resetEmail || email : email).trim().toLowerCase();

    if (currentOtpString.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let challengeToken: string | undefined = undefined;
    if (otpPurpose === 'login') {
      try {
        challengeToken = sessionStorage.getItem('lumetric_login_challenge') || undefined;
      } catch {}
    }

    const res: OtpResponse = await LumetricAuthService.verifyOtp({
      email: cleanEmail,
      otp: currentOtpString,
      purpose: otpPurpose,
      challengeToken,
      newPassword: otpPurpose === 'reset-password' ? resetNewPassword : undefined,
      payload: otpPurpose === 'signup'
        ? { name: fullName.trim(), password, role, organization: organization.trim() }
        : undefined
    });

    setIsLoading(false);

    if (res.success && res.user) {
      try { sessionStorage.removeItem('lumetric_login_challenge'); } catch {}
      setSuccessMessage(res.message || 'Verification successful! Launching Lumetric Studio...');
      flushMemoryState();
      setCurrentUser(res.user);
      setIsAuthenticated(true);
      if (res.user.settings?.subscription) {
        try {
          localStorage.setItem('lumetric_active_subscription', JSON.stringify(res.user.settings.subscription));
        } catch {}
      }
    } else {
      if ((res as any).code === 'USER_EXISTS' || res.error?.includes('already exists')) {
        setIsUserExistsError(true);
        setErrorMessage('An account with this email address already exists. Please sign in instead.');
        setMode('signin');
      } else {
        setErrorMessage(res.error || 'Invalid or expired verification code. Please check your code or request a fresh one.');
      }
    }
  };

  // 6. Initiate Password Reset
  const handleInitiateForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your work email address.');
      return;
    }

    const sent = await handleSendOtpForPurpose(cleanEmail, 'reset-password');
    if (sent) {
      setSuccessMessage(`Password recovery code sent to ${cleanEmail}. Please enter the code and set your new password.`);
    }
  };

  const authCard = (
    <div className={`relative w-full max-w-md mx-auto ${isModal ? 'my-auto' : 'my-auto py-2'} z-10 animate-in fade-in zoom-in-95 duration-200`}>
      {/* Modal Close Button */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-30 w-8 h-8 rounded-full bg-[#1A2820] border border-[#E5D9C8]/25 text-[#CFD8D2] hover:text-white hover:border-[#10B981] flex items-center justify-center text-xs font-bold shadow-xl transition-all cursor-pointer"
          title="Close (Esc)"
          aria-label="Close"
        >
          ✕
        </button>
      )}

      <div className="bg-[#111C17]/95 backdrop-blur-2xl border border-[#E5D9C8]/20 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/95">
        {/* Modal Header Brand Bar */}
        {isModal && (
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5D9C8]/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#059669] via-[#10B981] to-[#E34234] p-[1.5px] shadow-sm">
                <div className="w-full h-full bg-[#0D1612] rounded-[10px] flex items-center justify-center">
                  <span className="text-[#10B981] font-bold text-xs">✦</span>
                </div>
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-[#FAF8F5] block leading-tight">LUMETRIC</span>
                <span className="text-[9px] text-[#10B981] font-mono tracking-wider uppercase font-semibold">Decision Studio</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#0A110E] border border-[#E5D9C8]/10 text-[10px] font-mono text-[#84968C]">
              <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'connected' ? 'bg-[#10B981]' : 'bg-[#D97706] animate-pulse'}`} />
              <span>{serverStatus === 'connected' ? (serverLatency ? `${serverLatency}ms` : 'Cloud Active') : 'Live Cloud'}</span>
            </div>
          </div>
        )}

          {/* Mode Switcher (Sign In vs Create Account) - Hidden during OTP Verification */}
          {mode !== 'otp-verify' && (
            <div className="grid grid-cols-2 p-1 bg-[#0A110E] rounded-2xl border border-[#E5D9C8]/15 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setIsUserExistsError(false);
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
                  setIsUserExistsError(false);
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
          )}

          {/* Alerts */}
          {isUserExistsError ? (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/12 border border-amber-500/35 text-amber-200 text-xs flex flex-col gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                  🔒
                </div>
                <div className="flex-1">
                  <div className="font-bold text-amber-300 text-xs">Email Already Registered</div>
                  <div className="text-slate-300 mt-0.5 leading-relaxed text-[11px]">
                    An account is already linked to <strong className="text-white font-mono">{email}</strong>. Once an account is created, you cannot register another account with this email address.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setIsUserExistsError(false);
                  setErrorMessage(null);
                  setSuccessMessage(`Welcome back! Please sign in with ${email}.`);
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#022C22] text-[#FAF8F5] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer transition-all active:scale-[0.99]"
              >
                <span>Sign In With This Email</span>
                <span>→</span>
              </button>
            </div>
          ) : errorMessage ? (
            <div className="mb-4 p-3 rounded-xl bg-[#E34234]/15 border border-[#E34234]/35 text-[#FF8577] text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-[#FF5442] font-bold shrink-0">⚠️</span>
              <span className="flex-1 leading-snug">{errorMessage}</span>
            </div>
          ) : null}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#059669]/15 border border-[#059669]/35 text-[#34D399] text-xs flex items-start gap-2 animate-in fade-in">
              <span className="text-[#10B981] font-bold shrink-0">✓</span>
              <span className="flex-1 leading-snug">{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: SIGN IN MODE (PASSWORD OR OTP EMAIL CODE)        */}
          {/* ======================================================== */}
          {mode === 'signin' && (
            <div>
              <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FAF8F5]">
                  Sign In to Studio
                </h2>
                <p className="mt-1 text-xs text-[#CFD8D2]">
                  {signInMethod === 'password'
                    ? 'Enter your credentials to access your workspaces & pipelines'
                    : 'Zero-trust login: We will send a 6-digit code directly to your email'}
                </p>
              </div>

              {/* Sign In Method Toggle: Password vs Email Code */}
              <div className="flex items-center justify-center gap-1.5 p-1 bg-[#0D1612] rounded-xl border border-[#E5D9C8]/10 mb-4 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setSignInMethod('password');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    signInMethod === 'password'
                      ? 'bg-[#192821] text-[#FAF8F5] shadow-xs font-semibold'
                      : 'text-[#84968C] hover:text-[#FAF8F5]'
                  }`}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSignInMethod('otp');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    signInMethod === 'otp'
                      ? 'bg-[#059669] text-[#FAF8F5] shadow-xs font-semibold'
                      : 'text-[#84968C] hover:text-[#FAF8F5]'
                  }`}
                >
                  ⚡ One-Time Code (OTP)
                </button>
              </div>

              {signInMethod === 'password' ? (
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#CFD8D2]">
                        Work Email Address <span className="text-[#E34234]">*</span>
                      </label>
                      {emailStatus === 'checking' ? (
                        <span className="text-[10px] font-mono text-[#84968C] animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full border border-emerald-400 border-t-transparent animate-spin" />
                          Checking account...
                        </span>
                      ) : emailStatus === 'old_user' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 animate-in fade-in">
                          <span>●</span> Old User (Verified)
                        </span>
                      ) : emailStatus === 'new_user' ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold flex items-center gap-1 animate-in fade-in">
                          <span>○</span> New User (Unregistered)
                        </span>
                      ) : emailValidation && emailValidation.valid ? (
                        <span className="text-[10px] font-mono text-[#10B981] font-semibold">
                          ✓ Verified Domain
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      style={{ fontSize: '16px' }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border text-[#FAF8F5] placeholder-[#76887E] focus:outline-none transition-all ${
                        emailStatus === 'old_user'
                          ? 'border-[#059669]/70 focus:ring-2 focus:ring-[#059669]'
                          : emailStatus === 'new_user'
                          ? 'border-sky-500/60 focus:ring-2 focus:ring-sky-500'
                          : 'border-[#E5D9C8]/20 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    {emailStatus === 'new_user' && (
                      <div className="mt-1.5 p-2 rounded-xl bg-sky-500/12 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between animate-in fade-in">
                        <span className="text-[11px] leading-tight">No account found for this email yet.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('signup');
                            setErrorMessage(null);
                          }}
                          className="text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-500 px-2.5 py-0.5 rounded-md cursor-pointer transition-colors shrink-0"
                        >
                          Create Account →
                        </button>
                      </div>
                    )}
                    {emailStatus === 'old_user' && (
                      <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                        ✓ Welcome back{detectedUserName ? `, ${detectedUserName}` : ''}! Enter your password below.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#CFD8D2]">
                        Password <span className="text-[#E34234]">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setMode('forgot-password');
                          setErrorMessage(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] text-[#E34234] hover:text-[#FF6655] cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
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
                  </div>

                  {requiresMfa && (
                    <div className="p-3 bg-[#0A110E] border border-[#059669]/40 rounded-xl space-y-1.5 animate-in fade-in">
                      <label className="block text-xs font-medium text-[#34D399]">
                        Authenticator 6-Digit Code (2FA) <span className="text-[#E34234]">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={totpToken}
                        onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2 rounded-xl bg-[#0D1612] border border-[#059669]/60 font-mono text-center tracking-widest text-[#FAF8F5] text-base focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-2 text-[#CFD8D2] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-[#059669] bg-[#0D1612] border-[#E5D9C8]/30"
                      />
                      <span>Remember session for 30 days</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#E34234] to-[#C1271B] hover:from-[#C1271B] hover:to-[#961D14] text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-red-950/60 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <span>Sign in with Password →</span>
                    )}
                  </button>
                </form>
              ) : (
                /* One-Time Code Sign In Form */
                <form onSubmit={handleInitiateOtpLogin} className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[#CFD8D2]">
                        Registered Work Email Address <span className="text-[#E34234]">*</span>
                      </label>
                      {emailStatus === 'checking' ? (
                        <span className="text-[10px] font-mono text-[#84968C] animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full border border-emerald-400 border-t-transparent animate-spin" />
                          Checking...
                        </span>
                      ) : emailStatus === 'old_user' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 animate-in fade-in">
                          <span>●</span> Old User (Verified)
                        </span>
                      ) : emailStatus === 'new_user' ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold flex items-center gap-1 animate-in fade-in">
                          <span>○</span> New User (Unregistered)
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      style={{ fontSize: '16px' }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border text-[#FAF8F5] placeholder-[#76887E] focus:outline-none transition-all ${
                        emailStatus === 'old_user'
                          ? 'border-[#059669]/70 focus:ring-2 focus:ring-[#059669]'
                          : emailStatus === 'new_user'
                          ? 'border-sky-500/60 focus:ring-2 focus:ring-sky-500'
                          : 'border-[#E5D9C8]/20 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    {emailStatus === 'new_user' && (
                      <div className="mt-1.5 p-2 rounded-xl bg-sky-500/12 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between animate-in fade-in">
                        <span className="text-[11px] leading-tight">No account found for this email yet.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('signup');
                            setErrorMessage(null);
                          }}
                          className="text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-500 px-2.5 py-0.5 rounded-md cursor-pointer transition-colors shrink-0"
                        >
                          Create Account →
                        </button>
                      </div>
                    )}
                    {emailStatus === 'old_user' ? (
                      <p className="mt-1.5 text-[11px] text-emerald-400 font-medium">
                        ✓ Registered email verified{detectedUserName ? ` for ${detectedUserName}` : ''}. We will dispatch a 6-digit code.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-[#84968C] leading-snug">
                        We will dispatch a 6-digit verification code to this address. No password required.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#022C22] text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                        <span>Dispatching secure code...</span>
                      </>
                    ) : (
                      <span>Send 6-Digit Login Code →</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: SIGN UP MODE (STEP 1: DETAILS)                   */}
          {/* ======================================================== */}
          {mode === 'signup' && (
            <div>
              <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FAF8F5]">
                  Create Your Account
                </h2>
                <p className="mt-1 text-xs text-[#CFD8D2]">
                  Join Lumetric Studio with zero-trust email verification
                </p>
              </div>

              <form onSubmit={handleInitiateSignup} className="space-y-3.5">
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#CFD8D2]">
                      Work Email Address <span className="text-[#E34234]">*</span>
                    </label>
                    {emailStatus === 'checking' ? (
                      <span className="text-[10px] font-mono text-[#84968C] animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full border border-emerald-400 border-t-transparent animate-spin" />
                        Checking account...
                      </span>
                    ) : emailStatus === 'old_user' || isUserExistsError ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
                        <span>🔒</span> Old User (Already Registered)
                      </span>
                    ) : emailStatus === 'new_user' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 animate-in fade-in">
                        <span>✓</span> New User (Available)
                      </span>
                    ) : emailValidation && emailValidation.valid ? (
                      <span className="text-[10px] font-mono text-[#10B981] font-semibold">
                        ✓ Verified Domain
                      </span>
                    ) : null}
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    style={{ fontSize: '16px' }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border text-[#FAF8F5] placeholder-[#76887E] focus:outline-none transition-all ${
                      emailStatus === 'old_user' || isUserExistsError
                        ? 'border-amber-500/80 focus:ring-2 focus:ring-amber-500'
                        : emailStatus === 'new_user'
                        ? 'border-[#059669]/70 focus:ring-2 focus:ring-[#059669]'
                        : emailValidation && !emailValidation.valid
                        ? 'border-[#E34234]/70 focus:ring-2 focus:ring-[#E34234]'
                        : 'border-[#E5D9C8]/20 focus:ring-2 focus:ring-[#059669]'
                    }`}
                  />
                  {emailStatus === 'old_user' || isUserExistsError ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex flex-col gap-2 animate-in fade-in">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold">⚠️ Old User Account Detected:</span>
                        <span className="text-white font-medium">An account already exists for this email!</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-snug">
                        Once an account is created, you cannot use this email to create another account. Please sign in instead.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setIsUserExistsError(false);
                          setErrorMessage(null);
                          setSuccessMessage(`Welcome back${detectedUserName ? ', ' + detectedUserName : ''}! Sign in with your registered email.`);
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <span>Switch to Sign In (Old User) →</span>
                      </button>
                    </div>
                  ) : emailStatus === 'new_user' ? (
                    <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                      ✓ New user email verified. Set your password and details below to create your account.
                    </p>
                  ) : emailValidation && !emailValidation.valid ? (
                    <p className="mt-1 text-[11px] text-[#FF8577]">
                      {emailValidation.message}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                    Password <span className="text-[#E34234]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      style={{ fontSize: '16px' }}
                      className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#0D1612] border text-[#FAF8F5] placeholder-[#76887E] focus:outline-none transition-all ${
                        isPasswordTouched && !isPasswordValid
                          ? 'border-[#E34234]/70 focus:ring-2 focus:ring-[#E34234]'
                          : isPasswordTouched && isPasswordValid
                          ? 'border-[#059669]/70 focus:ring-2 focus:ring-[#059669]'
                          : 'border-[#E5D9C8]/20 focus:ring-2 focus:ring-[#059669]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84968C] hover:text-[#FAF8F5] text-xs cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {isPasswordTouched && !isPasswordValid ? (
                    <p className="mt-1 text-[11px] text-[#FF8577]">
                      Password must be at least 8 characters and contain a letter &amp; number/symbol.
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#84968C]">
                      Min. 8 characters with at least one letter and one number or symbol.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                    Data Science &amp; Engineering Role
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
                    Organization / Company
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
                    I agree to the Data Governance, Privacy &amp; Anti-Hijacking security policies.
                  </label>
                </div>

                {isUserExistsError || emailStatus === 'old_user' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setIsUserExistsError(false);
                      setErrorMessage(null);
                      setSuccessMessage(`Welcome back${detectedUserName ? ', ' + detectedUserName : ''}! Sign in to access your account for ${email}.`);
                    }}
                    className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-amber-950/60 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚠️ Old User: Click to Sign In Instead →</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || isCheckingEmail}
                    className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#022C22] text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading || isCheckingEmail ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                        <span>{isCheckingEmail ? 'Checking user status...' : 'Dispatching verification code...'}</span>
                      </>
                    ) : (
                      <span>Send 6-Digit Verification Code →</span>
                    )}
                  </button>
                )}
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: 6-DIGIT OTP VERIFICATION SCREEN (UNIVERSAL)      */}
          {/* ======================================================== */}
          {mode === 'otp-verify' && (
            <div className="animate-in fade-in duration-200">
              {/* Shield Icon & Heading */}
              <div className="text-center mb-5">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#059669]/15 border border-[#059669]/40 flex items-center justify-center text-[#10B981] shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FAF8F5]">
                  {otpPurpose === 'signup'
                    ? 'Verify Your Email'
                    : otpPurpose === 'reset-password'
                    ? 'Verify Password Reset'
                    : 'Enter Sign-In Code'}
                </h2>
                <p className="mt-1.5 text-xs text-[#CFD8D2]">
                  We sent a 6-digit verification code to:
                </p>
                <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 bg-[#0A110E] border border-[#E5D9C8]/15 rounded-full">
                  <span className="font-mono text-xs text-[#10B981] font-semibold">
                    {otpPurpose === 'reset-password' ? resetEmail || email : email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(otpPurpose === 'reset-password' ? 'forgot-password' : otpPurpose === 'signup' ? 'signup' : 'signin');
                      setErrorMessage(null);
                    }}
                    className="text-[10px] text-[#84968C] hover:text-[#FAF8F5] underline ml-1 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* 6-Digit Monospace Input Grid */}
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-3">
                  {otpDigits.map((digit, idx) => (
                    <React.Fragment key={idx}>
                      {idx === 3 && (
                        <span className="text-[#84968C] font-bold text-lg select-none">-</span>
                      )}
                      <input
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        style={{ fontSize: '20px' }}
                        className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-bold rounded-xl bg-[#0D1612] border text-[#FAF8F5] focus:outline-none transition-all ${
                          digit
                            ? 'border-[#059669] bg-[#059669]/10 text-[#34D399] shadow-sm shadow-emerald-950/40'
                            : 'border-[#E5D9C8]/25 hover:border-[#E5D9C8]/40 focus:border-[#059669] focus:ring-2 focus:ring-[#059669]'
                        }`}
                      />
                    </React.Fragment>
                  ))}
                </div>

                {/* Meta-style Quick Paste Pill */}
                <div className="flex justify-center -mt-1 mb-2">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-[#161B22] hover:bg-[#21262D] text-[#8B949E] hover:text-[#E6EDF3] border border-[#30363D] transition-colors cursor-pointer shadow-xs"
                    title="Paste 6-digit code from clipboard"
                  >
                    <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Paste code from clipboard</span>
                  </button>
                </div>

                {/* Additional New Password input if resetting password */}
                {otpPurpose === 'reset-password' && (
                  <div className="p-3 bg-[#0A110E] border border-[#E5D9C8]/15 rounded-2xl space-y-2.5 mt-2">
                    <span className="text-xs font-semibold text-[#FAF8F5] block">Set New Password</span>
                    <div>
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        placeholder="New Password (min. 8 chars)"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        style={{ fontSize: '16px' }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669] text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        placeholder="Confirm New Password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        style={{ fontSize: '16px' }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669] text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Resend Timer & Link */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#84968C]">
                    Expires in <span className="font-mono text-[#CFD8D2]">10:00</span>
                  </span>
                  {resendCooldown > 0 ? (
                    <span className="text-[#84968C] font-mono text-[11px]">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtpForPurpose(
                        otpPurpose === 'reset-password' ? resetEmail || email : email,
                        otpPurpose,
                        'A fresh 6-digit verification code has been dispatched.'
                      )}
                      className="text-xs text-[#10B981] hover:text-[#34D399] font-medium cursor-pointer"
                    >
                      Resend Verification Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || currentOtpString.length !== 6}
                  className="w-full mt-3 h-11 rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#022C22] text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>
                      {otpPurpose === 'signup'
                        ? 'Verify Code & Complete Registration →'
                        : otpPurpose === 'reset-password'
                        ? 'Reset Password & Launch Studio →'
                        : 'Verify & Launch Studio →'}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode(otpPurpose === 'reset-password' ? 'forgot-password' : otpPurpose === 'signup' ? 'signup' : 'signin');
                    setErrorMessage(null);
                  }}
                  className="w-full text-center text-xs text-[#84968C] hover:text-[#FAF8F5] py-1 cursor-pointer transition-colors"
                >
                  ← Back to credentials
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: FORGOT PASSWORD FLOW                             */}
          {/* ======================================================== */}
          {mode === 'forgot-password' && (
            <div className="animate-in fade-in">
              <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#FAF8F5]">
                  Reset Account Password
                </h2>
                <p className="mt-1 text-xs text-[#CFD8D2]">
                  We will send a 6-digit recovery code to verify your identity.
                </p>
              </div>

              <form onSubmit={handleInitiateForgotPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#CFD8D2] mb-1">
                    Your Registered Work Email <span className="text-[#E34234]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    style={{ fontSize: '16px' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1612] border border-[#E5D9C8]/20 text-[#FAF8F5] placeholder-[#76887E] focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-[#059669] to-[#047857] hover:from-[#047857] hover:to-[#022C22] text-[#FAF8F5] font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#FAF8F5]/30 border-t-[#FAF8F5] rounded-full animate-spin" />
                      <span>Sending recovery code...</span>
                    </>
                  ) : (
                    <span>Send 6-Digit Recovery Code →</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className="w-full text-center text-xs text-[#84968C] hover:text-[#FAF8F5] py-1 cursor-pointer transition-colors"
                >
                  ← Return to Sign In
                </button>
              </form>
            </div>
          )}

          {/* Security & Data Governance Footer */}
          <div className="mt-5 pt-3.5 border-t border-[#E5D9C8]/15 flex items-center justify-between text-[11px] text-[#CFD8D2]">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Zero-Trust OTP • Anti-Hijack Guard</span>
            </div>
            <span className="font-mono text-[#84968C] text-[10px]">Private Vault Architecture</span>
          </div>
        </div>
      </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 cursor-pointer" onClick={onClose} />
        {authCard}
      </div>
    );
  }

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
            <span className="text-[10px] text-[#10B981] font-mono tracking-wider uppercase font-semibold">Data &amp; Decision Studio</span>
          </div>
        </div>

        {/* Server & Security Status */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-[#10B981]' : 'bg-[#D97706] animate-pulse'}`} />
          <span className="text-[11px] text-[#84968C] font-mono">
            {serverStatus === 'connected' ? (serverLatency ? `${serverLatency}ms` : 'Cloud Active') : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="w-full max-w-md mx-auto my-auto py-2 z-10">
        {authCard}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center py-2 text-[11px] text-[#84968C] z-10">
        <span>Lumetric AI Data &amp; Decision Studio • Powered by Zoho Catalyst Cloud</span>
      </footer>
    </div>
  );
}
