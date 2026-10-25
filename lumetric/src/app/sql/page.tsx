'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const SQLStudioView = dynamic(
  () => import('@/components/sql/SQLStudioView').then((mod) => mod.SQLStudioView),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Initializing SQL Studio Engine...</span>
        </div>
      </div>
    ),
  }
);

export default function SQLStudioPage() {
  return <SQLStudioView />;
}
