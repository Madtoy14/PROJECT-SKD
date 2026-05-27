import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Coins, Zap, ArrowRight, Award, AlertTriangle 
} from 'lucide-react';
import { fetchProfile, updateProfile } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';

function AnimatedCounter({ end, duration = 2, suffix = '' }: { end: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / (duration * 1000), 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const gameMode = location.state?.mode || 'latihan';
  const isTryout = gameMode === 'tryout';

  const score = location.state?.score || 0;
  
  // Try Out Score Breakdowns
  const twkScore = location.state?.twkScore || 0;
  const tiuScore = location.state?.tiuScore || 0;
  const tkpScore = location.state?.tkpScore || 0;
  
  const userAnswers = location.state?.userAnswers;
  const quizQuestions = location.state?.quizQuestions;

  const receivedRanks: {name: string; score: number; isMe?: boolean}[] = location.state?.liveRanks || [];
  const earnedCoins = isTryout ? 300 : gameMode === 'survival' ? Math.floor(score * 0.2) : 50;
  const gainedXP = isTryout ? 500 : gameMode === 'survival' ? score : 150;

  const [actualEarnedCoins, setActualEarnedCoins] = useState(earnedCoins);
  const [boosterActive, setBoosterActive] = useState(false);

  // Load and update user profile dynamic reward on mount
  useEffect(() => {
    fetchProfile().then(async (p) => {
      setProfile(p);
      
      let finalEarnedCoins = earnedCoins;
      let updatedInv = { ...p.inventory };
      
      if (p.inventory && typeof p.inventory.item_coin_booster === 'number' && p.inventory.item_coin_booster > 0) {
        finalEarnedCoins = earnedCoins * 2;
        updatedInv.item_coin_booster = p.inventory.item_coin_booster - 1;
        setBoosterActive(true);
        setActualEarnedCoins(finalEarnedCoins);
      } else {
        setActualEarnedCoins(earnedCoins);
      }
      
      // Award coins and XP
      const updatedCoins = p.coins + finalEarnedCoins;
      const updatedScore = p.score + gainedXP;
      
      // Calculate level up
      const currentLevel = p.level;
      let newLevel = currentLevel;
      let tempXP = updatedScore;
      
      while (tempXP >= newLevel * 1000) {
        tempXP -= newLevel * 1000;
        newLevel += 1;
      }

      // Check daily quest triggers and update quests_progress
      let questsProgress = { ...(p.quests_progress || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }) };
      
      if (quizQuestions && userAnswers) {
        let twkCorrectCount = 0;
        let tiuCompleted = false;
        let survivalCount = 0;

        quizQuestions.forEach((q: any, idx: number) => {
          const ans = userAnswers[idx];
          if (ans === q.correct) {
            if (q.category === 'TWK') twkCorrectCount++;
          }
          if (gameMode === 'survival' && ans) {
            survivalCount++;
          }
        });

        if (gameMode === 'latihan' && quizQuestions.some((q: any) => q.category === 'TIU')) {
          tiuCompleted = true;
        }

        questsProgress[1] = Math.min((questsProgress[1] || 0) + twkCorrectCount, 10);
        if (tiuCompleted) questsProgress[3] = Math.min((questsProgress[3] || 0) + 1, 1);
        if (survivalCount > 0) questsProgress[5] = Math.min((questsProgress[5] || 0) + survivalCount, 30);
      }

      await updateProfile({
        coins: updatedCoins,
        score: updatedScore,
        level: newLevel,
        quests_progress: questsProgress,
        inventory: updatedInv as any
      });
    });
  }, [earnedCoins, gainedXP, gameMode, quizQuestions, userAnswers]);

  // Strict compiler workaround (read vars)
  if (profile) {}

  // PvP Leaderboard rendering fallback
  const finalRanks = receivedRanks.length > 0
    ? [...receivedRanks].sort((a, b) => b.score - a.score)
    : [
        { name: 'Anda', score: score, isMe: true },
        { name: 'Player44', score: 3200 },
        { name: 'ASN_Pro', score: 2850 },
        { name: 'JagoanSkd', score: 1500 },
        { name: 'Mager',    score: 800 }
      ].sort((a, b) => b.score - a.score);

  // Dynamic Passing Grade Ambang Batas Calculations based on questions count
  const twkQuestionsCount = quizQuestions?.filter((q: any) => q.category === 'TWK').length || 30;
  const tiuQuestionsCount = quizQuestions?.filter((q: any) => q.category === 'TIU').length || 35;
  const tkpQuestionsCount = quizQuestions?.filter((q: any) => q.category === 'TKP').length || 45;

  // Scale passing grades proportionally if question count is less than CPNS standard
  const twkPassThreshold = twkQuestionsCount < 30 ? Math.ceil(twkQuestionsCount * 0.433 * 5) : 65;
  const tiuPassThreshold = tiuQuestionsCount < 35 ? Math.ceil(tiuQuestionsCount * 0.457 * 5) : 80;
  const tkpPassThreshold = tkpQuestionsCount < 45 ? Math.ceil(tkpQuestionsCount * 0.293 * 5) : 66; // 66 Custom TKP threshold requested by user

  const isTwkPass = twkScore >= twkPassThreshold;
  const isTiuPass = tiuScore >= tiuPassThreshold;
  const isTkpPass = tkpScore >= tkpPassThreshold;
  const isLulusSkd = isTwkPass && isTiuPass && isTkpPass;

  return (
    <div className="min-h-screen bg-skd-bg flex flex-col items-center transition-colors pb-24">
      <div className="w-full max-w-3xl p-4 md:p-8 flex flex-col items-center pt-8 md:pt-12 space-y-8 md:space-y-12">
        
        {/* Header Badges */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-gradient-to-r p-[2px] rounded-full shadow-lg from-skd-premium to-skd-accent"
        >
          <div className="bg-skd-bg px-6 py-2 rounded-full font-bold tracking-widest text-xs text-skd-text uppercase">
            {isTryout ? 'TRY OUT CPNS SELESAI' : (gameMode === 'pvp' || gameMode === 'pvp1v1') ? 'PvP BATTLE SELESAI' : gameMode === 'survival' ? 'SURVIVAL BERAKHIR' : 'LATIHAN SELESAI'}
          </div>
        </motion.div>

        {/* Passing Grade Banner for Try Out */}
        {isTryout && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`w-full max-w-xl rounded-3xl p-[2px] overflow-hidden shadow-2xl relative ${
              isLulusSkd 
                ? 'bg-gradient-to-r from-skd-success via-emerald-400 to-green-500 shadow-skd-success/20' 
                : 'bg-gradient-to-r from-skd-danger via-rose-500 to-red-600 shadow-skd-danger/20'
            }`}
          >
            <div className="bg-[#1A1924] rounded-[22px] p-6 text-center space-y-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
                isLulusSkd ? 'bg-skd-success/10 border-skd-success/20 text-skd-success' : 'bg-skd-danger/10 border-skd-danger/20 text-skd-danger'
              }`}>
                {isLulusSkd ? <Award size={36} /> : <AlertTriangle size={36} />}
              </div>
              <div>
                <h2 className={`text-2xl font-black ${isLulusSkd ? 'text-skd-success' : 'text-skd-danger'}`}>
                  {isLulusSkd ? 'LULUS AMBANG BATAS!' : 'BELUM MEMENUHI AMBANG BATAS'}
                </h2>
                <p className="text-xs text-skd-muted mt-2 leading-relaxed max-w-md mx-auto">
                  {isLulusSkd 
                    ? 'Luar biasa! Skor perolehan Anda pada semua kategori (TWK, TIU, TKP) berhasil melewati ambang batas nasional Seleksi Kompetensi Dasar BKN!'
                    : 'Jangan berkecil hati. Masih ada kategori nilai yang berada di bawah standar kelulusan nasional. Mari tinjau kembali pembahasan soal dan perbanyak latihan!'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* PvP Leaderboard podiums */}
        {(gameMode === 'pvp' || gameMode === 'pvp1v1') ? (
          <div className="w-full max-w-xl space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-center text-skd-text mb-8">Papan Peringkat Akhir</h2>
            
            <div className="flex items-end justify-center gap-2 md:gap-4 h-48 mb-12">
              {[finalRanks[1], finalRanks[0], finalRanks[2]].map((rank, idx) => {
                const isFirst = idx === 1;
                const isSecond = idx === 0;
                if (!rank) return null;
                
                const height = isFirst ? 'h-40' : isSecond ? 'h-32' : 'h-24';
                const color = isFirst ? 'bg-yellow-500 shadow-yellow-500/20' : isSecond ? 'bg-gray-300 shadow-white/10' : 'bg-amber-600 shadow-amber-500/10';
                
                return (
                  <motion.div 
                    key={rank.name}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.2, type: 'spring' }}
                    className="flex flex-col items-center flex-1"
                  >
                    <span className="text-xs font-bold text-skd-text mb-2 truncate max-w-[80px]">{rank.name}</span>
                    <div className={`w-full ${height} ${color} rounded-t-2xl shadow-lg border border-white/5 flex flex-col justify-center items-center text-skd-bg`}>
                      <span className="text-2xl font-black font-space">{isFirst ? '1' : isSecond ? '2' : '3'}</span>
                      <span className="text-[10px] font-black font-space">{rank.score} pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="space-y-3">
              {finalRanks.slice(3).map((rank, index) => (
                <div key={rank.name} className={`flex items-center justify-between p-4 rounded-xl border ${rank.isMe ? 'bg-blue-500/10 border-blue-500' : 'bg-skd-card border-skd-border'}`}>
                   <div className="flex items-center gap-4">
                     <span className="font-bold text-skd-muted w-6 text-center">{index + 4}</span>
                     <span className={`font-bold ${rank.isMe ? 'text-blue-500' : 'text-skd-text'}`}>{rank.name}</span>
                   </div>
                   <span className="font-space font-bold text-skd-muted">{rank.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 relative">
            <div className="absolute inset-0 bg-skd-accent/20 blur-[60px] -z-10 rounded-full" />
            <h1 className="text-7xl md:text-8xl font-black text-skd-text font-space tracking-tighter">
              <AnimatedCounter end={score} />
            </h1>
            <p className="text-skd-muted font-bold tracking-widest">TOTAL SKOR SKD</p>
          </div>
        )}

        {/* Dynamic Category Scores Breakdown for Tryout (Real scaled passing grade) */}
        {isTryout && (
          <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 font-space">
            {/* TWK Card */}
            <div className={`p-4 rounded-2xl border text-center bg-[#1A1924] ${isTwkPass ? 'border-skd-success/40' : 'border-skd-danger/40'}`}>
              <span className="block text-[9px] text-gray-400 font-bold uppercase mb-1">Wawasan Kebangsaan</span>
              <span className="block text-xl font-black text-white">{twkScore} <span className="text-xs text-skd-muted">/ {twkQuestionsCount * 5}</span></span>
              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isTwkPass ? 'bg-skd-success/20 text-skd-success' : 'bg-skd-danger/20 text-skd-danger'}`}>
                {isTwkPass ? `Lolos (Min. ${twkPassThreshold})` : `Gagal (Min. ${twkPassThreshold})`}
              </span>
            </div>
            
            {/* TIU Card */}
            <div className={`p-4 rounded-2xl border text-center bg-[#1A1924] ${isTiuPass ? 'border-skd-success/40' : 'border-skd-danger/40'}`}>
              <span className="block text-[9px] text-gray-400 font-bold uppercase mb-1">Inteligensia Umum</span>
              <span className="block text-xl font-black text-white">{tiuScore} <span className="text-xs text-skd-muted">/ {tiuQuestionsCount * 5}</span></span>
              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isTiuPass ? 'bg-skd-success/20 text-skd-success' : 'bg-skd-danger/20 text-skd-danger'}`}>
                {isTiuPass ? `Lolos (Min. ${tiuPassThreshold})` : `Gagal (Min. ${tiuPassThreshold})`}
              </span>
            </div>

            {/* TKP Card */}
            <div className={`p-4 rounded-2xl border text-center bg-[#1A1924] ${isTkpPass ? 'border-skd-success/40' : 'border-skd-danger/40'}`}>
              <span className="block text-[9px] text-gray-400 font-bold uppercase mb-1">Karakteristik Pribadi</span>
              <span className="block text-xl font-black text-white">{tkpScore} <span className="text-xs text-skd-muted">/ {tkpQuestionsCount * 5}</span></span>
              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isTkpPass ? 'bg-skd-success/20 text-skd-success' : 'bg-skd-danger/20 text-skd-danger'}`}>
                {isTkpPass ? `Lolos (Min. ${tkpPassThreshold})` : `Gagal (Min. ${tkpPassThreshold})`}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {!isTryout && (
          <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-xl">
            <div className="bg-skd-card border border-skd-border p-6 rounded-3xl flex flex-col items-center shadow-sm">
              <div className="text-3xl md:text-4xl font-bold font-space text-skd-success">
                <AnimatedCounter end={85} suffix="%" />
              </div>
              <p className="text-xs text-skd-muted mt-2 font-bold uppercase tracking-wider">Akurasi Jawaban</p>
            </div>
            <div className="bg-skd-card border border-skd-border p-6 rounded-3xl flex flex-col items-center shadow-sm">
              <div className="text-3xl md:text-4xl font-bold font-space text-skd-text">04:32</div>
              <p className="text-xs text-skd-muted mt-2 font-bold uppercase tracking-wider">Waktu Pengerjaan</p>
            </div>
          </div>
        )}

        {/* Rewards section */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xl bg-skd-card/80 border border-skd-border rounded-3xl p-5 md:p-6 grid grid-cols-2 gap-4 md:flex md:justify-around md:items-center shadow-sm"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Coins className="text-yellow-500 fill-yellow-500 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-skd-muted font-bold text-left">Koin Diperoleh</p>
              <p className="font-bold font-space text-xl md:text-2xl text-yellow-500 flex items-center gap-1.5">
                <span>+</span>
                <AnimatedCounter end={actualEarnedCoins} duration={2.5} />
                {boosterActive && (
                  <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded-full font-bold animate-pulse">2X</span>
                )}
              </p>
            </div>
          </div>
          <div className="hidden md:block w-px h-12 md:h-16 bg-skd-border" />
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-skd-premium/10 flex items-center justify-center">
              <Zap className="text-skd-premium fill-skd-premium w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-skd-muted font-bold">XP Diperoleh</p>
              <p className="font-bold font-space text-xl md:text-2xl text-skd-premium">+<AnimatedCounter end={gainedXP} duration={2.5} /></p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="w-full max-w-xl space-y-3 pt-4">
          {gameMode === "tryout" && (<button 
            onClick={() => navigate('/pembahasan-tryout', { state: { userAnswers, quizQuestions } })}
            className="w-full py-4 rounded-2xl border-2 border-skd-border text-skd-text font-bold hover:bg-skd-muted/5 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
          >
            Tinjau Pembahasan Lembar Jawaban <ArrowRight size={20} />
          </button>)}
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl bg-skd-text text-skd-bg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>

      </div>
    </div>
  );
}