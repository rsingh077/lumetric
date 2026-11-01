'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

const ExcelAutomatorView = dynamic(
  () => import('@/components/excel/ExcelAutomatorView').then((mod) => mod.ExcelAutomatorView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col p-6 gap-6 min-h-[480px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <SkeletonCard className="w-full sm:w-80" lines={2} />
          <div className="flex gap-2">
            <SkeletonCard className="w-28" lines={1} />
            <SkeletonCard className="w-28" lines={1} />
          </div>
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    ),
  }
);

export default function ExcelAutomatorPage() {
  return <ExcelAutomatorView />;
}
