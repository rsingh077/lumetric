'use client';

import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { SplashScreen } from '@/components/auth/SplashScreen';
import { LandingPage } from '@/components/landing/LandingPage';
import { initMobileApp } from '@/utils/mobile';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    sidebarCollapsed,
    isSplashLoading,
    setIsSplashLoading,
    isAuthenticated,
    serverStatus,
    serverLatency
  } = useApp();

  useEffect(() => {
    initMobileApp();
  }, []);

  // 1. Initial Loading / Splash Screen with Server Handshake
  if (isSplashLoading) {
    return (
      <SplashScreen
        onComplete={() => setIsSplashLoading(false)}
        serverStatus={serverStatus}
        serverLatency={serverLatency}
      />
    );
  }

  // 2. Showcase Landing Page & 1-Click Auth Modal for unauthenticated sessions
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // 3. Fully Authenticated Main Application
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
