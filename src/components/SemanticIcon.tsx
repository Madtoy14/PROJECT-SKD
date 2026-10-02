import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

type SemanticIconProps = {
  icon: LucideIcon;
  label?: string;
  container?: boolean;
  className?: string;
};

export function SemanticIcon({ icon: Icon, label, container = false, className }: SemanticIconProps) {
  const content = <Icon aria-hidden={!label} aria-label={label} size={20} strokeWidth={2} />;
  if (!container) return <span className={cn('inline-flex items-center justify-center', className)}>{content}</span>;
  return <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-[var(--m3-shape-medium)] bg-primary-container text-primary', className)}>{content}</span>;
}
