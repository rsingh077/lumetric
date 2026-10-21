/**
 * Lumetric Server Authentication & Profile Client SDK
 * Direct connection to Zoho Catalyst Serverless Function (lumetric_server)
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'administrator' | 'builder' | 'reviewer' | 'viewer';
  organization?: string;
  avatarUrl?: string;
  mfaEnabled?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  settings?: {
    theme?: string;
    currency?: string;
    emailNotifications?: boolean;
    hapticsEnabled?: boolean;
  };
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  error?: string;
  retryAfterSeconds?: number;
}

export interface EmailValidationResult {
  valid: boolean;
  message?: string;
  domain?: string;
}

// Blocklists for suspicious, disposable, and placeholder email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
  'guerrillamail.com', 'throwawaymail.com', 'yopmail.com', 'sharklasers.com',
  'dispostable.com', 'getairmail.com', 'trashmail.com', 'fakeinbox.com',
  'maildrop.cc', 'inboxkitten.com', 'nada.ltd', 'mohmal.com', 'mytemp.email',
  'burnermail.io', 'crazymailing.com', 'tempail.com', 'emailondeck.com',
  'fakemailgenerator.com', 'dropmail.me', 'disposablemail.com', 'trashmail.net'
]);

const PLACEHOLDER_EMAIL_DOMAINS = new Set([
  'test.com', 'example.com', 'sample.com', 'demo.com', 'fake.com', 'dummy.com', 'asdf.com'
]);

/**
 * Validates genuine email authenticity, domain structure, and rejects vague numeric domains (like 12.com)
 */
export function validateEmailAuthenticity(email: string): EmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Work email address is required.' };
  }

  const trimmed = email.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { valid: false, message: 'Work email address is required.' };
  }
  if (trimmed.length > 254) {
    return { valid: false, message: 'Email address exceeds maximum permitted length (254 characters).' };
  }

  // Exactly one @ separator
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, message: 'Email must follow the format name@domain.com with a valid username and domain.' };
  }

  const [localPart, domainPart] = parts;

  // Local part syntax
  if (localPart.length > 64) {
    return { valid: false, message: 'Email username cannot exceed 64 characters.' };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, message: 'Email username cannot start or end with a period.' };
  }
  if (localPart.includes('..')) {
    return { valid: false, message: 'Email username cannot contain consecutive periods.' };
  }
  const localRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localRegex.test(localPart)) {
    return { valid: false, message: 'Email username contains invalid characters.' };
  }

  // Domain syntax
  if (!domainPart.includes('.')) {
    return { valid: false, message: 'Email domain must include a top-level extension (e.g. .com, .org, .io).' };
  }
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return { valid: false, message: 'Email domain cannot start or end with a period.' };
  }
  if (domainPart.includes('..')) {
    return { valid: false, message: 'Email domain cannot contain consecutive periods.' };
  }

  const labels = domainPart.split('.');
  const tld = labels[labels.length - 1];

  // Top-Level Domain (TLD) must be strictly letters and at least 2 chars
  if (!/^[a-zA-Z]{2,24}$/.test(tld)) {
    return {
      valid: false,
      message: `Invalid domain extension ".${tld}". Top-level domain must contain at least 2 letters and no numbers.`
    };
  }

  const reservedTlds = new Set(['test', 'example', 'invalid', 'localhost']);
  if (reservedTlds.has(tld)) {
    return { valid: false, message: `".${tld}" is a reserved non-routable extension. Please use an active email provider.` };
  }

  // Validate each domain segment
  for (let i = 0; i < labels.length - 1; i++) {
    const label = labels[i];
    if (!label) {
      return { valid: false, message: 'Email domain contains an empty segment.' };
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return { valid: false, message: `Domain label "${label}" cannot start or end with a hyphen.` };
    }
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return { valid: false, message: `Domain label "${label}" contains invalid characters.` };
    }
  }

  // Reject purely numeric domain names (e.g., 12.com or 123.456)
  const nonTldLabels = labels.slice(0, -1);
  const mainDomain = nonTldLabels[nonTldLabels.length - 1];
  if (/^\d+$/.test(mainDomain)) {
    return {
      valid: false,
      message: `Invalid domain "${domainPart}". Email domain cannot be purely numbers (e.g. 12.com is not allowed). Please use your genuine work or personal email.`
    };
  }

  if (!/[a-zA-Z]/.test(nonTldLabels.join(''))) {
    return {
      valid: false,
      message: `Invalid domain "${domainPart}". Email domain name must contain letters.`
    };
  }

  // Disposable email check
  if (DISPOSABLE_EMAIL_DOMAINS.has(domainPart)) {
    return {
      valid: false,
      message: `Temporary/disposable email domain "${domainPart}" is not permitted. Please use your genuine work or personal email address.`
    };
  }

  // Placeholder check
  if (PLACEHOLDER_EMAIL_DOMAINS.has(domainPart)) {
    return {
      valid: false,
      message: `"${domainPart}" is a placeholder domain. Please enter a genuine active email address.`
    };
  }

  return { valid: true, domain: domainPart };
}

