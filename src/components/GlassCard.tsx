import React from 'react';
import { Zap, Coins, ChevronRight } from 'lucide-react';

interface GlassCardProps {
  icon: any;
  title: string;
  description: string;
  cost: number;
  costType: 'energy' | 'coin';
  badge?: string;
  accentColor?: string;
  glowColor?: string;
  illustration?: string;
  bgImage?: string;
  bgClassName?: string;
  onClick: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  icon: Icon,
  title,
  description,
  cost,
  costType,
  badge,
  accentColor = 'text-primary',
  glowColor = 'bg-surface',
  illustration,
  bgImage,
  bgClassName = 'w-full h-full object-cover object-[center_right]',
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`skd-card skd-interactive cursor-pointer group w-full text-left skd-focus ${glowColor} border-transparent hover:border-black/5 relative overflow-hidden`}
      onClick={onClick}
    >
      {/* Background Image Layer */}
      {bgImage && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img 
            src={bgImage} 
            alt="" 
            aria-hidden="true" 
            className={`${bgClassName} transition-transform duration-700 group-hover:scale-105`} 
          />
          {/* Subtle readability overlay: strong white on left for text, fading to transparent on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-white/10 md:via-white/50 md:to-transparent" />
        </div>
      )}

      {/* Subtle background abstract shape (only visible if no bgImage) */}
      {!bgImage && (
        <>
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/40 rounded-full blur-2xl opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/30 rounded-full blur-xl opacity-50 pointer-events-none" />
        </>
      )}

      <div className="relative p-5 flex flex-col h-full min-h-[190px] overflow-hidden z-10">
        {illustration && !bgImage && (
          <img src={illustration} alt="" aria-hidden="true" className="pointer-events-none absolute -right-2 -bottom-2 w-28 h-24 object-contain opacity-80 mix-blend-multiply transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-1" />
        )}
        
        {/* Top row: Icon + Badge */}
        <div className="flex items-start justify-between mb-4 relative z-20">
          <div className="w-12 h-12 rounded-2xl bg-white/70 shadow-sm flex items-center justify-center transition-colors duration-200 group-hover:bg-white backdrop-blur-sm">
            <Icon size={24} strokeWidth={2.5} className={`transition-transform duration-200 group-hover:scale-110 ${accentColor}`} />
          </div>
          {badge && (
            <span className="skd-label uppercase rounded-full bg-white/60 text-fg-muted font-bold px-3 py-1 shadow-sm backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>

        {/* Title + Description */}
        <div className="relative z-20 flex-1 max-w-[75%] mt-1">
          <h4 className="font-bold text-[17px] text-fg leading-tight group-hover:text-primary transition-colors duration-200">
            {title}
          </h4>
          <p className="text-[13px] text-fg-muted mt-2 leading-relaxed line-clamp-2 max-w-[95%]">
            {description}
          </p>
        </div>

        {/* Bottom row: Cost + Arrow */}
        <div className="relative z-20 flex items-center justify-between mt-5 pt-3 border-t border-black/5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-fg-muted bg-white/50 px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
            {costType === 'energy' ? (
              <Zap size={14} className="text-energy" />
            ) : (
              <Coins size={14} className="text-coin" />
            )}
            <span>
              {cost === 0 ? 'Gratis' : `${cost.toLocaleString()} ${costType === 'energy' ? 'Energi' : 'Koin'}`}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/60 shadow-sm flex items-center justify-center text-fg-muted group-hover:bg-primary group-hover:text-white transition-all duration-200 group-hover:scale-110">
            <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
};
