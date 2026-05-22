import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-navy-900)] text-white border border-[var(--color-navy-900)] ' +
    'hover:bg-[var(--color-navy-800)] active:bg-[var(--color-navy-950)] ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--color-navy-400)] focus-visible:ring-offset-1',
  secondary:
    'bg-white text-[var(--color-text-primary)] border border-[var(--color-border-strong)] ' +
    'hover:bg-[var(--color-slate-50)] active:bg-[var(--color-slate-100)] ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--color-navy-400)] focus-visible:ring-offset-1',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] border border-transparent ' +
    'hover:bg-[var(--color-slate-100)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-slate-200)] ' +
    'focus-visible:ring-2 focus-visible:ring-[var(--color-navy-400)] focus-visible:ring-offset-1',
  danger:
    'bg-[var(--color-status-red)] text-white border border-[var(--color-status-red)] ' +
    'hover:bg-red-700 active:bg-red-800 ' +
    'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center font-medium rounded-md',
        'transition-colors duration-100 outline-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
