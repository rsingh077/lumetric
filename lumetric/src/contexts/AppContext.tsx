'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, Project, User, UserRole, DatasetProfile, ActiveView, FleetTelemetryData } from '@/types';
import { LumetricAuthService } from '@/lib/auth';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AppContextType {
  // User & Roles
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (authenticated: boolean) => void;
  isSplashLoading: boolean;
  setIsSplashLoading: (loading: boolean) => void;
  
  // Workspaces
  workspaces: Workspace[];
  currentWorkspace: Workspace;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, description?: string) => Workspace;
  
  // Projects
  projects: Project[];
  currentProject: Project | null;
  selectProject: (projectId: string | null) => void;
  createProject: (name: string, objective?: string, description?: string) => Project;
  
  // User's Real Ingested Datasets
  datasets: DatasetProfile[];
  activeDataset: DatasetProfile | null;
  activeRows: Record<string, string>[];
  setActiveDataset: (dataset: DatasetProfile | null, rows?: Record<string, string>[]) => void;
  addDataset: (dataset: DatasetProfile, rows?: Record<string, string>[]) => void;
  deleteDataset: (id: string) => void;
  
  // Navigation / Shell State
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Server Connectivity & Reconnection
  serverStatus: 'connected' | 'connecting' | 'disconnected';
  serverLatency: number | null;
  lastServerSync: string | null;
  serverDetails: any;
  reconnectServer: () => Promise<boolean>;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;

  // Authentication Modal & Profile Controls
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: 'profile' | 'login' | 'register' | 'admin-dashboard';
  openAuthModal: (mode?: 'profile' | 'login' | 'register' | 'admin-dashboard') => void;
  closeAuthModal: () => void;
  logout: () => Promise<void>;
  loginAsDemoRole: (role: UserRole) => void;

  // Fleet Telemetry & Dispatch Automation
  fleetTelemetry: FleetTelemetryData;
  dispatchAlert: (message: string, severity?: string) => Promise<boolean>;
  generateInvoice: (shipmentId?: string, amountEur?: number) => Promise<any>;
}

const defaultUser: User = {
  id: 'usr-demo-001',
  email: 'alex.chen@lumetric.internal',
  name: 'Alex Chen',
  role: 'owner',
  createdAt: '2026-10-15T08:00:00Z',
};

const initialWorkspaces: Workspace[] = [
  {
    id: 'ws-prod-alpha',
    name: 'Lumetric Core Analytics',
    slug: 'core-analytics',
    description: 'Primary studio workspace for exploratory analytics, modeling and reporting',
    ownerId: 'usr-demo-001',
    members: [
      { userId: 'usr-demo-001', role: 'owner', joinedAt: '2026-10-15T08:00:00Z' },
      { userId: 'usr-analyst-002', role: 'builder', joinedAt: '2026-10-15T09:00:00Z' },
      { userId: 'usr-viewer-003', role: 'viewer', joinedAt: '2026-10-16T11:00:00Z' }
    ],
    createdAt: '2026-10-15T08:00:00Z',
    updatedAt: '2026-10-17T09:00:00Z',
  },
  {
    id: 'ws-sandbox-02',
    name: 'Risk & Strategy Sandbox',
    slug: 'risk-strategy',
    description: 'Isolated test bench for stress testing forecasting assumptions and DCF variants',
    ownerId: 'usr-demo-001',
    members: [
      { userId: 'usr-demo-001', role: 'owner', joinedAt: '2026-10-16T10:00:00Z' }
    ],
    createdAt: '2026-10-16T10:00:00Z',
    updatedAt: '2026-10-17T08:30:00Z',
  }
];

