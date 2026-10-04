import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface GlassStatCardProps {
  icon: any;
  value: React.ReactNode;
  label: string;
  trend?: string;
  isUp?: boolean;
  accentColor?: string;
}

export const GlassStatCard: React.FC<GlassStatCardProps> = ({
  icon: Icon,
  value,
  label,
  trend,
  isUp,
  accentColor = 'text-primary',
}) => {
  // Extract base color from text-{color}-{shade} if possible to use as background
  let bgClass = 'bg-surface-container';
  if (accentColor.includes('emerald')) bgClass = 'bg-emerald-50 text-emerald-600';
  else if (accentColor.includes('blue')) bgClass = 'bg-blue-50 text-blue-600';
  else if (accentColor.includes('orange')) bgClass = 'bg-orange-50 text-orange-600';
  else if (accentColor.includes('red')) bgClass = 'bg-red-50 text-red-600';

  return (
    <div
      className="skd-card skd-card-tonal animate-fade-in-up p-4 sm:p-5 flex flex-col justify-between h-full min-h-[140px] border border-black/5 hover:border-black/10 transition-all hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${bgClass}`}>
        <Icon size={20} className={accentColor} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-3xl font-black text-fg font-space leading-none mb-1 tracking-tight">
          {value}
        </p>
        <p className="text-[11px] sm:text-xs font-bold text-fg-muted uppercase tracking-wider">{label}</p>
      </div>
      {trend && (
        <div className={`mt-3 text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded-md w-max ${isUp ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
          {isUp ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
