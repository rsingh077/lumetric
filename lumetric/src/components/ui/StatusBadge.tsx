import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'stale' | 'neutral' | 'emerald' | 'vermilion' | 'ivory';

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--lm-status-success-bg)] text-[#059669] border border-[#059669]/20',
  emerald: 'bg-[#ECFDF5] text-[#065F46] border border-[#059669]/30 dark:bg-[#064E3B]/40 dark:text-[#34D399]',
  vermilion: 'bg-[#FFF1F0] text-[#E34234] border border-[#E34234]/30 dark:bg-[#E34234]/20 dark:text-[#FF5442]',
  ivory: 'bg-[#F4ECE1] text-[#15221B] border border-[#E5D9C8] dark:bg-[#192821] dark:text-[#FAF8F5]',
  warning: 'bg-[var(--lm-status-warning-bg)] text-[var(--lm-status-warning)] border border-amber-500/20',
  error: 'bg-[#FFF1F0] text-[#E34234] border border-[#E34234]/20 dark:bg-[#E34234]/20 dark:text-[#FF5442]',
  info: 'bg-[var(--lm-status-info-bg)] text-[var(--lm-status-info)] border border-teal-500/20',
  stale: 'bg-[var(--lm-status-stale-bg)] text-[var(--lm-status-stale)] border border-purple-500/20',
  neutral: 'bg-[var(--lm-bg-secondary)] text-[var(--lm-text-secondary)] border border-[var(--lm-border-default)]',
};

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-[#059669]',
  emerald: 'bg-[#059669]',
  vermilion: 'bg-[#E34234]',
  ivory: 'bg-[#76887E]',
  warning: 'bg-[var(--lm-status-warning)]',
  error: 'bg-[#E34234]',
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
