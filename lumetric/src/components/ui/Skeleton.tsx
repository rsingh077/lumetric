import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--lm-bg-secondary)]/80 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({
  className = '',
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div
      className={`p-5 rounded-2xl border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] space-y-3.5 animate-pulse ${className}`}
      role="status"
      aria-label="Loading card content"
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-[var(--lm-bg-secondary)] rounded-md" />
        <div className="h-4 w-12 bg-[var(--lm-bg-secondary)] rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-[var(--lm-bg-secondary)]/70 rounded-md"
            style={{ width: `${Math.max(45, 95 - i * 15)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({
  className = '',
  height = '280px',
}: {
  className?: string;
  height?: string;
}) {
  return (
    <div
      className={`p-5 rounded-3xl border border-[var(--lm-border-default)] bg-[var(--lm-bg-elevated)] space-y-4 animate-pulse ${className}`}
      role="status"
      aria-label="Loading visual chart data"
      style={{ minHeight: height }}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 bg-[var(--lm-bg-secondary)] rounded-md" />
        <div className="h-6 w-20 bg-[var(--lm-bg-secondary)] rounded-lg" />
      </div>
      <div className="flex items-end justify-between gap-2 pt-6 h-48">
        {[40, 65, 30, 85, 55, 90, 45, 70, 60, 80, 50, 75].map((pct, idx) => (
          <div
            key={idx}
            className="flex-1 bg-[var(--lm-bg-secondary)]/80 rounded-t-lg transition-all"
            style={{ height: `${pct}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = '',
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`border border-[var(--lm-border-default)] rounded-2xl bg-[var(--lm-bg-elevated)] overflow-hidden animate-pulse ${className}`}
      role="status"
      aria-label="Loading data table"
    >
      <div className="flex items-center gap-4 px-4 py-3 bg-[var(--lm-bg-secondary)] border-b border-[var(--lm-border-default)]">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-3.5 bg-[var(--lm-border-default)] rounded-md flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--lm-border-default)]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-3 bg-[var(--lm-bg-secondary)]/80 rounded-md flex-1"
                style={{ width: `${60 + ((r + c) % 4) * 10}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