const initialProjects: Project[] = [
  {
    id: 'prj-rev-forecast',
    workspaceId: 'ws-prod-alpha',
    name: 'Q4 Enterprise Revenue & Churn Forecast',
    objective: 'Reconcile recurring ARR dynamics, seasonal variance, and deliver rolling 12-month projections',
    description: 'Statistical time-series forecasting combined with customer cohort retention analysis',
    status: 'active',
    createdBy: 'usr-demo-001',
    createdAt: '2026-10-15T09:30:00Z',
    updatedAt: '2026-10-17T09:15:00Z',
  },
  {
    id: 'prj-unit-econ',
    workspaceId: 'ws-prod-alpha',
    name: 'B2B Logistics Unit Economics & Pricing',
    objective: 'Calculate route-level gross margins, spot pricing sensitivity, and break-even elasticity',
    description: 'Preparation pipeline unifying telemetry feeds and invoice line items',
    status: 'active',
    createdBy: 'usr-demo-001',
    createdAt: '2026-10-16T14:00:00Z',
    updatedAt: '2026-10-17T07:20:00Z',
  },
  {
    id: 'prj-dcf-valuation',
    workspaceId: 'ws-sandbox-02',
    name: 'SaaS Expansion DCF Valuation Model',
    objective: 'Model 5-year free cash flows under baseline, bull, and stress macro interest rate scenarios',
    description: 'Valuation with WACC sensitivity table and equity value bridge',
    status: 'draft',
    createdBy: 'usr-demo-001',
    createdAt: '2026-10-16T16:00:00Z',
    updatedAt: '2026-10-17T08:45:00Z',
  }
];