const CATALYST_SERVER_URL = 'https://project-rainfall-60092395179.development.catalystserverless.in/server/lumetric_server';

const TOKEN_STORAGE_KEY = 'lumetric_auth_token';
const USER_STORAGE_KEY = 'lumetric_auth_user';

export class LumetricAuthService {
  private static getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  public static getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(USER_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public static setSession(token: string, user: AuthUser) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  public static clearSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  public static getServerUrl(): string {
    return CATALYST_SERVER_URL;
  }

  public static async checkHealth(): Promise<{
    connected: boolean;
    latencyMs: number;
    data?: any;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(`${CATALYST_SERVER_URL}/api/health`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        return { connected: true, latencyMs, data };
      } else {
        return { connected: false, latencyMs, error: `HTTP ${res.status}` };
      }
    } catch (err: any) {
      return {
        connected: false,
        latencyMs: Date.now() - start,
        error: err.name === 'AbortError' ? 'Connection timed out' : err.message || 'Cannot reach server'
      };
    }
  }

  public static async register(payload: {
    email: string;
    password: string;
    name: string;
    organization?: string;
    role?: string;
  }): Promise<AuthResponse> {
    const cleanPayload = {
      ...payload,
      email: (payload.email || '').trim().toLowerCase(),
      name: (payload.name || '').trim(),
      organization: (payload.organization || 'Enterprise Data Lab').trim(),
      role: payload.role || 'builder'
    };

    const emailCheck = validateEmailAuthenticity(cleanPayload.email);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.message };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let data: AuthResponse;
      try {
        data = await res.json();
      } catch {
        data = {
          success: res.ok,
          error: `Server status ${res.status}`
        };
      }

