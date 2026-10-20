'use client';

import React, { useState } from 'react';
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
  LogOutIcon,
} from '@/components/icons';
import { UserRole, ActiveView } from '@/types';

interface NavItem {
  id: ActiveView;
  label: string;
  badge?: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Core Studio',
    items: [
      { id: 'home', label: 'Overview', icon: HomeIcon },
      { id: 'data', label: 'Data & Documents', icon: DatabaseIcon },
      { id: 'projects', label: 'Projects & Goals', icon: FolderIcon },
      { id: 'analysis', label: 'Analysis & EDA', badge: 'Active', icon: BarChart3Icon },
      { id: 'pipelines', label: 'Data Pipelines', icon: GitBranchIcon },
      { id: 'models', label: 'ML Models & AI', icon: BrainIcon },
    ],
  },
  {
    title: 'Executive & Delivery',
    items: [
      { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboardIcon },
      { id: 'stories', label: 'Data Stories', icon: BookOpenIcon },
      { id: 'operations', label: 'Engine Operations', icon: ActivityIcon },
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
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
    logout,
    mobileMenuOpen,
    setMobileMenuOpen,
    serverStatus,
    serverLatency,
    reconnectServer,
    activeRows,
    documentFiles,
    activeDocument,
    t,
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
      {/* Mobile Backdrop with Blur */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Glass Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[var(--lm-bg-secondary)]/98 backdrop-blur-2xl border-r border-[var(--lm-border-default)] shadow-[var(--lm-shadow-md)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none pt-safe pb-safe ${
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
              <BrandMascotIcon className="w-6 h-6 shrink-0 text-[#059669]" />
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-[var(--lm-text-primary)]">
                      Lumetric
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ECFDF5] dark:bg-[#064E3B]/60 text-[#065F46] dark:text-[#34D399] font-bold border border-[#059669]/30">
                      STUDIO
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">
                    Data &amp; Document Studio
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

            {/* Mobile dismiss button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-full bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] apple-pressable"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* User Profile Card matching Studio Design */}
          {!sidebarCollapsed && (
            <div className="mt-3 p-2.5 rounded-2xl bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-[#059669] via-[#10B981] to-[#E34234] p-[2px] shrink-0 shadow-sm">
                <div className="w-full h-full rounded-full bg-[#0D1612] text-[#FAF8F5] flex items-center justify-center font-bold text-sm">
                  {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'DS'}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white dark:border-[#0D1612]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-[var(--lm-text-tertiary)] font-medium block">
                  {t('common.welcome') || 'Welcome back'},
                </span>
                <span className="text-sm font-bold text-[var(--lm-text-primary)] truncate block">
                  {currentUser.name || 'Data Scientist'}
                </span>
              </div>
            </div>
          )}

          {/* Workspace Switcher */}
          {!sidebarCollapsed && (
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-xl bg-[var(--lm-bg-primary)]/80 hover:bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] text-[var(--lm-text-primary)] font-semibold transition-all duration-200 shadow-xs apple-pressable"
                aria-expanded={wsDropdownOpen}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#059669] shadow-xs shrink-0" />
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
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-[var(--lm-text-primary)]'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === currentWorkspace.id && (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-medium">✓</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[var(--lm-border-default)] my-1" />
                  <button
                    onClick={() => {
                      setNewWsModalOpen(true);
                      setWsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-[var(--lm-bg-tertiary)] flex items-center gap-1.5 font-medium rounded-b-xl"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    + New Workspace
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grouped Enterprise Navigation with Red Active Pill */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Sections">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
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
                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#059669] text-[#FAF8F5] font-semibold shadow-md shadow-[#059669]/25'
                        : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#FAF8F5]'
                          : 'text-[var(--lm-text-tertiary)] group-hover:text-[var(--lm-text-primary)]'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? 'bg-[#E34234] text-[#FAF8F5]'
                            : 'bg-[#FFF1F0] dark:bg-[#E34234]/20 text-[#E34234]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          ))}

          {/* Dynamic Engine Operations & Ingestion Metrics Card */}
          {!sidebarCollapsed && (
            <div className="pt-2 space-y-3">
              <div className="rounded-2xl bg-gradient-to-br from-[#064E3B] via-[#059669] to-[#047857] text-[#FAF8F5] p-4 shadow-lg shadow-emerald-950/30 border border-[#10B981]/25">
                <div className="flex items-center justify-between text-xs mb-3 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
                    <span className="tracking-tight">Engine Operations</span>
                  </div>
                  <span
                    onClick={() => setActiveView('operations')}
                    className="text-emerald-100 text-[11px] hover:underline cursor-pointer opacity-90"
                  >
                    View All →
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-200 block uppercase font-mono tracking-wider">Tabular Ingested</span>
                    <span className="font-extrabold text-base">{activeRows.length > 0 ? `${activeRows.length} Records` : '0 Records'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block uppercase font-mono tracking-wider">Document Dossiers</span>
                    <span className="font-extrabold text-base">{documentFiles.length} Dossier{documentFiles.length !== 1 ? 's' : ''} Loaded</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-200 block uppercase font-mono tracking-wider">Tokens &amp; PII Treated</span>
                    <span className="font-extrabold text-base">
                      {activeDocument?.treatments?.reduce((acc, t) => acc + (t.metrics?.tokensParsed || 0), 0) || 264} Tokens Treated
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('data')}
                  className="w-full mt-3 py-2 px-3 rounded-full bg-[#FAF8F5] text-[#059669] hover:bg-[#F4ECE1] text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="text-sm font-bold">+</span>
                  <span>Ingest Dataset / Doc</span>
                </button>
              </div>

            </div>
          )}
        </nav>

        {/* User Profile & Role Footer */}
        <div className="border-t border-[var(--lm-border-default)] p-2.5 bg-[var(--lm-bg-primary)]">
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              title="Active RBAC Role"
            >
              <div className="w-7 h-7 rounded-full bg-[#059669] text-[#FAF8F5] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentUser.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--lm-text-primary)] truncate leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-[#ECFDF5] dark:bg-[#064E3B]/60 border border-[#059669]/30 text-[#065F46] dark:text-[#34D399] rounded font-semibold">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)]">Role ▾</span>
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
                        ? 'bg-[#059669] text-[#FAF8F5] font-semibold'
                        : 'text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-tertiary)]'
                    }`}
                  >
                    <span>{r}</span>
                    {currentUser.role === r && <span className="text-[10px] font-mono">✓</span>}
                  </button>
                ))}
                <div className="pt-1.5 mt-1 border-t border-[var(--lm-border-default)]">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOutIcon className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {!sidebarCollapsed ? (
            <div className="mt-2 pt-2 border-t border-[var(--lm-border-default)] flex items-center justify-between text-[10px]">
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold cursor-pointer active:scale-95 transition-transform"
                title="Sign out of Lumetric"
              >
                <LogOutIcon className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-[var(--lm-border-default)] flex justify-center">
              <button
                type="button"
                onClick={() => logout()}
                className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                title="Sign Out"
              >
                <LogOutIcon className="w-4 h-4" />
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
              Isolate datasets, pipelines, and document treatments for your data engineering team.
            </p>
            <form onSubmit={handleCreateWs} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantitative Risk Analytics"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Scope and analytical objectives of this environment"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-xs apple-pressable"
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
