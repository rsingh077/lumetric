'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, Project, User, UserRole, DatasetProfile, ActiveView } from '@/types';
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
  setRole: (role: UserRole) => void;
  
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialWorkspaces);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(initialWorkspaces[0]);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [currentProject, setCurrentProject] = useState<Project | null>(initialProjects[0]);
  
  // Clean start: pure user-driven datasets (no synthetic presets)
  const [datasets, setDatasets] = useState<DatasetProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumetric_datasets');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Safe fallback
      }
    }
    return [];
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
    return null;
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
    return [];
  });

  const [activeView, setActiveViewState] = useState<ActiveView>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

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
        setRole,
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
