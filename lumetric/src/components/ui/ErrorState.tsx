import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center" role="alert">
      <div className="w-16 h-16 rounded-full bg-[var(--lm-status-error-bg)] flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[var(--lm-status-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--lm-text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--lm-text-secondary)] max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>Try again</Button>
      )}
    </div>
  );
}
