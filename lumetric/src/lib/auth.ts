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
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error connecting to Catalyst Server'
      };
    }
  }

  public static async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await fetch(`${CATALYST_SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data: AuthResponse = await res.json();
      if (data.success && data.token && data.user) {
        this.setSession(data.token, data.user);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error connecting to Catalyst Server'
      };
    }
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
}
