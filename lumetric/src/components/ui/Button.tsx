import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'vermilion' | 'emerald';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#059669] text-[#FAF8F5] hover:bg-[#047857] shadow-sm hover:shadow-md border border-[#047857]/30 focus-visible:ring-2 focus-visible:ring-[#059669]',
  emerald:
    'bg-[#059669] text-[#FAF8F5] hover:bg-[#047857] shadow-sm hover:shadow-md border border-[#047857]/30 focus-visible:ring-2 focus-visible:ring-[#059669]',
  vermilion:
    'bg-[#E34234] text-[#FAF8F5] hover:bg-[#C93326] shadow-sm hover:shadow-md border border-[#C93326]/30 focus-visible:ring-2 focus-visible:ring-[#E34234]',
  secondary:
    'bg-[var(--lm-bg-secondary)] text-[var(--lm-text-primary)] border border-[var(--lm-border-default)] hover:bg-[var(--lm-bg-tertiary)] shadow-xs hover:shadow-sm',
  ghost:
    'bg-transparent text-[var(--lm-text-secondary)] hover:bg-[var(--lm-bg-secondary)] hover:text-[var(--lm-text-primary)] border border-transparent',
  danger:
    'bg-[#E34234] text-[#FAF8F5] hover:bg-[#C93326] shadow-sm border border-red-700/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-md font-medium',
  md: 'px-3.5 py-2 text-xs font-semibold gap-2 rounded-md',
  lg: 'px-4.5 py-2.5 text-sm font-semibold gap-2 rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0" aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
