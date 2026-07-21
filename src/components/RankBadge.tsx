import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, ChevronRight } from 'lucide-react';
import {
  RANK_TIERS,
  getRankForScore,
  getRankProgress,
  getCurrentSeason,
  getSeasonDates,
} from '../data/ranks';

interface RankBadgeProps {
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showSeason?: boolean;
  className?: string;
  clickable?: boolean; // show modal on click
}

// ─── Shared Modal ────────────────────────────────────────────────────────────
function RankModal({ score, onClose }: { score: number; onClose: () => void }) {
  const currentRank = getRankForScore(score);
  const { nextRank, pointsNeeded } = getRankProgress(score);
  const season = getCurrentSeason();
  const { start, end, daysLeft, resetDate } = getSeasonDates();

  const progressPct = Math.min(
    (score - currentRank.minScore) / ((nextRank?.minScore ?? currentRank.minScore + 1) - currentRank.minScore) * 100,
    100
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-overlay backdrop-blur-sm animate-[fadeInScale_0.2s_ease-out_both]"
      />

      {/* Modal sheet */}
      <div className="relative z-10 bg-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl overflow-hidden animate-[fadeInUp_0.25s_ease-out_both]">
        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${currentRank.color} p-6 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors z-20"
          >
            <X size={18} />
          </button>

          <div className="relative z-10">
            <p className="text-fg/70 text-xs font-bold uppercase tracking-widest mb-1">Rank Kamu · Musim {season}</p>
            <div className="flex items-center gap-3">
              <span className="text-5xl">{currentRank.emoji}</span>
              <div>
                <h2 className="text-3xl font-black text-fg drop-shadow">{currentRank.name}</h2>
                <p className="text-fg/70 text-xs">{currentRank.description}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-fg/70 font-bold mb-1.5">
                  <span>{score.toLocaleString()} XP</span>
                  {nextRank ? (
                    <span>{nextRank.emoji} {nextRank.name} — {pointsNeeded.toLocaleString()} XP lagi</span>
                  ) : (
                    <span>Rank Tertinggi 🎉</span>
                  )}
                </div>
                <div className="h-2.5 bg-black/30 rounded-full overflow-hidden">
                  {/* ponytail: CSS transition replaces motion.div width animation */}
                  <div
                    className="h-full bg-black/10 rounded-full transition-[width] duration-[1200ms] ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Season info bar */}
        <div className="px-5 py-3 bg-bg/60 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-fg-muted">
            <Calendar size={13} />
            <span>Musim: <span className="text-fg font-bold">{start}</span> – <span className="text-fg font-bold">{end}</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <Clock size={13} className="text-primary" />
            <span className={daysLeft <= 5 ? 'text-danger' : 'text-primary'}>
              {daysLeft} hari tersisa
            </span>
            <span className="text-fg-muted">· Reset: {resetDate}</span>
          </div>
        </div>

        {/* All rank tiers list */}
        <div className="p-5 space-y-2.5 max-h-[50vh] overflow-y-auto">
          <p className="text-[10px] font-bold text-fg-muted uppercase tracking-widest mb-3">Semua Tingkatan Rank</p>

          {[...RANK_TIERS].reverse().map((tier) => {
            const isActive = tier.id === currentRank.id;
            const isUnlocked = score >= tier.minScore;
            const isNext = nextRank?.id === tier.id;
            const nextTierMinScore = RANK_TIERS[RANK_TIERS.findIndex(t => t.id === tier.id) + 1]?.minScore ?? null;

            return (
              <div
                key={tier.id}
                className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all
                  ${isActive
                    ? `bg-gradient-to-r ${tier.color}/20 ${tier.borderColor} shadow-md`
                    : isNext
                      ? 'bg-bg border-border border-dashed'
                      : isUnlocked
                        ? 'bg-bg/50 border-border/50'
                        : 'bg-bg/30 border-border/30 opacity-50'
                  }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0
                  ${isUnlocked ? `bg-gradient-to-br ${tier.color}` : 'bg-skd-muted/10'}`}>
                  {tier.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${isActive ? tier.textColor : isUnlocked ? 'text-fg' : 'text-fg-muted'}`}>
                      {tier.name}
                    </span>
                    {isActive && (
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r ${tier.color} text-white`}>
                        Rank Anda
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-subtle text-fg-muted">
                        Berikutnya
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-fg-muted mt-0.5 truncate">{tier.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-sm font-black font-space ${isActive ? tier.textColor : isUnlocked ? 'text-fg' : 'text-fg-muted'}`}>
                    {tier.minScore.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-fg-muted">
                    {nextTierMinScore !== null ? `– ${(nextTierMinScore - 1).toLocaleString()} XP` : '+ XP'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-5 py-4 border-t border-border bg-bg/40 text-center">
          <p className="text-[10px] text-fg-muted">
            XP diperoleh dari setiap jawaban benar. Rank di-reset setiap awal bulan.
            <br/>
            <span className="text-primary font-bold">TWK / TIU benar = 50 XP · TKP = 10–50 XP per opsi</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── RankBadge (pill) ────────────────────────────────────────────────────────
export default function RankBadge({
  score = 3800,
  size = 'md',
  showProgress = false,
  showSeason = false,
  className = '',
  clickable = true,
}: RankBadgeProps) {
  const rank = getRankForScore(score);
  const { progress, nextRank, pointsNeeded } = getRankProgress(score);
  const season = getCurrentSeason();
  const [modalOpen, setModalOpen] = useState(false);

  const sizeMap = {
    sm: { emoji: 'text-base sm:text-lg', name: 'text-[10px] sm:text-xs', badge: 'px-2 py-0.5 sm:px-2.5 sm:py-1 gap-1 sm:gap-1.5' },
    md: { emoji: 'text-xl', name: 'text-sm', badge: 'px-3 py-1.5 gap-2' },
    lg: { emoji: 'text-3xl', name: 'text-base', badge: 'px-4 py-2 gap-2.5' },
  }[size];

  return (
    <>
      <div className={`flex flex-col items-start gap-2 ${className}`}>
        {showSeason && (
          <span className="text-[10px] font-bold text-fg-muted uppercase tracking-widest">
            Musim {season}
          </span>
        )}

        <button
          onClick={clickable ? () => setModalOpen(true) : undefined}
          className={`inline-flex items-center ${sizeMap.badge} rounded-full bg-gradient-to-r ${rank.color} shadow-lg transition-all
            ${clickable ? 'hover:scale-105 hover:brightness-95 focus-visible:outline-none focus-visible:ring focus-visible:ring-ring active:scale-95 cursor-pointer' : 'cursor-default'}`}
        >
          <span className={sizeMap.emoji}>{rank.emoji}</span>
          <span className={`font-black ${sizeMap.name} text-fg drop-shadow-sm`}>{rank.name}</span>
          {clickable && <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-fg/70 ml-0.5" />}
        </button>

        {showProgress && (
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold">
              <span className={rank.textColor}>{score.toLocaleString()} XP</span>
              {nextRank ? (
                <span className="text-fg-muted">{nextRank.name} dalam {pointsNeeded.toLocaleString()} XP</span>
              ) : (
                <span className="text-yellow-400">Rank Tertinggi!</span>
              )}
            </div>
            <div className="h-2 bg-surface-subtle rounded-full overflow-hidden border border-border/50">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${rank.color} transition-[width] duration-[1200ms] ease-out`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {modalOpen && <RankModal score={score} onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ─── RankCard (full card for Profile page) ───────────────────────────────────
export function RankCard({ score = 3800 }: { score?: number }) {
  const currentRank = getRankForScore(score);
  const { progress, nextRank, pointsNeeded } = getRankProgress(score);
  const season = getCurrentSeason();
  const { daysLeft, resetDate } = getSeasonDates();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={`rounded-2xl border bg-gradient-to-br ${currentRank.color}/10 ${currentRank.borderColor} p-5 space-y-4 shadow-lg cursor-pointer hover:brightness-95 focus-visible:outline-none focus-visible:ring focus-visible:ring-ring transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] font-bold text-fg-muted uppercase tracking-widest mb-0.5">Musim Aktif</p>
            <p className="text-xs font-bold text-fg">{season}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className={daysLeft <= 5 ? 'text-danger' : 'text-primary'} />
            <span className={`text-xs font-bold ${daysLeft <= 5 ? 'text-danger' : 'text-primary'}`}>
              {daysLeft} hari lagi
            </span>
            <span className="text-[10px] text-fg-muted">· Reset {resetDate}</span>
          </div>
        </div>

        {/* Rank display */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentRank.color} flex items-center justify-center text-3xl shadow-lg`}>
            {currentRank.emoji}
          </div>
          <div>
            <p className={`text-2xl font-black ${currentRank.textColor}`}>{currentRank.name}</p>
            <p className="text-xs text-fg-muted">{currentRank.description}</p>
          </div>
          <ChevronRight size={18} className="ml-auto text-fg-muted" />
        </div>

        {/* Progress to next rank */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className={currentRank.textColor}>{score.toLocaleString()} XP</span>
            {nextRank ? (
              <span className="text-fg-muted">{nextRank.emoji} {nextRank.name} → {pointsNeeded.toLocaleString()} XP lagi</span>
            ) : (
              <span className="text-yellow-400">👑 Puncak Tertinggi!</span>
            )}
          </div>
          <div className="h-2.5 bg-surface-subtle rounded-full overflow-hidden border border-border/30">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${currentRank.color} relative overflow-hidden transition-[width] duration-[1400ms] ease-out`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-black/10 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tier ladder */}
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-end justify-between gap-1">
            {RANK_TIERS.map((tier) => {
              const isActive = tier.id === currentRank.id;
              const isPast = tier.minScore < currentRank.minScore;
              return (
                <div key={tier.id} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-full h-1.5 rounded-full transition-all ${isPast || isActive ? `bg-gradient-to-r ${tier.color}` : 'bg-surface-subtle'}`} />
                  <span className={`text-[8px] ${isActive ? 'text-xl leading-none' : isPast ? 'text-[8px] opacity-50' : 'text-[8px] opacity-20'}`}>
                    {isActive ? tier.emoji : '·'}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-fg-muted text-center mt-2">Klik untuk lihat semua rank</p>
        </div>
      </div>

      {modalOpen && <RankModal score={score} onClose={() => setModalOpen(false)} />}
    </>
  );
}
