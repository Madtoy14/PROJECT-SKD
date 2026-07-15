import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Clock, Star, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRankForScore, getCurrentSeason, getSeasonDates, RANK_TIERS } from '../data/ranks';
import { fetchMonthlyLeaderboard, supabase, isSupabaseConfigured } from '../lib/supabase';
import PlayerProfileModal from '../components/PlayerProfileModal';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function Leaderboard() {
  const navigate = useNavigate();
  const season = getCurrentSeason();
  const { start, end, daysLeft, resetDate } = getSeasonDates();
  const [activeTab, setActiveTab] = useState<'all' | 'friends'>('all');
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [mutualFriendIds, setMutualFriendIds] = useState<Set<string>>(new Set());
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  useEffect(() => {
    fetchMonthlyLeaderboard().then(data => {
      const mapped = data.map(item => ({
        ...item,
        xp: item.score
      })).slice(0, 10);
      setLeaderboardData(mapped);
      setLoading(false);
    });
  }, []);

  // Fetch mutual follows saat tab Teman aktif
  useEffect(() => {
    if (activeTab !== 'friends' || !isSupabaseConfigured()) return;
    if (mutualFriendIds.size > 0) return; // sudah di-fetch sebelumnya

    setFriendsLoading(true);
    const fetchMutuals = async () => {
      try {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return;

        // Ambil semua yang current user ikuti (user_id = saya)
        const { data: following } = await supabase!
          .from('friends')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (!following || following.length === 0) return;

        const followingIds = following.map(f => f.friend_id);

        // Dari daftar itu, cari yang juga mengikuti saya balik (mutual)
        const { data: mutuals } = await supabase!
          .from('friends')
          .select('user_id')
          .eq('friend_id', user.id)
          .eq('status', 'accepted')
          .in('user_id', followingIds);

        if (mutuals) {
          setMutualFriendIds(new Set(mutuals.map(m => m.user_id)));
        }
      } catch (err) {
        console.error('Gagal fetch mutual friends:', err);
      } finally {
        setFriendsLoading(false);
      }
    };
    fetchMutuals();
  }, [activeTab]);

  const myData = leaderboardData.find(p => p.isMe);
  const myRank = getRankForScore(myData?.xp ?? 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-premium">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg transition-colors pb-28">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-locked-subtle rounded-full transition-colors text-fg"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-fg">Liga Bulanan</h1>
            <p className="text-[10px] text-fg-muted font-bold">Musim {season}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Clock size={12} className={daysLeft <= 5 ? 'text-danger' : 'text-primary'} />
            <span className={daysLeft <= 5 ? 'text-danger' : 'text-primary'}>{daysLeft} hari</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5 pt-5">

        {/* ── Season Info Banner ── */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg shadow-blue-500/20 animate-[fadeInUp_0.3s_ease-out_both]">
          <div>
            <p className="text-fg/70 text-[10px] font-bold uppercase tracking-widest">Periode Musim</p>
            <p className="text-fg font-bold text-sm">{start} – {end}</p>
            <p className="text-fg/60 text-[10px] mt-0.5">Reset: {resetDate}</p>
          </div>
          <div className="text-right">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Users size={24} className="text-fg" />
            </div>
          </div>
        </div>

        {/* ── My position card ── */}
        {myData && (
          <div className={`bg-gradient-to-br ${myRank.color}/10 border ${myRank.borderColor} rounded-2xl p-4 flex items-center gap-4 shadow-md animate-[fadeInUp_0.3s_ease-out_both]`}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${myRank.color} flex items-center justify-center text-2xl shadow-sm`}>
              {myRank.emoji}
            </div>
            <div className="flex-1">
              <p className="text-xs text-fg-muted font-bold uppercase tracking-wider">Posisi Kamu</p>
              <p className={`text-lg font-black ${myRank.textColor}`}>#{myData.rank} — {myData.name}</p>
              <p className="text-xs text-fg-muted">{myRank.name} · {myData.xp.toLocaleString()} XP</p>
            </div>
            <Star size={20} className="text-primary fill-skd-accent/30 shrink-0" />
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-2 bg-surface rounded-xl p-1 border border-border">
          {(['all', 'friends'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
                }`}
            >
              {tab === 'all' ? '🌏 Semua Pemain' : '👥 Teman'}
            </button>
          ))}
        </div>

        {/* ── Top 3 Podium ── */}
        {activeTab === 'all' && leaderboardData.length > 0 && (
          <div className="flex items-end justify-center gap-3 pt-2 animate-[fadeInUp_0.3s_ease-out_both]">
            {[leaderboardData[1], leaderboardData[0], leaderboardData[2]].filter(Boolean).map((p, i) => {
              const tier = getRankForScore(p.xp);
              const isFirst = p.rank === 1;
              const heights = ['h-20', 'h-28', 'h-14'];
              const podiumColors = [
                'bg-surface-subtle border-border',
                'bg-coin-subtle border-coin',
                'bg-warning-subtle border-warning'
              ];
              const medals = ['🥈', '🥇', '🥉'];

              return (
                <div
                  key={p.rank}
                  onClick={() => setSelectedPlayerId(p.id)}
                  className={`flex flex-col items-center gap-2 flex-1 cursor-pointer hover:scale-105 transition-transform ${isFirst ? '-translate-y-3' : ''}`}
                >
                  {isFirst && <span className="text-3xl">👑</span>}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {tier.emoji}
                  </div>
                  <p className={`text-[10px] font-black text-center truncate max-w-[80px] ${p.isMe ? 'text-primary' : 'text-fg'}`}>{p.name}</p>
                  <p className="text-[9px] text-fg-muted font-space">{p.xp.toLocaleString()} XP</p>
                  <div className={`w-full ${heights[i]} ${podiumColors[i]} rounded-t-xl border flex items-center justify-center text-xl font-black`}>
                    {medals[i]}
                  </div>
                </div>
              );
            })}
          </div>
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
            {/* Header count */}
            {activeTab === 'all' && (
              <p className="text-[10px] text-fg-muted uppercase font-bold tracking-widest px-1 mb-3">
                {leaderboardData.length} Peserta
              </p>
            )}

            {/* ── Tab Teman: mutual follow dari Supabase ── */}
            {activeTab === 'friends' && (
              friendsLoading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : mutualFriendIds.size === 0 ? (
                <div className="text-center py-12 text-fg-muted">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="font-bold">Belum ada teman saling mengikuti</p>
                  <p className="text-xs mt-1">Ikuti pemain lain dari halaman Profil, lalu minta mereka balik mengikutimu</p>
                </div>
              ) : (() => {
                // Filter leaderboard hanya untuk mutual friends + diri sendiri
                const friendList = leaderboardData.filter(p => p.isMe || mutualFriendIds.has(p.id));
                if (friendList.length === 0) {
                  return (
                    <div className="text-center py-12 text-fg-muted">
                      <p className="text-4xl mb-3">🏆</p>
                      <p className="font-bold">Teman kamu belum ada di papan peringkat</p>
                      <p className="text-xs mt-1">Ajak teman bermain agar muncul di sini</p>
                    </div>
                  );
                }
                return (
                  <>
                    <p className="text-[10px] text-fg-muted uppercase font-bold tracking-widest px-1 mb-3">
                      {friendList.length} Teman Saling Mengikuti
                    </p>
                    {friendList.map((player, idx) => {
                      const tier = getRankForScore(player.xp);
                      const medal = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : null;
                      return (
                        <motion.div
                          key={player.rank}
                          variants={itemVariants}
                          onClick={() => setSelectedPlayerId(player.id)}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors cursor-pointer
                            ${player.isMe
                              ? `bg-gradient-to-r ${tier.color}/10 ${tier.borderColor} shadow-md`
                              : 'bg-surface border-border hover:bg-surface-subtle'}`}
                        >
                          <div className={`w-7 text-center font-black text-base shrink-0
                            ${idx === 0 ? 'text-coin' : idx === 1 ? 'text-fg-muted' : idx === 2 ? 'text-amber-600' : 'text-fg-muted'}`}>
                            {medal ?? `#${player.rank}`}
                          </div>
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                            {tier.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${player.isMe ? tier.textColor : 'text-fg'}`}>
                              {player.name}{player.isMe && ' 👤'}
                            </p>
                            <p className={`text-[10px] font-bold ${tier.textColor}`}>{tier.name}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black font-space text-fg">{player.xp.toLocaleString()}</p>
                            <p className="text-[9px] text-fg-muted">XP</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </>
                );
              })()
            )}

            {activeTab === 'all' && leaderboardData.map((player, idx) => {
              const tier = getRankForScore(player.xp);
              const medal = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : null;

              return (
                <motion.div
                  key={player.rank}
                  variants={itemVariants}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors cursor-pointer
                    ${player.isMe
                      ? `bg-gradient-to-r ${tier.color}/10 ${tier.borderColor} shadow-md`
                      : 'bg-surface border-border hover:bg-surface-subtle'}`}
                >
                  {/* Position */}
                  <div className={`w-7 text-center font-black text-base shrink-0
                    ${idx === 0 ? 'text-coin' : idx === 1 ? 'text-fg-muted' : idx === 2 ? 'text-amber-600' : 'text-fg-muted'}`}>
                    {medal ?? `#${player.rank}`}
                  </div>

                  {/* Rank icon */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                    {tier.emoji}
                  </div>

                  {/* Name + rank */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${player.isMe ? tier.textColor : 'text-fg'}`}>
                      {player.name}{player.isMe && ' 👤'}
                    </p>
                    <p className={`text-[10px] font-bold ${tier.textColor}`}>{tier.name}</p>
                  </div>

                  {/* XP bar + score */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black font-space text-fg">{player.xp.toLocaleString()}</p>
                    <p className="text-[9px] text-fg-muted">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* ── Rank Tier Legend ── */}
        <div className="pt-2 pb-4">
          <p className="text-[10px] text-fg-muted uppercase font-bold tracking-widest mb-3">Tingkatan Rank</p>
          <div className="grid grid-cols-4 gap-2">
            {RANK_TIERS.map(tier => (
              <div key={tier.id} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border ${tier.borderColor} bg-gradient-to-br ${tier.color}/10`}>
                <span className="text-xl">{tier.emoji}</span>
                <span className={`text-[9px] font-black ${tier.textColor}`}>{tier.name}</span>
                <span className="text-[8px] text-fg-muted font-space">{tier.minScore.toLocaleString()}+ XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {selectedPlayerId && (
        <PlayerProfileModal 
          playerId={selectedPlayerId} 
          onClose={() => setSelectedPlayerId(null)} 
        />
      )}
    </div>
  );
}
