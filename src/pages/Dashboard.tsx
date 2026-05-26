import { useState, useEffect } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Plus, Swords, BrainCircuit, Target, Trophy, Check, Flame, Activity, Crosshair, Sun, Moon, Gift, X, Users, Lock, CreditCard, Loader2, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import RankBadge from '../components/RankBadge';
import { getRankForScore, getCurrentSeason } from '../data/ranks';

const GAME_MODES = [
  { id: 'latihan', title: 'Latihan Harian', desc: 'Asah kemampuanmu setiap hari', cost: 3, costType: 'energy', icon: BrainCircuit, color: 'text-skd-success', bg: 'bg-skd-success/10', border: 'border-skd-success/20 hover:border-skd-success hover:bg-skd-success/5', badge: 'Santai' },
  { id: 'survival', title: 'Survival Mode', desc: '1 Kesalahan = Game Over', cost: 2, costType: 'energy', icon: Target, color: 'text-skd-danger', bg: 'bg-skd-danger/10', border: 'border-skd-danger/20 hover:border-skd-danger hover:bg-skd-danger/5', badge: 'Hardcore' },
  { id: 'pvp', title: 'PvP Battle', desc: 'Main bareng maks 50 player', cost: 2, costType: 'energy', icon: Swords, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/5', badge: 'Multiplayer' },
  { id: 'tryout', title: 'Try Out Akbar', desc: 'Simulasi ujian sesungguhnya', cost: 1500, costType: 'coin', icon: Trophy, color: 'text-skd-premium', bg: 'bg-skd-premium/10', border: 'border-skd-premium/30 hover:border-skd-premium hover:bg-skd-premium/5 hover:shadow-[0_0_15px_rgba(245,166,35,0.3)]', badge: 'Premium' },
];

const MONTHLY_LEADERBOARD = [
  { rank: 1, name: 'Raden Saori', xp: 3800, isMe: true },
  { rank: 2, name: 'BudiSantoso', xp: 3210 },
  { rank: 3, name: 'SitiRahma', xp: 2950 },
  { rank: 4, name: 'AndiWijaya', xp: 2640 },
  { rank: 5, name: 'DewiBulan', xp: 2100 },
  { rank: 6, name: 'FajarPagi', xp: 1870 },
  { rank: 7, name: 'NurHidayah', xp: 1450 },
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function AnimatedCounter({ end, suffix = '', duration = 2 }: { end: number, suffix?: string, duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setCount(Math.floor(easeOutQuart * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
}

// Framer Motion Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Energy & Coins State
  const [energy, setEnergy] = useState(24);
  const [energyTimer, setEnergyTimer] = useState(150); // 150s = 2.5 mins
  const [globalCoins, setGlobalCoins] = useState(1240);
  
  // Streak State
  const [totalStreak, setTotalStreak] = useState(29); // Simulate: 29 days completed. Today is day 30!
  const [startDayIndex] = useState(2); // Simulate: Streak started on Wednesday ('Rab')
  const [isStreakClaimed, setIsStreakClaimed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Modal State for Game Modes
  const [selectedMode, setSelectedMode] = useState<any>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // PvP State
  const [roomCode, setRoomCode] = useState('');
  const [pvpState, setPvpState] = useState<'idle' | 'loading' | 'waiting' | 'matching'>('idle');
  const [isHost, setIsHost] = useState(false);
  const [activeRoom, setActiveRoom] = useState('');
  const [playersCount, setPlayersCount] = useState(1);

  // PvP 1v1 Quick Duel States
  const [pvpSubMode, setPvpSubMode] = useState<'selection' | 'custom'>('selection');
  const [opponentName, setOpponentName] = useState('');
  const [opponentLevel, setOpponentLevel] = useState(1);
  const [matchCountdown, setMatchCountdown] = useState(3);

  // Calculate dynamic 7-day cycle
  const cycleDayIndex = totalStreak % 7; 
  const isTodayMegaReward = (totalStreak + 1) % 30 === 0;

  const weeklyStreakData = Array.from({ length: 7 }).map((_, idx) => {
    const dayName = DAY_NAMES[(startDayIndex + idx) % 7];
    let status = 'future';
    
    if (isStreakClaimed) {
      if (idx <= cycleDayIndex) status = 'done';
    } else {
      if (idx < cycleDayIndex) status = 'done';
      else if (idx === cycleDayIndex) status = 'current';
    }
    
    return {
      day: dayName,
      status,
      isDay7: idx === 6,
      isMega: idx === cycleDayIndex && isTodayMegaReward
    };
  });

  // Timer Logic
  useEffect(() => {
    if (energy >= 25) return;
    
    const interval = setInterval(() => {
      setEnergyTimer((prev) => {
        if (prev <= 1) {
          setEnergy((e) => Math.min(e + 1, 25));
          return 150;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [energy]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // PvP Logic
  const handleCreateRoom = () => {
    setPvpState('loading');
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setActiveRoom(code);
      setIsHost(true);
      setPlayersCount(1);
      setPvpState('waiting');
    }, 1000);
  };

  const handleJoinRoom = () => {
    if (roomCode.length < 4) return;
    setPvpState('loading');
    setTimeout(() => {
      setActiveRoom(roomCode.toUpperCase());
      setIsHost(false);
      setPlayersCount(Math.floor(Math.random() * 20) + 5); // Simulate already joined players
      setPvpState('waiting');
    }, 1500);
  };

  // Simulate players joining in waiting room
  useEffect(() => {
    if (pvpState === 'waiting' && selectedMode?.id === 'pvp') {
      const interval = setInterval(() => {
        setPlayersCount(prev => {
          if (prev >= 50) return 50;
          return prev + Math.floor(Math.random() * 3) + 1;
        });
      }, 2500);
      
      // If not host, simulate host starting the game after some time
      if (!isHost) {
        setTimeout(() => {
          handlePlayGame(new MouseEvent('click') as any, '/quiz', 'pvp');
          setSelectedMode(null);
          setPvpState('idle');
        }, 8000);
      }

      return () => clearInterval(interval);
    }
  }, [pvpState, selectedMode, isHost]);

  // Reset PvP State when closing modal
  const handleCloseModal = () => {
    setSelectedMode(null);
    setPvpState('idle');
    setPvpSubMode('selection');
    setRoomCode('');
    setOpponentName('');
  };

  // Matchmaking simulation for 1v1 PvP
  useEffect(() => {
    let timerFind: ReturnType<typeof setTimeout>;
    let intervalCountdown: ReturnType<typeof setInterval>;

    if (pvpState === 'matching') {
      setOpponentName('');
      setMatchCountdown(3);

      timerFind = setTimeout(() => {
        const OPPONENT_NAMES = ['Ahmad_ASN', 'Siti_SKD', 'JagoanPNS', 'LulusCPNS', 'PejuangAbdi'];
        const chosenOpponent = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
        setOpponentName(chosenOpponent);
        setOpponentLevel(Math.floor(Math.random() * 6) + 10);

        let count = 3;
        intervalCountdown = setInterval(() => {
          count--;
          setMatchCountdown(count);
          if (count === 0) {
            clearInterval(intervalCountdown);
            // Navigate directly to quiz with pvp1v1 and matched opponent
            navigate('/quiz', { state: { mode: 'pvp1v1', opponent: chosenOpponent } });
            setSelectedMode(null);
            setPvpState('idle');
            setPvpSubMode('selection');
          }
        }, 1000);
      }, 2500);
    }

    return () => {
      clearTimeout(timerFind);
      if (intervalCountdown) clearInterval(intervalCountdown);
    };
  }, [pvpState, navigate]);

  const handleCancelMatching = () => {
    setPvpState('idle');
    setOpponentName('');
    setMatchCountdown(3);
  };

  const handlePlayGame = (e: React.MouseEvent, path: string, modeId?: string, extraState: any = {}) => {
    if (!isStreakClaimed) {
      e.preventDefault();
      
      setToastMessage('Menyelesaikan Quest...');
      
      setTimeout(() => {
        setIsStreakClaimed(true);
        
        const isMega = (totalStreak + 1) % 30 === 0;
        const isWeekly = (totalStreak + 1) % 7 === 0;
        
        let bonus = 2; // base daily reward
        let msg = 'Quest Selesai! +2 Koin Harian';
        
        if (isMega) {
          bonus = 50;
          msg = 'Quest Selesai! +50 Koin Mega Streak 30 Hari!';
        } else if (isWeekly) {
          bonus = 10;
          msg = 'Quest Selesai! +10 Koin Streak Mingguan!';
        }

        setGlobalCoins(prev => prev + bonus);
        setToastMessage(msg);
        
        setTimeout(() => {
          setToastMessage('');
          navigate(path, { state: { mode: modeId, ...extraState } });
        }, 2000);
      }, 1000);
    } else {
       navigate(path, { state: { mode: modeId, ...extraState } });
    }
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-skd-premium/20 border border-skd-premium text-skd-premium font-bold px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(245,166,35,0.3)] backdrop-blur-md whitespace-nowrap"
          >
            <Coins size={20} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto pb-28"
      >
        {/* ── Top Bar ── */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-skd-card/50 sm:bg-transparent p-3.5 sm:p-0 rounded-2xl border border-skd-border sm:border-none shadow-sm sm:shadow-none"
        >
          {/* Top Row: User Avatar, Name, Rank and mobile theme switcher */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-skd-premium to-skd-accent p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-skd-card rounded-[10px] flex items-center justify-center font-bold text-xs text-skd-text">US</div>
            </div>
            <div>
              <p className="text-xs font-black text-skd-text leading-none">CIHUYYYY</p>
              <p className="text-[9px] text-skd-accent font-bold mt-0.5">Lvl 14 · Pejuang</p>
            </div>
            
            {/* Rank badge */}
            <RankBadge score={3800} size="sm" />
            
            {/* Mobile theme toggle */}
            <button
              onClick={toggleTheme}
              className="sm:hidden w-8 h-8 flex items-center justify-center bg-skd-card rounded-full border border-skd-border text-skd-muted hover:text-skd-text transition-colors ml-auto"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {/* Bottom Row on Mobile / Right items on Desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t border-skd-border/30 sm:border-none pt-2.5 sm:pt-0">
            {/* Liga button */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/liga')}
              className="inline-flex items-center px-2.5 py-1 gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg text-[10px] sm:text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
              <span>Liga</span>
              <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/70 ml-0.5" />
            </motion.button>

            {/* Desktop Theme Switcher + Resources */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button
                onClick={toggleTheme}
                className="hidden sm:flex w-8 h-8 items-center justify-center bg-skd-card rounded-full border border-skd-border text-skd-muted hover:text-skd-text transition-colors"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <div className="flex items-center gap-1 bg-skd-card px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full border border-skd-border shadow-sm">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-skd-accent fill-skd-accent" />
                <span className="font-space font-bold text-[10px] sm:text-xs text-skd-text">{energy}/25</span>
              </div>
              <div className="flex items-center gap-1 bg-skd-card px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full border border-skd-border shadow-sm">
                <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-space font-bold text-[10px] sm:text-xs text-skd-text">{globalCoins.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── XP Bar ── */}
        <motion.section
          variants={itemVariants}
          className="bg-skd-card rounded-2xl p-3.5 sm:px-5 sm:py-4 border border-skd-border shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
        >
          {/* Level info + Progress Bar */}
          <div className="flex items-center gap-3 flex-1">
            <div className="shrink-0">
              <p className="text-xs font-bold text-skd-text">Level 14</p>
              <p className="text-[9px] sm:text-[10px] text-skd-muted font-bold">Pejuang ASN</p>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-skd-muted/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: '70%' }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-skd-premium to-skd-accent rounded-full"
                />
              </div>
              <p className="text-[9px] sm:text-[10px] text-skd-muted mt-1 font-space font-bold text-right">700 / 1000 XP</p>
            </div>
          </div>

          {/* Energy info + Refill Button */}
          <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-skd-border/20 sm:border-none pt-2 sm:pt-0 shrink-0">
            <div className="text-left sm:text-right">
              <div className="flex items-center gap-1.5 sm:justify-end mb-0.5">
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-skd-accent" />
                <span className="text-[10px] sm:text-xs font-bold text-skd-text">Energy</span>
              </div>
              {energy >= 25
                ? <p className="text-[9px] sm:text-[10px] text-skd-muted">⚡ Penuh</p>
                : <p className="text-[9px] sm:text-[10px] text-skd-muted">+1 in <span className="text-skd-text font-bold">{formatTime(energyTimer)}</span></p>}
            </div>
            <button onClick={() => navigate('/toko')} className="bg-skd-muted/10 hover:bg-skd-muted/20 transition-colors px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-skd-text flex items-center gap-1">
              <Plus size={13} /> Refill
            </button>
          </div>
        </motion.section>

        {/* ── GAME MODES (MAIN FOCUS) ── */}
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl md:text-2xl font-black text-skd-text tracking-tight">Pilih Mode Permainan</h2>
            <span className="text-xs text-skd-muted font-bold hidden sm:block">4 Mode Tersedia</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {GAME_MODES.map((mode) => (
              <motion.div
                key={mode.id}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedMode(mode)}
                className={`bg-skd-card rounded-2xl border transition-all cursor-pointer flex flex-col gap-3 p-4 md:p-5 shadow-sm relative overflow-hidden group ${mode.border}`}
              >
                {/* Badge top-right */}
                <div className="absolute top-0 right-0 px-2.5 py-1 bg-skd-bg/80 backdrop-blur-sm rounded-bl-xl border-b border-l border-skd-border text-[9px] font-bold text-skd-muted uppercase tracking-wider">
                  {mode.badge}
                </div>

                {/* Icon */}
                <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${mode.bg} ${mode.color} mt-1`}>
                  <mode.icon size={22} />
                </div>

                {/* Text */}
                <div>
                  <h4 className="font-black text-base md:text-lg text-skd-text group-hover:text-skd-accent transition-colors leading-tight">{mode.title}</h4>
                  <p className="text-[11px] text-skd-muted mt-0.5 leading-snug">{mode.desc}</p>
                </div>

                {/* Cost chip */}
                <div className="flex items-center gap-1 text-[11px] font-bold text-skd-text bg-skd-bg px-2.5 py-1 rounded-lg w-fit border border-skd-border mt-auto">
                  {mode.costType === 'energy'
                    ? <Zap size={12} className="text-skd-accent" />
                    : <Coins size={12} className="text-yellow-500" />}
                  <span>{mode.cost.toLocaleString()} {mode.costType === 'energy' ? 'Energi' : 'Koin'}</span>
                </div>

                {/* Glow on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl bg-gradient-to-br ${mode.bg}`} style={{ opacity: 0 }} />
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── STREAK + STATS ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Streak */}
          <motion.section variants={itemVariants} className="lg:col-span-7 bg-skd-card rounded-2xl p-4 md:p-5 border border-skd-border shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-skd-text">
                <Flame className="text-skd-accent" size={16} />
                Streak Harian
                <span className="text-[10px] text-skd-muted font-space font-normal">Total: {totalStreak + (isStreakClaimed ? 1 : 0)} Hari</span>
              </h3>
              <div className="text-right">
                <div className="text-[9px] font-bold text-skd-premium uppercase tracking-wider mb-1">Mega (30 Hari)</div>
                <div className="w-20 h-1.5 bg-skd-bg rounded-full overflow-hidden border border-skd-border">
                  <div className="h-full bg-skd-premium" style={{ width: `${((totalStreak + (isStreakClaimed ? 1 : 0)) / 30) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center w-full">
              {weeklyStreakData.map((day, idx) => {
                const isRewardBox = day.isDay7 || day.isMega;
                const isToday = day.status === 'current';
                const canClaimToday = isToday && !isStreakClaimed;

                if (isRewardBox) {
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                        ${day.status === 'done' ? 'bg-skd-success border-skd-success text-white' :
                          day.status === 'current' ? 'border-skd-premium bg-skd-premium/10 text-skd-premium shadow-[0_0_12px_rgba(245,166,35,0.4)]' :
                          'border-skd-border bg-skd-muted/5 text-skd-muted'}`}
                      >
                        {day.status === 'done' ? <Check size={14} strokeWidth={3} /> : <Gift size={15} className={day.status === 'future' ? 'opacity-50' : ''} />}
                        {canClaimToday && (
                          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 border-2 border-skd-premium rounded-full pointer-events-none" />
                        )}
                      </div>
                      <span className={`text-[9px] font-bold ${day.status === 'done' ? 'text-skd-success' : day.status === 'current' ? 'text-skd-premium' : 'text-skd-muted'}`}>
                        {day.status === 'done' ? '✓' : day.isMega ? '+50🪙' : '+10🪙'}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className={`relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                      ${day.status === 'done' ? 'bg-skd-success border-skd-success text-white' :
                        day.status === 'current' ? 'border-skd-accent bg-skd-accent/10 text-skd-accent' :
                        'border-skd-border bg-skd-muted/5 text-skd-muted'}`}
                    >
                      {day.status === 'done' && <Check size={14} strokeWidth={3} />}
                      {day.status === 'current' && !isStreakClaimed && (
                        <>
                          <div className="w-2 h-2 rounded-full bg-skd-accent" />
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 border-2 border-skd-accent rounded-full pointer-events-none" />
                        </>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold ${day.status === 'current' ? 'text-skd-accent' : 'text-skd-muted'}`}>{day.day}</span>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Quick Stats */}
          <motion.section variants={itemVariants} className="lg:col-span-5">
            <div className="grid grid-cols-3 gap-3 h-full">
              {[
                { icon: Activity, color: 'text-skd-success', bg: 'bg-skd-success/10', value: 342, label: 'Dijawab', suffix: '' },
                { icon: Crosshair, color: 'text-blue-500', bg: 'bg-blue-500/10', value: 78, label: 'Akurasi', suffix: '%' },
                { icon: Flame, color: 'text-skd-accent', bg: 'bg-skd-accent/10', value: 12, label: 'Combo', suffix: '', prefix: 'x' },
              ].map((stat, i) => (
                <motion.div key={i} whileHover={{ y: -3 }} className="bg-skd-card rounded-2xl p-3 md:p-4 border border-skd-border shadow-sm flex flex-col items-center justify-center text-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg}`}>
                    <stat.icon className={stat.color} size={16} />
                  </div>
                  <p className="text-xl font-black text-skd-text font-space leading-none">
                    {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-[9px] text-skd-muted font-bold uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>



      </motion.div>

      {/* ── Game Mode Modal ── */}
      <AnimatePresence>
        {selectedMode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-skd-card w-full max-w-md rounded-3xl border border-skd-border shadow-2xl relative z-10 overflow-hidden"
            >
              <div className={`h-24 ${selectedMode.bg} relative`}>
                <button onClick={handleCloseModal} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors">
                  <X size={20} />
                </button>
                <div className={`absolute -bottom-8 left-6 w-16 h-16 rounded-2xl flex items-center justify-center bg-skd-card border-4 border-skd-card shadow-lg ${selectedMode.color}`}>
                  <selectedMode.icon size={32} />
                </div>
              </div>

              <div className="p-6 pt-12">
                <h3 className="text-2xl font-bold text-skd-text mb-1">{selectedMode.title}</h3>
                <p className="text-skd-muted text-sm mb-6">{selectedMode.desc}</p>

                {selectedMode.id === 'latihan' && (
                  <div className="bg-skd-bg p-4 rounded-xl border border-skd-border mb-6">
                    <h4 className="text-sm font-bold text-skd-text mb-2">Tentang Mode Ini</h4>
                    <p className="text-xs text-skd-muted leading-relaxed">Selesaikan kuis harian tanpa batas waktu. Cocok untuk mengasah ingatan dan membangun fondasi pemahaman materi SKD dengan santai.</p>
                  </div>
                )}

                {selectedMode.id === 'survival' && (
                  <div className="bg-skd-danger/10 p-4 rounded-xl border border-skd-danger/20 mb-6">
                    <h4 className="text-sm font-bold text-skd-danger mb-2 flex items-center gap-2"><Target size={16}/> Aturan Hardcore</h4>
                    <p className="text-xs text-skd-text leading-relaxed">Jawab sebanyak-banyaknya. <span className="font-bold text-skd-danger">Salah 1 soal = LANGSUNG GAGAL.</span> Buktikan akurasi sempurna Anda!</p>
                    <div className="mt-3 text-xs font-bold text-skd-muted">Rekor Terbaikmu: <span className="text-skd-text">42 Soal Beruntun</span></div>
                  </div>
                )}

                 {selectedMode.id === 'pvp' && (
                  <div className="space-y-4 mb-6">
                    {/* Mode Selection */}
                    {pvpState === 'idle' && pvpSubMode === 'selection' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        {/* Option 1: 1v1 Quick Duel */}
                        <div
                          onClick={() => setPvpState('matching')}
                          className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Swords size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-skd-text flex items-center gap-1.5">
                              1v1 Quick Duel
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">Instan</span>
                            </h4>
                            <p className="text-[11px] text-skd-muted mt-0.5 leading-snug">Duel kilat 1v1 melawan penantang acak sekarang!</p>
                          </div>
                          <ChevronRight size={16} className="text-skd-muted group-hover:text-blue-400 transition-colors" />
                        </div>

                        {/* Option 2: Custom Room */}
                        <div
                          onClick={() => setPvpSubMode('custom')}
                          className="p-4 rounded-2xl border border-skd-border bg-skd-bg/50 hover:bg-skd-card cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-skd-muted/10 text-skd-text flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-skd-text">Custom Room (Maks 50 Player)</h4>
                            <p className="text-[11px] text-skd-muted mt-0.5 leading-snug">Buat atau masuk room dengan teman menggunakan kode room.</p>
                          </div>
                          <ChevronRight size={16} className="text-skd-muted group-hover:text-skd-text transition-colors" />
                        </div>
                      </motion.div>
                    )}

                    {/* Custom Room Lobby Setup */}
                    {pvpState === 'idle' && pvpSubMode === 'custom' && (
                      <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <button
                          onClick={() => setPvpSubMode('selection')}
                          className="text-xs text-blue-500 font-bold hover:underline flex items-center gap-1 mb-1"
                        >
                          ← Kembali ke Pilihan Mode
                        </button>
                        
                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                          <h4 className="text-sm font-bold text-blue-500 mb-2 flex items-center gap-2"><Users size={16}/> Multiplayer Custom Room</h4>
                          <p className="text-xs text-skd-text mb-3">Lawan teman-temanmu secara real-time. Siapa yang tercepat dan paling akurat?</p>
                          <button onClick={handleCreateRoom} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-blue-500/20">
                            Buat Room Baru
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-skd-border" /><span className="text-xs text-skd-muted font-medium uppercase">Atau</span><div className="flex-1 h-px bg-skd-border" />
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Masukkan Kode Room" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
                            className="flex-1 bg-skd-bg border border-skd-border rounded-lg px-4 text-sm font-mono text-skd-text outline-none focus:border-blue-500 transition-colors uppercase" maxLength={6} />
                          <button onClick={handleJoinRoom} disabled={roomCode.length < 4} className="bg-skd-card border border-skd-border hover:bg-skd-bg disabled:opacity-50 px-4 rounded-lg text-sm font-bold text-skd-text transition-colors">Join</button>
                        </div>
                      </motion.div>
                    )}

                    {/* Matchmaking Screen for 1v1 PvP */}
                    {pvpState === 'matching' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-skd-bg/60 rounded-2xl border border-skd-border p-5 text-center space-y-6">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400">
                            Quick Match
                          </span>
                          <h4 className="text-base font-bold text-skd-text">Mencari Lawan Duel 1v1...</h4>
                        </div>

                        {/* Matchmaking VS screen */}
                        <div className="flex items-center justify-center gap-6 py-4">
                          {/* Player 1: Me */}
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-skd-premium to-skd-accent p-0.5 shadow-md flex items-center justify-center shrink-0">
                              <div className="w-full h-full bg-skd-card rounded-full flex items-center justify-center font-bold text-sm text-skd-text">US</div>
                            </div>
                            <span className="text-xs font-black text-skd-text truncate max-w-[80px]">CIHUYYYY</span>
                            <span className="text-[9px] text-skd-muted font-bold">Lvl 14</span>
                          </div>

                          {/* VS Badge */}
                          <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full animate-ping" />
                            <div className="w-10 h-10 rounded-full bg-skd-card border-2 border-blue-500 flex items-center justify-center font-black text-xs text-blue-500 relative z-10 shadow-lg">
                              VS
                            </div>
                          </div>

                          {/* Player 2: Opponent */}
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <AnimatePresence mode="wait">
                              {opponentName ? (
                                <motion.div
                                  key="opponent-found"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="flex flex-col items-center gap-2"
                                >
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-skd-accent to-yellow-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
                                    <div className="w-full h-full bg-skd-card rounded-full flex items-center justify-center font-bold text-sm text-skd-text">
                                      {opponentName.substring(0, 2).toUpperCase()}
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-skd-accent truncate max-w-[80px]">{opponentName}</span>
                                  <span className="text-[9px] text-skd-muted font-bold">Lvl {opponentLevel}</span>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="opponent-searching"
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="flex flex-col items-center gap-2"
                                >
                                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-skd-border bg-skd-card flex items-center justify-center text-skd-muted font-black text-xl">
                                    ?
                                  </div>
                                  <span className="text-xs font-bold text-skd-muted animate-pulse">Mencari...</span>
                                  <span className="text-[9px] text-skd-muted font-bold">-</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Status / Countdown */}
                        <div className="h-8 flex items-center justify-center">
                          {opponentName ? (
                            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-black text-green-400">
                              Pertandingan dimulai dalam {matchCountdown}...
                            </motion.p>
                          ) : (
                            <div className="flex items-center gap-2 text-skd-muted">
                              <Loader2 className="animate-spin text-blue-500" size={14} />
                              <span className="text-xs font-bold">Menyamakan peringkat Anda...</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleCancelMatching}
                          className="w-full bg-skd-card border border-skd-border hover:bg-skd-bg text-skd-text font-bold py-2 rounded-lg text-xs transition-colors"
                        >
                          Batal
                        </button>
                      </motion.div>
                    )}

                    {pvpState === 'loading' && (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <p className="text-sm font-bold text-skd-text animate-pulse">Menghubungkan ke Server PvP...</p>
                      </div>
                    )}
                    {pvpState === 'waiting' && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-skd-bg rounded-2xl border border-skd-border p-6 text-center space-y-4">
                        <div>
                          <p className="text-xs text-skd-muted uppercase font-bold tracking-widest mb-1">Kode Room</p>
                          <div className="text-3xl font-black text-skd-text font-mono tracking-widest bg-skd-card py-2 rounded-xl border border-skd-border">{activeRoom}</div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500"><Users size={24} /></div>
                          <div className="text-left">
                            <div className="text-2xl font-black text-skd-text">{playersCount}<span className="text-sm text-skd-muted font-medium">/50</span></div>
                            <div className="text-xs text-skd-muted">Pemain Bergabung</div>
                          </div>
                        </div>
                        {isHost
                          ? <p className="text-xs text-skd-muted pt-2">Menunggu pemain lain bergabung...</p>
                          : <div className="flex items-center justify-center gap-2 text-skd-accent pt-2"><Loader2 className="animate-spin" size={14} /><p className="text-xs font-bold">Menunggu Host Memulai Pertandingan...</p></div>}
                      </motion.div>
                    )}
                  </div>
                )}

                {selectedMode.id === 'tryout' && (
                  <div className="bg-skd-premium/10 p-4 rounded-xl border border-skd-premium/30 mb-6">
                    <h4 className="text-sm font-bold text-skd-premium mb-2 flex items-center gap-2"><Lock size={16}/> Buka Akses Try Out</h4>
                    <p className="text-xs text-skd-text leading-relaxed mb-4">Simulasi ini menggunakan standar format BKN dengan sistem penilaian ambang batas resmi. Dapatkan rapor lengkap di akhir sesi.</p>
                    <div className="space-y-2">
                      <button onClick={(e) => { handlePlayGame(e, '/quiz', selectedMode.id); setSelectedMode(null); }} className="w-full bg-skd-premium hover:bg-yellow-400 text-[#0F0E17] font-bold py-3 rounded-lg text-sm transition-colors shadow-lg shadow-skd-premium/20 flex items-center justify-center gap-2">
                        <Coins size={18} /> Buka dengan 1.500 Koin
                      </button>
                      <button className="w-full bg-skd-bg hover:bg-skd-card border border-skd-border text-skd-text font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                        <CreditCard size={18} /> Beli seharga Rp 15.000
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-skd-border pt-4">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-skd-text">
                    <span className="text-skd-muted font-normal mr-1">Biaya:</span>
                    {selectedMode.costType === 'energy' ? <><Zap size={16} className="text-skd-accent" /> {selectedMode.cost}</> : <><Coins size={16} className="text-yellow-500" /> {selectedMode.cost.toLocaleString()}</>}
                  </div>
                  {selectedMode.id !== 'tryout' && (selectedMode.id !== 'pvp' || (selectedMode.id === 'pvp' && isHost && pvpState === 'waiting')) && (
                    <button
                      onClick={(e) => { handlePlayGame(e, '/quiz', selectedMode.id); handleCloseModal(); }}
                      className={`text-skd-bg hover:scale-105 transition-transform px-6 py-2.5 rounded-full font-bold text-sm shadow-md ${selectedMode.id === 'pvp' ? 'bg-blue-500' : 'bg-skd-text'}`}
                    >
                      {selectedMode.id === 'pvp' ? 'Mulai Sekarang' : 'Mulai Main'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
