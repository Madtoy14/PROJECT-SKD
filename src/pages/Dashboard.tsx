import { useState, useEffect } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Plus, Swords, BrainCircuit, Target, Trophy, Check, Flame, Activity, Crosshair, Sun, Moon, Gift } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const GAME_MODES = [
  { id: 'latihan', title: 'Latihan Harian', cost: 3, icon: BrainCircuit, color: 'text-skd-success', bg: 'bg-skd-success/10', border: 'hover:border-skd-success' },
  { id: 'survival', title: 'Survival Mode', cost: 2, icon: Target, color: 'text-skd-danger', bg: 'bg-skd-danger/10', border: 'hover:border-skd-danger' },
  { id: 'simulasi', title: 'Simulasi Akbar', cost: 10, icon: Trophy, color: 'text-skd-accent', bg: 'bg-skd-accent/10', border: 'hover:border-skd-accent' },
  { id: 'pvp', title: 'PvP Battle', cost: 2, icon: Swords, color: 'text-skd-premium', bg: 'bg-skd-premium/10', border: 'hover:border-skd-premium' },
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

  const handlePlayGame = (e: React.MouseEvent, path: string) => {
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
          navigate(path);
        }, 2000);
      }, 1000);
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
      className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24"
    >
      {/* Header (Mobile) & Stats Bar */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-center gap-4">
        <header className="flex w-full md:w-auto justify-between items-center pt-2 md:pt-0 md:hidden">
          <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-skd-accent to-yellow-500 bg-clip-text text-transparent">SKDQuest</h1>
        </header>

        <div className="flex justify-end gap-3 w-full md:w-auto ml-auto">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center bg-skd-card w-9 h-9 md:w-10 md:h-10 rounded-full border border-skd-border shadow-sm text-skd-muted hover:text-skd-text hover:bg-skd-bg transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="flex items-center gap-1.5 bg-skd-card px-3 py-1.5 rounded-full border border-skd-border shadow-sm">
            <Zap size={16} className="text-skd-accent fill-skd-accent" />
            <span className="font-space font-bold text-sm text-skd-text">{energy}/25</span>
          </div>
          <div className="flex items-center gap-1.5 bg-skd-card px-3 py-1.5 rounded-full border border-skd-border shadow-sm">
            <Coins size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="font-space font-bold text-sm text-skd-text">{globalCoins.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* Profile & Energy Section */}
      <motion.section variants={itemVariants} className="bg-skd-card rounded-3xl p-6 md:p-8 border border-skd-border relative overflow-hidden shadow-sm transition-colors">
        <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-skd-premium/20 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-skd-premium to-skd-accent p-0.5 shadow-lg">
              <div className="w-full h-full bg-skd-card rounded-[14px] flex items-center justify-center font-bold text-xl md:text-2xl text-skd-text">
                US
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-bold text-skd-text">CIHUYYYY</h2>
              <p className="text-sm md:text-base text-skd-accent mb-2 font-medium">Level 14 • Pejuang ASN</p>
              <div className="w-full h-2 md:h-3 bg-skd-muted/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '70%' }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-skd-premium to-skd-accent rounded-full"
                />
              </div>
              <p className="text-[10px] md:text-xs text-right mt-1 text-skd-muted font-space font-bold">700 / 1000 XP</p>
            </div>
          </div>

          <div className="md:w-px md:h-20 bg-skd-border hidden md:block" />

          <div className="pt-5 border-t border-skd-border md:border-t-0 md:pt-0 md:pl-6 flex items-center justify-between md:flex-col md:items-start md:gap-3 md:min-w-[200px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} className="text-skd-accent" />
                <span className="text-sm font-bold text-skd-text">Energy Refill</span>
              </div>
              {energy >= 25 ? (
                <p className="text-xs text-skd-muted font-space font-medium tracking-wide">⚡ Energi Penuh</p>
              ) : (
                <p className="text-xs text-skd-muted font-space font-medium">⚡ +1 in <span className="text-skd-text">{formatTime(energyTimer)}</span></p>
              )}
            </div>
            <button 
              onClick={() => navigate('/toko')}
              className="bg-skd-muted/10 hover:bg-skd-muted/20 transition-colors px-4 py-2 md:py-2.5 md:w-full rounded-xl text-sm font-bold text-skd-text flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Refill
            </button>
          </div>
        </div>
      </motion.section>

      {/* Middle Row: Streak & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

        {/* Weekly Streak */}
        <motion.section variants={itemVariants} className="lg:col-span-5 bg-skd-card rounded-3xl p-6 border border-skd-border shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-skd-text">
              <Flame className="text-skd-accent" size={20} /> 
              <div>
                Streak Harian
                <div className="text-xs text-skd-muted font-space font-normal mt-0.5">Total: {totalStreak + (isStreakClaimed ? 1 : 0)} Hari</div>
              </div>
            </h3>
            {/* Mega Bonus Progress */}
            <div className="text-right">
              <div className="text-[10px] font-bold text-skd-premium uppercase tracking-wider mb-1">Mega Bonus (30 Hari)</div>
              <div className="w-24 h-2 bg-skd-bg rounded-full overflow-hidden border border-skd-border">
                <div className="h-full bg-skd-premium" style={{ width: `${((totalStreak + (isStreakClaimed ? 1 : 0)) / 30) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center w-full mt-2">
            {weeklyStreakData.map((day, idx) => {
              const isRewardBox = day.isDay7 || day.isMega;
              const isToday = day.status === 'current';
              const canClaimToday = isToday && !isStreakClaimed;
              
              if (isRewardBox) {
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div 
                      className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm
                        ${day.status === 'done' ? 'bg-skd-success border-skd-success text-white' : 
                          day.status === 'current' ? 'border-skd-premium bg-skd-premium/10 text-skd-premium shadow-[0_0_15px_rgba(245,166,35,0.4)]' : 
                          'border-skd-border bg-skd-muted/5 text-skd-muted'}`}
                    >
                      {day.status === 'done' ? <Check size={16} strokeWidth={3} /> : <Gift size={18} className={day.status === 'future' ? 'opacity-50' : ''} />}
                      
                      {canClaimToday && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 border-2 border-skd-premium rounded-full pointer-events-none"
                        />
                      )}
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold ${day.status === 'done' ? 'text-skd-success' : day.status === 'current' ? 'text-skd-premium' : 'text-skd-muted'}`}>
                      {day.status === 'done' ? 'Diklaim' : day.isMega ? '+50 🪙' : '+10 🪙'}
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div
                    className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all
                      ${day.status === 'done' ? 'bg-skd-success border-skd-success text-white' :
                        day.status === 'current' ? 'border-skd-accent bg-skd-accent/10 text-skd-accent' :
                          'border-skd-border bg-skd-muted/5 text-skd-muted'}
                    `}
                  >
                    {day.status === 'done' && <Check size={16} strokeWidth={3} />}
                    {day.status === 'current' && !isStreakClaimed && (
                      <>
                        <div className="w-2 h-2 rounded-full bg-skd-accent" />
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 border-2 border-skd-accent rounded-full pointer-events-none"
                        />
                      </>
                    )}
                  </div>
                  <span className={`text-[10px] md:text-xs font-bold ${day.status === 'current' ? 'text-skd-accent' : 'text-skd-muted'}`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Quick Stats */}
        <motion.section variants={itemVariants} className="lg:col-span-7">
          <div className="grid grid-cols-3 gap-3 md:gap-4 h-full">
            <motion.div whileHover={{ y: -4 }} className="bg-skd-card rounded-3xl p-4 md:p-5 border border-skd-border shadow-sm flex flex-col justify-center items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-skd-success/10 flex items-center justify-center mb-3">
                <Activity className="text-skd-success" size={20} />
              </div>
              <h4 className="text-2xl md:text-3xl font-black text-skd-text font-space mb-1">
                <AnimatedCounter end={342} />
              </h4>
              <p className="text-[10px] md:text-xs text-skd-muted font-bold uppercase tracking-wider">Soal Dijawab</p>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="bg-skd-card rounded-3xl p-4 md:p-5 border border-skd-border shadow-sm flex flex-col justify-center items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <Crosshair className="text-blue-500" size={20} />
              </div>
              <h4 className="text-2xl md:text-3xl font-black text-skd-text font-space mb-1">
                <AnimatedCounter end={78} suffix="%" />
              </h4>
              <p className="text-[10px] md:text-xs text-skd-muted font-bold uppercase tracking-wider">Akurasi</p>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="bg-skd-card rounded-3xl p-4 md:p-5 border border-skd-border shadow-sm flex flex-col justify-center items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-skd-accent/10 flex items-center justify-center mb-3">
                <Flame className="text-skd-accent fill-skd-accent/20" size={20} />
              </div>
              <h4 className="text-2xl md:text-3xl font-black text-skd-text font-space mb-1">
                x<AnimatedCounter end={12} />
              </h4>
              <p className="text-[10px] md:text-xs text-skd-muted font-bold uppercase tracking-wider">Combo Terbaik</p>
            </motion.div>
          </div>
        </motion.section>

      </div>

      {/* Game Modes */}
      <motion.section variants={itemVariants}>
        <h3 className="text-lg md:text-xl font-bold mb-4 text-skd-text">Pilih Quest</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {GAME_MODES.map((mode) => (
            <Link key={mode.id} to="/quiz" onClick={(e) => handlePlayGame(e, '/quiz')}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`bg-skd-card p-5 md:p-6 rounded-3xl border border-skd-border transition-all cursor-pointer flex flex-col items-center text-center h-full gap-4 shadow-sm hover:shadow-md ${mode.border}`}
              >
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${mode.bg} ${mode.color}`}>
                  <mode.icon size={28} className="md:w-8 md:h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base mb-1.5 text-skd-text">{mode.title}</h4>
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-skd-muted bg-skd-bg px-3 py-1 rounded-full w-fit mx-auto">
                    <Zap size={12} className="text-skd-accent" />
                    <span>{mode.cost}</span>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>
    </motion.div>
    </div>
  );
}
