/**
 * Lumetric Typed API Client SDK
 * Auto-generated and aligned with OpenAPI 3.0.3 specification (`docs/openapi.yaml`).
 * Connects directly to Zoho Catalyst Serverless API gateway.
 */

import { LumetricAuthService, AuthUser } from './auth';

export const CATALYST_SERVER_URL =
  'https://project-rainfall-60092395179.development.catalystserverless.in/server/lumetric_server';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  [key: string]: any;
}

export interface GatewayStatusResponse {
  status: string;
  service: string;
  cloudProvider: string;
  region: string;
  version: string;
  compliance: string[];
  activeConnectors: number;
  timestamp: string;
  uptime: number;
}

export interface HealthTelemetryResponse {
  status: string;
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  nodeVersion: string;
  totalConnectors: number;
  totalAuditEntries: number;
  totalRegisteredUsers: number;
  catalystTimestamp: number;
}

export interface EmailCheckResult {
  success: boolean;
  exists: boolean;
  userType: 'old_user' | 'new_user';
  isOldUser: boolean;
  isNewUser: boolean;
  name: string | null;
  email: string;
  message: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  category: string;
  details: string;
  timestamp: string;
  sha256Hash: string;
}

export interface AuditLogsResponse extends ApiResponse {
  total: number;
  limit: number;
  headSha256: string;
  logs: AuditLogEntry[];
}

export interface BillingPlanLimits {
  maxDatasets: number | string;
  maxRows: number;
  aiTokensPerDay: number;
  exportFormats: string[];
  teamSeats: number;
  supportSLA: string;
}

export interface BillingPlan {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  badge: string;
  tagline: string;
  priceINR: number;
  priceUSD: number;
  interval: string;
  annualPriceINR?: number;
  annualPriceUSD?: number;
  limits: BillingPlanLimits;
  features: string[];
}

export interface BillingOrderResponse extends ApiResponse {
  orderId: string;
  amount: number;
  currency: string;
  billingCycle: string;
  merchantVpa: string;
  payeeName: string;
  upiDeepLink: string;
  expiresInSeconds: number;
}

export interface TabularRecord {
  id: string;
  accountName: string;
  region: string;
  planTier: string;
  arrUsd: number | string;
  nps: number;
  churnRiskPct: number;
  auditStatus: string;
}

export class LumetricApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${CATALYST_SERVER_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = LumetricAuthService.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({
      success: false,
      error: `HTTP ${res.status}: Failed to parse JSON response`,
    }));

    if (!res.ok && !data.error) {
      data.error = `HTTP error ${res.status}`;
    }

    return data as T;
  }

  // --- Telemetry Endpoints ---
  public static async getGatewayStatus(): Promise<GatewayStatusResponse> {
    return this.request<GatewayStatusResponse>('/');
  }

  public static async getHealth(): Promise<HealthTelemetryResponse> {
    return this.request<HealthTelemetryResponse>('/api/health');
  }

  public static async ping(): Promise<{ status: string; uptime: number }> {
    return this.request('/api/ping');
  }

  // --- Auth & Account Endpoints ---
  public static async checkEmail(email: string): Promise<EmailCheckResult> {
    return this.request<EmailCheckResult>('/api/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public static async sendOtp(payload: {
    email: string;
    purpose?: 'signup' | 'login' | 'reset-password';
    payload?: any;
  }): Promise<ApiResponse> {
    return this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async verifyOtp(payload: {
    email: string;
    otp: string;
    purpose?: 'signup' | 'login' | 'reset-password';
    newPassword?: string;
    payload?: any;
  }): Promise<ApiResponse> {
    return this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async logout(refreshToken?: string): Promise<ApiResponse> {
    return this.request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // --- User Profile & Workspace Data ---
  public static async getProfile(): Promise<{ success: boolean; user: AuthUser }> {
    return this.request('/api/user/profile');
  }

  public static async updateProfile(payload: {
    name?: string;
    organization?: string;
    avatarUrl?: string;
    settings?: any;
  }): Promise<{ success: boolean; user: AuthUser }> {
    return this.request('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  public static async getWorkspaceData(): Promise<{
    success: boolean;
    userEmail: string;
    workspaceData: any;
  }> {
    return this.request('/api/user/workspace-data');
  }

  public static async saveWorkspaceData(workspaceData: any): Promise<ApiResponse> {
    return this.request('/api/user/workspace-data', {
      method: 'POST',
      body: JSON.stringify({ workspaceData }),
    });
  }

  public static async resetWorkspaceData(): Promise<ApiResponse> {
    return this.request('/api/user/workspace-data/reset', {
      method: 'POST',
    });
  }

  // --- Audit Logs ---
  public static async getAuditLogs(params?: {
    limit?: number;
    category?: string;
    actorEmail?: string;
    search?: string;
  }): Promise<AuditLogsResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.category) query.set('category', params.category);
    if (params?.actorEmail) query.set('actorEmail', params.actorEmail);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return this.request(`/api/audit/logs${qs ? `?${qs}` : ''}`);
  }

  // --- Data & Intelligence ---
  public static async getTabularRecords(): Promise<{
    success: boolean;
    userRole: string;
    columnLevelMaskingApplied: boolean;
    totalRecords: number;
    records: TabularRecord[];
  }> {
    return this.request('/api/data/records');
  }

  // --- Billing & Subscriptions ---
  public static async getBillingPlans(): Promise<{
    success: boolean;
    currency: string;
    plans: BillingPlan[];
  }> {
    return this.request('/api/billing/plans');
  }

  public static async getSubscription(email?: string): Promise<ApiResponse> {
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.request(`/api/billing/subscription${qs}`);
  }

  public static async createBillingOrder(payload: {
    planId: string;
    billingCycle?: 'monthly' | 'annual';
    userEmail?: string;
  }): Promise<BillingOrderResponse> {
    return this.request('/api/billing/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async verifyUpiPayment(payload: {
    orderId?: string;
    utrNumber: string;
    planId?: string;
    billingCycle?: 'monthly' | 'annual';
    userEmail?: string;
  }): Promise<ApiResponse> {
    return this.request('/api/billing/verify-upi', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public static async getInvoices(email?: string): Promise<{ success: boolean; invoices: any[] }> {
    const qs = email ? `?email=${encodeURIComponent(email)}` : '';
    return this.request(`/api/billing/invoices${qs}`);
  }
}
