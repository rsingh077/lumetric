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

interface NavEntry {
  id: string;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  badge?: string;
  appleColor: string;
}

const navItems: NavEntry[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: HomeIcon,
    appleColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'projects',
    label: 'Projects',
    href: '/projects',
    icon: FolderIcon,
    appleColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'data',
    label: 'Data',
    href: '/data',
    icon: DatabaseIcon,
    appleColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'pipelines',
    label: 'Pipelines',
    href: '/pipelines',
    icon: GitBranchIcon,
    appleColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    href: '/analysis',
    icon: BarChart3Icon,
    appleColor: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    id: 'models',
    label: 'Models',
    href: '/models',
    icon: BrainIcon,
    appleColor: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  },
  {
    id: 'dashboards',
    label: 'Dashboards',
    href: '/dashboards',
    icon: LayoutDashboardIcon,
    appleColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'stories',
    label: 'Stories',
    href: '/stories',
    icon: BookOpenIcon,
    appleColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
  {
    id: 'operations',
    label: 'Operations',
    href: '/operations',
    icon: ActivityIcon,
    appleColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: SettingsIcon,
    appleColor: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
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
        <div className="flex flex-col border-b border-[var(--lm-border-default)] p-3.5 bg-[var(--lm-bg-primary)]/50 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 h-11 px-1">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
              }}
              className="flex items-center gap-2.5 overflow-hidden group cursor-pointer"
            >
              <div className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-108 shrink-0">
                <BrandMascotIcon className="w-8 h-8 drop-shadow-sm" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-[var(--lm-text-primary)]">
                      Lumetric
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <SparklesIcon className="w-2.5 h-2.5 text-blue-500" />
                      Studio
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono tracking-wider">
                    v0.1.0 • verified
                  </span>
                </div>
              )}
            </a>

            {/* Desktop collapse button */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-xl text-[var(--lm-text-tertiary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-tertiary)] transition-colors duration-200 apple-pressable"
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

        {/* Navigation Items (Apple Smooth Pill Navigation) */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1" aria-label="Sections">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const IconComponent = item.icon;

            return (
              <a
                key={item.id}
                href={`#${item.id === 'home' ? '' : item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveView(item.id as ActiveView);
                }}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 apple-pressable cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-tertiary)]/60'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {/* Icon Container */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : `${item.appleColor}`
                  } ${sidebarCollapsed ? 'mx-auto' : ''}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                {!sidebarCollapsed && (
                  <span className="truncate flex-1 tracking-tight">{item.label}</span>
                )}

                {/* Subtle active indicator dot */}
                {!sidebarCollapsed && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </a>
            );
          })}
        </nav>

        {/* User & Role Simulation Section */}
        <div className="border-t border-[var(--lm-border-default)] p-3 bg-[var(--lm-bg-primary)]/50 backdrop-blur-xl">
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--lm-bg-tertiary)]/80 transition-colors text-left apple-pressable"
              title="Switch user role to test permissions"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[var(--lm-text-primary)] truncate">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] text-[var(--lm-text-secondary)] rounded-md font-semibold">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] text-[var(--lm-text-tertiary)]">Switch ▾</span>
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
              <span>Private Tenant</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine
              </span>
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
