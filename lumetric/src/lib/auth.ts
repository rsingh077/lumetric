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
      organization: (payload.organization || 'Enterprise Fleet').trim(),
      role: payload.role || 'builder'
    };

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
      // Offline fallback: if network is down or timed out, allow local creation
      const isNetworkIssue = err.name === 'AbortError' || (typeof navigator !== 'undefined' && !navigator.onLine);
      if (isNetworkIssue) {
        const localUser: AuthUser = {
          id: `usr_local_${Date.now()}`,
          email: cleanPayload.email,
          name: cleanPayload.name || 'Executive User',
          role: (cleanPayload.role as any) || 'owner',
          organization: cleanPayload.organization,
          createdAt: new Date().toISOString()
        };
        const localToken = `local_token_${Date.now()}`;
        this.setSession(localToken, localUser);
        return {
          success: true,
          message: 'Mode hors ligne : Profil créé localement.',
          token: localToken,
          user: localUser
        };
      }
      return {
        success: false,
        error: err.name === 'AbortError' ? 'Délai d’attente serveur dépassé. Réessayez.' : err.message || 'Erreur réseau vers le serveur Catalyst'
      };
    }
  }

  public static async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: payload.password }),
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
        error: err.name === 'AbortError' ? 'Délai de connexion dépassé.' : err.message || 'Erreur réseau vers le serveur'
      };
    }
  }

  public static async loginWithGoogle(payload: {
    email: string;
    name?: string;
    avatarUrl?: string;
    googleId?: string;
  }): Promise<AuthResponse> {
    const cleanEmail = (payload.email || '').trim().toLowerCase();
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
      // Local fallback for quick Google sign in
      const fallbackUser: AuthUser = {
        id: `usr_google_${Date.now()}`,
        email: cleanEmail,
        name: payload.name || cleanEmail.split('@')[0],
        role: 'owner',
        createdAt: new Date().toISOString()
      };
      const fallbackToken = `token_google_${Date.now()}`;
      this.setSession(fallbackToken, fallbackUser);
      return {
        success: true,
        token: fallbackToken,
        user: fallbackUser
      };
    }
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
            Authorization: `Bearer ${token}`
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
          Authorization: `Bearer ${token}`
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
          Authorization: `Bearer ${token}`
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

  public static async fetchWorkspaceUsers(): Promise<{ success: boolean; users?: AuthUser[]; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`
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
        headers: { Authorization: `Bearer ${token}` }
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to setup 2FA' };
    }
  }

  public static async verify2FA(totpToken: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: totpToken })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to verify 2FA' };
    }
  }

  public static async fetchAuditLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    const token = this.getStoredToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/audit/logs`, {
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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
        headers: { Authorization: `Bearer ${token}` }
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetEmail, newRole })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update role' };
    }
  }

  public static async fetchFleetTelemetry(): Promise<any> {
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/fleet/telemetry/live`, { cache: 'no-store' });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch telemetry' };
    }
  }

  public static async dispatchFleetAlert(payload: { truckId?: string; alertType?: string; message: string; severity?: string }): Promise<any> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/fleet/dispatch/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to dispatch alert' };
    }
  }

  public static async generateDigitalInvoice(payload: { shipmentId?: string; customerName?: string; parcelsCount?: number; distanceKm?: number; amountEur?: number }): Promise<any> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/fleet/invoice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to generate digital invoice' };
    }
  }

  public static async fetchFleetRecords(): Promise<any> {
    const token = this.getStoredToken();
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/fleet/records`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch fleet records' };
    }
  }
}

