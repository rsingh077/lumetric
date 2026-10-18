'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { initMobileApp } from '@/utils/mobile';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp();

  useEffect(() => {
    initMobileApp();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--lm-bg-primary)] text-[var(--lm-text-primary)]">
      <Sidebar />
      <div
        className={`flex flex-col min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        }`}
      >
        <Header />
        <main className="flex-1 px-3.5 py-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

