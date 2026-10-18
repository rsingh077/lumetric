'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
  FolderIcon,
  ChevronDownIcon,
  PlusIcon,
  XIcon,
} from '@/components/icons';

interface SearchResultItem {
  id: string;
  title: string;
  category: 'Page' | 'Project' | 'Dataset' | 'Action';
  description: string;
  href: string;
  badge?: string;
  action?: () => void;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentWorkspace,
    currentProject,
    projects,
    selectProject,
    createProject,
    currentUser,
    setMobileMenuOpen,
    notifications,
    markNotificationRead,
    datasets,
  } = useApp();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newPrjName, setNewPrjName] = useState('');
  const [newPrjObjective, setNewPrjObjective] = useState('');
  const [newPrjDesc, setNewPrjDesc] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const workspaceProjects = projects.filter((p) => p.workspaceId === currentWorkspace.id);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K to toggle Search Dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setProjectDropdownOpen(false);
        setNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute clean breadcrumb title
  const getSectionTitle = () => {
    if (pathname === '/') return 'Studio Overview';
    const segment = pathname.split('/')[1] || '';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) markNotificationRead(n.id);
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrjName.trim()) return;
    createProject(newPrjName.trim(), newPrjObjective.trim(), newPrjDesc.trim());
    setNewPrjName('');
    setNewPrjObjective('');
    setNewPrjDesc('');
    setNewProjectModalOpen(false);
    setProjectDropdownOpen(false);
  };

  // Comprehensive Search Items
  const allSearchItems = useMemo((): SearchResultItem[] => {
    const pages: SearchResultItem[] = [
      { id: 'p-home', title: 'Studio Overview & Ingestion', category: 'Page', description: 'Central workspace hub, active dataset summary, and intake dropzone', href: '/' },
      { id: 'p-dash', title: 'Executive Dashboards', category: 'Page', description: 'Real-time charts, Big Data precision moments, frequency histograms and 360° record inspector', href: '/dashboards' },
      { id: 'p-analysis', title: 'Statistical Analysis & Discovery', category: 'Page', description: 'Hypothesis testing, correlation driver rankings, and trend forecasts', href: '/analysis' },
      { id: 'p-data', title: 'Data Workspace & Ingestion Requirements', category: 'Page', description: 'Governed schema profiling, grain declarations, quality checks and sanitization', href: '/data' },
      { id: 'p-pipe', title: 'Pipelines & DAG Studio', category: 'Page', description: 'Directed Acyclic Graph transformations, join checks, and gold tables', href: '/pipelines' },
      { id: 'p-models', title: 'Machine Learning Models Registry', category: 'Page', description: 'Trained models, cross-validation metrics, and production serving', href: '/models' },
      { id: 'p-stories', title: 'Visual Story Studio', category: 'Page', description: 'Executive slide narratives grounded directly in calculation runs', href: '/stories' },
      { id: 'p-ops', title: 'Operations & Orchestrator Console', category: 'Page', description: 'Dagster job execution logs, checkpoints, worker memory, and SLAs', href: '/operations' },
      { id: 'p-projects', title: 'Projects Portfolio', category: 'Page', description: 'Organizational research units scoped to current workspace', href: '/projects' },
      { id: 'p-settings', title: 'Workspace Governance & RBAC', category: 'Page', description: 'Role-based access matrix, multi-tenant boundaries, and KMS keys', href: '/settings' },
    ];

    const prjItems: SearchResultItem[] = workspaceProjects.map((p) => ({
      id: `prj-${p.id}`,
      title: p.name,
      category: 'Project',
      description: p.objective || p.description || 'Active research project',
      href: '/projects',
      action: () => selectProject(p.id),
      badge: p.status,
    }));

    const dsItems: SearchResultItem[] = datasets.map((d) => ({
      id: `ds-${d.id}`,
      title: d.fileName,
      category: 'Dataset',
      description: `${d.rowCount.toLocaleString()} rows • ${d.columnCount} columns • SHA: ${d.sha256.substring(0, 8)}`,
      href: '/data',
      badge: d.status,
    }));

    return [...pages, ...prjItems, ...dsItems];
  }, [workspaceProjects, datasets, selectProject]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allSearchItems.slice(0, 8);
    const q = searchQuery.toLowerCase();
    return allSearchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allSearchItems, searchQuery]);

  const handleSelectSearchResult = (item: SearchResultItem) => {
    if (item.action) {
      item.action();
    }
    setSearchOpen(false);
    setSearchQuery('');
    router.push(item.href);
  };

  return (
    <>
      {/* Apple Frosted Glass Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between min-h-14 pt-safe px-4 md:px-6 bg-[var(--lm-bg-primary)]/75 backdrop-blur-2xl border-b border-[var(--lm-border-default)] shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
        {/* Left Section: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-xl text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-secondary)] lg:hidden apple-pressable"
            aria-label="Open navigation menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[var(--lm-text-primary)] tracking-tight">
              {currentWorkspace.name}
            </span>
            <span className="text-[var(--lm-text-tertiary)] font-normal">/</span>
            
            {/* Project Quick Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--lm-bg-secondary)]/80 hover:bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] hover:border-[var(--lm-border-strong)] text-[var(--lm-text-primary)] font-medium max-w-[220px] transition-all apple-pressable"
                aria-expanded={projectDropdownOpen}
              >
                <FolderIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">
                  {currentProject ? currentProject.name : 'Select Project'}
                </span>
                <ChevronDownIcon className="w-3 h-3 text-[var(--lm-text-tertiary)] shrink-0" />
              </button>

              {projectDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-2xl shadow-[var(--lm-shadow-xl)] p-1.5 z-50 animate-fade-in">
                  <div className="px-3 py-1 text-[10px] font-semibold text-[var(--lm-text-tertiary)] uppercase tracking-wider">
                    Workspace Projects
                  </div>

                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        selectProject(null);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        !currentProject
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
                      }`}
                    >
                      <span className="truncate">All Workspace Data</span>
                      {!currentProject && <span className="text-[10px]">✓</span>}
                    </button>

                    {workspaceProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          selectProject(p.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentProject?.id === p.id
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-[var(--lm-text-primary)] hover:bg-[var(--lm-bg-secondary)]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {currentProject?.id === p.id && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1.5 mt-1 border-t border-[var(--lm-border-default)]">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectDropdownOpen(false);
                        setNewProjectModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors apple-pressable"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>New Project...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-[var(--lm-text-tertiary)] font-normal hidden sm:inline">/</span>
            <span className="text-[var(--lm-text-secondary)] font-medium hidden sm:inline">
              {getSectionTitle()}
            </span>
          </div>
        </div>

        {/* Right Section: Command Palette, Notifications, Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Global Search Pill (Apple ⌘K Style) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[var(--lm-bg-secondary)]/80 hover:bg-[var(--lm-bg-secondary)] border border-[var(--lm-border-default)] hover:border-[var(--lm-border-strong)] text-xs text-[var(--lm-text-secondary)] transition-all apple-pressable"
            title="Search anything (⌘K or Ctrl+K)"
          >
            <SearchIcon className="w-3.5 h-3.5 text-[var(--lm-text-tertiary)]" />
            <span className="hidden sm:inline">Search studio...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-tertiary)] rounded-md border border-[var(--lm-border-default)]">
              ⌘K
            </kbd>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2 rounded-xl text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-secondary)] relative apple-pressable"
              aria-label="View notifications"
            >
              <BellIcon className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-[var(--lm-bg-primary)]" />
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-2xl shadow-[var(--lm-shadow-xl)] p-3.5 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--lm-border-default)] mb-2">
                  <span className="text-xs font-semibold text-[var(--lm-text-primary)]">
                    Audit & Events
                  </span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-blue-600 hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                    <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">
                      {unreadCount} unread
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                        n.read ? 'bg-transparent text-[var(--lm-text-secondary)] hover:bg-slate-50' : 'bg-blue-500/10 text-[var(--lm-text-primary)] border border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-xs">{n.title}</span>
                        <span className="text-[10px] text-[var(--lm-text-tertiary)] font-mono">
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--lm-text-secondary)] leading-tight mt-0.5">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-[var(--lm-border-default)]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight text-[var(--lm-text-primary)] tracking-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-[var(--lm-text-tertiary)] uppercase font-mono font-medium">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Fully Functional Global Search Dialog */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-3xl shadow-[var(--lm-shadow-xl)] p-4 w-full max-w-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--lm-border-default)]">
              <div className="flex items-center gap-2.5 flex-1">
                <SearchIcon className="w-4 h-4 text-blue-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search pages, datasets, projects, models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm bg-transparent outline-none text-[var(--lm-text-primary)] placeholder:text-[var(--lm-text-tertiary)]"
                />
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-xl text-[var(--lm-text-tertiary)] hover:bg-[var(--lm-bg-tertiary)] apple-pressable"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Live Filtered Search Results */}
            <div className="py-2 max-h-80 overflow-y-auto space-y-1">
              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--lm-text-tertiary)]">
                  No items matched &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item)}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[var(--lm-bg-secondary)] cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-xs text-[var(--lm-text-primary)] group-hover:text-blue-600 transition-colors truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-tertiary)]">
                          {item.category}
                        </span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--lm-text-secondary)] truncate">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      Jump →
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2.5 border-t border-[var(--lm-border-default)] flex items-center justify-between text-[11px] text-[var(--lm-text-tertiary)]">
              <span>Press <kbd className="font-mono bg-[var(--lm-bg-secondary)] px-1 rounded border">Esc</kbd> to dismiss</span>
              <span>{searchResults.length} results available</span>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-[var(--lm-bg-elevated)] backdrop-blur-2xl border border-[var(--lm-border-default)] rounded-3xl shadow-[var(--lm-shadow-xl)] p-6 w-full max-w-md">
            <h3 className="text-base font-bold text-[var(--lm-text-primary)] mb-1">
              Create New Project
            </h3>
            <p className="text-xs text-[var(--lm-text-secondary)] mb-4">
              Organize pipelines, metrics, and models under a shared analytical objective.
            </p>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ARR Churn Analysis 2026"
                  value={newPrjName}
                  onChange={(e) => setNewPrjName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Business Objective
                </label>
                <input
                  type="text"
                  placeholder="e.g. Determine enterprise renewal drivers"
                  value={newPrjObjective}
                  onChange={(e) => setNewPrjObjective(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--lm-text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional context and hypotheses..."
                  value={newPrjDesc}
                  onChange={(e) => setNewPrjDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--lm-bg-primary)] border border-[var(--lm-border-default)] rounded-xl text-[var(--lm-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewProjectModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-tertiary)] rounded-xl apple-pressable"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs apple-pressable"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
