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
    { name: 'Dashboard', href: '/dashboards', icon: LayoutDashboardIcon },
    { name: 'Studio', href: '#menu', icon: MenuIcon, isMenuToggle: true },
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
      aria-label="iOS Mobile Floating Dock"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pointer-events-none select-none pb-safe"
    >
      <div className="px-4 pb-2 pt-1 max-w-sm mx-auto pointer-events-auto">
        {/* iOS Frosted Glass Capsule Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-full bg-[var(--lm-bg-primary)]/85 dark:bg-[#121319]/85 backdrop-blur-3xl border border-[var(--lm-border-default)] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          {tabs.map((tab) => {
            const isActive = !tab.isMenuToggle && (pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href)));
            const Icon = tab.icon;

            if (tab.isMenuToggle) {
              return (
                <button
                  key={tab.name}
                  type="button"
                  onClick={(e) => handleTabClick(tab, e)}
                  className="flex flex-col items-center justify-center py-1 px-3 rounded-full text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)] active:scale-90 transition-transform duration-150"
                  aria-label="Open Studio Menu"
                >
                  <div className="p-1 rounded-full text-[var(--lm-text-secondary)]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9.5px] font-semibold tracking-tight mt-0.5 text-[var(--lm-text-tertiary)]">
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
                className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-full active:scale-90 transition-all duration-150 ${
                  isActive
                    ? 'text-[var(--lm-text-primary)] font-bold'
                    : 'text-[var(--lm-text-secondary)] hover:text-[var(--lm-text-primary)]'
                }`}
              >
                <div
                  className={`p-1 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'text-[var(--lm-text-secondary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[9.5px] tracking-tight mt-0.5 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-[var(--lm-text-tertiary)] font-medium'
                  }`}
                >
                  {tab.name}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
