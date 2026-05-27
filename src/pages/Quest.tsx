import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle2, Flame, Clock, Brain, Coins } from 'lucide-react';
import { fetchProfile, updateProfile } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';

const DAILY_QUESTS_METADATA = [
  { id: 1, title: 'Jawab 10 Soal TWK', total: 10, reward: 100, icon: Brain },
  { id: 2, title: 'Raih Combo 5x', total: 5, reward: 50, icon: Flame },
  { id: 3, title: 'Selesaikan Latihan TIU', total: 1, reward: 150, icon: Clock },
];

const WEEKLY_QUESTS_METADATA = [
  { id: 4, title: 'Masuk Top 10 Liga', total: 10, reward: 500, icon: Target },
  { id: 5, title: 'Survival Mode: Jawab 30 Soal', total: 30, reward: 300, icon: Flame },
];

export default function Quest() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile().then(p => setProfile(p));
  }, []);

  const handleClaim = async (questId: number, reward: number, title: string) => {
    if (!profile) return;
    
    // Safety check if already claimed
    if (profile.quests_claimed?.includes(questId)) return;

    const updatedCoins = profile.coins + reward;
    const updatedClaimed = [...(profile.quests_claimed || []), questId];

    const updated = await updateProfile({
      coins: updatedCoins,
      quests_claimed: updatedClaimed
    });

    setProfile(updated);
    setToastMessage(`Sukses klaim hadiah +${reward} Koin dari misi "${title}"!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const renderQuestCard = (quest: any) => {
    const progress = profile?.quests_progress?.[quest.id] || 0;
    const isCompleted = progress >= quest.total;
    const isClaimed = profile?.quests_claimed?.includes(quest.id) || false;
    const progressPercentage = Math.min((progress / quest.total) * 100, 100);

    return (
      <motion.div
        key={quest.id}
        whileHover={{ scale: isCompleted && !isClaimed ? 1.03 : 1.01 }}
        className={`p-4 md:p-5 rounded-2xl border flex items-center gap-4 relative overflow-hidden transition-all shadow-sm ${
          isClaimed 
            ? 'bg-skd-success/5 border-skd-success/20 opacity-60' 
            : isCompleted
              ? 'bg-gradient-to-r from-skd-success/15 via-skd-success/5 to-transparent border-skd-success/60 shadow-lg shadow-skd-success/5'
              : 'bg-skd-card border-skd-border hover:border-skd-muted/30'
        }`}
      >
        {isCompleted && !isClaimed && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-skd-success/10 blur-2xl rounded-full animate-pulse" />
        )}
        
        <div className={`w-12 h-12 md:w-14 md:h-14 flex shrink-0 items-center justify-center rounded-xl ${
          isClaimed 
            ? 'bg-skd-success/20 text-skd-success' 
            : isCompleted ? 'bg-skd-success text-white shadow-lg shadow-skd-success/20' : 'bg-skd-muted/10 text-skd-text'
        }`}>
          {isClaimed ? <CheckCircle2 size={24} /> : <quest.icon size={24} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-xs md:text-sm truncate mb-1.5 ${
            isClaimed ? 'text-skd-success' : isCompleted ? 'text-skd-success animate-pulse' : 'text-skd-text'
          }`}>
            {quest.title}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-skd-muted/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  isClaimed || isCompleted ? 'bg-skd-success' : 'bg-skd-accent'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-[10px] font-space font-bold text-skd-muted shrink-0">
              {progress}/{quest.total}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`flex items-center gap-1 font-space font-bold text-xs md:text-sm ${
            isClaimed ? 'text-skd-success' : isCompleted ? 'text-skd-success' : 'text-yellow-500'
          }`}>
            +{quest.reward} <Coins size={14} className={isClaimed || isCompleted ? 'text-skd-success fill-skd-success/20' : 'text-yellow-500 fill-yellow-500'} />
          </div>
          
          {isClaimed ? (
            <span className="text-[9px] text-skd-success font-bold px-2 py-0.5 bg-skd-success/15 rounded-full border border-skd-success/20">
              Klaim Selesai
            </span>
          ) : isCompleted ? (
            <button
              onClick={() => handleClaim(quest.id, quest.reward, quest.title)}
              className="text-[10px] text-white bg-skd-success hover:bg-skd-success/90 font-black px-3 py-1 rounded-full shadow-md shadow-skd-success/20 active:scale-95 transition-all"
            >
              Klaim
            </button>
          ) : (
            <span className="text-[9px] text-skd-muted font-bold px-2 py-0.5 bg-skd-muted/10 rounded-full">
              Berjalan
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 pb-24 max-w-5xl mx-auto min-h-screen">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-skd-success text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] whitespace-nowrap text-xs md:text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="pt-2 md:pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-skd-text">Quest Harian & Mingguan</h1>
          <p className="text-sm text-skd-muted mt-1">Selesaikan misi untuk mendapatkan koin ekstra!</p>
        </div>
        <div className="flex items-center gap-1.5 bg-skd-card px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-skd-border shadow-sm">
          <Coins size={20} className="text-yellow-500 fill-yellow-500 animate-pulse" />
          <span className="font-space font-bold text-skd-text md:text-lg">
            {profile ? profile.coins.toLocaleString() : '1,240'}
          </span>
        </div>
      </header>

      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-skd-border pb-2">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-skd-text">
            <Flame className="text-skd-danger" size={24} /> Quest Harian
          </h2>
          <span className="text-xs md:text-sm text-skd-muted font-space font-bold bg-skd-muted/10 px-3 py-1 rounded-full">Reset: 14:20:00</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {DAILY_QUESTS_METADATA.map(renderQuestCard)}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-skd-border pb-2">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-skd-text">
            <Target className="text-skd-premium" size={24} /> Quest Mingguan
          </h2>
          <span className="text-xs md:text-sm text-skd-muted font-space font-bold bg-skd-muted/10 px-3 py-1 rounded-full">Reset: 5 Hari</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {WEEKLY_QUESTS_METADATA.map(renderQuestCard)}
        </div>
      </section>
    </div>
  );
}
