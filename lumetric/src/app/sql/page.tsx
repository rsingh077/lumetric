'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

const SQLStudioView = dynamic(
  () => import('@/components/sql/SQLStudioView').then((mod) => mod.SQLStudioView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex flex-col p-6 gap-6 min-h-[480px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
        <SkeletonTable rows={7} cols={5} />
      </div>
    ),
  }
);

export default function SQLStudioPage() {
  return <SQLStudioView />;
}
