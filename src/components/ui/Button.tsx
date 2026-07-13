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
    const baseClass = 'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg shrink-0 hover:scale-[1.03] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100';
    
    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    // Variant classes
    const variantClasses = {
      primary: 'bg-primary text-primary-fg hover:opacity-90 shadow-lg shadow-primary/25',
      secondary: 'bg-surface-subtle text-fg hover:bg-surface shadow-sm border border-border',
      outline: 'bg-transparent text-fg hover:bg-surface-subtle border-2 border-border',
      ghost: 'bg-transparent text-fg hover:bg-surface-subtle',
      danger: 'bg-danger text-danger-fg hover:opacity-90 shadow-lg shadow-destructive/25',
      premium: 'bg-premium text-premium-fg hover:opacity-90 shadow-lg shadow-purple-500/25',
      info: 'bg-info text-info-fg hover:opacity-90 shadow-lg shadow-primary/25',
      warning: 'bg-warning text-warning-fg hover:opacity-90 shadow-lg shadow-warning/25',
      success: 'bg-success text-success-fg hover:opacity-90 shadow-lg shadow-success/25',
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
