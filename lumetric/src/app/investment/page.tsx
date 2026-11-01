'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/contexts/AppContext';

const InvestmentPlannerView = dynamic(
  () => import('@/components/investment/InvestmentPlannerView').then((mod) => mod.InvestmentPlannerView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Initializing Investment &amp; Venture Intelligence Studio...</span>
        </div>
      </div>
    ),
  }
);

export default function InvestmentPlannerPage() {
  const { activeView, setActiveView } = useApp();

  useEffect(() => {
    // Ensure activeView is synchronized if this component is mounted directly
    if (activeView !== 'investment') {
      setActiveView('investment');
    }
  }, [activeView, setActiveView]);

  return <InvestmentPlannerView />;
}
