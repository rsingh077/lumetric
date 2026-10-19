import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className = '', padding = 'md', hover = false }: CardProps) {
  return (
    <div
      className={`relative rounded-lg bg-[var(--lm-bg-elevated)] border border-[var(--lm-border-default)] shadow-xs ${paddingClasses[padding]} ${
        hover
          ? 'hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm transition-all duration-150 cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-base font-semibold tracking-tight text-[var(--lm-text-primary)] ${className}`}>
      {children}
    </h3>
  );
}
