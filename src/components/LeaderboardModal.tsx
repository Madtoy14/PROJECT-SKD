import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Users, Clock } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { getRankForScore, getCurrentSeason, getSeasonDates } from '../data/ranks';

interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  isMe?: boolean;
}

interface LeaderboardModalProps {
  data: LeaderboardEntry[];
  onClose: () => void;
}

export default function LeaderboardModal({ data, onClose }: LeaderboardModalProps) {
  const season = getCurrentSeason();
  const { start, end, daysLeft, resetDate } = getSeasonDates();
  const modalRef = useFocusTrap(true, onClose);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-overlay backdrop-blur-sm z-0"
        data-backdrop="true"
      />

      {/* Modal */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative z-10 bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-600 to-cyan-500 p-6 rounded-t-3xl sm:rounded-t-3xl overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Papan Peringkat"
            className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors z-20"
          >
            <X size={18} />
          </button>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
                <Users size={20} className="text-fg" />
              </div>
              <div>
                <p className="text-fg/70 text-[10px] font-bold uppercase tracking-widest">Liga Bulanan</p>
                <h2 id="leaderboard-title" className="text-xl font-black text-fg">Musim {season}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Season Info Bar */}
        <div className="px-5 py-3 bg-bg/60 border-b border-border flex items-center justify-between flex-wrap gap-2 shrink-0">
          <span className="text-xs text-fg-muted">
            📅 <span className="text-fg font-bold">{start}</span> – <span className="text-fg font-bold">{end}</span>
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Clock size={12} className={daysLeft <= 5 ? 'text-danger' : 'text-primary'} />
            <span className={daysLeft <= 5 ? 'text-danger' : 'text-primary'}>{daysLeft} hari lagi</span>
            <span className="text-fg-muted">· Reset {resetDate}</span>
          </div>
        </div>

        {/* Top 3 Podium */}
        {data.length >= 3 && (
          <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-end justify-center gap-3">
              {/* 2nd place */}
              {(() => {
                const p = data[1];
                const tier = getRankForScore(p.xp);
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-2xl">{tier.emoji}</span>
                    <p className={`text-xs font-bold truncate max-w-full text-center ${p.isMe ? 'text-primary' : 'text-fg'}`}>{p.name}</p>
                    <p className="text-[10px] text-fg-muted font-space">{p.xp.toLocaleString()} XP</p>
                    <div className="w-full h-16 bg-gray-400/40 rounded-t-xl flex items-center justify-center font-black text-gray-300 text-xl border border-gray-400/30">2</div>
                  </div>
                );
              })()}
              {/* 1st place */}
              {(() => {
                const p = data[0];
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-3xl">👑</span>
                    <p className={`text-xs font-bold truncate max-w-full text-center ${p.isMe ? 'text-primary' : 'text-fg'}`}>{p.name}</p>
                    <p className="text-[10px] text-fg-muted font-space">{p.xp.toLocaleString()} XP</p>
                    <div className="w-full h-24 bg-yellow-500/50 rounded-t-xl flex items-center justify-center font-black text-yellow-300 text-2xl border border-yellow-500/30">1</div>
                  </div>
                );
              })()}
              {/* 3rd place */}
              {(() => {
                const p = data[2];
                const tier = getRankForScore(p.xp);
                return (
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-2xl">{tier.emoji}</span>
                    <p className={`text-xs font-bold truncate max-w-full text-center ${p.isMe ? 'text-primary' : 'text-fg'}`}>{p.name}</p>
                    <p className="text-[10px] text-fg-muted font-space">{p.xp.toLocaleString()} XP</p>
                    <div className="w-full h-10 bg-amber-700/40 rounded-t-xl flex items-center justify-center font-black text-amber-600 text-xl border border-amber-600/30">3</div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-[10px] text-fg-muted uppercase font-bold tracking-widest px-1 mb-3">Semua Peserta</p>
          {data.map((player, idx) => {
            const tier = getRankForScore(player.xp);
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
            return (
              <motion.div
                key={player.rank}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border
                  ${player.isMe
                    ? 'bg-primary/8 border-primary/30 shadow-sm'
                    : 'bg-bg/50 border-border/50'}`}
              >
                {/* Position */}
                <div className={`w-7 text-center font-black text-sm shrink-0
                  ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-fg-muted' : idx === 2 ? 'text-amber-600' : 'text-fg-muted'}`}>
                  {medal ?? `#${player.rank}`}
                </div>

                {/* Rank tier emoji */}
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-lg shrink-0 shadow-sm`}>
                  {tier.emoji}
                </div>

                {/* Name + rank name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${player.isMe ? 'text-primary' : 'text-fg'}`}>
                    {player.name}{player.isMe && ' 👤'}
                  </p>
                  <p className={`text-[10px] font-bold ${tier.textColor}`}>{tier.name}</p>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-black font-space text-fg">{player.xp.toLocaleString()}</p>
                  <p className="text-[9px] text-fg-muted">XP</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-bg/40 text-center shrink-0">
          <p className="text-[10px] text-fg-muted">Leaderboard di-reset setiap awal bulan baru</p>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