const DEFAULT_INITIAL_ROWS: Record<string, string>[] = [
  { Account_ID: 'ACC-1001', Customer_Name: 'Acme Global Corp', Region: 'North America', Plan_Tier: 'Enterprise', ARR_USD: '145000', NPS_Score: '72', Churn_Probability: '0.04', Active_Users: '142', Contract_Months: '36', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1002', Customer_Name: 'Global Freight Logistics', Region: 'Europe', Plan_Tier: 'Enterprise', ARR_USD: '98000', NPS_Score: '68', Churn_Probability: '0.12', Active_Users: '89', Contract_Months: '24', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1003', Customer_Name: 'Apex Health Systems', Region: 'Asia Pacific', Plan_Tier: 'Growth', ARR_USD: '45000', NPS_Score: '81', Churn_Probability: '0.02', Active_Users: '45', Contract_Months: '12', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1004', Customer_Name: 'Zenith Digital Media', Region: 'North America', Plan_Tier: 'Standard', ARR_USD: '18500', NPS_Score: '54', Churn_Probability: '0.38', Active_Users: '19', Contract_Months: '12', Last_Audit_Status: 'Flagged' },
  { Account_ID: 'ACC-1005', Customer_Name: 'Starlight Omnichannel', Region: 'Latin America', Plan_Tier: 'Growth', ARR_USD: '52000', NPS_Score: '61', Churn_Probability: '0.18', Active_Users: '52', Contract_Months: '24', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1006', Customer_Name: 'Nova Autonomous Robotics', Region: 'Europe', Plan_Tier: 'Enterprise', ARR_USD: '210000', NPS_Score: '89', Churn_Probability: '0.01', Active_Users: '215', Contract_Months: '36', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1007', Customer_Name: 'Pinnacle Capital FinTech', Region: 'North America', Plan_Tier: 'Enterprise', ARR_USD: '320000', NPS_Score: '92', Churn_Probability: '0.02', Active_Users: '340', Contract_Months: '36', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1008', Customer_Name: 'Crestview Predictive Analytics', Region: 'Asia Pacific', Plan_Tier: 'Standard', ARR_USD: '12000', NPS_Score: '42', Churn_Probability: '0.45', Active_Users: '11', Contract_Months: '12', Last_Audit_Status: 'Quarantine' },
  { Account_ID: 'ACC-1009', Customer_Name: 'Horizon Next Telecom', Region: 'Europe', Plan_Tier: 'Growth', ARR_USD: '64000', NPS_Score: '75', Churn_Probability: '0.08', Active_Users: '68', Contract_Months: '24', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1010', Customer_Name: 'Vanguard Freight Networks', Region: 'North America', Plan_Tier: 'Enterprise', ARR_USD: '175000', NPS_Score: '84', Churn_Probability: '0.03', Active_Users: '165', Contract_Months: '36', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1011', Customer_Name: 'BioGen Therapeutics', Region: 'North America', Plan_Tier: 'Growth', ARR_USD: '78000', NPS_Score: '79', Churn_Probability: '0.06', Active_Users: '80', Contract_Months: '24', Last_Audit_Status: 'Verified' },
  { Account_ID: 'ACC-1012', Customer_Name: 'Quantum Dynamics Retail', Region: 'Europe', Plan_Tier: 'Standard', ARR_USD: '22000', NPS_Score: '58', Churn_Probability: '0.25', Active_Users: '24', Contract_Months: '12', Last_Audit_Status: 'Verified' },
];

const DEFAULT_INITIAL_DATASET: DatasetProfile = {
  id: 'ds-enterprise-arr-2026',
  fileName: 'b2b_saas_arr_performance.csv',
  fileSize: 4096,
  sha256: 'a98f12c304d9b6e8f41190bcda42118e9a21b8c094ff3123891d4e789bc109ef',
  version: 'v1.0-verified',
  rowCount: 12,
  columnCount: 10,
  uploadedAt: new Date().toISOString(),
  parseWarnings: [],
  status: 'complete',
  quarantinedRowsCount: 0,
  requirements: {
    businessGrain: 'One row per enterprise customer contract',
    primaryKey: 'Account_ID',
    timestampColumn: 'Contract_Months',
    currency: 'USD ($)',
    unitScale: '1.0',
    periodicity: 'Monthly',
    dataClassification: 'Internal Business',
    intendedDecision: 'Analyze enterprise retention and forecast ARR',
  },
  qualityChecks: [
    { rule: 'Primary Key Uniqueness', category: 'Integrity', status: 'passed', details: 'All 12 account IDs unique', quarantinedCount: 0, metricAssertion: 'unique_rate == 1.0' },
    { rule: 'Mandatory Non-Null Constraints', category: 'Completeness', status: 'passed', details: '0 null values detected', quarantinedCount: 0, metricAssertion: 'null_count == 0' },
    { rule: 'Cryptographic SHA-256 Seal', category: 'Integrity', status: 'passed', details: 'Source hash locked to audit ledger', quarantinedCount: 0, metricAssertion: 'sha256_verified == true' },
  ],
  columns: [
    { name: 'Account_ID', inferredType: 'string', semanticRole: 'identifier', totalCount: 12, nullCount: 0, uniqueCount: 12, sampleValues: ['ACC-1001', 'ACC-1002', 'ACC-1003'] },
    { name: 'Customer_Name', inferredType: 'string', semanticRole: 'dimension', totalCount: 12, nullCount: 0, uniqueCount: 12, sampleValues: ['Acme Global Corp', 'Global Freight Logistics', 'Apex Health Systems'] },
    { name: 'Region', inferredType: 'string', semanticRole: 'dimension', totalCount: 12, nullCount: 0, uniqueCount: 4, sampleValues: ['North America', 'Europe', 'Asia Pacific', 'Latin America'] },
    { name: 'Plan_Tier', inferredType: 'string', semanticRole: 'dimension', totalCount: 12, nullCount: 0, uniqueCount: 3, sampleValues: ['Enterprise', 'Growth', 'Standard'] },
    { name: 'ARR_USD', inferredType: 'integer', semanticRole: 'metric', totalCount: 12, nullCount: 0, uniqueCount: 12, min: 12000, max: 320000, mean: 101625, median: 71000, stdDev: 91400, sampleValues: ['145000', '98000', '45000'] },
    { name: 'NPS_Score', inferredType: 'integer', semanticRole: 'metric', totalCount: 12, nullCount: 0, uniqueCount: 12, min: 42, max: 92, mean: 70.8, median: 73.5, stdDev: 14.8, sampleValues: ['72', '68', '81'] },
    { name: 'Churn_Probability', inferredType: 'float', semanticRole: 'metric', totalCount: 12, nullCount: 0, uniqueCount: 12, min: 0.01, max: 0.45, mean: 0.14, median: 0.10, stdDev: 0.13, sampleValues: ['0.04', '0.12', '0.02'] },
    { name: 'Active_Users', inferredType: 'integer', semanticRole: 'metric', totalCount: 12, nullCount: 0, uniqueCount: 12, min: 11, max: 340, mean: 114, median: 74, stdDev: 97.4, sampleValues: ['142', '89', '45'] },
    { name: 'Contract_Months', inferredType: 'integer', semanticRole: 'metric', totalCount: 12, nullCount: 0, uniqueCount: 3, min: 12, max: 36, mean: 24, median: 24, stdDev: 9.8, sampleValues: ['36', '24', '12'] },
    { name: 'Last_Audit_Status', inferredType: 'string', semanticRole: 'dimension', totalCount: 12, nullCount: 0, uniqueCount: 3, sampleValues: ['Verified', 'Flagged', 'Quarantine'] },
  ]
};

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Studio Engine Online',
    message: 'Local analytical runner active. Ready to ingest and process your datasets.',
    timestamp: 'Just now',
    read: false,
    type: 'success',
  }
];

