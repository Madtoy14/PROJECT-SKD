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
  const baseClass = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shrink-0';
  
  const variantClasses = {
    default: 'bg-surface-subtle text-fg',
    success: 'bg-success-subtle text-success-fg',
    warning: 'bg-warning-subtle text-warning-fg',
    danger: 'bg-danger-subtle text-danger-fg',
    info: 'bg-info-subtle text-info-fg',
    coin: 'bg-amber-50 text-warning hover:scale-105 transition-transform duration-300',
    premium: 'bg-premium-subtle text-premium-text',
    xp: 'bg-xp-subtle text-xp',
    energy: 'bg-rose-50 text-destructive hover:scale-105 transition-transform duration-300',
  };

  const combinedClassName = `${baseClass} ${variantClasses[variant]} ${className}`;

  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
};

export { Badge };
