import { useState, useEffect } from 'react';







import { motion, type Variants, AnimatePresence } from 'framer-motion';







import { Zap, Coins, Plus, Swords, BrainCircuit, Target, Trophy, Check, Flame, Activity, Crosshair, Sun, Moon, Gift, X, Users, Lock, CreditCard, Loader2, ChevronRight, UserPlus, Share2, Copy, Volume2, VolumeX } from 'lucide-react';







import { Link, useNavigate } from 'react-router-dom';







import { fetchProfile, updateProfile } from '../lib/supabase';







import { useTheme } from '../context/ThemeContext';







import { useAudio } from '../context/AudioContext';







import RankBadge from '../components/RankBadge';







import { getRankForScore, getCurrentSeason } from '../data/ranks';







import avatarPdh from '../assets/avatar_pdh.png';







const AVATAR_FILTERS: Record<string, string> = {







  stmkg: 'hue-rotate-0',







  ipdn: 'hue-rotate-30',







  stan: 'hue-rotate-[160deg]',







  hitamputih: 'grayscale brightness-110',







  korpri: 'hue-rotate-[220deg] saturate-125',







  pdh_kemendagri: 'brightness-95 contrast-105 saturate-110',







};







const GAME_MODES = [







  { id: 'latihan', title: 'Latihan Harian', desc: 'Asah kemampuanmu setiap hari', cost: 3, costType: 'energy', icon: BrainCircuit, color: 'text-skd-success', bg: 'bg-skd-success/10', border: 'border-skd-success/20 hover:border-skd-success hover:bg-skd-success/5', badge: 'Santai' },







  { id: 'survival', title: 'Survival Mode', desc: '1 Kesalahan = Game Over', cost: 2, costType: 'energy', icon: Target, color: 'text-skd-danger', bg: 'bg-skd-danger/10', border: 'border-skd-danger/20 hover:border-skd-danger hover:bg-skd-danger/5', badge: 'Hardcore' },







  { id: 'pvp', title: 'PvP Battle', desc: 'Main bareng maks 50 player', cost: 2, costType: 'energy', icon: Swords, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20 hover:border-blue-500 hover:bg-blue-500/5', badge: 'Multiplayer' },







  { id: 'tryout', title: 'Try Out Mode', desc: 'Simulasi SKD', cost: 1500, costType: 'coin', icon: Trophy, color: 'text-skd-premium', bg: 'bg-skd-premium/10', border: 'border-skd-premium/30 hover:border-skd-premium hover:bg-skd-premium/5 hover:shadow-[0_0_15px_rgba(245,166,35,0.3)]', badge: 'Premium' },







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







  const { isMuted, toggleMute } = useAudio();







  const navigate = useNavigate();







  // Energy & Coins State







  const [energy, setEnergy] = useState(24);







  const [energyTimer, setEnergyTimer] = useState(150); // 150s = 2.5 mins







  const [globalCoins, setGlobalCoins] = useState(1240);







  const [equippedAvatarId, setEquippedAvatarId] = useState('stmkg');







  const [profile, setProfile] = useState<any>(null);







  useEffect(() => {







    fetchProfile().then(p => {







      if (p) {







        setProfile(p);







        setEnergy(p.energy);







        setGlobalCoins(p.coins);







        setEquippedAvatarId(p.equipped_avatar_id || 'stmkg');







        setLastSpinDate(localStorage.getItem('skdquest_last_spin_date'));







        







        // Cek & Amankan Streak Harian (Streak Protector)!







        const lastClaimStr = localStorage.getItem('skdquest_last_claim_date');







        const now = new Date();







        const todayStr = now.toDateString();







        







        if (lastClaimStr) {







          const lastClaimDate = new Date(lastClaimStr);







          const timeDiff = now.getTime() - lastClaimDate.getTime();







          const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));







          







          if (daysDiff > 1) {







            // Melewatkan lebih dari 1 hari! Streak terancam pecah!







            if (p.inventory && typeof p.inventory.item_streak_protector === 'number' && p.inventory.item_streak_protector > 0) {







              const updatedInv = { ...p.inventory, item_streak_protector: p.inventory.item_streak_protector - 1 } as any;







              updateProfile({ inventory: updatedInv }).then(() => {







                setToastMessage(`🛡️ Streak Protector Aktif! Rantai streak ${p.streak} hari Anda berhasil diselamatkan!`);







                setTimeout(() => setToastMessage(''), 5000);







              });







              setTotalStreak(p.streak);







            } else {







              // Streak pecah/patah ke 0







              updateProfile({ streak: 0 });







              setTotalStreak(0);







              setToastMessage(`💔 Streak Anda terputus karena absen belajar. Mulai lagi dari 0!`);







              setTimeout(() => setToastMessage(''), 5000);







            }







          } else {







            setTotalStreak(p.streak ?? 29);







            if (daysDiff === 0) {







              setIsStreakClaimed(true);







            }







          }







        } else {







          setTotalStreak(p.streak ?? 29);







          localStorage.setItem('skdquest_last_claim_date', todayStr);







        }







      }







    });







  }, []);







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







  const [pvpState, setPvpState] = useState<'idle' | 'loading' | 'waiting' | 'matching' | 'waiting_friend'>('idle');







  const [isHost, setIsHost] = useState(false);







  const [activeRoom, setActiveRoom] = useState('');







  const [playersCount, setPlayersCount] = useState(1);







  // PvP 1v1 Quick Duel States







  const [pvpSubMode, setPvpSubMode] = useState<'selection' | 'custom' | 'friend_duel'>('selection');







  const [opponentName, setOpponentName] = useState('');







  const [opponentLevel, setOpponentLevel] = useState(1);







  const [matchCountdown, setMatchCountdown] = useState(3);







  // Spin Wheel States







  const [showSpinWheel, setShowSpinWheel] = useState(false);







  const [isSpinning, setIsSpinning] = useState(false);







  const [spinAngle, setSpinAngle] = useState(0);







  const [spinResult, setSpinResult] = useState<string | null>(null);







  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);







  const SPIN_PRIZES = [







    { id: 'item_waktu_beku', title: 'Waktu Beku', count: 1, color: '#6366F1', weight: 15 },







    { id: 'item_skor_ganda', title: 'Skor Ganda', count: 1, color: '#F59E0B', weight: 15 },







    { id: 'item_terawangan', title: 'Teropong Sakti', count: 1, color: '#8B5CF6', weight: 15 },







    { id: 'coins_100', title: '100 Koin', count: 100, isCoins: true, color: '#EC4899', weight: 20 },







    { id: 'item_kesempatan_kedua', title: 'Kesempatan Kedua', count: 1, color: '#10B981', weight: 10 },







    { id: 'item_coin_booster', title: 'Koin Booster', count: 1, color: '#3B82F6', weight: 10 },







    { id: 'energy_5', title: '5 Energi', count: 5, isEnergy: true, color: '#14B8A6', weight: 12 },







    { id: 'coins_500', title: '500 Koin (Jackpot!)', count: 500, isCoins: true, color: '#EF4444', weight: 3 },







  ];







  const startSpin = () => {







    if (isSpinning || !profile) return;







    







    const todayStr = new Date().toDateString();







    const hasSpunToday = lastSpinDate === todayStr;







    







    if (hasSpunToday) {







      if (globalCoins < 100) {







        setToastMessage("Koin Anda tidak cukup untuk membeli spin tambahan (100 Koin)!");







        setTimeout(() => setToastMessage(''), 3000);







        return;







      }







    }







    







    setIsSpinning(true);







    setSpinResult(null);







    







        const r = Math.random() * 100;



    let cumulative = 0;



    let prizeIdx = 0;



    for (let i = 0; i < SPIN_PRIZES.length; i++) {



      cumulative += SPIN_PRIZES[i].weight;



      if (r <= cumulative) {



        prizeIdx = i;



        break;



      }



    }



    const prize = SPIN_PRIZES[prizeIdx];







    







    const targetAngle = 360 - (prizeIdx * 45) - 22.5;







    const finalAngle = targetAngle + (5 * 360);







    setSpinAngle(finalAngle);







    







    setTimeout(() => {







      setIsSpinning(false);







      setSpinResult(prize.title);







      







      let updatedInv = { ...profile.inventory };







      let newCoins = globalCoins;







      let newEnergy = energy;







      







      if (hasSpunToday) {







        newCoins -= 100;







      } else {







        localStorage.setItem('skdquest_last_spin_date', todayStr);







        setLastSpinDate(todayStr);







      }







      







      if (prize.isCoins) {







        newCoins += prize.count;







      } else if (prize.isEnergy) {







        newEnergy = Math.min(24, newEnergy + prize.count);







      } else {







        updatedInv[prize.id] = (updatedInv[prize.id] || 0) + prize.count;







      }







      







      setGlobalCoins(newCoins);







      setEnergy(newEnergy);







      







      updateProfile({







        coins: newCoins,







        energy: newEnergy,







        inventory: updatedInv as any







      }).then(() => {







        setToastMessage(`🎉 Selamat! Anda memenangkan: ${prize.title}!`);







        setTimeout(() => setToastMessage(''), 4000);







      });







    }, 4200);







  };







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







      // If code starts with 'D' (Duel), simulate friend duel join







      if (roomCode.toUpperCase().startsWith('D')) {







        setPlayersCount(2);







        setPvpState('waiting_friend');







        setTimeout(() => {







          handlePlayGame(new MouseEvent('click') as any, '/quiz', 'pvp1v1', { opponent: 'Teman Anda', roomId: activeRoom });







          setSelectedMode(null);







          setPvpState('idle');







          setPvpSubMode('selection');







        }, 2000);







      } else {







        setPlayersCount(Math.floor(Math.random() * 20) + 5); // Simulate already joined players







        setPvpState('waiting');







      }







    }, 1500);







  };







  const handleCreateFriendDuel = () => {







    setPvpState('loading');







    setTimeout(() => {







      const code = 'D' + Math.random().toString(36).substring(2, 7).toUpperCase();







      setActiveRoom(code);







      setIsHost(true);







      setPlayersCount(1);







      setPvpSubMode('friend_duel');







      setPvpState('waiting_friend');







    }, 1000);







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







  // Simulate friend joining in waiting_friend room







  useEffect(() => {







    if (pvpState === 'waiting_friend' && isHost && selectedMode?.id === 'pvp') {







      const timer = setTimeout(() => {







        setPlayersCount(2);







        setToastMessage('Teman berhasil bergabung!');







        // Host starts the game automatically after friend joins







        setTimeout(() => {







          handlePlayGame(new MouseEvent('click') as any, '/quiz', 'pvp1v1', { opponent: 'Teman Anda', roomId: activeRoom });







          setSelectedMode(null);







          setPvpState('idle');







          setPvpSubMode('selection');







        }, 2000);







      }, 6000); // simulate friend taking 6 seconds to join







      return () => clearTimeout(timer);







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







    setPvpSubMode('selection');







  };







  const handlePlayGame = (e: React.MouseEvent, path: string, modeId?: string, extraState: any = {}) => {







    // Verifikasi energi sebelum bermain







    const cost = selectedMode?.cost || 0;







    const costType = selectedMode?.costType || 'energy';







    







    if (costType === 'energy' && energy < cost) {







      setToastMessage(`Energi Anda tidak cukup! Dibutuhkan ${cost} energi.`);







      setTimeout(() => setToastMessage(''), 3000);







      return;







    }







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







        const newCoins = globalCoins + bonus;







        const newStreak = totalStreak + 1;







        setGlobalCoins(newCoins);







        setTotalStreak(newStreak);







        setToastMessage(msg);







        localStorage.setItem('skdquest_last_claim_date', new Date().toDateString());







        // Simpan perolehan koin dan streak permanen ke Supabase/Profile







        updateProfile({ coins: newCoins, streak: newStreak }).then(() => {







          setTimeout(() => {







            setToastMessage('');







            navigate(path, { state: { mode: modeId, ...extraState } });







          }, 2000);







        });







      }, 1000);







    } else {







      navigate(path, { state: { mode: modeId, ...extraState } });







    }







  };







  return (







    <div className="relative">







      {/* === RODA KEBERUNTUNGAN SPIN WHEEL MODAL === */}







      <AnimatePresence>







        {showSpinWheel && (







          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">







            <motion.div 







              initial={{ opacity: 0 }}







              animate={{ opacity: 0.6 }}







              exit={{ opacity: 0 }}







              onClick={() => !isSpinning && setShowSpinWheel(false)}







              className="fixed inset-0 bg-black"







            />







            







            <motion.div







              initial={{ scale: 0.9, opacity: 0 }}







              animate={{ scale: 1, opacity: 1 }}







              exit={{ scale: 0.9, opacity: 0 }}







              className="bg-skd-card border border-skd-border w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative z-10 overflow-hidden text-center flex flex-col items-center gap-4"







            >







              <button 







                disabled={isSpinning}







                onClick={() => setShowSpinWheel(false)}







                className="absolute top-4 right-4 p-1 hover:bg-skd-muted/10 rounded-full transition-colors text-skd-text disabled:opacity-30"







              >







                <X size={20} />







              </button>







              







              <h3 className="font-black text-lg text-skd-text flex items-center gap-1.5 uppercase font-space tracking-wider">







                🎡 Roda Keberuntungan







              </h3>







              <p className="text-xs text-skd-muted leading-relaxed">







                {lastSpinDate === new Date().toDateString() 







                  ? "Anda sudah menggunakan spin gratis hari ini. Beli putaran ekstra seharga 100 Koin!" 







                  : "Putar roda untuk mendapatkan Power-up harian gratis Anda!"}







              </p>







              







              <div className="relative w-72 h-72 md:w-80 md:h-80 mt-2 flex items-center justify-center bg-black/40 rounded-full border-[6px] border-skd-border shadow-inner">







                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-red-500 drop-shadow-md" />







                







                <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#1A1924] border-4 border-skd-border z-10 flex items-center justify-center shadow-lg">







                  <div className="w-3 h-3 rounded-full bg-yellow-500 fill-yellow-500 animate-pulse" />







                </div>







                <motion.div







                  className="w-full h-full"







                  animate={{ rotate: spinAngle }}







                  transition={isSpinning ? { duration: 4, ease: [0.1, 1, 0.1, 1] } : { duration: 0 }}







                >







                  <svg className="w-full h-full" viewBox="0 0 256 256">







                    {(() => {







                      const dVal = (startAngle: number, endAngle: number) => {







                        const rad = Math.PI / 180;







                        const x1 = 128 + 115 * Math.cos(startAngle * rad);







                        const y1 = 128 + 115 * Math.sin(startAngle * rad);







                        const x2 = 128 + 115 * Math.cos(endAngle * rad);







                        const y2 = 128 + 115 * Math.sin(endAngle * rad);







                        return `M 128 128 L ${x1} ${y1} A 115 115 0 0 1 ${x2} ${y2} Z`;







                      };







                      return SPIN_PRIZES.map((prize, idx) => {







                        const startAngle = idx * 45 - 90;







                        const endAngle = (idx + 1) * 45 - 90;







                        const midAngle = idx * 45 + 22.5 - 90;
                        const textRad = Math.PI / 180;
                        const tx = 128 + 80 * Math.cos(midAngle * textRad);
                        const ty = 128 + 80 * Math.sin(midAngle * textRad);
                        
                        let displayFirst = "";
                        let displaySecond = "";

                        switch (prize.id) {
                          case 'item_waktu_beku':
                            displayFirst = "❄️ Waktu";
                            displaySecond = "Beku";
                            break;
                          case 'item_skor_ganda':
                            displayFirst = "🔥 Skor";
                            displaySecond = "x2";
                            break;
                          case 'item_terawangan':
                            displayFirst = "👁️ Teropong";
                            displaySecond = "Sakti";
                            break;
                          case 'coins_100':
                            displayFirst = "🪙 100";
                            displaySecond = "Koin";
                            break;
                          case 'item_kesempatan_kedua':
                            displayFirst = "🔄 Ksmptn";
                            displaySecond = "Kedua";
                            break;
                          case 'item_coin_booster':
                            displayFirst = "🚀 Koin";
                            displaySecond = "Booster";
                            break;
                          case 'energy_5':
                            displayFirst = "⚡ 5";
                            displaySecond = "Energi";
                            break;
                          case 'coins_500':
                            displayFirst = "👑 Jackpot";
                            displaySecond = "500 Koin";
                            break;
                          default:
                            const cleanTitle = prize.title.split(' (')[0];
                            displayFirst = cleanTitle.split(' ')[0];
                            displaySecond = cleanTitle.split(' ').slice(1).join(' ');
                        }
                        
                        return (
                          <g key={prize.id}>
                            <path d={dVal(startAngle, endAngle)} fill={prize.color} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                            <text 
                              x={tx} 
                              y={ty} 
                              transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                              textAnchor="middle" 
                              className="fill-white font-black font-space text-[12px] tracking-tighter"
                            >
                              <tspan x={tx} dy="-3">{displayFirst}</tspan>
                              {displaySecond && (
                                <tspan x={tx} dy="11" className="fill-yellow-300 font-bold text-[9.5px] tracking-tighter">
                                  {displaySecond}
                                </tspan>
                              )}
                            </text>
                          </g>
                        );







                      });







                    })()}







                  </svg>







                </motion.div>







              </div>







              







              <button







                disabled={isSpinning}







                onClick={startSpin}







                className="w-full mt-2 py-3 bg-gradient-to-r from-skd-premium to-skd-accent text-[#0F0E17] font-black rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"







              >







                <Coins size={16} />







                <span>







                  {isSpinning 







                    ? "Memutar..." 







                    : lastSpinDate === new Date().toDateString() 







                    ? "Beli Putaran (100 Koin)" 







                    : "Putar Sekarang (Gratis)"}







                </span>







              </button>



              {/* Legenda Peluang Gacha Transparan */}

              <div className="mt-4 bg-white/5 border border-white/5 rounded-2xl p-3 text-center max-w-sm w-full backdrop-blur-md">

                <h4 className="text-[10px] font-black text-skd-accent uppercase tracking-widest mb-2 font-space">Peluang Hadiah Roda CAT</h4>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-bold text-gray-400">

                  {SPIN_PRIZES.map(prize => (

                    <div key={prize.id} className="flex justify-between border-b border-white/5 pb-0.5">

                      <span className="flex items-center gap-1.5">

                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prize.color }} />

                        {prize.title.split(' (')[0]}

                      </span>

                      <span className="font-space text-white">{prize.weight}%</span>

                    </div>

                  ))}

                </div>

              </div>







            </motion.div>







          </div>







        )}







      </AnimatePresence>







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







        className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto pb-8 md:pb-12"







      >







        {/* ── Top Header (Profile, XP, Resources) ── */}







        <motion.div







          variants={itemVariants}







          className="flex flex-col md:flex-row items-center justify-between gap-4 bg-skd-card p-3 rounded-2xl border border-skd-border shadow-sm"







        >







          {/* Profile & XP Inline */}







          <div className="flex items-center gap-3 w-full md:w-auto">







            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-skd-premium to-skd-accent p-0.5 shadow-sm shrink-0 overflow-hidden">







              <img 







                src={avatarPdh} 







                alt="Avatar" 







                className={`w-full h-full rounded-full object-cover ${AVATAR_FILTERS[equippedAvatarId] || ''}`} 







              />







            </div>







            <div className="flex flex-col flex-1 min-w-[150px]">







              <div className="flex items-center gap-2">







                <p className="text-sm font-semibold text-skd-text leading-none">CIHUYYYY</p>







                <div className="px-1.5 py-0.5 bg-skd-premium/10 rounded text-[9px] text-skd-premium font-bold">Lvl 14</div>







                <RankBadge score={3800} size="sm" />







              </div>







              {/* Inline XP Bar */}







              <div className="flex items-center gap-2 mt-1.5">







                <div className="flex-1 h-1.5 bg-skd-muted/20 rounded-full overflow-hidden">







                  <motion.div







                    initial={{ width: 0 }} animate={{ width: '70%' }}







                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}







                    className="h-full bg-gradient-to-r from-skd-premium to-skd-accent rounded-full"







                  />







                </div>







                <p className="text-[10px] text-skd-muted font-medium w-16">700/1K XP</p>







              </div>







            </div>







          </div>







          {/* Right Side Resources & Theme */}







          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t border-skd-border md:border-none">







            <motion.button







              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}







              onClick={() => navigate('/liga')}







              className="inline-flex items-center px-2.5 py-1 gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg text-[10px] sm:text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer"







            >







              <Users className="w-3.5 h-3.5 text-white" />







              <span>Liga</span>







              <ChevronRight className="w-3 h-3 text-white/70 ml-0.5" />







            </motion.button>







            <div className="flex items-center gap-1.5 ml-auto">







              <motion.button







                whileHover={{ scale: 1.1 }}







                whileTap={{ scale: 0.9 }}







                onClick={toggleMute}







                className="w-8 h-8 flex items-center justify-center bg-skd-bg rounded-full border border-skd-border text-skd-muted hover:text-skd-text transition-colors"







              >







                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}







              </motion.button>







              <button







                onClick={toggleTheme}







                className="w-8 h-8 flex items-center justify-center bg-skd-bg rounded-full border border-skd-border text-skd-muted hover:text-skd-text transition-colors"







              >







                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}







              </button>







              <div className="flex items-center gap-1 bg-skd-bg px-2.5 py-1.5 rounded-full border border-skd-border shadow-sm">







                <Zap className="w-3.5 h-3.5 text-skd-accent fill-skd-accent" />







                <span className="font-space font-bold text-xs text-skd-text">{energy}/25</span>







              </div>







              <div className="flex items-center gap-1 bg-skd-bg px-2.5 py-1.5 rounded-full border border-skd-border shadow-sm">







                <Coins className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />







                <span className="font-space font-bold text-xs text-skd-text">{globalCoins.toLocaleString()}</span>







              </div>







            </div>







          </div>







        </motion.div>







        {/* ── GAME MODES (MAIN FOCUS) ── */}







        <motion.section variants={itemVariants} className="space-y-4 pt-2">







          <div className="flex items-center justify-between">







            <h2 className="text-[18px] sm:text-[20px] font-semibold text-skd-text tracking-tight">Mode Permainan</h2>







            <span className="text-[12px] text-skd-muted font-medium hidden sm:block">Pilih Mode Permainan</span>







          </div>







          <div className="flex flex-col gap-3 md:gap-4">







            {/* Primary CTA: Latihan Harian */}







            {GAME_MODES.filter(m => m.id === 'latihan').map(mode => (







              <motion.div







                key={mode.id}







                whileHover={{ scale: 1.01 }}







                whileTap={{ scale: 0.98 }}







                onClick={() => setSelectedMode(mode)}







                className="bg-skd-card rounded-2xl border-l-[6px] border-l-skd-success border-t border-r border-b border-skd-border transition-all cursor-pointer p-5 sm:p-6 shadow-sm relative overflow-hidden group flex flex-col sm:flex-row items-center sm:justify-between gap-5"







              >







                <div className="flex items-center gap-4 w-full sm:w-auto">







                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-skd-success/10 text-skd-success shrink-0">







                    <mode.icon size={28} />







                  </div>







                  <div className="text-left">







                    <h4 className="font-black text-[22px] text-skd-text leading-tight">{mode.title}</h4>







                    <p className="text-[13px] text-skd-muted mt-1 font-medium">{mode.desc}</p>







                    <div className="flex items-center gap-1 text-[11px] font-bold text-skd-text bg-skd-bg px-2.5 py-1 rounded-md w-fit border border-skd-border mt-2.5">







                      <Zap size={12} className="text-skd-accent" />







                      <span>{mode.cost} Energi</span>







                    </div>







                  </div>







                </div>







                <div className="w-full sm:w-auto relative shrink-0">







                  <motion.button







                    animate={{







                      boxShadow: ['0 0 0px rgba(74, 222, 128, 0)', '0 0 20px rgba(74, 222, 128, 0.4)', '0 0 0px rgba(74, 222, 128, 0)']







                    }}







                    transition={{ duration: 2, repeat: Infinity }}







                    className="w-full sm:w-auto px-8 py-3.5 bg-skd-success text-white rounded-xl font-bold text-[15px] hover:brightness-110 transition-all z-10 relative"







                  >







                    Mulai Sekarang







                  </motion.button>







                </div>







              </motion.div>







            ))}







            {/* Secondary Modes */}







            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">







              {GAME_MODES.filter(m => m.id !== 'latihan').map((mode) => {







                let accentColor = '';







                if (mode.id === 'survival') accentColor = 'border-l-skd-danger';







                else if (mode.id === 'pvp') accentColor = 'border-l-blue-500';







                else if (mode.id === 'tryout') accentColor = 'border-l-skd-premium';







                return (







                  <motion.div







                    key={mode.id}







                    whileHover={{ scale: 1.02, y: -2 }}







                    whileTap={{ scale: 0.98 }}







                    onClick={() => setSelectedMode(mode)}







                    className={`bg-skd-card rounded-xl border-l-[5px] ${accentColor} border-t border-r border-b border-skd-border transition-all cursor-pointer p-4 shadow-sm flex flex-col gap-2 group relative`}







                  >







                    <div className="flex items-center gap-3">







                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode.bg} ${mode.color}`}>







                        <mode.icon size={20} />







                      </div>







                      <div>







                        <h4 className="font-black text-[15px] text-skd-text leading-tight group-hover:text-skd-accent transition-colors">{mode.title}</h4>







                        <div className="absolute top-3 right-3 text-[9px] font-bold text-skd-muted uppercase bg-skd-bg px-1.5 py-0.5 rounded border border-skd-border">







                          {mode.badge}







                        </div>







                      </div>







                    </div>







                    <p className="text-[12px] text-skd-muted font-medium line-clamp-2 mt-1">{mode.desc}</p>







                    <div className="flex items-center gap-1 text-[11px] font-bold text-skd-text mt-auto pt-2">







                      {mode.costType === 'energy' ? <Zap size={12} className="text-skd-accent" /> : <Coins size={12} className="text-yellow-500" />}







                      <span>{mode.cost.toLocaleString()} {mode.costType === 'energy' ? 'Energi' : 'Koin'}</span>







                    </div>







                  </motion.div>







                );







              })}







            </div>







          </div>







        </motion.section>







        {/* ── STREAK + STATS ROW ── */}







        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">







          {/* Streak Section */}







          <motion.section variants={itemVariants} className="lg:col-span-7 bg-skd-card rounded-2xl p-5 border border-skd-border shadow-sm flex flex-col">







            <div className="flex justify-between items-end mb-3">







              <div>







                <h3 className="text-[18px] sm:text-[20px] font-semibold text-skd-text tracking-tight flex items-center gap-2">







                  <Flame className="text-skd-accent" size={20} />







                  Streak Harian







                </h3>







                <p className="text-[13px] text-skd-muted font-medium mt-0.5">{totalStreak + (isStreakClaimed ? 1 : 0)}/30 hari — hampir MEGA!</p>







              </div>







              <div className="flex items-center gap-2 text-right pb-1">







                <button 







                  onClick={() => setShowSpinWheel(true)}







                  className="text-[10px] font-bold text-skd-premium uppercase tracking-wider bg-skd-premium/10 px-3 py-1.5 rounded hover:bg-skd-premium/20 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 animate-pulse shrink-0"







                >







                  <Gift size={12} /> Klaim Spin Harian 🎡







                </button>







                <span className="text-[10px] font-bold text-skd-premium uppercase tracking-wider bg-skd-premium/10 px-2 py-1.5 rounded">Mega Reward</span>







              </div>







            </div>







            {/* Motivational Progress Bar */}







            <div className="w-full h-2.5 bg-skd-bg rounded-full overflow-hidden border border-skd-border mb-5">







              <motion.div







                initial={{ width: 0 }}







                animate={{ width: `${((totalStreak + (isStreakClaimed ? 1 : 0)) / 30) * 100}%` }}







                transition={{ duration: 1.5, delay: 0.2 }}







                className="h-full bg-gradient-to-r from-skd-accent to-skd-premium rounded-full"







              />







            </div>







            <div className="flex justify-between items-center w-full mt-auto">







              {weeklyStreakData.map((day, idx) => {







                const isRewardBox = day.isDay7 || day.isMega;







                const isToday = day.status === 'current';







                const canClaimToday = isToday && !isStreakClaimed;







                if (isRewardBox) {







                  return (







                    <div key={idx} className="flex flex-col items-center gap-1.5">







                      <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all







                        ${day.status === 'done' ? 'bg-skd-success border-skd-success text-white' :







                          day.status === 'current' ? 'border-skd-premium bg-skd-premium/10 text-skd-premium shadow-[0_0_12px_rgba(245,166,35,0.4)]' :







                            'border-skd-border bg-skd-muted/5 text-skd-muted'}`}







                      >







                        {day.status === 'done' ? <Check size={16} strokeWidth={3} /> : <Gift size={16} className={day.status === 'future' ? 'opacity-50' : ''} />}







                        {canClaimToday && (







                          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}







                            className="absolute inset-0 border-2 border-skd-premium rounded-full pointer-events-none" />







                        )}







                      </div>







                      <span className={`text-[10px] font-bold ${day.status === 'done' ? 'text-skd-success' : day.status === 'current' ? 'text-skd-premium' : 'text-skd-muted'}`}>







                        {day.status === 'done' ? '✓' : day.isMega ? '+50🪙' : '+10🪙'}







                      </span>







                    </div>







                  );







                }







                return (







                  <div key={idx} className="flex flex-col items-center gap-1.5">







                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all







                      ${day.status === 'done' ? 'bg-skd-success border-skd-success text-white' :







                        day.status === 'current' ? 'border-skd-accent bg-skd-accent/10 text-skd-accent' :







                          'border-skd-border bg-skd-muted/5 text-skd-muted'}`}







                    >







                      {day.status === 'done' && <Check size={16} strokeWidth={3} />}







                      {day.status === 'current' && !isStreakClaimed && (







                        <>







                          <div className="w-2.5 h-2.5 rounded-full bg-skd-accent" />







                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }}







                            className="absolute inset-0 border-2 border-skd-accent rounded-full pointer-events-none" />







                        </>







                      )}







                    </div>







                    <span className={`text-[10px] font-bold ${day.status === 'current' ? 'text-skd-accent' : 'text-skd-muted'}`}>{day.day}</span>







                  </div>







                );







              })}







            </div>







          </motion.section>







          {/* Quick Stats */}







          <motion.section variants={itemVariants} className="lg:col-span-5 flex flex-col">







            <h3 className="text-[18px] sm:text-[20px] font-semibold text-skd-text tracking-tight mb-3">Statistik</h3>







            <div className="grid grid-cols-3 gap-3 flex-1">







              {[







                { icon: Activity, color: 'text-skd-success', bg: 'bg-skd-success/10', border: 'border-skd-success/20', value: 342, label: 'Dijawab', suffix: '' },







                { icon: Crosshair, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', value: 78, label: 'Akurasi', suffix: '%' },







                { icon: Flame, color: 'text-skd-accent', bg: 'bg-skd-accent/10', border: 'border-skd-accent/20', value: 12, label: 'Combo', suffix: '', prefix: 'x' },







              ].map((stat, i) => (







                <motion.div key={i} whileHover={{ y: -3 }} className={`bg-skd-card rounded-2xl p-4 border ${stat.border} shadow-sm flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group`}>







                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} transition-transform group-hover:scale-110`}>







                    <stat.icon className={stat.color} size={20} />







                  </div>







                  <div className="relative z-10">







                    <p className="text-2xl font-black text-skd-text font-space leading-none mb-1">







                      {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} />







                    </p>







                    <p className="text-[11px] text-skd-muted font-bold uppercase tracking-wider">{stat.label}</p>







                  </div>







                  <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-20 ${stat.bg}`} />







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







                    <h4 className="text-sm font-bold text-skd-danger mb-2 flex items-center gap-2"><Target size={16} /> Aturan Hardcore</h4>







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







                        {/* Option 1.5: 1v1 Duel Teman */}







                        <div







                          onClick={handleCreateFriendDuel}







                          className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition-all flex items-center gap-4 group"







                        >







                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">







                            <UserPlus size={22} />







                          </div>







                          <div className="flex-1 min-w-0">







                            <h4 className="text-sm font-black text-skd-text flex items-center gap-1.5">







                              Duel Bersama Teman







                            </h4>







                            <p className="text-[11px] text-skd-muted mt-0.5 leading-snug">Undang temanmu untuk duel 1v1 secara private.</p>







                          </div>







                          <ChevronRight size={16} className="text-skd-muted group-hover:text-purple-400 transition-colors" />







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







                          <h4 className="text-sm font-bold text-blue-500 mb-2 flex items-center gap-2"><Users size={16} /> Multiplayer Custom Room</h4>







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







                    {pvpState === 'waiting_friend' && (







                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-skd-bg rounded-2xl border border-skd-border p-6 text-center space-y-4">







                        <div>







                          <p className="text-xs text-skd-muted uppercase font-bold tracking-widest mb-1">Kode Duel</p>







                          <div className="text-3xl font-black text-skd-text font-mono tracking-widest bg-skd-card py-2 rounded-xl border border-skd-border flex items-center justify-center gap-3">







                            {activeRoom}







                            <button onClick={() => setToastMessage('Kode berhasil disalin!')} className="p-2 bg-skd-bg hover:bg-skd-border rounded-lg text-skd-muted hover:text-skd-text transition-colors">







                              <Copy size={18} />







                            </button>







                          </div>







                        </div>







                        <div className="flex items-center justify-center gap-3">







                          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500"><UserPlus size={24} /></div>







                          <div className="text-left">







                            <div className="text-2xl font-black text-skd-text">{playersCount}<span className="text-sm text-skd-muted font-medium">/2</span></div>







                            <div className="text-xs text-skd-muted">Pemain Bergabung</div>







                          </div>







                        </div>







                        {playersCount === 1 && isHost ? (







                          <div className="flex flex-col items-center justify-center gap-3 pt-2">







                            <div className="flex items-center gap-2 text-purple-400">







                              <Loader2 className="animate-spin" size={14} />







                              <p className="text-xs font-bold">Menunggu teman bergabung...</p>







                            </div>







                            <button onClick={() => setToastMessage('Link undangan berhasil disalin!')} className="text-[10px] font-bold text-skd-text bg-skd-card border border-skd-border hover:bg-skd-bg px-3 py-1.5 rounded-lg flex items-center gap-1.5">







                              <Share2 size={12} /> Bagikan Link







                            </button>







                          </div>







                        ) : (







                          <div className="text-green-400 font-bold text-sm pt-2">Memulai duel...</div>







                        )}







                        <button







                          onClick={handleCancelMatching}







                          className="w-full mt-4 bg-skd-card border border-skd-border hover:bg-skd-bg text-skd-text font-bold py-2 rounded-lg text-xs transition-colors"







                        >







                          Batalkan Duel







                        </button>







                      </motion.div>







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







                    <h4 className="text-sm font-bold text-skd-premium mb-2 flex items-center gap-2"><Lock size={16} /> Buka Akses Try Out</h4>







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







                      onClick={(e) => { const extra = selectedMode.id === 'pvp' ? { roomId: activeRoom } : {}; handlePlayGame(e, '/quiz', selectedMode.id, extra); handleCloseModal(); }}







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