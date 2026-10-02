import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium' | 'info' | 'warning' | 'success' | 'custom';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    
    // Base classes
    const baseClass = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-colors duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shrink-0 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
    
    // Size classes
    const sizeClasses = {
      sm: 'min-h-9 px-4 text-xs',
      md: 'min-h-10 px-5 text-sm',
      lg: 'min-h-12 px-6 text-base',
    };

    // Variant classes
    const variantClasses = {
      primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
      secondary: 'bg-secondary-container text-on-secondary-container hover:bg-surface-container-high',
      outline: 'bg-transparent text-fg hover:bg-surface-subtle border border-border-strong',
      ghost: 'bg-transparent text-fg hover:bg-surface-subtle',
      danger: 'bg-danger text-danger-fg hover:bg-danger/90',
      premium: 'bg-tertiary text-white hover:opacity-90',
      info: 'bg-info text-white hover:bg-info-hover',
      warning: 'bg-warning text-white hover:opacity-90',
      success: 'bg-success text-white hover:opacity-90',
      custom: '', // Allows purely overriding with className while keeping base behaviors
    };

    const combinedClassName = `${baseClass} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
