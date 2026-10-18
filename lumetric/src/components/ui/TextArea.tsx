import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, id, className = '', ...props }, ref) => {
    const inputId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--lm-text-primary)]">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-sm bg-[var(--lm-bg-primary)] border rounded-[var(--lm-radius-md)] text-[var(--lm-text-primary)] placeholder:text-[var(--lm-text-tertiary)] transition-colors duration-[var(--lm-transition-fast)] focus:outline-none focus:ring-2 focus:ring-[var(--lm-accent-primary)] focus:ring-offset-1 resize-y min-h-[80px] ${
            error
              ? 'border-[var(--lm-status-error)] focus:ring-[var(--lm-status-error)]'
              : 'border-[var(--lm-border-default)] hover:border-[var(--lm-border-strong)]'
          } ${className}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--lm-status-error)]" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--lm-text-tertiary)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
