import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, Flame, Clock, Brain, Coins } from 'lucide-react';
import { fetchProfile, supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';

const DAILY_QUESTS_METADATA = [
  { id: 1, title: 'Jawab 10 Soal TWK', total: 10, reward: 100, icon: Brain },
  { id: 2, title: 'Raih Combo 5x', total: 5, reward: 50, icon: Flame },
  { id: 3, title: 'Selesaikan Latihan TIU', total: 1, reward: 150, icon: Clock },
];

const WEEKLY_QUESTS_METADATA = [
  { id: 4, title: 'Selesaikan 10 Kuis', total: 10, reward: 500, icon: Target },
  { id: 5, title: 'Survival Mode: Jawab 30 Soal', total: 30, reward: 300, icon: Flame },
];

export default function Quest() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile().then(p => { setProfile(p); setLoading(false); });
  }, []);

  // --- Weekly Quest Reset Check ---
  useEffect(() => {
    const checkWeeklyReset = async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        const { data, error } = await supabase.rpc('reset_weekly_quests');
        if (error) {
          console.error('Weekly reset check failed:', error);
          return;
        }
        if (data?.reset) {
          // Weekly quests direset, refresh profile
          const fresh = await fetchProfile();
          if (fresh) setProfile(fresh);
        }
      } catch (err) {
        console.error('Weekly reset error:', err);
      }
    };
    checkWeeklyReset();
  }, []);

  // --- Real-time Midnight Reset Listener ---
  useEffect(() => {
    const todayAtMount = new Date().toDateString();
    const interval = setInterval(() => {
       if (new Date().toDateString() !== todayAtMount) {
          // Hari berganti (tepat pukul 00:00), refresh halaman untuk memicu reset quest
          window.location.reload();
       }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const [timeLeftStr, setTimeLeftStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeftStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    updateTime();
    const iv = setInterval(updateTime, 1000);
    return () => clearInterval(iv);
  }, []);

  const handleClaim = async (questId: number, reward: number, title: string) => {
    if (!profile) return;

    // UI guard; security boundary di RPC claim_quest
    const currentProgress = profile.quests_progress?.[questId] || 0;
    if (currentProgress === 999) return;
    if (!isSupabaseConfigured() || !supabase) {
      setToastMessage('Koneksi server tidak tersedia.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    try {
      // Fail-closed: hanya RPC claim_quest (server). Jangan mutasi coins dari client.
      const { data, error } = await supabase.rpc('claim_quest', { p_quest_id: questId });
      if (error || !data?.success) {
        const reason = (data?.reason || error?.message || 'Gagal klaim quest').toString();
        const msgMap: Record<string, string> = {
          already_claimed: 'Quest sudah diklaim.',
          progress_insufficient: 'Progress belum cukup.',
          not_authenticated: 'Login dulu.',
          unknown_quest: 'Quest tidak dikenal.',
          profile_not_found: 'Profil tidak ditemukan.',
        };
        setToastMessage(msgMap[reason] || `Gagal klaim: ${reason}`);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }

      const fresh = await fetchProfile();
      if (fresh) setProfile(fresh);
      const earned = data.coins_earned ?? reward;
      setToastMessage(`Sukses klaim hadiah +${earned} Koin dari misi "${title}"!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage('Terjadi kesalahan saat klaim quest');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const renderQuestCard = (quest: any) => {
    let progress = profile?.quests_progress?.[quest.id] || 0;
    const isClaimed = progress === 999;
    
    // Jika sudah diklaim, tampilkan progress penuh di UI
    if (isClaimed) progress = quest.total;
    
    const isCompleted = isClaimed || progress >= quest.total;
    const progressPercentage = Math.min((progress / quest.total) * 100, 100);

    return (
      <motion.div
        key={quest.id}
        whileHover={{ scale: isCompleted && !isClaimed ? 1.03 : 1.01 }}
        className={`p-4 md:p-5 rounded-2xl border flex items-center gap-4 relative overflow-hidden transition-all shadow-sm ${
          isClaimed 
            ? 'bg-surface-subtle border-border opacity-70' 
            : isCompleted
              ? 'bg-success-subtle border-success shadow-sm'
              : 'bg-surface border-border hover:border-border'
        }`}
      >
        {isCompleted && !isClaimed && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 blur-2xl rounded-full animate-pulse pointer-events-none z-0" />
        )}
        
        <div className={`relative z-10 w-12 h-12 md:w-14 md:h-14 flex shrink-0 items-center justify-center rounded-xl ${
          isClaimed 
            ? 'bg-surface-subtle text-success' 
            : isCompleted ? 'bg-success text-success-fg shadow-md shadow-success/20' : 'bg-locked-subtle text-fg'
        }`}>
          {isClaimed ? <CheckCircle2 size={24} /> : <quest.icon size={24} />}
        </div>
        
        <div className="relative z-10 flex-1 min-w-0">
          <h3 className={`font-bold text-xs md:text-sm truncate mb-1.5 ${
            isClaimed ? 'text-success' : isCompleted ? 'text-success animate-pulse' : 'text-fg'
          }`}>
            {quest.title}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-locked-subtle rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  isClaimed || isCompleted ? 'bg-success' : 'bg-primary'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-[10px] font-space font-bold text-fg-muted shrink-0">
              {progress}/{quest.total}
            </span>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col items-end gap-2 shrink-0">
          <div className={`flex items-center gap-1 font-space font-bold text-xs md:text-sm ${
            isClaimed ? 'text-success' : isCompleted ? 'text-success' : 'text-coin'
          }`}>
            +{quest.reward} <Coins size={14} className={isClaimed || isCompleted ? 'text-success' : 'text-coin fill-yellow-500'} />
          </div>
          
          {isClaimed ? (
            <span className="text-[9px] text-success font-bold px-2 py-0.5 bg-surface-subtle rounded-full border border-border text-fg-muted">
              Klaim Selesai
            </span>
          ) : isCompleted ? (
            <button
              onClick={() => handleClaim(quest.id, quest.reward, quest.title)}
              className="text-[10px] text-white bg-success hover:bg-success/90 text-success-fg font-black px-3 py-1 rounded-full shadow-md shadow-sm/20 active:scale-95 transition-all"
            >
              Klaim
            </button>
          ) : (
            <span className="text-[9px] text-fg-muted font-bold px-2 py-0.5 bg-locked-subtle rounded-full">
              Berjalan
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 pb-24 max-w-5xl mx-auto min-h-screen">
      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-surface-subtle rounded-xl w-48" />
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-surface-subtle rounded-2xl border border-border" />
          ))}
        </div>
      )}
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-success text-success-fg px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] whitespace-nowrap text-xs md:text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="pt-2 md:pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-fg">Quest Harian & Mingguan</h1>
          <p className="text-sm text-fg-muted mt-1">Selesaikan misi untuk mendapatkan koin ekstra!</p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-border shadow-sm">
          <Coins size={20} className="text-coin fill-yellow-500 animate-pulse" />
          <span className="font-space font-bold text-fg md:text-lg">
            {profile ? profile.coins.toLocaleString() : '1,240'}
          </span>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-border pb-2">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-fg">
            <Flame className="text-danger" size={24} /> Quest Harian
          </h2>
          <span className="text-xs md:text-sm text-fg-muted font-space font-bold bg-locked-subtle px-3 py-1 rounded-full">Reset: {timeLeftStr}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {DAILY_QUESTS_METADATA.map(renderQuestCard)}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-border pb-2">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-fg">
            <Target className="text-premium" size={24} /> Quest Mingguan
          </h2>
          <span className="text-xs md:text-sm text-fg-muted font-space font-bold bg-locked-subtle px-3 py-1 rounded-full">Reset: Hari Minggu</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {WEEKLY_QUESTS_METADATA.map(renderQuestCard)}
        </div>
      </section>
    </div>
  );
}
