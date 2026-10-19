'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import {
  BrandMascotIcon,
  HomeIcon,
  FolderIcon,
  DatabaseIcon,
  GitBranchIcon,
  BarChart3Icon,
  BrainIcon,
  LayoutDashboardIcon,
  BookOpenIcon,
  ActivityIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  SparklesIcon,
} from '@/components/icons';
import { UserRole, ActiveView } from '@/types';

interface NavItem {
  id: ActiveView;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { id: 'home', label: 'Studio Overview', href: '/', icon: HomeIcon },
      { id: 'projects', label: 'Projects & Goals', href: '/projects', icon: FolderIcon },
    ],
  },
  {
    title: 'Data Engine',
    items: [
      { id: 'data', label: 'Data Workspace', href: '/data', icon: DatabaseIcon },
      { id: 'pipelines', label: 'DAG Pipelines', href: '/pipelines', icon: GitBranchIcon },
    ],
  },
  {
    title: 'Intelligence & BI',
    items: [
      { id: 'analysis', label: 'Statistical Analysis', href: '/analysis', icon: BarChart3Icon },
      { id: 'models', label: 'Model Registry', href: '/models', icon: BrainIcon },
      { id: 'dashboards', label: 'Dashboards', href: '/dashboards', icon: LayoutDashboardIcon },
      { id: 'stories', label: 'Visual Stories', href: '/stories', icon: BookOpenIcon },
    ],
  },
  {
    title: 'System & Admin',
    items: [
      { id: 'operations', label: 'Operations & SLAs', href: '/operations', icon: ActivityIcon },
      { id: 'settings', label: 'Governance & RBAC', href: '/settings', icon: SettingsIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const {
    activeView,
    setActiveView,
    sidebarCollapsed,
    toggleSidebar,
    workspaces,
    currentWorkspace,
    switchWorkspace,
    createWorkspace,
    currentUser,
    setRole,
    mobileMenuOpen,
    setMobileMenuOpen,
    serverStatus,
    serverLatency,
    reconnectServer,
  } = useApp();

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [newWsModalOpen, setNewWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  const handleCreateWs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim(), newWsDesc.trim());
    setNewWsName('');
    setNewWsDesc('');
    setNewWsModalOpen(false);
    setWsDropdownOpen(false);
  };

  const roles: UserRole[] = ['owner', 'administrator', 'builder', 'reviewer', 'viewer'];

  return (
    <>
      {/* Mobile Backdrop with Apple Blur */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Apple Floating Glass Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[var(--lm-bg-secondary)]/95 backdrop-blur-2xl border-r border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none pt-safe pb-safe ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[280px] max-w-[85vw]'
        } ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Main Navigation"
      >
        {/* Brand & Workspace Header */}
        <div className="flex flex-col border-b border-[var(--lm-border-default)] p-3 bg-[var(--lm-bg-primary)]">
          <div className="flex items-center justify-between gap-2 h-10 px-1">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
              }}
              className="flex items-center gap-2.5 overflow-hidden group cursor-pointer"
            >
              <BrandMascotIcon className="w-6 h-6 shrink-0" />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-[var(--lm-text-primary)]">
                      Lumetric
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                      STUDIO
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">
                    Decision Engine
                  </span>
                </div>
              )}
            </a>

            {/* Desktop collapse button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1 rounded-md text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-tertiary)] transition-colors apple-pressable"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="w-4 h-4" />
              ) : (
                <ChevronLeftIcon className="w-4 h-4" />
              )}
            </button>

            {/* Mobile iOS-style dismiss button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-full bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] apple-pressable"
              aria-label="Close navigation sheet"
            >
              ✕
            </button>
          </div>


          {/* Workspace Switcher */}
          {!sidebarCollapsed && (
            <div className="relative mt-2.5">
              <button
                type="button"
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl bg-[var(--lm-bg-primary)]/80 hover:bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] font-semibold transition-all duration-200 shadow-xs apple-pressable"
                aria-expanded={wsDropdownOpen}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shrink-0" />
                  <span className="truncate">{currentWorkspace.name}</span>
                </div>
                <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--lm-text-tertiary)] shrink-0" />
              </button>

              {wsDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-2xl shadow-[var(--lm-shadow-xl)] py-1.5 z-50 animate-fade-in">
                  <div className="px-3.5 py-1 text-[10px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider">
                    Workspaces
                  </div>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setWsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[var(--lm-bg-tertiary)] transition-colors ${
                        ws.id === currentWorkspace.id
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-[var(--lm-text-primary)]'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === currentWorkspace.id && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-medium">✓</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[var(--lm-border-default)] my-1" />
                  <button
                    onClick={() => {
                      setNewWsModalOpen(true);
                      setWsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-[var(--lm-bg-tertiary)] flex items-center gap-1.5 font-medium rounded-b-xl"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    New Workspace...
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grouped Enterprise Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Sections">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-0.5">
              {!sidebarCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[var(--lm-text-tertiary)] uppercase font-mono">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const isActive = activeView === item.id;
                const IconComponent = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id === 'home' ? '' : item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveView(item.id);
                    }}
                    className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-white dark:text-slate-900'
                          : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.label}</span>
                    )}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile & Role Simulation */}
        <div className="border-t border-[var(--lm-border-default)] p-2.5 bg-[var(--lm-bg-primary)]">
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              title="Switch user role to test permissions"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-semibold text-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--lm-text-primary)] truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded font-semibold">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] text-slate-400">Switch ▾</span>
                  </div>
                </div>
              )}
            </button>

            {roleDropdownOpen && (
              <div className="absolute left-0 bottom-full mb-1.5 w-60 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-2xl shadow-[var(--lm-shadow-xl)] p-2 z-50 animate-fade-in">
                <div className="text-[10px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider px-2 py-1">
                  Active Role (RBAC)
                </div>
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize flex items-center justify-between transition-colors ${
                      currentUser.role === r
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-tertiary)]'
                    }`}
                  >
                    <span>{r}</span>
                    {currentUser.role === r && <span className="text-[10px] font-mono">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <div className="mt-2 pt-2 border-t border-[var(--lm-border-default)] flex items-center justify-between text-[10px] text-[var(--lm-text-tertiary)]">
              <span>Catalyst Node</span>
              <button
                type="button"
                onClick={() => reconnectServer()}
                className="inline-flex items-center gap-1.5 font-medium hover:opacity-80 transition-opacity apple-pressable cursor-pointer"
                title="Click to reconnect with Catalyst Cloud Server"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    serverStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : serverStatus === 'connecting'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-rose-500'
                  }`}
                />
                <span
                  className={
                    serverStatus === 'connected'
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : serverStatus === 'connecting'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400 font-bold'
                  }
                >
                  {serverStatus === 'connected'
                    ? `Live (${serverLatency !== null ? `${serverLatency}ms` : '20ms'})`
                    : serverStatus === 'connecting'
                    ? 'Pinging...'
                    : 'Reconnect'}
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* New Workspace Modal */}
      {newWsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-2xl shadow-[var(--lm-shadow-xl)] p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-[var(--lm-text-primary)] mb-1">
              Create New Workspace
            </h3>
            <p className="text-xs text-[var(--lm-text-secondary)] mb-4">
              Isolate datasets, pipelines, and authorization boundaries.
            </p>
            <form onSubmit={handleCreateWs} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Risk & Quantitative Research"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Purpose and permitted analytical workloads"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewWsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-tertiary)] rounded-xl apple-pressable"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs apple-pressable"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