const DEFAULT_INITIAL_TELEMETRY: FleetTelemetryData = {
  truckId: 'Camion 12 (Julien Morel)',
  driverName: 'Julien Morel',
  driverRating: 5.0,
  vehicleStatus: 'in_transit',
  speedKmh: 82,
  fuelLevelPct: 78,
  engineTempC: 88,
  cargoLoadPct: 78,
  cargoWeightTons: 14.2,
  maxWeightTons: 18.0,
  currentLocation: {
    lat: 47.3220,
    lng: 5.0415,
    checkpoint: 'Dijon Sud',
    nextStop: 'Lyon (Saint-Priest Dépôt)'
  },
  routeCheckpoints: [
    { name: 'Paris', status: 'completed', time: '08:15' },
    { name: 'Auxerre', status: 'completed', time: '10:45' },
    { name: 'Dijon', status: 'active', time: '13:10' },
    { name: 'Lyon', status: 'pending', time: '15:45' },
    { name: 'Marseille', status: 'pending', time: '17:30' }
  ],
  progressPct: 72,
  remainingDistanceKm: 140,
  etaMinutes: 140,
  estimatedArrival: '17:30',
  delayWarningMinutes: 18,
  activeAlert: {
    id: 'alt-a6-beaune',
    type: 'traffic_delay',
    severity: 'warning',
    title: 'Chantier A6 Beaune',
    message: "Chantier en cours sur l'A6 après Beaune. Ralentissement estimé +18 min."
  },
  parcelsDelivered: 34,
  parcelsTotal: 48,
  billingTotalEur: 5860,
  lastPingTimestamp: new Date().toISOString()
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Splash & Authentication Life Cycle
  const [isSplashLoading, setIsSplashLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return LumetricAuthService.isAuthenticated();
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (typeof window !== 'undefined') {
      const stored = LumetricAuthService.getStoredUser();
      if (stored && stored.email) {
        return {
          id: stored.id,
          name: stored.name || 'Camille Dubois',
          email: stored.email,
          role: (stored.role as UserRole) || 'owner',
          createdAt: stored.createdAt || new Date().toISOString()
        };
      }
    }
    return {
      id: 'usr-camille-001',
      email: 'camille.dubois@gmail.com',
      name: 'Camille Dubois',
      role: 'owner',
      createdAt: '2026-10-15T08:00:00Z'
    };
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(initialWorkspaces[0]);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [currentProject, setCurrentProject] = useState<Project | null>(initialProjects[0]);
  
  // Clean start: defaults to pre-loaded verified enterprise dataset if local storage empty
  const [datasets, setDatasets] = useState<DatasetProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumetric_datasets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Safe fallback
      }
    }
    return [DEFAULT_INITIAL_DATASET];
  });

  const [activeDataset, setActiveDatasetState] = useState<DatasetProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumetric_active_dataset');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Safe fallback
      }
    }
    return DEFAULT_INITIAL_DATASET;
  });

  const [activeRows, setActiveRowsState] = useState<Record<string, string>[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumetric_active_rows');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Safe fallback
      }
    }
    return DEFAULT_INITIAL_ROWS;
  });

  const [activeView, setActiveViewState] = useState<ActiveView>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'profile' | 'login' | 'register' | 'admin-dashboard'>('profile');
  const [fleetTelemetry, setFleetTelemetry] = useState<FleetTelemetryData>(DEFAULT_INITIAL_TELEMETRY);

  const dispatchAlert = async (message: string, severity: string = 'warning'): Promise<boolean> => {
    try {
      const res = await LumetricAuthService.dispatchFleetAlert({
        truckId: fleetTelemetry.truckId,
        message,
        severity
      });
      if (res && res.success) {
        setNotifications(prev => [
          {
            id: res.alertId || `alt-${Date.now()}`,
            title: 'Alerte Flotte Émise',
            message: `${message} (Ancré au registre SHA-256)`,
            timestamp: new Date().toLocaleTimeString(),
            read: false,
            type: severity === 'error' ? 'error' : 'warning'
          },
          ...prev.slice(0, 19)
        ]);
        return true;
      }
    } catch {}
    return false;
  };

  const generateInvoice = async (shipmentId?: string, amountEur?: number): Promise<any> => {
    try {
      const res = await LumetricAuthService.generateDigitalInvoice({
        shipmentId: shipmentId || 'SHP-FR-9921',
        amountEur: amountEur || fleetTelemetry.billingTotalEur || 5860,
        customerName: 'Logistique Express France'
      });
      if (res && res.success) {
        setNotifications(prev => [
          {
            id: `inv-${Date.now()}`,
            title: 'Facture Numérique Certifiée',
            message: `Facture ${res.invoiceNumber} générée avec signature HMAC-SHA256 (${res.totalAmountEur} €).`,
            timestamp: new Date().toLocaleTimeString(),
            read: false,
            type: 'success'
          },
          ...prev.slice(0, 19)
        ]);
      }
      return res;
    } catch {
      return null;
    }
  };

  const openAuthModal = (mode: 'profile' | 'login' | 'register' | 'admin-dashboard' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const logout = async () => {
    await LumetricAuthService.logout();
    setCurrentUser({
      id: 'usr_guest',
      email: '',
      name: 'Guest User',
      role: 'viewer',
      createdAt: new Date().toISOString()
    });
    setIsAuthenticated(false);
    setAuthModalMode('login');
    setAuthModalOpen(false);
  };

  const loginAsDemoRole = (role: UserRole) => {
    const roleProfiles: Record<UserRole, { name: string; email: string }> = {
      owner: { name: 'Camille Dubois', email: 'camille.dubois@gmail.com' },
      administrator: { name: 'Alex Chen', email: 'alex.chen@gmail.com' },
      builder: { name: 'Sarah Lin', email: 'sarah.lin@gmail.com' },
      reviewer: { name: 'David Vance', email: 'reviewer@lumetric.dev' },
      viewer: { name: 'Emma Watson', email: 'viewer@lumetric.dev' },
    };
    const profile = roleProfiles[role] || roleProfiles.owner;
    const user: User = {
      id: `usr-${role}-${Date.now().toString(36)}`,
      name: profile.name,
      email: profile.email,
      role,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(user);
    LumetricAuthService.setSession(`demo_jwt_token_${role}_${Date.now()}`, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
    setIsAuthenticated(true);
    setAuthModalOpen(false);
  };

  // Server Connectivity & Reconnection State
  const [serverStatus, setServerStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [serverLatency, setServerLatency] = useState<number | null>(null);
  const [lastServerSync, setLastServerSync] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<any>(null);

  const reconnectServer = async (): Promise<boolean> => {
    setServerStatus('connecting');
    try {
      const res = await LumetricAuthService.checkHealth();
      if (res.connected) {
        setServerStatus('connected');
        setServerLatency(res.latencyMs);
        setServerDetails(res.data);
        const timeStr = new Date().toLocaleTimeString();
        setLastServerSync(timeStr);

        // Sync stored user if available
        const storedUser = LumetricAuthService.getStoredUser();
        if (storedUser) {
          setCurrentUser({
            id: storedUser.id,
            email: storedUser.email,
            name: storedUser.name || 'User',
            role: storedUser.role || 'owner',
            createdAt: storedUser.createdAt || new Date().toISOString()
          });
        }

        setNotifications(prev => [
          {
            id: `srv-sync-${Date.now()}`,
            title: 'Server Reconnected',
            message: `Connected to Zoho Catalyst Cloud (${res.latencyMs}ms roundtrip).`,
            timestamp: timeStr,
            read: false,
            type: 'success'
          },
          ...prev.slice(0, 19)
        ]);
        return true;
      } else {
        setServerStatus('disconnected');
        setServerLatency(null);
        setNotifications(prev => [
          {
            id: `srv-err-${Date.now()}`,
            title: 'Server Offline',
            message: res.error || 'Could not establish connection to Catalyst Server.',
            timestamp: new Date().toLocaleTimeString(),
            read: false,
            type: 'error'
          },
          ...prev.slice(0, 19)
        ]);
        return false;
      }
    } catch (e: any) {
      setServerStatus('disconnected');
      setServerLatency(null);
      return false;
    }
  };

  useEffect(() => {
    // Attempt connection immediately on mount
    reconnectServer();

    // Heartbeat every 45s
    const interval = setInterval(() => {
      reconnectServer();
    }, 45000);

    const handleRecheck = () => {
      reconnectServer();
    };

    window.addEventListener('online', handleRecheck);
    window.addEventListener('focus', handleRecheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleRecheck);
      window.removeEventListener('focus', handleRecheck);
    };
  }, []);

  useEffect(() => {
    // Poll live fleet telemetry from Catalyst every 12 seconds
    const pollTelemetry = async () => {
      try {
        const res = await LumetricAuthService.fetchFleetTelemetry();
        if (res && res.success) {
          setFleetTelemetry(res);
        }
      } catch {}
    };

    pollTelemetry();
    const interval = setInterval(pollTelemetry, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const getViewFromLocation = (): ActiveView => {
      if (typeof window === 'undefined') return 'home';
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const validViews: ActiveView[] = [
        'home', 'projects', 'data', 'pipelines', 'analysis',
        'models', 'dashboards', 'stories', 'operations', 'settings'
      ];
      if (validViews.includes(hash as ActiveView)) {
        return hash as ActiveView;
      }
      const path = window.location.pathname.toLowerCase();
      for (const v of validViews) {
        if (v !== 'home' && (path.includes(`/${v}.html`) || path.includes(`/${v}`))) {
          return v;
        }
      }
      return 'home';
    };

    setActiveViewState(getViewFromLocation());

    const handleLocationChange = () => {
      setActiveViewState(getViewFromLocation());
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const setActiveView = (view: ActiveView) => {
    setActiveViewState(view);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      const newHash = view === 'home' ? '' : `#${view}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash || window.location.pathname);
      }
    }
  };

  const setRole = (role: UserRole) => {
    setCurrentUser(prev => ({ ...prev, role }));
  };

  const switchWorkspace = (workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      const wsProjects = projects.filter(p => p.workspaceId === ws.id);
      setCurrentProject(wsProjects.length > 0 ? wsProjects[0] : null);
    }
  };

  const createWorkspace = (name: string, description?: string): Workspace => {
    const id = `ws-${Date.now().toString(36)}`;
    const newWs: Workspace = {
      id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: description || 'User-created workspace',
      ownerId: currentUser.id,
      members: [{ userId: currentUser.id, role: 'owner', joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkspaces(prev => [...prev, newWs]);
    setCurrentWorkspace(newWs);
    setCurrentProject(null);
    return newWs;
  };

  const selectProject = (projectId: string | null) => {
    if (!projectId) {
      setCurrentProject(null);
      return;
    }
    const prj = projects.find(p => p.id === projectId);
    if (prj) {
      setCurrentProject(prj);
    }
  };

  const createProject = (name: string, objective?: string, description?: string): Project => {
    const newPrj: Project = {
      id: `prj-${Date.now().toString(36)}`,
      workspaceId: currentWorkspace.id,
      name,
      objective: objective || '',
      description: description || '',
      status: 'active',
      createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects(prev => [newPrj, ...prev]);
    setCurrentProject(newPrj);
    return newPrj;
  };

  const setActiveDataset = (dataset: DatasetProfile | null, rows?: Record<string, string>[]) => {
    setActiveDatasetState(dataset);
    if (typeof window !== 'undefined') {
      try {
        if (dataset) {
          localStorage.setItem('lumetric_active_dataset', JSON.stringify(dataset));
        } else {
          localStorage.removeItem('lumetric_active_dataset');
        }
      } catch {
        // ignore
      }
    }
    if (rows) {
      setActiveRowsState(rows);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumetric_active_rows', JSON.stringify(rows));
        } catch {
          // ignore
        }
      }
    }
  };

  const addDataset = (dataset: DatasetProfile, rows?: Record<string, string>[]) => {
    setDatasets(prev => {
      const updated = [dataset, ...prev.filter(d => d.id !== dataset.id)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumetric_datasets', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });

    // Make newly ingested dataset automatically the active focal point
    setActiveDataset(dataset, rows);
  };

  const deleteDataset = (id: string) => {
    setDatasets(prev => {
      const updated = prev.filter(d => d.id !== id);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('lumetric_datasets', JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
    if (activeDataset?.id === id) {
      setActiveDataset(null);
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        setRole,
        isAuthenticated,
        setIsAuthenticated,
        isSplashLoading,
        setIsSplashLoading,
        workspaces,
        currentWorkspace,
        switchWorkspace,
        createWorkspace,
        projects,
        currentProject,
        selectProject,
        createProject,
        datasets,
        activeDataset,
        activeRows,
        setActiveDataset,
        addDataset,
        deleteDataset,
        activeView,
        setActiveView,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        mobileMenuOpen,
        setMobileMenuOpen,
        notifications,
        markNotificationRead,
        serverStatus,
        serverLatency,
        lastServerSync,
        serverDetails,
        reconnectServer,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        logout,
        loginAsDemoRole,
        fleetTelemetry,
        dispatchAlert,
        generateInvoice,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