      if (data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError'
          ? 'Server connection timed out. Please check your network connection.'
          : err.message || 'Cannot reach Zoho Catalyst Cloud server.'
      };
    }
  }

  public static async login(payload: { email: string; password: string; totpToken?: string }): Promise<AuthResponse> {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    const emailCheck = validateEmailAuthenticity(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.message };
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: payload.password,
          totpToken: payload.totpToken ? payload.totpToken.trim() : undefined
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let data: AuthResponse;
      try {
        data = await res.json();
      } catch {
        data = {
          success: res.ok,
          error: `Server status ${res.status}`
        };
      }

      if (data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Connection timed out.' : err.message || 'Network error connecting to server'
      };
    }
  }

  public static async loginWithGoogle(payload: {
    email: string;
    name?: string;
    avatarUrl?: string;
    googleId?: string;
    credential?: string;
    accessToken?: string;
  }): Promise<AuthResponse> {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    const emailCheck = validateEmailAuthenticity(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.message };
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, email: cleanEmail }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      let data: AuthResponse;
      try {
        data = await res.json();
      } catch {
        data = {
          success: res.ok,
          error: `Server status ${res.status}`
        };
      }

      if (data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.name === 'AbortError'
          ? 'Google authentication timed out. Please try again.'
          : err.message || 'Cannot reach Zoho Catalyst Cloud server for Google Auth.'
      };
    }
  }

  /**
   * Opens the genuine Google Account Chooser popup window (centered 500x620)
   * Listens for account selection and automatically logs in / registers with Catalyst Cloud
   */
  public static openGooglePopup(hintEmail?: string): Promise<AuthResponse> {
    if (typeof window === 'undefined') {
      return Promise.resolve({ success: false, error: 'Window environment not available.' });
    }

    return new Promise((resolve) => {
      const width = 500;
      const height = 620;
      const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
      const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
      const screenWidth = window.innerWidth || document.documentElement.clientWidth || screen.width;
      const screenHeight = window.innerHeight || document.documentElement.clientHeight || screen.height;

      const left = Math.max(0, Math.floor((screenWidth - width) / 2 + dualScreenLeft));
      const top = Math.max(0, Math.floor((screenHeight - height) / 2 + dualScreenTop));

      const origin = window.location.origin;
      const isAppPath = window.location.pathname.startsWith('/app');
      const basePath = isAppPath ? `${origin}/app` : origin;
      const params = new URLSearchParams();
      if (hintEmail) params.set('email', hintEmail);
      params.set('origin', origin);

      const popupUrl = `${basePath}/google-auth.html?${params.toString()}`;

      let popupWindow: Window | null = null;
      try {
        popupWindow = window.open(
          popupUrl,
          'GoogleAccountChooser',
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=no,toolbar=no,menubar=no,location=no`
        );
      } catch (e: any) {
        console.warn('Popup open exception:', e);
      }

      if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
        resolve({
          success: false,
          error: 'POPUP_BLOCKED',
          message: 'The Google Sign-In popup was blocked by your browser. Please allow popups for this site, or use the direct link below.'
        });
        return;
      }

      try {
        if (popupWindow.focus) popupWindow.focus();
      } catch {
        // ignore
      }

      let isResolved = false;

      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        if (checkClosedInterval) clearInterval(checkClosedInterval);
      };

      const handleMessage = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'LUMETRIC_GOOGLE_AUTH_SUCCESS' && event.data.payload) {
          if (isResolved) return;
          isResolved = true;
          cleanup();

          const payload = event.data.payload;
          try {
            const authResult = await LumetricAuthService.loginWithGoogle(payload);
            resolve(authResult);
          } catch (err: any) {
            resolve({
              success: false,
              error: err.message || 'Failed to authenticate Google account with Catalyst server.'
            });
          }
        } else if (event.data && event.data.type === 'LUMETRIC_GOOGLE_AUTH_CANCEL') {
          if (isResolved) return;
          isResolved = true;
          cleanup();
          resolve({ success: false, error: 'WINDOW_CLOSED', message: 'Google sign-in was cancelled.' });
        }
      };

      window.addEventListener('message', handleMessage);

      const checkClosedInterval = setInterval(() => {
        try {
          if (popupWindow && popupWindow.closed) {
            if (!isResolved) {
              isResolved = true;
              cleanup();
              resolve({
                success: false,
                error: 'WINDOW_CLOSED',
                message: 'Google Sign-In window was closed before completing authentication.'
              });
            }
          }
        } catch {
          // ignore cross-origin errors
        }
      }, 700);

      // Auto-timeout after 5 minutes
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve({
            success: false,
            error: 'Google Sign-In session timed out. Please try again.'
          });
        }
      }, 5 * 60 * 1000);
    });
  }

  public static async checkDataStoreStatus(): Promise<{
    success: boolean;
    connected: boolean;
    tableExists: boolean;
    tables?: string[];
    totalTables?: number;
    error?: string;
  }> {
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/datastore/status`);
      return await res.json();
    } catch (err: any) {
      return { success: false, connected: false, tableExists: false, error: err.message };
    }
  }

  public static getAuthHeaders(token?: string | null): Record<string, string> {
    const activeToken = token || this.getStoredToken();
    if (!activeToken) return {};
    return {
      'x-auth-token': activeToken,
      'x-access-token': activeToken
    };
  }

  public static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return Boolean(token && user && user.email);
  }

  public static async logout(): Promise<void> {
    const token = this.getStoredToken();
    if (token) {
      try {
        await fetch(`${CATALYST_SERVER_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(token)
          }
        });
      } catch (e) {
        console.warn('Logout notification error:', e);
      }
    }
    this.clearSession();
  }

  public static async fetchProfile(): Promise<AuthResponse> {
    const token = this.getStoredToken();
    if (!token) {
      return { success: false, error: 'No active session' };
    }

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/user/profile`, {
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch profile' };
    }
  }

  public static async updateProfile(payload: {
    name?: string;
    organization?: string;
    avatarUrl?: string;
    settings?: Record<string, any>;
  }): Promise<AuthResponse> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify(payload)
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  }

  public static async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to change password' };
    }
  }

  public static async fetchWorkspaceUsers(): Promise<{ success: boolean; users?: AuthUser[]; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/admin/users`, {
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch users list' };
    }
  }

  public static async setup2FA(): Promise<{ success: boolean; secret?: string; qrCodeDataUrl?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup 2FA' };
    }
  }

  public static async verify2FA(totpToken: string, secret?: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify({ token: totpToken, secret })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify 2FA' };
    }
  }

  public static async disable2FA(payload: { password?: string; token?: string }): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disable 2FA' };
    }
  }

  public static async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message?: string;
    resetOtp?: string;
    emailDispatched?: boolean;
    deliveryChannel?: string;
    recipient?: string;
    emailPreview?: {
      subject: string;
      html: string;
      text: string;
    };
    error?: string;
  }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const emailCheck = validateEmailAuthenticity(cleanEmail);
    if (!emailCheck.valid) {
      return { success: false, error: emailCheck.message };
    }

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to request password reset' };
    }
  }

  public static async resetPassword(payload: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email.trim().toLowerCase(),
          otp: payload.otp.trim(),
          newPassword: payload.newPassword
        })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reset password' };
    }
  }

  public static async fetchAuditLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/audit/logs`, {
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch audit logs' };
    }
  }

  public static async fetchConnectors(): Promise<{ success: boolean; connectors?: any[]; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/connectors`, {
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch connectors' };
    }
  }

  public static async syncConnector(id: string): Promise<{ success: boolean; message?: string; connector?: any; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/connectors/sync/${id}`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to sync connector' };
    }
  }

  public static async updateUserRole(targetEmail: string, newRole: string): Promise<AuthResponse> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/admin/users/role-grant/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify({ targetEmail, newRole })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update role' };
    }
  }

  public static async fetchDataIntelligence(): Promise<any> {
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/data/intelligence/live`, { cache: 'no-store' });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch data intelligence' };
    }
  }

  public static async submitDocumentTreatment(payload: { docId?: string; treatmentType?: string; documentName?: string }): Promise<any> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/documents/treatment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit document treatment' };
    }
  }

  public static async fetchGovernedRecords(): Promise<any> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/data/records`, {
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch governed records' };
    }
  }

  public static async fetchWorkspaceData(): Promise<{ success: boolean; workspaceData?: any; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/user/workspace-data`, {
        headers: {
          ...this.getAuthHeaders(token)
        }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch workspace data' };
    }
  }

  public static async saveWorkspaceData(workspaceData: any): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/user/workspace-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(token)
        },
        body: JSON.stringify({ workspaceData })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save workspace data' };
    }
  }
}

