import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-[var(--lm-bg-secondary)] flex items-center justify-center mb-4 text-[var(--lm-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--lm-text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--lm-text-secondary)] max-w-md mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
