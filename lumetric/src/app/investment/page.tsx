'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/contexts/AppContext';
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

const InvestmentPlannerView = dynamic(
  () => import('@/components/investment/InvestmentPlannerView').then((mod) => mod.InvestmentPlannerView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col p-6 gap-6 min-h-[480px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart height="340px" />
          <SkeletonChart height="340px" />
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
