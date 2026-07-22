import { useState, useEffect, useMemo } from 'react';
import { motion, type Variants, AnimatePresence } from 'framer-motion';
import { Zap, Coins, Swords, BrainCircuit, Target, Trophy, Check, Flame, Activity, Crosshair, Gift, X, Users, Lock, CreditCard, Loader2, ChevronRight, UserPlus, Copy, BookOpen, LogOut, Clock, Eye, RefreshCw, Sparkles, PartyPopper } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchProfile, resetDailyQuests, syncEnergy, supabase, isSupabaseConfigured, fetchAvailableCharacters, type Character, type UserProfile } from '../lib/supabase';
import RankBadge from '../components/RankBadge';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import avatarPdh from '../assets/avatar_pdh.webp';
import { useFocusTrap } from '../hooks/useFocusTrap';



const GAME_MODES = [
  { id: 'latihan', title: 'Latihan Harian', desc: 'Asah kemampuanmu setiap hari', cost: 2, costType: 'energy', icon: BrainCircuit, color: 'text-success', bg: 'bg-success-subtle', border: 'border-success/30 hover:border-success hover:shadow-sm', badge: 'Santai' },
  { id: 'survival', title: 'Survival Mode', desc: '1 Kesalahan = Game Over', cost: 3, costType: 'energy', icon: Target, color: 'text-danger', bg: 'bg-danger-subtle', border: 'border-danger/30 hover:border-danger hover:shadow-sm', badge: 'Hardcore' },
  { id: 'pvp', title: 'PvP Battle', desc: 'Main bareng maks 50 player', cost: 3, costType: 'energy', icon: Swords, color: 'text-info', bg: 'bg-info-subtle', border: 'border-info/30 hover:border-info hover:shadow-sm', badge: 'Multiplayer' },
  { id: 'tryout', title: 'Try Out Mode', desc: 'Simulasi SKD · 1.000 koin / attempt', cost: 1000, costType: 'coin', icon: Trophy, color: 'text-premium', bg: 'bg-premium-subtle', border: 'border-premium/30 hover:border-premium hover:shadow-sm', badge: 'Premium' },
  { id: 'catatan_salah', title: 'Buku Catatan Salah', desc: 'Latih ulang soal yang pernah salah', cost: 0, costType: 'energy', icon: BookOpen, color: 'text-info', bg: 'bg-info-subtle', border: 'border-info/30 hover:border-info hover:shadow-card', badge: 'Evaluasi' },
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
    const navigate = useNavigate();
  // Energy & Coins State
  const [energy, setEnergy] = useState<number | null>(null);

  // --- Real-time Midnight Reset Listener ---
  useEffect(() => {
    const todayAtMount = new Date().toDateString();
    const interval = setInterval(() => {
       if (new Date().toDateString() !== todayAtMount) {
          // Hari berganti (tepat pukul 00:00), refresh halaman untuk memicu reset quest dan streak
          window.location.reload();
       }
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  const [energyTimer, setEnergyTimer] = useState(150); // 150s = 2.5 mins
  const [globalCoins, setGlobalCoins] = useState(1240);
  const [equippedAvatarId, setEquippedAvatarId] = useState('stmkg');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  useEffect(() => {
    setLoading(true);
    fetchAvailableCharacters().then(setAvailableCharacters);
    fetchProfile()
      .then(p => {
        if (!p) {
          // Jika profil null, berarti ini user baru (dari Google Auth) yang belum punya karakter
          navigate('/onboarding', { replace: true });
          setIsProcessing(false);
          return;
        }

        // 1. Reset misi harian server-side (quest 1-3) — jangan updateProfile quests_progress
        void resetDailyQuests().then((r) => {
          if (r.success && r.questsProgress) {
            setProfile((prev: UserProfile | null) =>
              prev ? { ...prev, quests_progress: r.questsProgress as any } : prev
            );
          }
        });

        // 2. Energy: nilai DB dulu; sync_energy authoritative (regen 1/150s, cap 25)
        setEnergy(p.energy ?? 25);
        setEnergyTimer((p.energy ?? 25) >= 25 ? 0 : 150);
        setProfile(p);
        setGlobalCoins(p.coins);
        setEquippedAvatarId(p.selected_avatar || 'stmkg');
        setLastSpinDate(normalizeSpinDate(p.last_spin_date) || p.last_spin_date || null);

        void syncEnergy().then((r) => {
          if (!r.success) return;
          setEnergy(r.energy);
          setEnergyTimer(r.energy >= 25 ? 0 : Math.max(0, r.secondsToNext || 0));
          setProfile((prev: UserProfile | null) =>
            prev ? { ...prev, energy: r.energy } : prev
          );
        });

        // Streak display dari server; klaim hanya lewat tombol + RPC daily_claim
        // last_claim_date format kanonis: YYYY-MM-DD (Asia/Jakarta di server)
        const lastClaimStr = (p.last_claim_date || '').slice(0, 10);
        const todayYmd = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
        setTotalStreak(p.streak ?? 0);
        if (lastClaimStr && lastClaimStr === todayYmd) {
          setIsStreakClaimed(true);
        } else {
          setIsStreakClaimed(false);
        }
      })
      .finally(() => setLoading(false));
  }, []);
  // Streak State (real calendar, not simulated)
  const [totalStreak, setTotalStreak] = useState(0);
  const [isStreakClaimed, setIsStreakClaimed] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  // Modal State for Game Modes
  const [selectedMode, setSelectedMode] = useState<any>(null);
  const gameModeModalRef = useFocusTrap(!!selectedMode, () => {
    setSelectedMode(null);
    setPvpState('idle');
    setPvpSubMode('selection');
    setRoomCode('');
    setIsHost(false);
    setActiveRoom('');
  });
  const [isProcessing, setIsProcessing] = useState(false);
  // PvP State
  const [roomCode, setRoomCode] = useState('');
  const [pvpState, setPvpState] = useState<'idle' | 'loading' | 'waiting' | 'matching' | 'waiting_friend'>('idle');
  const [isHost, setIsHost] = useState(false);
  const [activeRoom, setActiveRoom] = useState('');
  const [playersCount, setPlayersCount] = useState(1);
  // PvP 1v1 Quick Duel States
  const [pvpSubMode, setPvpSubMode] = useState<'selection' | 'custom' | 'friend_duel' | 'bot_setup'>('selection');
  const [opponentName, setOpponentName] = useState('');
  const [opponentLevel, setOpponentLevel] = useState(1);
  const [matchCountdown, setMatchCountdown] = useState(3);
  // Spin Wheel States
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinWheelModalRef = useFocusTrap(showSpinWheel, () => {
    if (!isSpinning) setShowSpinWheel(false);
  });
  const [spinAngle, setSpinAngle] = useState(0);
  const [, setSpinResult] = useState<string | null>(null);
  const [wonPrize, setWonPrize] = useState<{ title: string; count: number; icon: any; color: string; isCoins?: boolean; isEnergy?: boolean } | null>(null);
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);

  // Tanggal kanonis spin: Asia/Jakarta YYYY-MM-DD (selaras RPC)
  const jakartaYmd = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const normalizeSpinDate = (v?: string | null) => {
    if (!v) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    // legacy Date.toDateString() → coba parse
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    }
    return null;
  };

  const SPIN_PRIZES = useMemo(() => [
    { id: 'item_waktu_beku', title: 'Waktu Beku', short: 'Beku', count: 1, color: '#6366F1', icon: Clock, weight: 15, desc: 'Membekukan timer kuis selama 30 detik.' },
    { id: 'item_skor_ganda', title: 'Skor Ganda', short: 'x2 Skor', count: 1, color: '#F59E0B', icon: Zap, weight: 15, desc: 'Menggandakan poin jawaban benarmu.' },
    { id: 'item_terawangan', title: 'Teropong Sakti', short: 'Teropong', count: 1, color: '#8B5CF6', icon: Eye, weight: 15, desc: 'Melihat jawaban paling populer di soal.' },
    { id: 'coins_100', title: '100 Koin', short: '100 Koin', count: 100, isCoins: true, color: '#EC4899', icon: Coins, weight: 20, desc: 'Tambahan 100 koin untuk belanja item.' },
    { id: 'item_kesempatan_kedua', title: 'Kesempatan Kedua', short: '2nd Life', count: 1, color: '#10B981', icon: RefreshCw, weight: 10, desc: 'Lanjut bermain meski 1x salah jawab.' },
    { id: 'energy_5', title: '5 Energi', short: '+5⚡', count: 5, isEnergy: true, color: '#14B8A6', icon: Flame, weight: 12, desc: 'Tambahan 5 energi untuk masuk mode kuis.' },
    { id: 'coins_500', title: '500 Koin (Jackpot!)', short: 'JACKPOT!', count: 500, isCoins: true, color: '#EF4444', icon: Trophy, weight: 3, desc: 'Bonus Jackpot 500 koin melimpah!' },
  ], []);

  // Precompute SVG geometry so spinning animation does ZERO layout math per frame
  const precomputedSlices = useMemo(() => {
    const sliceSize = 360 / SPIN_PRIZES.length;
    const rad = Math.PI / 180;
    return SPIN_PRIZES.map((prize, idx) => {
      const startAngle = idx * sliceSize - 90;
      const endAngle = (idx + 1) * sliceSize - 90;
      const midAngle = idx * sliceSize + (sliceSize / 2) - 90;
      const x1 = 128 + 118 * Math.cos(startAngle * rad);
      const y1 = 128 + 118 * Math.sin(startAngle * rad);
      const x2 = 128 + 118 * Math.cos(endAngle * rad);
      const y2 = 128 + 118 * Math.sin(endAngle * rad);
      const d = `M 128 128 L ${x1.toFixed(2)} ${y1.toFixed(2)} A 118 118 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      const tx = 128 + 82 * Math.cos(midAngle * rad);
      const ty = 128 + 82 * Math.sin(midAngle * rad);
      const ix = 128 + 54 * Math.cos(midAngle * rad);
      const iy = 128 + 54 * Math.sin(midAngle * rad);
      return { prize, d, tx, ty, ix, iy, midAngle };
    });
  }, [SPIN_PRIZES]);

  const hasSpunToday = normalizeSpinDate(lastSpinDate) === jakartaYmd();

  const startSpin = () => {
    if (isSpinning || !profile) return;
    if (!isSupabaseConfigured() || !supabase) {
      setToastMessage('Koneksi server tidak tersedia.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    if (hasSpunToday && globalCoins < 100) {
      setToastMessage('Koin tidak cukup (butuh 100 koin).');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setIsSpinning(true);
    setSpinResult(null);

    // SH-01: server-side random via RPC — identitas dari auth.uid()
    void Promise.resolve(supabase.rpc('spin_wheel')).then(({ data, error }) => {
      const failReason =
        (data && typeof data === 'object' && (data as { error?: string }).error) ||
        error?.message ||
        null;

      if (failReason || !data || (data as { error?: string }).error) {
        const reason = String((data as { error?: string })?.error || failReason || 'error');
        const msgMap: Record<string, string> = {
          insufficient_coins: 'Koin tidak cukup (butuh 100 koin).',
          not_authenticated: 'Login terlebih dahulu untuk memutar roda.',
          profile_not_found: 'Profil akun tidak ditemukan.',
        };
        setIsSpinning(false);
        setSpinResult(null);
        let userMsg = msgMap[reason];
        if (!userMsg) {
          if (reason.toLowerCase().includes('uuid') || reason.toLowerCase().includes('syntax')) {
            userMsg = 'Gagal memutar roda (Server DB perlu update). Silakan coba lagi.';
          } else {
            userMsg = `Gagal memutar roda: ${reason}`;
          }
        }
        setToastMessage(userMsg);
        setTimeout(() => setToastMessage(''), 4000);
        return;
      }

      const prizeIds = SPIN_PRIZES.map(p => p.id);
      const idx = prizeIds.indexOf((data as { prize_id?: string }).prize_id || '');
      const prizeIdx = idx < 0 ? 0 : idx;
      const selectedPrize = SPIN_PRIZES[prizeIdx];

      // Animasi ultra mulus 60FPS: 3 putaran (1080 deg) dengan cubic-bezier deceleration
      const sliceSize = 360 / SPIN_PRIZES.length;
      const targetAngle = 360 - (prizeIdx * sliceSize) - (sliceSize / 2);
      setSpinAngle(prev => {
        const base = Math.ceil(prev / 360) * 360;
        return base + targetAngle + (3 * 360);
      });

      setTimeout(() => {
        setIsSpinning(false);
        const d = data as {
          coins_new?: number;
          energy_new?: number;
          prize_title?: string;
          last_spin_date?: string;
        };
        setLastSpinDate(d.last_spin_date || jakartaYmd());
        if (typeof d.coins_new === 'number') setGlobalCoins(d.coins_new);
        if (typeof d.energy_new === 'number') setEnergy(d.energy_new);
        setSpinResult(d.prize_title || selectedPrize.title);

        // Tampilkan Modal Selebrasi Hadiah (Rich Visual Prize Modal)
        setWonPrize({
          title: d.prize_title || selectedPrize.title,
          count: selectedPrize.count,
          icon: selectedPrize.icon,
          color: selectedPrize.color,
          isCoins: selectedPrize.isCoins,
          isEnergy: selectedPrize.isEnergy,
        });
      }, 2600);
    }).catch(() => {
      setIsSpinning(false);
      setToastMessage('Gagal spin (jaringan). Coba lagi.');
      setTimeout(() => setToastMessage(''), 4000);
    });
  };
  // Minggu kalender real (Sen–Min), timezone Asia/Jakarta
  // DAY_NAMES index: 0=Sen ... 6=Min
  // JS getDay(): 0=Min, 1=Sen, ..., 6=Sab
  const isTodayMegaReward = totalStreak > 0 && totalStreak % 30 === 0;
  const weeklyStreakData = (() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    }).formatToParts(new Date());
    const y = Number(parts.find(p => p.type === 'year')?.value);
    const m = Number(parts.find(p => p.type === 'month')?.value);
    const d = Number(parts.find(p => p.type === 'day')?.value);
    // weekday short en: Mon,Tue,... — map ke index Sen=0
    const wd = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
    const wdMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const todayIdx = wdMap[wd] ?? 0; // 0=Sen ... 6=Min

    // UTC date at Jakarta Y-M-D for day math
    const todayUtc = Date.UTC(y, m - 1, d);

    return Array.from({ length: 7 }).map((_, idx) => {
      const dayName = DAY_NAMES[idx];
      const cellUtc = todayUtc + (idx - todayIdx) * 86400000;
      const daysFromToday = Math.round((cellUtc - todayUtc) / 86400000);

      let status: 'done' | 'current' | 'future' = 'future';
      if (daysFromToday < 0) {
        // hari sebelum hari ini: done jika termasuk rantai streak mundur
        status = -daysFromToday <= totalStreak ? 'done' : 'future';
      } else if (daysFromToday === 0) {
        status = isStreakClaimed ? 'done' : 'current';
      } else {
        status = 'future';
      }

      return {
        day: dayName,
        status,
        isDay7: idx === 6,
        isMega: daysFromToday === 0 && isTodayMegaReward,
      };
    });
  })();
  // Timer countdown UI; habis / tab fokus → re-sync server (jangan write energy client)
  useEffect(() => {
    if ((energy || 0) >= 25) return;
    const interval = setInterval(() => {
      setEnergyTimer((prev) => {
        if (prev <= 1) {
          void syncEnergy().then((r) => {
            if (!r.success) return;
            setEnergy(r.energy);
            setEnergyTimer(r.energy >= 25 ? 0 : Math.max(1, r.secondsToNext || 150));
            setProfile((p: UserProfile | null) => (p ? { ...p, energy: r.energy } : p));
          });
          // Tahan 1s sampai server jawab (hindari spam RPC)
          return 1;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [energy]);

  // Re-sync saat tab kembali aktif (anti drift timer background)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void syncEnergy().then((r) => {
        if (!r.success) return;
        setEnergy(r.energy);
        setEnergyTimer(r.energy >= 25 ? 0 : Math.max(0, r.secondsToNext || 0));
        setProfile((p: UserProfile | null) => (p ? { ...p, energy: r.energy } : p));
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);
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
      setPvpState('waiting_friend');
    }, 1000);
  };
  const handleJoinRoom = () => {
    if (roomCode.length < 4) return;
    setPvpState('loading');
    setTimeout(() => {
      setActiveRoom(roomCode.toUpperCase());
      setIsHost(false);
      setPvpState('waiting_friend');
      if (roomCode.toUpperCase().startsWith('D')) {
        setPvpSubMode('friend_duel');
      } else {
        setPvpSubMode('custom');
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

  // Supabase Real-time: Custom Room & Friend Duel Lobby
  useEffect(() => {
    if (!activeRoom || !isSupabaseConfigured() || pvpState !== 'waiting_friend') return;
    
    const channel = supabase!.channel(`lobby_${activeRoom}`);
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const players = Object.values(state).flat();
      setPlayersCount(players.length);
      if (players.length > 1) {
        setToastMessage('Pemain bergabung ke room!');
        setTimeout(() => setToastMessage(''), 2000);
      }
    });

    if (!isHost) {
      channel.on('broadcast', { event: 'start_game' }, () => {
        handlePlayGame(new MouseEvent('click') as any, '/quiz', 'pvp', { roomId: activeRoom });
        setSelectedMode(null);
        setPvpState('idle');
      });
    }

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && profile) {
        await channel.track({ id: profile.id, name: profile.nickname || 'Player' });
      }
    });

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [activeRoom, pvpState, isHost, profile]);

  const handleStartHostGame = (e: React.MouseEvent) => {
    if (isHost && activeRoom && isSupabaseConfigured()) {
      const channel = supabase!.channel(`lobby_${activeRoom}`);
      channel.send({
        type: 'broadcast',
        event: 'start_game',
        payload: {}
      });
      // Delay slightly for others to get broadcast before host switches page
      setTimeout(() => {
        handlePlayGame(e, '/quiz', 'pvp', { roomId: activeRoom });
        setSelectedMode(null);
        setPvpState('idle');
      }, 500);
    }
  };

  // Reset PvP State when closing modal
  const handleCloseModal = () => {
    setSelectedMode(null);
    setPvpState('idle');
    setPvpSubMode('selection');
    setRoomCode('');
    setOpponentName('');
  };

  // Global Matchmaking (1v1)
  useEffect(() => {
    if (pvpState !== 'matching' || !isSupabaseConfigured()) return;
    
    const channel = supabase!.channel('global_matchmaking');
    let intervalCountdown: ReturnType<typeof setInterval>;
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const allWaiters = Object.values(state).flat() as any[];
      
      // Look for someone else waiting
      const others = allWaiters.filter(p => p.id !== profile?.id);
      
      if (others.length > 0 && opponentName === '') {
        // Match found!
        const opponent = others[0];
        setOpponentName(opponent.name);
        setOpponentLevel(10); // Assume level 10 for display
        
        // We need a common room ID. We can derive it by sorting IDs to be consistent
        const ids = [profile!.id, opponent.id].sort();
        const roomId = `QM_${ids[0]}_${ids[1]}`;
        
        // Start countdown to quiz
        let count = 3;
        setMatchCountdown(count);
        intervalCountdown = setInterval(() => {
          count--;
          setMatchCountdown(count);
          if (count === 0) {
            clearInterval(intervalCountdown);
            supabase!.removeChannel(channel);
            navigate('/quiz', { state: { mode: 'pvp1v1', opponent: opponent.name, roomId: roomId, energyCost: 2 } });
            setSelectedMode(null);
            setPvpState('idle');
            setPvpSubMode('selection');
          }
        }, 1000);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && profile) {
        await channel.track({ id: profile.id, name: profile.nickname || 'Player', timestamp: Date.now() });
      }
    });

    return () => {
      if (intervalCountdown) clearInterval(intervalCountdown);
      supabase!.removeChannel(channel);
    };
  }, [pvpState, profile, navigate, opponentName]);

  const handleCancelMatching = () => {
    setPvpState('idle');
    setOpponentName('');
    setMatchCountdown(3);
    setPvpSubMode('selection');
  };
  const handlePlayGame = async (_e: React.MouseEvent, path: string, modeId?: string, extraState: any = {}) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (modeId === 'catatan_salah') {
        try {
          const parsed = profile?.catatan_salah || [];
          if (parsed.length === 0) {
            setToastMessage('Buku Catatan Salah Anda masih kosong! Belum ada soal yang tercatat.');
            setTimeout(() => setToastMessage(''), 3000);
            return;
          }
        } catch (err) {
          console.error(err);
        }
        navigate('/catatan-salah');
        return;
      }

      const actualModeId = modeId === 'pvp1v1' ? 'pvp' : modeId;
      const modeConfig = GAME_MODES.find(m => m.id === actualModeId) || selectedMode;
      const cost = modeConfig?.cost || 0;
      const costType = modeConfig?.costType || 'energy';

      // Sync energy server sebelum cek biaya (hindari stale UI)
      let liveEnergy = energy || 0;
      if (costType === 'energy' && cost > 0) {
        const synced = await syncEnergy();
        if (synced.success) {
          liveEnergy = synced.energy;
          setEnergy(synced.energy);
          setEnergyTimer(synced.energy >= 25 ? 0 : Math.max(0, synced.secondsToNext || 0));
          setProfile((p: UserProfile | null) => (p ? { ...p, energy: synced.energy } : p));
        }
        if (liveEnergy < cost) {
          setToastMessage(`Energi tidak cukup! Butuh ${cost} (punya ${liveEnergy}).`);
          setTimeout(() => setToastMessage(''), 3000);
          return;
        }
      }
      if (costType === 'coin' && globalCoins < cost) {
        setToastMessage(`Koin Anda tidak cukup! Dibutuhkan ${cost.toLocaleString()} koin.`);
        setTimeout(() => setToastMessage(''), 3000);
        return;
      }

      // Energy dipotong di Quiz saat jawaban pertama (RPC consume_energy)
      navigate(path, {
        state: {
          mode: modeId,
          energyCost: costType === 'energy' ? cost : 0,
          coinCost: costType === 'coin' ? cost : 0,
          ...extraState,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDailyClaim = async () => {
    if (isStreakClaimed || isProcessing) return;
    if (!isSupabaseConfigured() || !supabase) {
      setToastMessage('Koneksi server tidak tersedia.');
      setTimeout(() => setToastMessage(''), 2500);
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('daily_claim');
      if (error || data?.error) {
        if (data?.error === 'already_claimed') {
          setIsStreakClaimed(true);
          if (typeof data.streak === 'number') setTotalStreak(data.streak);
          setToastMessage('Klaim harian sudah diambil hari ini.');
        } else {
          setToastMessage(data?.error ?? error?.message ?? 'Gagal klaim harian.');
        }
        setTimeout(() => setToastMessage(''), 3000);
        return;
      }
      setGlobalCoins(data.coins_new);
      setTotalStreak(data.streak);
      setIsStreakClaimed(true);
      setProfile((prev: UserProfile | null) => prev ? { ...prev, coins: data.coins_new, streak: data.streak, last_claim_date: data.last_claim_date } : prev);
      setToastMessage(data.msg || `Klaim berhasil! +${data.bonus} Koin`);
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage('Gagal klaim harian. Coba lagi.');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/auth');
  };
  
  // Kalkulasi statistik pemain secara dinamis dari Supabase Profile
  let totalDijawab = 0;
  let totalBenar = 0;
  if (profile?.akurasi) {
    // Ambil data dasar TIU, TWK, TKP jika ada
    ['TIU', 'TWK', 'TKP'].forEach(cat => {
      if (profile.akurasi[cat]) {
        totalDijawab += profile.akurasi[cat].total || 0;
        totalBenar += profile.akurasi[cat].correct || 0;
      }
    });
  }
  const calculatedAkurasi = totalDijawab > 0 ? Math.round((totalBenar / totalDijawab) * 100) : 0;
  const calculatedCombo = profile?.highest_survival_score || 0;

  if (loading) return <DashboardSkeleton />;
  
  return (
    <div className="relative">
      {/* === RODA KEBERUNTUNGAN SPIN WHEEL MODAL === */}
      <AnimatePresence>
        {showSpinWheel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSpinning && setShowSpinWheel(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              data-backdrop="true"
            />
            
            <motion.div
              ref={spinWheelModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="spin-wheel-title"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface border border-border/80 w-full max-w-sm sm:max-w-md md:max-w-xl rounded-[32px] p-5 sm:p-6 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar flex flex-col md:flex-row items-center gap-5 justify-between"
            >
              <button 
                type="button"
                disabled={isSpinning}
                onClick={() => setShowSpinWheel(false)}
                aria-label="Tutup Roda Keberuntungan"
                className="absolute top-4 right-4 p-1.5 hover:bg-surface-subtle rounded-full transition-colors text-fg disabled:opacity-30 z-30 border border-border/40"
              >
                <X size={18} />
              </button>
              
              {/* Kolom Kiri: Roda Spin dengan LED Ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center p-2.5 rounded-full bg-gradient-to-b from-amber-500/20 via-primary/10 to-purple-500/20 border-4 border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  
                  {/* 12 LED Lights */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30) * (Math.PI / 180);
                    const radius = 110;
                    const lx = radius * Math.cos(angle);
                    const ly = radius * Math.sin(angle);
                    return (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full border border-white/40 z-20 transition-all duration-300 ${
                          isSpinning
                            ? (i % 2 === 0 ? 'bg-amber-300 shadow-[0_0_6px_#fde047]' : 'bg-rose-400 shadow-[0_0_6px_#fb7185]')
                            : 'bg-amber-400/80 shadow-[0_0_4px_#f59e0b]'
                        }`}
                        style={{
                          transform: `translate(${lx}px, ${ly}px)`,
                        }}
                      />
                    );
                  })}

                  {/* Pointer Jarum Penunjuk Atas */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-rose-500 drop-shadow-[0_3px_6px_rgba(225,29,72,0.6)]" />
                    <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,1)] -mt-3.5 border border-rose-700" />
                  </div>
                  
                  {/* Centre Hub Button */}
                  <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-surface shadow-lg border-4 border-amber-400/80 z-20 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-inner">
                      <Trophy size={9} className="text-stone-900" />
                    </div>
                  </div>

                  {/* Wheel SVG Canvas */}
                  <motion.div
                    className="w-full h-full rounded-full overflow-hidden will-change-transform shadow-xl"
                    animate={{ rotate: spinAngle }}
                    transition={isSpinning ? { duration: 2.6, ease: [0.15, 0.85, 0.35, 1.0] } : { duration: 0 }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 256 256">
                      {precomputedSlices.map(({ prize, d, tx, ty, midAngle }) => (
                        <g key={prize.id}>
                          <path
                            d={d}
                            fill={prize.color}
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="1.5"
                          />
                          <text
                            x={tx}
                            y={ty}
                            transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-white font-black font-space text-[10.5px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                          >
                            {prize.short}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Kolom Kanan: Detail, Tombol & Peluang (Desktop 2-column layout) */}
              <div className="flex flex-col flex-1 w-full items-center md:items-start text-center md:text-left gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                    <Sparkles size={18} className="animate-pulse" />
                  </span>
                  <h3 id="spin-wheel-title" className="font-black text-lg text-fg uppercase font-space tracking-wider">
                    Roda Keberuntungan
                  </h3>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed max-w-[280px]">
                  {hasSpunToday
                    ? "Spin gratis hari ini sudah dipakai. Putaran ekstra 100 koin."
                    : "Putar roda keberuntungan harian dan dapatkan item gratis!"}
                </p>

                <button
                  disabled={isSpinning}
                  onClick={startSpin}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-stone-950 font-black rounded-2xl shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm uppercase tracking-wider font-space transition-all"
                >
                  <Coins size={18} className="fill-stone-950/20" />
                  <span>
                    {isSpinning
                      ? "Memutar Roda..."
                      : hasSpunToday
                      ? "Beli Putaran (100 Koin)"
                      : "Putar Sekarang (Gratis)"}
                  </span>
                </button>

                {/* Legenda Peluang Gacha Transparan */}
                <div className="w-full bg-surface-subtle/80 border border-border/60 rounded-2xl p-2.5 backdrop-blur-md">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5 font-space flex items-center justify-center md:justify-start gap-1">
                    <span>Peluang Hadiah Roda CAT</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] font-bold text-fg-muted">
                    {SPIN_PRIZES.map(prize => (
                      <div key={prize.id} className="flex justify-between border-b border-border/40 pb-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prize.color }} />
                          <span className="truncate">{prize.title.split(' (')[0]}</span>
                        </span>
                        <span className="font-space text-fg shrink-0 ml-1">{prize.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* === MODAL SELEBRASI KEMENANGAN SPIN (WON PRIZE MODAL) === */}
      <AnimatePresence>
        {wonPrize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setWonPrize(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              className="bg-surface border-2 border-amber-400/60 w-full max-w-sm rounded-[32px] p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] relative z-10 text-center flex flex-col items-center gap-4 overflow-hidden"
            >
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

              <div className="p-3 bg-amber-500/10 rounded-full border border-amber-400/30 text-amber-400 animate-bounce">
                <PartyPopper size={36} />
              </div>

              <div>
                <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest font-space">
                  Selamat! Kamu Menang
                </span>
                <h3 className="text-2xl font-black text-fg font-space mt-1">
                  {wonPrize.title}
                </h3>
              </div>

              {/* Visual Card Prize */}
              <div className="w-full bg-gradient-to-b from-surface-subtle to-surface border border-border/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-inner">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 text-white"
                  style={{ backgroundColor: wonPrize.color }}
                >
                  <wonPrize.icon size={32} />
                </div>
                <span className="font-space font-black text-xl text-fg mt-1">
                  +{wonPrize.count} {wonPrize.isCoins ? 'Koin' : wonPrize.isEnergy ? 'Energi' : 'Item'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setWonPrize(null)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-stone-950 font-black rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.98] font-space uppercase tracking-wider text-sm"
              >
                Klaim Hadiah
              </button>
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
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-premium-subtle border border-premium text-premium font-bold px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(245,166,35,0.3)] backdrop-blur-md whitespace-nowrap"
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
          className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-3 rounded-2xl border border-border shadow-sm"
        >
          {/* Profile & XP Inline */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-full bg-xp text-primary-fg p-0.5 shadow-sm shrink-0 overflow-hidden">
                {(()=>{
                  const currentAvatar = availableCharacters.find(c => c.id === (profile?.selected_avatar || equippedAvatarId));
                  return (
                    <img 
                      src={currentAvatar?.image_url || avatarPdh} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover" 
                    />
                  );
                })()}
            </div>
            <div className="flex flex-col flex-1 min-w-[150px]">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-fg leading-none">{profile?.nickname || profile?.username || 'Pejuang'}</p>
                <div className="px-1.5 py-0.5 bg-premium-subtle rounded text-[9px] text-premium font-bold">Lvl {profile?.level || 1}</div>
                <RankBadge score={profile?.score || 0} size="sm" />
                {/* Streak Badge "Hari ke-X" */}
                {totalStreak > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.6 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/40 rounded text-[9px] font-black text-orange-500 shrink-0"
                    title={`Streak ${totalStreak + (isStreakClaimed ? 1 : 0)} hari belajar berturut-turut!`}
                  >
                    <Flame size={9} className="text-orange-500" />
                    {totalStreak + (isStreakClaimed ? 1 : 0)}h
                  </motion.div>
                )}
              </div>
              {/* Inline XP Bar */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-locked-subtle rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${((profile?.score || 0) % 1000) / 10}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                    className="h-full bg-xp text-primary-fg rounded-full"
                  />
                </div>
                <p className="text-[10px] text-fg-muted font-medium w-16">{(profile?.score || 0) % 1000}/1K XP</p>
              </div>
            </div>
          </div>
          {/* Right Side Resources & Theme */}
          <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t border-border md:border-none">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/liga')}
              className="inline-flex items-center px-2.5 py-1 gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg text-[10px] sm:text-xs font-black text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-fg" />
              <span>Liga</span>
              <ChevronRight className="w-3 h-3 text-fg/70 ml-0.5" />
            </motion.button>
            <div className="flex items-center gap-1.5 ml-auto">
              
              <button
                onClick={handleLogout}
                className="w-8 h-8 flex items-center justify-center bg-danger-subtle rounded-full border border-danger/20 text-danger hover:bg-danger-subtle transition-colors cursor-pointer ml-1"
                title="Keluar / Logout"
              >
                <LogOut size={15} />
              </button>
              <div 
                className="flex items-center gap-1 bg-surface-subtle px-2.5 py-1.5 rounded-full border border-border shadow-sm relative group cursor-pointer"
                onClick={() => {
                  if ((energy || 0) < 25) {
                    setToastMessage(`+1 Energi dalam ${formatTime(energyTimer)}`);
                    setTimeout(() => setToastMessage(''), 3000);
                  }
                }}
              >
                <Zap className="text-energy" />
                <span className="font-space font-bold text-xs text-fg">{energy}/25</span>
                {(energy || 0) < 25 && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-surface shadow-sm border border-border text-fg text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    +{formatTime(energyTimer)} mnt
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 bg-surface-subtle px-2.5 py-1.5 rounded-full border border-border shadow-sm">
                <Coins className="w-3.5 h-3.5 text-coin fill-yellow-500" />
                <span className="font-space font-bold text-xs text-fg">{globalCoins.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>
        {/* ── GAME MODES (MAIN FOCUS) ── */}
        <motion.section variants={itemVariants} className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-fg tracking-tight">Mode Permainan</h2>
            <span className="text-[12px] text-fg-muted font-medium hidden sm:block">Pilih Mode Permainan</span>
          </div>
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Primary CTA: Latihan Harian */}
            {GAME_MODES.filter(m => m.id === 'latihan').map(mode => (
              <motion.div
                key={mode.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedMode(mode)}
                className="bg-surface rounded-2xl border-l-[6px] border-l-success border-t border-r border-b border-border transition-all cursor-pointer p-5 sm:p-6 shadow-sm relative overflow-hidden group flex flex-col sm:flex-row items-center sm:justify-between gap-5"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-success-subtle text-success shrink-0">
                    <mode.icon size={28} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-[22px] text-fg leading-tight">{mode.title}</h4>
                    <p className="text-[13px] text-fg-muted mt-1 font-medium">{mode.desc}</p>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-fg bg-surface-subtle px-2.5 py-1 rounded-md w-fit border border-border mt-2.5">
                      <Zap size={12} className="text-energy" />
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
                    className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-fg focus-visible:outline-none focus-visible:ring focus-visible:ring-ring rounded-xl font-bold text-[15px] hover:brightness-110 transition-all z-10 relative"
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
                if (mode.id === 'survival') accentColor = 'border-l-danger';
                else if (mode.id === 'pvp') accentColor = 'border-l-info';
                else if (mode.id === 'tryout') accentColor = 'border-l-premium';
                return (
                  <motion.div
                    key={mode.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMode(mode)}
                    className={`bg-surface rounded-xl border-l-[5px] ${accentColor} border-t border-r border-b border-border transition-all cursor-pointer p-4 shadow-sm flex flex-col gap-2 group relative`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode.bg} ${mode.color}`}>
                        <mode.icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-[15px] text-fg leading-tight group-hover:text-primary transition-colors">{mode.title}</h4>
                        <div className="absolute top-3 right-3 text-[9px] font-bold text-fg-muted uppercase bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
                          {mode.badge}
                        </div>
                      </div>
                    </div>
                    <p className="text-[12px] text-fg-muted font-medium line-clamp-2 mt-1">
                      {mode.id === 'catatan_salah' && (profile?.catatan_salah?.length ?? 0) > 0
                        ? `${profile?.catatan_salah?.length} soal menunggu dipelajari ulang`
                        : mode.desc}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-fg mt-auto pt-2">
                      {mode.costType === 'energy' ? <Zap size={12} className="text-energy" /> : <Coins size={12} className="text-coin" />}
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
          <motion.section variants={itemVariants} className="lg:col-span-7 bg-surface rounded-2xl p-5 border border-border shadow-sm flex flex-col">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="text-[18px] sm:text-[20px] font-semibold text-fg tracking-tight flex items-center gap-2">
                  <Flame className="text-streak" size={20} />
                  Streak Harian
                  {/* Hari ke-X badge prominent */}
                  <motion.span
                    key={totalStreak}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                    className="ml-1 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] font-black rounded-full shadow-sm"
                  >
                    Hari ke-{totalStreak + (isStreakClaimed ? 1 : 0)}
                  </motion.span>
                </h3>
                <p className="text-[13px] text-fg-muted font-medium mt-0.5">
                  {(() => {
                    const displayStreak = totalStreak; // totalStreak sudah include hari ini jika claimed
                    const toMega = displayStreak === 0 ? 30 : (30 - (displayStreak % 30 || 30));
                    if (isTodayMegaReward) return `${displayStreak} hari · 🏆 MEGA REWARD tercapai!`;
                    return `${displayStreak} hari beruntun · Mega tiap 30 hari (+${toMega} hari lagi)`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-right pb-1 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleDailyClaim}
                  disabled={isStreakClaimed || isProcessing}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded shadow-sm active:scale-95 shrink-0 flex items-center gap-1.5 transition-all ${
                    isStreakClaimed
                      ? 'bg-success/15 text-success cursor-default'
                      : 'bg-primary text-primary-fg hover:opacity-90 animate-pulse'
                  }`}
                >
                  <Flame size={12} />
                  {isStreakClaimed ? 'Sudah klaim hari ini' : (isProcessing ? 'Memproses...' : 'Klaim Harian')}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowSpinWheel(true)}
                  className="text-[10px] font-bold text-premium uppercase tracking-wider bg-premium-subtle px-3 py-1.5 rounded hover:bg-premium-subtle transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                >
                  <Gift size={12} /> Spin Harian 🎡
                </button>
              </div>
            </div>
            {/* Motivational Progress Bar */}
            <div className="w-full h-2.5 bg-surface-subtle rounded-full overflow-hidden border border-border mb-5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((totalStreak + (isStreakClaimed ? 1 : 0)) / 30) * 100}%` }}
                transition={{ duration: 1.5, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-primary to-premium rounded-full"
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
                        ${day.status === 'done' ? 'bg-success border-success text-white' :
                          day.status === 'current' ? 'border-premium bg-premium-subtle text-premium-text shadow-[0_0_12px_rgba(245,166,35,0.4)]' :
                            'border-border bg-surface-subtle text-fg-muted'}`}
                      >
                        {day.status === 'done' ? <Check size={16} strokeWidth={3} /> : <Gift size={16} className={day.status === 'future' ? 'opacity-50' : ''} />}
                        {canClaimToday && (
                          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute inset-0 border-2 border-premium rounded-full pointer-events-none" />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${day.status === 'done' ? 'text-success' : day.status === 'current' ? 'text-premium' : 'text-fg-muted'}`}>
                        {day.status === 'done' ? '✓' : day.isMega ? '+50🪙' : '+10🪙'}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                      ${day.status === 'done' ? 'bg-success border-success text-white' :
                        day.status === 'current' ? 'border-primary bg-primary-subtle text-primary' :
                          'border-border bg-surface-subtle text-fg-muted'}`}
                    >
                      {day.status === 'done' && <Check size={16} strokeWidth={3} />}
                      {day.status === 'current' && !isStreakClaimed && (
                        <>
                          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 border-2 border-primary rounded-full pointer-events-none" />
                        </>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold ${day.status === 'current' ? 'text-primary' : 'text-fg-muted'}`}>{day.day}</span>
                  </div>
                );
              })}
            </div>
          </motion.section>
          {/* Quick Stats */}
          <motion.section variants={itemVariants} className="lg:col-span-5 flex flex-col">
            <h3 className="text-[18px] sm:text-[20px] font-semibold text-fg tracking-tight mb-3">Statistik</h3>
            <div className="grid grid-cols-3 gap-3 flex-1">
              {[
                { icon: Activity, color: 'text-success', bg: 'bg-success-subtle', border: 'border-success', value: totalDijawab, label: 'Dijawab', suffix: '' },
                { icon: Crosshair, color: 'text-info', bg: 'bg-info/', border: 'border-info/20', value: calculatedAkurasi, label: 'Akurasi', suffix: '%' },
                { icon: Flame, color: 'text-primary', bg: 'bg-primary-subtle', border: 'border-primary/20', value: calculatedCombo, label: 'Combo', suffix: '', prefix: 'x' },
              ].map((stat, i) => (
                <motion.div key={i} whileHover={{ y: -4, scale: 1.02 }} className={`bg-surface rounded-2xl p-4 border ${stat.border} shadow-sm flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group cursor-default transition-shadow hover:shadow-md`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} transition-transform group-hover:scale-110`}>
                    <stat.icon className={stat.color} size={20} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-2xl font-black text-fg font-space leading-none mb-1">
                      {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-[11px] text-fg-muted font-bold uppercase tracking-wider">{stat.label}</p>
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
              onClick={handleCloseModal} className="absolute inset-0 bg-overlay backdrop-blur-sm" data-backdrop="true" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              ref={gameModeModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-mode-title"
              className="bg-surface w-full max-w-md rounded-3xl border border-border shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className={`h-24 ${selectedMode.bg} relative`}>
                <button type="button" onClick={handleCloseModal} aria-label="Tutup Mode Game" className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-overlay backdrop-blur-sm rounded-full text-white transition-colors">
                  <X size={20} />
                </button>
                <div className={`absolute -bottom-8 left-6 w-16 h-16 rounded-2xl flex items-center justify-center bg-surface border-4 border-skd-card shadow-lg ${selectedMode.color}`}>
                  <selectedMode.icon size={32} />
                </div>
              </div>
              <div className="p-6 pt-12">
                <h3 id="game-mode-title" className="text-2xl font-bold text-fg mb-1">{selectedMode.title}</h3>
                <p className="text-fg-muted text-sm mb-6">{selectedMode.desc}</p>
                {selectedMode.id === 'latihan' && (
                  <div className="bg-surface-subtle p-4 rounded-xl border border-border mb-6">
                    <h4 className="text-sm font-bold text-fg mb-2">Tentang Mode Ini</h4>
                    <p className="text-xs text-fg-muted leading-relaxed">Selesaikan kuis harian tanpa batas waktu. Cocok untuk mengasah ingatan dan membangun fondasi pemahaman materi SKD dengan santai.</p>
                  </div>
                )}
                {selectedMode.id === 'catatansalah' && (
                  <div className="bg-coin-subtle p-4 rounded-xl border border-yellow-500/20 mb-6">
                    <h4 className="text-sm font-bold text-coin mb-2">Tentang Mode Ini</h4>
                    <p className="text-xs text-fg-muted leading-relaxed">Latih kembali soal-soal yang pernah Anda jawab salah di mode latihan atau tryout. Soal baru akan dihapus dari buku catatan setelah Anda menjawab benar 3 kali berturut-turut!</p>
                  </div>
                )}
                {selectedMode.id === 'survival' && (
                  <div className="bg-danger-subtle p-4 rounded-xl border border-danger/20 mb-6">
                    <h4 className="text-sm font-bold text-danger mb-2 flex items-center gap-2"><Target size={16} /> Aturan Hardcore</h4>
                    <p className="text-xs text-fg leading-relaxed">Jawab sebanyak-banyaknya. <span className="font-bold text-danger">Salah 1 soal = LANGSUNG GAGAL.</span> Buktikan akurasi sempurna Anda!</p>
                    <div className="mt-3 text-xs font-bold text-fg-muted">Rekor Terbaikmu: <span className="text-fg">42 Soal Beruntun</span></div>
                  </div>
                )}
                {selectedMode.id === 'pvp' && (
                  <div className="space-y-4 mb-6">
                    {/* Mode Selection */}
                    {pvpState === 'idle' && pvpSubMode === 'selection' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        {/* Option 1: 1v1 Quick Duel (Real Player) */}
                        <div
                          onClick={() => setPvpState('matching')}
                          className="p-4 rounded-2xl border border-info/20 bg-info/5 hover:bg-info/10 cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-info/ text-info flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Swords size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                              Lawan Pemain Asli (Real-time)
                              <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-success-subtle text-green-400 font-bold uppercase tracking-wider">Online</span>
                            </h4>
                            <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">Cari lawan secara acak di seluruh dunia.</p>
                          </div>
                          <ChevronRight size={16} className="text-fg-muted group-hover:text-info transition-colors" />
                        </div>
                        {/* Option 1.2: 1v1 Bot AI */}
                        <div
                          onClick={() => setPvpSubMode('bot_setup')}
                          className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-coin-subtle cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-info-subtle text-info-fg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BrainCircuit size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                              Lawan Bot (AI)
                            </h4>
                            <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">Duel melawan bot pintar dengan tingkat kesulitan.</p>
                          </div>
                          <ChevronRight size={16} className="text-fg-muted group-hover:text-coin transition-colors" />
                        </div>
                        {/* Option 1.5: 1v1 Duel Teman */}
                        <div
                          onClick={() => setPvpSubMode('friend_duel')}
                          className="p-4 rounded-2xl border border-premium bg-premium-subtle hover:bg-premium-subtle cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-premium-subtle text-premium-text flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UserPlus size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-fg flex items-center gap-1.5">
                              Duel Bersama Teman
                            </h4>
                            <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">Undang temanmu untuk duel 1v1 secara private.</p>
                          </div>
                          <ChevronRight size={16} className="text-fg-muted group-hover:text-premium transition-colors" />
                        </div>
                        {/* Option 2: Custom Room */}
                        <div
                          onClick={() => setPvpSubMode('custom')}
                          className="p-4 rounded-2xl border border-border bg-surface-subtle/50 hover:bg-surface cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-locked-subtle text-fg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Users size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-fg">Custom Room (Maks 50 Player)</h4>
                            <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">Buat atau masuk room dengan teman menggunakan kode room.</p>
                          </div>
                          <ChevronRight size={16} className="text-fg-muted group-hover:text-fg transition-colors" />
                        </div>
                      </motion.div>
                    )}
                    {/* Bot Difficulty Setup */}
                    {pvpState === 'idle' && pvpSubMode === 'bot_setup' && (
                      <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <button
                          onClick={() => setPvpSubMode('selection')}
                          className="text-xs text-info font-bold hover:underline flex items-center gap-1 mb-1"
                        >
                          <ChevronRight size={14} className="rotate-180" /> Kembali
                        </button>
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-fg">Pilih Tingkat Kesulitan AI:</h4>
                          <div
                            onClick={(e) => { handlePlayGame(e, '/quiz', 'pvp_bot', { botDifficulty: 'easy', energyCost: 2 }); setSelectedMode(null); setPvpSubMode('selection'); }}
                            className="p-4 rounded-xl border border-success/30 bg-success/10 hover:bg-success-subtle cursor-pointer transition-colors"
                          >
                            <h5 className="font-black text-green-400 text-sm mb-1">EASY (Santai)</h5>
                            <p className="text-[11px] text-fg-muted">Bot menjawab lebih lambat dan sering salah. Cocok untuk pemanasan.</p>
                          </div>
                          <div
                            onClick={(e) => { handlePlayGame(e, '/quiz', 'pvp_bot', { botDifficulty: 'medium', energyCost: 2 }); setSelectedMode(null); setPvpSubMode('selection'); }}
                            className="p-4 rounded-xl border border-yellow-500/30 bg-coin-subtle hover:bg-coin-subtle cursor-pointer transition-colors"
                          >
                            <h5 className="font-black text-coin text-sm mb-1">MEDIUM (Normal)</h5>
                            <p className="text-[11px] text-fg-muted">Bot bermain setara dengan pemain rata-rata.</p>
                          </div>
                          <div
                            onClick={(e) => { handlePlayGame(e, '/quiz', 'pvp_bot', { botDifficulty: 'hard', energyCost: 2 }); setSelectedMode(null); setPvpSubMode('selection'); }}
                            className="p-4 rounded-xl border border-danger/30 bg-danger/10 hover:bg-danger-subtle cursor-pointer transition-colors"
                          >
                            <h5 className="font-black text-danger text-sm mb-1">HARD (Sangat Sulit)</h5>
                            <p className="text-[11px] text-fg-muted">Bot menjawab super cepat dan hampir sempurna!</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {/* Custom Room Lobby Setup */}
                    {pvpState === 'idle' && (pvpSubMode === 'custom' || pvpSubMode === 'friend_duel') && (
                      <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <button
                          onClick={() => setPvpSubMode('selection')}
                          className="text-xs text-info font-bold hover:underline flex items-center gap-1 mb-1"
                        >
                          ← Kembali ke Pilihan Mode
                        </button>
                        <div className="bg-info/10 p-4 rounded-xl border border-info/20">
                          <h4 className="text-sm font-bold text-info mb-2 flex items-center gap-2"><Users size={16} /> {pvpSubMode === 'custom' ? 'Multiplayer Custom Room' : 'Duel Bersama Teman'}</h4>
                          <p className="text-xs text-fg mb-3">Lawan teman-temanmu secara real-time. Siapa yang tercepat dan paling akurat?</p>
                          <button onClick={pvpSubMode === 'custom' ? handleCreateRoom : handleCreateFriendDuel} className="w-full bg-info text-info-fg hover:bg-info-hover text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-blue-500/20">
                            Buat Room Baru
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-skd-border" /><span className="text-xs text-fg-muted font-medium uppercase">Atau</span><div className="flex-1 h-px bg-skd-border" />
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Masukkan Kode Room" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
                            className="flex-1 bg-surface-subtle border border-border rounded-lg px-4 text-sm font-mono text-fg outline-none focus:border-info transition-colors uppercase" maxLength={6} />
                          <button onClick={handleJoinRoom} disabled={roomCode.length < 4} className="bg-surface border border-border hover:bg-surface-subtle disabled:opacity-50 px-4 rounded-lg text-sm font-bold text-fg transition-colors">Join</button>
                        </div>
                      </motion.div>
                    )}
                    {/* Matchmaking Screen for 1v1 PvP */}
                    {pvpState === 'matching' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-subtle/60 rounded-2xl border border-border p-5 text-center space-y-6">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-info/ text-info">
                            Quick Match
                          </span>
                          <h4 className="text-base font-bold text-fg">Mencari Lawan Duel 1v1...</h4>
                        </div>
                        {/* Matchmaking VS screen */}
                        <div className="flex items-center justify-center gap-6 py-4">
                          {/* Player 1: Me */}
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-14 h-14 rounded-full bg-xp text-primary-fg p-0.5 shadow-md flex items-center justify-center shrink-0">
                              <div className="w-full h-full bg-surface rounded-full flex items-center justify-center font-bold text-sm text-fg">US</div>
                            </div>
                            <span className="text-xs font-black text-fg truncate max-w-[80px]">{profile?.nickname || profile?.username || 'Pejuang'}</span>
                            <span className="text-[9px] text-fg-muted font-bold">Lvl {profile?.level || 1}</span>
                          </div>
                          {/* VS Badge */}
                          <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
                            <div className="absolute inset-0 bg-info/ blur-md rounded-full animate-ping" />
                            <div className="w-10 h-10 rounded-full bg-surface border-2 border-info flex items-center justify-center font-black text-xs text-info relative z-10 shadow-lg">
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
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-yellow-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
                                    <div className="w-full h-full bg-surface rounded-full flex items-center justify-center font-bold text-sm text-fg">
                                      {opponentName.substring(0, 2).toUpperCase()}
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-primary truncate max-w-[80px]">{opponentName}</span>
                                  <span className="text-[9px] text-fg-muted font-bold">Lvl {opponentLevel}</span>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="opponent-searching"
                                  initial={{ scale: 0.8 }}
                                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="flex flex-col items-center gap-2"
                                >
                                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-border bg-surface flex items-center justify-center text-fg-muted font-black text-xl">
                                    ?
                                  </div>
                                  <span className="text-xs font-bold text-fg-muted animate-pulse">Mencari...</span>
                                  <span className="text-[9px] text-fg-muted font-bold">-</span>
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
                            <div className="flex items-center gap-2 text-fg-muted">
                              <Loader2 className="animate-spin text-info" size={14} />
                              <span className="text-xs font-bold">Menyamakan peringkat Anda...</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleCancelMatching}
                          className="w-full bg-surface border border-border hover:bg-surface-subtle text-fg font-bold py-2 rounded-lg text-xs transition-colors"
                        >
                          Batal
                        </button>
                      </motion.div>
                    )}
                    {pvpState === 'loading' && (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4">
                        <Loader2 className="animate-spin text-info" size={32} />
                        <p className="text-sm font-bold text-fg animate-pulse">Menghubungkan ke Server PvP...</p>
                      </div>
                    )}
                    {pvpState === 'waiting_friend' && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface-subtle rounded-2xl border border-border p-6 text-center space-y-4">
                        <div>
                          <p className="text-xs text-fg-muted uppercase font-bold tracking-widest mb-1">Kode Duel</p>
                          <div className="text-3xl font-black text-fg font-mono tracking-widest bg-surface py-2 rounded-xl border border-border flex items-center justify-center gap-3">
                            {activeRoom}
                            <button onClick={() => setToastMessage('Kode berhasil disalin!')} className="p-2 bg-surface-subtle hover:bg-skd-border rounded-lg text-fg-muted hover:text-fg transition-colors">
                              <Copy size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-premium-subtle flex items-center justify-center text-premium"><UserPlus size={24} /></div>
                          <div className="text-left">
                            <div className="text-2xl font-black text-fg">{playersCount}<span className="text-sm text-fg-muted font-medium">/2</span></div>
                            <div className="text-xs text-fg-muted">Pemain Bergabung</div>
                          </div>
                        </div>
                        {isHost ? (
                          <button onClick={handleStartHostGame} disabled={playersCount < 2} className="w-full mt-2 bg-premium hover:bg-premium-hover disabled:opacity-50 disabled:hover:bg-premium text-white font-bold py-3 rounded-xl shadow-lg transition-colors active:scale-95">
                            {playersCount < 2 ? 'Menunggu teman bergabung...' : 'Mulai Pertandingan'}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-premium pt-2">
                            <Loader2 className="animate-spin" size={14} />
                            <p className="text-xs font-bold">Menunggu Host Memulai Pertandingan...</p>
                          </div>
                        )}
                        <button
                          onClick={handleCancelMatching}
                          className="w-full mt-4 bg-surface border border-border hover:bg-surface-subtle text-fg font-bold py-2 rounded-lg text-xs transition-colors"
                        >
                          Batalkan Duel
                        </button>
                      </motion.div>
                    )}
                    {pvpState === 'waiting' && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface-subtle rounded-2xl border border-border p-6 text-center space-y-4">
                        <div>
                          <p className="text-xs text-fg-muted uppercase font-bold tracking-widest mb-1">Kode Room</p>
                          <div className="text-3xl font-black text-fg font-mono tracking-widest bg-surface py-2 rounded-xl border border-border">{activeRoom}</div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-info/ flex items-center justify-center text-info"><Users size={24} /></div>
                          <div className="text-left">
                            <div className="text-2xl font-black text-fg">{playersCount}<span className="text-sm text-fg-muted font-medium">/50</span></div>
                            <div className="text-xs text-fg-muted">Pemain Bergabung</div>
                          </div>
                        </div>
                        {isHost ? (
                          <button onClick={handleStartHostGame} disabled={playersCount < 2} className="w-full mt-2 bg-info text-info-fg hover:bg-info-hover disabled:opacity-50 disabled:hover:bg-info text-info-fg text-white font-bold py-3 rounded-xl shadow-lg transition-colors active:scale-95">
                            {playersCount < 2 ? 'Menunggu pemain...' : `Mulai Pertandingan (${playersCount} Pemain)`}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-info pt-2">
                            <Loader2 className="animate-spin" size={14} />
                            <p className="text-xs font-bold">Menunggu Host Memulai Pertandingan...</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                {selectedMode.id === 'tryout' && (
                  <div className="bg-premium-subtle p-4 rounded-xl border border-premium mb-6">
                    <h4 className="text-sm font-bold text-premium mb-2 flex items-center gap-2"><Lock size={16} /> Buka Akses Try Out</h4>
                    <p className="text-xs text-fg leading-relaxed mb-4">
                      Simulasi standar format BKN (110 soal, ambang batas resmi, rapor lengkap).
                      Entry attempt: <strong>1.000 koin (≈ Rp10.000)</strong>. Beli paket di Toko untuk unlock permanen + pembahasan.
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={(e) => { e.preventDefault(); setSelectedMode(null); navigate('/tryout-lobby'); }}
                        className="w-full bg-premium text-primary-fg hover:bg-coin text-[#0F0E17] font-bold py-3 rounded-lg text-sm transition-colors shadow-lg shadow-skd-premium/20 flex items-center justify-center gap-2"
                      >
                        <Coins size={18} /> Ke Lobby Try Out · 1.000 Koin / attempt
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); setSelectedMode(null); navigate('/toko'); }}
                        className="w-full bg-surface-subtle hover:bg-surface border border-border text-fg font-bold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <CreditCard size={18} /> Beli paket unlock di Toko
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-fg">
                    <span className="text-fg-muted font-normal mr-1">Biaya:</span>
                    {selectedMode.costType === 'energy' ? <><Zap size={16} className="text-energy" /> {selectedMode.cost}</> : <><Coins size={16} className="text-coin" /> {selectedMode.cost.toLocaleString()}</>}
                  </div>
                  {selectedMode.id !== 'tryout' && (selectedMode.id !== 'pvp' || (selectedMode.id === 'pvp' && isHost && pvpState === 'waiting')) && (
                    <button
                      onClick={(e) => { const extra = selectedMode.id === 'pvp' ? { roomId: activeRoom } : {}; handlePlayGame(e, '/quiz', selectedMode.id, extra); handleCloseModal(); }}
                      className={`text-skd-bg hover:scale-105 transition-transform px-6 py-2.5 rounded-full font-bold text-sm shadow-md ${selectedMode.id === 'pvp' ? 'bg-info text-info-fg' : 'bg-skd-text'}`}
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