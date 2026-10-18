import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6" role="status" aria-label={message}>
      <div className="relative w-10 h-10 mb-4">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--lm-border-default)]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--lm-accent-primary)] animate-spin" />
      </div>
      <p className="text-sm text-[var(--lm-text-secondary)]">{message}</p>
    </div>
  );
}
