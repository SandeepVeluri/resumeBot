'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-700 disabled:bg-navy-400',
  secondary:
    'bg-white text-navy-900 border border-navy-200 hover:bg-navy-50 focus:ring-navy-200',
  ghost:
    'bg-transparent text-navy-900 hover:bg-navy-50 focus:ring-navy-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, children, disabled, ...rest },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
