import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'coin' | 'premium' | 'xp' | 'energy';
}

const Badge: React.FC<BadgeProps> = ({ 
  className = '', 
  variant = 'default', 
  children, 
  ...props 
}) => {
  const baseClass = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shrink-0';
  
  const variantClasses = {
    default: 'bg-surface-subtle text-fg',
    success: 'bg-success-subtle text-success-fg',
    warning: 'bg-warning-subtle text-warning-fg',
    danger: 'bg-danger-subtle text-danger-fg',
    info: 'bg-info-subtle text-info-fg',
    coin: 'bg-coin-subtle text-coin',
    premium: 'bg-premium-subtle text-premium-text',
    xp: 'bg-xp-subtle text-xp',
    energy: 'bg-energy-subtle text-energy',
  };

  const combinedClassName = `${baseClass} ${variantClasses[variant]} ${className}`;

  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
};

export { Badge };
