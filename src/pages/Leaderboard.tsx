import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Clock, Calendar, Star } from 'lucide-react';
import { getRankForScore, getCurrentSeason, getSeasonDates, RANK_TIERS } from '../data/ranks';

const LEADERBOARD_DATA = [
  { rank: 1, name: 'BudiSantoso', xp: 9820 },
  { rank: 2, name: 'SitiRahma', xp: 8640 },
  { rank: 3, name: 'AndiWijaya', xp: 7910 },
  { rank: 4, name: 'Raden Saori', xp: 3800, isMe: true },
  { rank: 5, name: 'DewiBulan', xp: 3210 },
  { rank: 6, name: 'FajarPagi', xp: 2870 },
  { rank: 7, name: 'NurHidayah', xp: 2540 },
  { rank: 8, name: 'ArioSukma', xp: 2200 },
  { rank: 9, name: 'MayaSari', xp: 1980 },
  { rank: 10, name: 'YudiPratama', xp: 1750 },
  { rank: 11, name: 'LestariPutri', xp: 1480 },
  { rank: 12, name: 'RizqiHakim', xp: 1200 },
  { rank: 13, name: 'CandraKusuma', xp: 980 },
  { rank: 14, name: 'PutriAyunda', xp: 800 },
  { rank: 15, name: 'HafizDarmawan', xp: 620 },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const season = getCurrentSeason();
  const { start, end, daysLeft, resetDate } = getSeasonDates();
  const [activeTab, setActiveTab] = useState<'all' | 'friends'>('all');

  const myData = LEADERBOARD_DATA.find(p => p.isMe);
  const myRank = getRankForScore(myData?.xp ?? 0);

  return (
    <div className="min-h-screen bg-skd-bg transition-colors pb-28">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-skd-bg/80 backdrop-blur-md border-b border-skd-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-skd-muted/10 rounded-full transition-colors text-skd-text"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-skd-text">Liga Bulanan</h1>
            <p className="text-[10px] text-skd-muted font-bold">Musim {season}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Clock size={12} className={daysLeft <= 5 ? 'text-skd-danger' : 'text-skd-accent'} />
            <span className={daysLeft <= 5 ? 'text-skd-danger' : 'text-skd-accent'}>{daysLeft} hari</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5 pt-5">

        {/* ── Season Info Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg shadow-blue-500/20"
        >
          <div>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Periode Musim</p>
            <p className="text-white font-bold text-sm">{start} – {end}</p>
            <p className="text-white/60 text-[10px] mt-0.5">Reset: {resetDate}</p>
          </div>
          <div className="text-right">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </motion.div>

        {/* ── My position card ── */}
        {myData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gradient-to-br ${myRank.color}/10 border ${myRank.borderColor} rounded-2xl p-4 flex items-center gap-4 shadow-md`}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${myRank.color} flex items-center justify-center text-2xl shadow-sm`}>
              {myRank.emoji}
            </div>
            <div className="flex-1">
              <p className="text-xs text-skd-muted font-bold uppercase tracking-wider">Posisi Kamu</p>
              <p className={`text-lg font-black ${myRank.textColor}`}>#{myData.rank} — {myData.name}</p>
              <p className="text-xs text-skd-muted">{myRank.name} · {myData.xp.toLocaleString()} XP</p>
            </div>
            <Star size={20} className="text-skd-accent fill-skd-accent/30 shrink-0" />
          </motion.div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-2 bg-skd-card rounded-xl p-1 border border-skd-border">
          {(['all', 'friends'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-skd-muted hover:text-skd-text'
                }`}
            >
              {tab === 'all' ? '🌏 Semua Pemain' : '👥 Teman'}
            </button>
          ))}
        </div>

        {/* ── Top 3 Podium ── */}
        {activeTab === 'all' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-end justify-center gap-3 pt-2"
          >
            {[LEADERBOARD_DATA[1], LEADERBOARD_DATA[0], LEADERBOARD_DATA[2]].map((p, i) => {
              const tier = getRankForScore(p.xp);
              const isFirst = i === 1;
              const heights = ['h-20', 'h-28', 'h-14'];
              const podiumColors = [
                'bg-gray-400/20 border-gray-400/30',
                'bg-yellow-500/20 border-yellow-500/40',
                'bg-amber-700/20 border-amber-600/30'
              ];
              const medals = ['🥈', '🥇', '🥉'];

              return (
                <motion.div
                  key={p.rank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex flex-col items-center gap-2 flex-1 ${isFirst ? '-translate-y-3' : ''}`}
                >
                  {isFirst && <span className="text-3xl">👑</span>}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {tier.emoji}
                  </div>
                  <p className={`text-[10px] font-black text-center truncate max-w-[80px] ${p.isMe ? 'text-skd-accent' : 'text-skd-text'}`}>{p.name}</p>
                  <p className="text-[9px] text-skd-muted font-space">{p.xp.toLocaleString()} XP</p>
                  <div className={`w-full ${heights[i]} ${podiumColors[i]} rounded-t-xl border flex items-center justify-center text-xl font-black`}>
                    {medals[i]}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ── Full List ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            <p className="text-[10px] text-skd-muted uppercase font-bold tracking-widest px-1 mb-3">
              {activeTab === 'all' ? `${LEADERBOARD_DATA.length} Peserta` : 'Daftar Teman'}
            </p>

            {activeTab === 'friends' && (
              <div className="text-center py-12 text-skd-muted">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-bold">Belum ada teman yang ditambahkan</p>
                <p className="text-xs mt-1">Tambah teman dari halaman Profil</p>
              </div>
            )}

            {activeTab === 'all' && LEADERBOARD_DATA.map((player, idx) => {
              const tier = getRankForScore(player.xp);
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

              return (
                <motion.div
                  key={player.rank}
                  variants={itemVariants}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors
                    ${player.isMe
                      ? `bg-gradient-to-r ${tier.color}/10 ${tier.borderColor} shadow-md`
                      : 'bg-skd-card border-skd-border hover:bg-skd-muted/5'}`}
                >
                  {/* Position */}
                  <div className={`w-7 text-center font-black text-base shrink-0
                    ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-skd-muted'}`}>
                    {medal ?? `#${player.rank}`}
                  </div>

                  {/* Rank icon */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                    {tier.emoji}
                  </div>

                  {/* Name + rank */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${player.isMe ? tier.textColor : 'text-skd-text'}`}>
                      {player.name}{player.isMe && ' 👤'}
                    </p>
                    <p className={`text-[10px] font-bold ${tier.textColor}`}>{tier.name}</p>
                  </div>

                  {/* XP bar + score */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black font-space text-skd-text">{player.xp.toLocaleString()}</p>
                    <p className="text-[9px] text-skd-muted">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* ── Rank Tier Legend ── */}
        <div className="pt-2 pb-4">
          <p className="text-[10px] text-skd-muted uppercase font-bold tracking-widest mb-3">Tingkatan Rank</p>
          <div className="grid grid-cols-4 gap-2">
            {RANK_TIERS.map(tier => (
              <div key={tier.id} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border ${tier.borderColor} bg-gradient-to-br ${tier.color}/10`}>
                <span className="text-xl">{tier.emoji}</span>
                <span className={`text-[9px] font-black ${tier.textColor}`}>{tier.name}</span>
                <span className="text-[8px] text-skd-muted font-space">{tier.minScore.toLocaleString()}+ XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
