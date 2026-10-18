'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import {
  HomeIcon,
  FolderIcon,
  DatabaseIcon,
  LayoutDashboardIcon,
  MenuIcon,
} from '@/components/icons';
import { triggerHapticFeedback } from '@/utils/mobile';

interface NavTab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isMenuToggle?: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { setMobileMenuOpen } = useApp();

  const tabs: NavTab[] = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Projects', href: '/projects', icon: FolderIcon },
    { name: 'Data', href: '/data', icon: DatabaseIcon },
    { name: 'Dashboards', href: '/dashboards', icon: LayoutDashboardIcon },
    { name: 'Menu', href: '#menu', icon: MenuIcon, isMenuToggle: true },
  ];

  const handleTabClick = (tab: NavTab, e: React.MouseEvent) => {
    triggerHapticFeedback();
    if (tab.isMenuToggle) {
      e.preventDefault();
      setMobileMenuOpen(true);
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[var(--lm-bg-primary)]/85 backdrop-blur-2xl border-t border-[var(--lm-border-default)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-safe transition-all select-none"
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = !tab.isMenuToggle && (pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href)));
          const Icon = tab.icon;

          if (tab.isMenuToggle) {
            return (
              <button
                key={tab.name}
                type="button"
                onClick={(e) => handleTabClick(tab, e)}
                className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] active:scale-90 transition-transform"
                aria-label="Open full studio menu"
              >
                <div className="p-1 rounded-xl">
                  <Icon className="w-5 h-5 text-[var(--lm-text-secondary)]" />
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-0.5 text-[var(--lm-text-tertiary)]">
                  {tab.name}
                </span>
              </button>
            );
          }

          return (
            <a
              key={tab.name}
              href={tab.href}
              onClick={(e) => handleTabClick(tab, e)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl active:scale-90 transition-transform ${
                isActive
                  ? 'text-[var(--lm-text-primary)] font-semibold'
                  : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white'
                    : 'text-[var(--lm-text-secondary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${
                  isActive
                    ? 'text-[var(--lm-text-primary)] font-semibold'
                    : 'text-[var(--lm-text-tertiary)] font-normal'
                }`}
              >
                {tab.name}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
