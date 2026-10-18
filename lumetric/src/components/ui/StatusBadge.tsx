import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'stale' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--lm-status-success-bg)] text-[var(--lm-status-success)]',
  warning: 'bg-[var(--lm-status-warning-bg)] text-[var(--lm-status-warning)]',
  error: 'bg-[var(--lm-status-error-bg)] text-[var(--lm-status-error)]',
  info: 'bg-[var(--lm-status-info-bg)] text-[var(--lm-status-info)]',
  stale: 'bg-[var(--lm-status-stale-bg)] text-[var(--lm-status-stale)]',
  neutral: 'bg-[var(--lm-bg-tertiary)] text-[var(--lm-text-secondary)]',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--lm-status-success)]',
  warning: 'bg-[var(--lm-status-warning)]',
  error: 'bg-[var(--lm-status-error)]',
  info: 'bg-[var(--lm-status-info)]',
  stale: 'bg-[var(--lm-status-stale)]',
  neutral: 'bg-[var(--lm-text-tertiary)]',
};

export function StatusBadge({ variant, children, dot = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--lm-radius-full)] text-xs font-medium ${variantStyles[variant]}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
