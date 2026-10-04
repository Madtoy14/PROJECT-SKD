import { useState, useEffect, useMemo } from 'react';
import { motion, type Variants, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Zap, Coins, Swords, BrainCircuit, Target, Trophy, Check, Flame, Activity, Crosshair, Gift, X, Users, Loader2, ChevronRight, UserPlus, Copy, BookOpen, LogOut, Clock, Eye, RefreshCw, Sparkles, PartyPopper, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchProfile, resetDailyQuests, syncEnergy, supabase, isSupabaseConfigured, fetchAvailableCharacters, type Character, type UserProfile } from '../lib/supabase';
import RankBadge from '../components/RankBadge';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import avatarPdh from '../assets/avatar_pdh.webp';
import { GlassCard } from '../components/GlassCard';
import { GlassStatCard } from '../components/GlassStatCard';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { WEEKLY_QUESTS_METADATA } from './Quest';
import { dashboardIllustrations } from '../assets/illustrations';
const latihanHarianBg = supabase.storage.from('background').getPublicUrl('Latihan Harian.png').data.publicUrl;
const survivalCardBg = supabase.storage.from('background').getPublicUrl('survival mode card .png').data.publicUrl;
const pvpCardBg = supabase.storage.from('background').getPublicUrl('pvp battle card.png').data.publicUrl;
const tryoutCardBg = supabase.storage.from('background').getPublicUrl('Try Out Mode card.png').data.publicUrl;
const catatanSalahCardBg = supabase.storage.from('background').getPublicUrl('Buku Catatan Salah card.png').data.publicUrl;




const GAME_MODES = [
  { id: 'latihan', title: 'Latihan Harian', desc: 'Asah kemampuanmu setiap hari', cost: 2, costType: 'energy', icon: BrainCircuit, color: 'text-success', bg: 'bg-success-subtle', border: 'border-success/30 hover:border-success hover:shadow-card-hover', badge: 'Santai' },
  { id: 'survival', title: 'Survival Mode', desc: 'Salah sekali, game over. Bertahan selama mungkin.', cost: 3, costType: 'energy', icon: Target, color: 'text-danger', bg: 'bg-danger-subtle', border: 'border-danger/30 hover:border-danger hover:shadow-card-hover', badge: 'Hardcore' },
  { id: 'pvp', title: 'PvP Battle', desc: 'Adu kemampuan melawan pemain lain.', cost: 3, costType: 'energy', icon: Swords, color: 'text-info', bg: 'bg-info-subtle', border: 'border-info/30 hover:border-info hover:shadow-card-hover', badge: 'Multiplayer' },
  { id: 'tryout', title: 'Try Out Mode', desc: 'Simulasi ujian dengan soal BKN.', cost: 1000, costType: 'coin', icon: Trophy, color: 'text-premium', bg: 'bg-premium-subtle', border: 'border-premium/30 hover:border-premium hover:shadow-card-hover', badge: 'Premium' },
  { id: 'catatan_salah', title: 'Buku Catatan Salah', desc: 'Pelajari kembali soal yang pernah salah.', cost: 0, costType: 'energy', icon: BookOpen, color: 'text-info', bg: 'bg-info-subtle', border: 'border-info/30 hover:border-info hover:shadow-card', badge: 'Evaluasi' },
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
      staggerChildren: 0.08,
      delayChildren: 0.04,
    }
  }
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.2, 0, 0, 1] } }
};
const reducedContainerVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1 } };
const reducedItemVariants: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.1 } } };
export default function Dashboard() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const pageVariants = prefersReducedMotion ? reducedContainerVariants : containerVariants;
  const sectionVariants = prefersReducedMotion ? reducedItemVariants : itemVariants;
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
    <div className="relative min-h-screen isolate bg-[#F7FAFF]">
      {/* ── Global Ambient Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-700 ease-in-out flex justify-center">
        {/* Subtle dot pattern spans entire viewport width */}
        <div
          className="absolute inset-0 opacity-[0.15] sm:opacity-[0.25] lg:opacity-[0.4] transition-opacity duration-700"
          style={{
            backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
            backgroundSize: 'clamp(14px, 2vw, 24px) clamp(14px, 2vw, 24px)',
            maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
          }}
        />

        {/* Ambient Glows Container - locked to content width */}
        <div className="relative w-full max-w-6xl h-full">
          {/* Ambient Glows */}
          <div className="absolute -top-[5%] md:-top-[10%] left-[-20%] md:left-[10%] w-[140%] md:w-[80%] h-[clamp(350px,40%,700px)] bg-[#DBEAFE] rounded-full blur-[80px] md:blur-[120px] opacity-60 md:opacity-70 transition-all duration-700" />
          <div className="absolute top-[10%] md:top-[5%] right-[-30%] md:-right-[10%] w-[100%] md:w-[50%] h-[clamp(250px,35%,600px)] bg-[#CFFAFE] rounded-full blur-[60px] md:blur-[100px] opacity-40 md:opacity-60 transition-all duration-700" />
          <div className="absolute bottom-[2%] md:bottom-[5%] left-[-20%] md:left-[5%] w-[120%] md:w-[60%] h-[clamp(300px,40%,700px)] bg-[#EDE9FE] rounded-full blur-[80px] md:blur-[120px] opacity-50 md:opacity-80 transition-all duration-700" />

          {/* Abstract Decorative Shapes */}
          <div className="absolute top-[15%] md:top-[10%] -right-[20%] md:-right-[10%] w-[clamp(200px,35%,500px)] aspect-square border-[clamp(15px,3%,50px)] border-[#BFDBFE] rounded-full opacity-[0.15] md:opacity-[0.35] blur-[2px] md:blur-[4px] transition-all duration-700" />
          <div className="absolute bottom-[10%] right-[-15%] md:right-[5%] w-[clamp(180px,30%,500px)] aspect-square bg-gradient-to-br from-[#DDD6FE] to-transparent rounded-full opacity-30 md:opacity-50 blur-xl md:blur-3xl mix-blend-multiply transition-all duration-700" />
          <div className="hidden sm:block absolute top-[40%] -left-[10%] w-[clamp(120px,20%,300px)] aspect-[2/5] bg-[#BFDBFE] rounded-[999px] rotate-[25deg] opacity-20 md:opacity-30 blur-lg md:blur-2xl transition-all duration-700" />
        </div>
      </div>

      {/* === RODA KEBERUNTUNGAN SPIN WHEEL MODAL === */}
      <AnimatePresence>
        {showSpinWheel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSpinning && setShowSpinWheel(false)}
              className="fixed inset-0 bg-overlay"
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
              className="m3-card w-full max-w-sm sm:max-w-md md:max-w-xl rounded-[var(--m3-shape-extra-large)] p-5 sm:p-6 shadow-card-strong relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar flex flex-col md:flex-row items-center gap-5 justify-between"
            >
              <button
                type="button"
                disabled={isSpinning}
                onClick={() => setShowSpinWheel(false)}
                aria-label="Tutup Roda Keberuntungan"
                className="absolute top-4 right-4 p-2 hover:bg-surface-subtle rounded-full transition-colors text-fg disabled:opacity-30 z-30 border border-border"
              >
                <X size={18} />
              </button>

              {/* Kolom Kiri: Roda Spin dengan LED Ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center p-2.5 rounded-full bg-warning-subtle border-4 border-warning/40 shadow-md">

                  {/* 12 LED Lights */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i * 30) * (Math.PI / 180);
                    const radius = 110;
                    const lx = radius * Math.cos(angle);
                    const ly = radius * Math.sin(angle);
                    return (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full border border-border z-20 transition-all duration-300 ${isSpinning
                          ? (i % 2 === 0 ? 'bg-warning' : 'bg-danger')
                          : 'bg-warning'
                          }`}
                        style={{
                          transform: `translate(${lx}px, ${ly}px)`,
                        }}
                      />
                    );
                  })}

                  {/* Pointer Jarum Penunjuk Atas */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-danger" />
                    <div className="w-2 h-2 rounded-full bg-warning -mt-3.5 border border-danger" />
                  </div>

                  {/* Centre Hub Button */}
                  <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-surface shadow-md border-4 border-warning/80 z-20 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 rounded-full bg-warning flex items-center justify-center">
                      <Trophy size={9} className="text-fg" />
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
                            className="fill-white font-black font-space text-[10.5px]"
                          >
                            {prize.short}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Kolom Kanan: Detail, Tombol & Peluang */}
              <div className="flex flex-col flex-1 w-full items-center md:items-start text-center md:text-left gap-3">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                    <Sparkles size={18} />
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
                  className="w-full min-h-11 py-3 bg-warning text-white font-semibold rounded-full shadow-sm hover:opacity-90 active:translate-y-px disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors"
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

                {/* Legenda Peluang Gacha */}
                <div className="w-full m3-card-tonal rounded-[var(--m3-shape-medium)] p-2.5">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5 font-space flex items-center justify-center md:justify-start gap-1">
                    <span>Peluang Hadiah Roda CAT</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9.5px] font-bold text-fg-muted">
                    {SPIN_PRIZES.map(prize => (
                      <div key={prize.id} className="flex justify-between border-b border-border pb-0.5">
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

      {/* === MODAL SELEBRASI KEMENANGAN SPIN === */}
      <AnimatePresence>
        {wonPrize && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              onClick={() => setWonPrize(null)}
              className="fixed inset-0 bg-overlay"
            />
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              className="m3-card border-2 border-warning/60 w-full max-w-sm rounded-[var(--m3-shape-extra-large)] p-6 shadow-card-strong relative z-10 text-center flex flex-col items-center gap-4 overflow-hidden"
            >
              <div className="p-3 bg-warning-subtle rounded-full border border-warning/30 text-warning">
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
              <div className="w-full m3-card-tonal rounded-[var(--m3-shape-medium)] p-4 flex flex-col items-center justify-center gap-2">
                <div
                  className="w-16 h-16 rounded-[var(--m3-shape-medium)] flex items-center justify-center shadow-sm border border-border text-white"
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
                className="w-full min-h-11 py-3.5 bg-warning text-white font-semibold rounded-full shadow-sm hover:opacity-90 active:translate-y-px text-sm"
              >
                Klaim Hadiah
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 m3-card text-fg font-semibold px-6 py-3 rounded-full flex items-center gap-3 shadow-md whitespace-nowrap border border-primary/30"
          >
            <Coins size={20} className="text-coin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════
          MAIN DASHBOARD CONTENT
         ═══════════════════════════════════════════════════ */}
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 p-4 md:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto pb-28 md:pb-12"
      >
        {/* ── TOP HEADER — Glass floating bar ── */}
        <motion.div
          variants={sectionVariants}
          className="m3-card rounded-[var(--m3-shape-large)] p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          {/* Profile & XP */}
          <div className="flex flex-col gap-2 sm:gap-2.5 w-full sm:w-auto flex-1">
            
            {/* 1. Identity & Status Row */}
            <div className="flex items-center gap-3">
              {/* Avatar - slightly smaller and perfectly circular */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-container p-[2px] shrink-0 overflow-hidden shadow-sm">
              {(() => {
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
              
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                {/* Username */}
                <p className="text-[15px] sm:text-[17px] font-bold text-fg truncate max-w-[120px] sm:max-w-[160px] md:max-w-none shrink-0 leading-none pb-[1px]">
                  {profile?.nickname || profile?.username || 'Pejuang'}
                </p>
                
                {/* Compact Badges Group */}
                <div className="flex items-center gap-2">
                  {/* Lvl Badge */}
                  <div className="h-[24px] px-2.5 bg-primary/10 rounded-full text-[10px] sm:text-[11px] text-primary-hover font-bold flex items-center justify-center shrink-0 shadow-none filter-none">
                    Lvl {profile?.level || 1}
                  </div>
                  
                  {/* Rank Badge (Warrior) */}
                  <div className="shrink-0 flex items-center shadow-none filter-none">
                    <RankBadge score={profile?.score || 0} size="sm" />
                  </div>
                  
                  {/* Streak Badge */}
                  {totalStreak > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.6 }}
                      className="h-[24px] px-2.5 bg-orange-50/80 border border-orange-200/50 rounded-full text-[10px] sm:text-[11px] font-bold text-orange-600 flex items-center gap-1 shrink-0 shadow-none filter-none"
                      title={`Streak ${totalStreak + (isStreakClaimed ? 1 : 0)} hari belajar berturut-turut!`}
                    >
                      <Flame size={11} className="text-orange-500 shrink-0" />
                      {totalStreak + (isStreakClaimed ? 1 : 0)}h
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
              {/* XP Bar */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${((profile?.score || 0) % 1000) / 10}%` }}
                    transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.55, ease: [0.2, 0, 0, 1], delay: 0.18 }}
                    className="h-full bg-primary rounded-full m3-progress"
                  />
                </div>
                <p className="text-[10px] text-fg-muted font-medium w-16">{(profile?.score || 0) % 1000}/1K XP</p>
              </div>
            </div>
          </div>

          {/* Right Side Resources */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t border-border sm:border-none">
            <motion.button
              onClick={() => navigate('/liga')}
              className="m3-interactive inline-flex items-center min-h-9 px-3 sm:px-4 py-1.5 gap-1.5 rounded-full bg-primary text-primary-fg text-xs font-semibold transition-colors hover:bg-primary-hover cursor-pointer shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Liga</span>
              <ChevronRight className="w-3 h-3 opacity-70 ml-0.5" />
            </motion.button>
            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <button
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center bg-danger-subtle rounded-full border border-danger/20 text-danger hover:bg-danger/10 transition-colors cursor-pointer ml-1"
                title="Keluar / Logout"
              >
                <LogOut size={15} />
              </button>
              <div
                className="flex items-center gap-1 bg-energy-subtle px-3 py-1.5 rounded-full relative group cursor-pointer"
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
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 m3-card text-fg text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    +{formatTime(energyTimer)} mnt
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 bg-coin-subtle px-3 py-1.5 rounded-full">
                <Coins className="w-3.5 h-3.5 text-coin fill-yellow-500" />
                <span className="font-space font-bold text-xs text-fg">{globalCoins.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── ROW 1: LATIHAN HARIAN + STREAK ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Latihan Harian — PRIMARY CARD with 3D Mascot */}
          {GAME_MODES.filter(m => m.id === 'latihan').map(mode => (
            <motion.section
              key={mode.id}
              variants={sectionVariants}
              onClick={() => setSelectedMode(mode)}
              className="group xl:col-span-7 skd-card skd-interactive cursor-pointer relative overflow-hidden bg-primary-container border-transparent hover:shadow-card-hover"
            >
              {/* Soft decorative background layers */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/40 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

              {/* Decorative Background Artwork */}
              <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[var(--m3-shape-large)] md:rounded-3xl">
                <img
                  src={latihanHarianBg}
                  alt=""
                  className="w-full h-full object-cover object-[80%_center] md:object-[center_right] transition-transform duration-700 ease-out group-hover:scale-105"
                />
                {/* Subtle Readability Overlay for Text */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent md:via-white/40 md:to-transparent" />
              </div>

              <div className="flex flex-col md:flex-row items-stretch relative z-10 min-h-[340px] md:min-h-[240px]">
                {/* Left: Text Content */}
                <div className="p-6 sm:p-8 flex flex-col justify-start md:justify-center flex-1 relative z-20 w-full sm:w-[75%] md:w-1/2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/80 shadow-sm backdrop-blur flex items-center justify-center">
                      <mode.icon size={26} className="text-primary" strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="skd-label text-primary tracking-widest uppercase bg-white/60 backdrop-blur px-2.5 py-1 rounded-full shadow-sm">
                        Mode Utama
                      </span>
                      <h3 className="text-2xl md:text-3xl font-black text-fg mt-1.5 leading-none tracking-tight">{mode.title}</h3>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-fg-muted font-bold mb-6 max-w-[240px] sm:max-w-sm leading-relaxed">
                    Latihan soal setiap hari untuk mengasah kemampuanmu dan meningkatkan skor SKD.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-auto md:mt-0">
                    <motion.button
                      className="skd-interactive w-auto min-h-11 sm:min-h-12 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 text-[13px] sm:text-base"
                    >
                      Mulai Sekarang <ChevronRight size={16} strokeWidth={3} className="sm:w-[18px] sm:h-[18px]" />
                    </motion.button>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-orange-700 bg-orange-50/90 backdrop-blur-sm border border-orange-200/50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-sm">
                      <Zap size={14} className="text-orange-500" /> {mode.cost} Energi
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          ))}

          {/* Streak Harian */}
          <motion.section variants={sectionVariants} className="xl:col-span-5 skd-card p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-br from-[#fffcf8] via-[#fff5eb] to-[#fff0e0] border-orange-200/60 relative overflow-hidden">
            {/* Background Atmosphere & Decorative Fire Motif */}
            <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-gradient-to-bl from-orange-300/10 to-transparent rounded-full blur-3xl -translate-y-1/4 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-red-400/5 rounded-full blur-2xl translate-y-1/3 pointer-events-none" />
            <Flame className="absolute -right-8 -bottom-4 w-56 h-56 text-orange-500 opacity-5 -rotate-12 pointer-events-none" />
            <div className="absolute top-6 right-10 w-1 h-16 bg-gradient-to-b from-orange-400/20 to-transparent rounded-full rotate-45 blur-[1px] pointer-events-none" />
            <div className="absolute top-12 right-20 w-1.5 h-10 bg-gradient-to-b from-orange-300/30 to-transparent rounded-full rotate-12 blur-[1px] pointer-events-none" />

            <div className="relative z-10 flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                {/* Header Icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-[20px] bg-gradient-to-br from-orange-50 to-orange-100/80 border border-orange-200/50 flex items-center justify-center shrink-0 shadow-none transition-all duration-300 group hover:-translate-y-0.5 hover:shadow-sm">
                  <TrendingUp 
                    size={26} 
                    strokeWidth={2.5} 
                    className="text-orange-500 transition-transform duration-300 ease-out group-hover:scale-110" 
                    aria-hidden="true" 
                  />
                </div>
                <div>
                  <h3 className="text-[20px] sm:text-[22px] font-black text-fg leading-none mb-1.5 flex items-center gap-2 tracking-tight">
                    Streak Harian
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-[10px] font-black rounded-md whitespace-nowrap uppercase tracking-widest shadow-sm self-start">
                      HARI KE-{totalStreak + (isStreakClaimed ? 1 : 0)}
                    </span>
                    <p className="text-[11px] text-orange-800/70 font-bold">
                      {(() => {
                        const displayStreak = totalStreak;
                        const toMega = displayStreak === 0 ? 30 : (30 - (displayStreak % 30 || 30));
                        if (isTodayMegaReward) return `${displayStreak} hari beruntun • 🏆 MEGA REWARD!`;
                        return `${displayStreak} hari beruntun • Mega tiap 30 hari`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative z-10 w-full h-3.5 bg-orange-200/50 rounded-full overflow-hidden border border-orange-300/30 mb-6 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((totalStreak + (isStreakClaimed ? 1 : 0)) / 30) * 100}%` }}
                transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.55, delay: 0.18, ease: [0.2, 0, 0, 1] }}
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full relative"
              >
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white/40 to-transparent" />
              </motion.div>
            </div>

            {/* Day indicators */}
            <div className="relative z-10 flex justify-between items-center w-full mb-8 gap-1">
              {weeklyStreakData.map((day, idx) => {
                const isRewardBox = day.isDay7 || day.isMega;
                const isToday = day.status === 'current';
                const canClaimToday = isToday && !isStreakClaimed;

                if (isRewardBox) {
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-all shrink-0 shadow-sm
                        ${day.status === 'done' ? 'bg-orange-50 border-orange-200 text-orange-500' :
                          day.status === 'current' ? 'border-orange-500 bg-orange-100 text-orange-600' :
                            'border-black/5 bg-white text-orange-300'}`}
                      >
                        <Gift size={20} className={day.status === 'future' ? 'opacity-60' : ''} />
                        {canClaimToday && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                            className="absolute inset-0 border-2 border-orange-500 rounded-xl pointer-events-none" />
                        )}
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-black whitespace-nowrap flex items-center justify-center gap-[2px] ${day.status === 'done' ? 'text-orange-500' : day.status === 'current' ? 'text-orange-600' : 'text-orange-400'}`}>
                        {day.status === 'done' ? '+30' : day.isMega ? '+50' : '+10'}
                        {day.status !== 'done' && <Coins size={10} className="fill-yellow-500 text-yellow-600" />}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border-2 transition-all shrink-0 shadow-sm
                      ${day.status === 'done' ? 'bg-orange-50 border-orange-200 text-orange-500' :
                        day.status === 'current' ? 'border-orange-500 bg-orange-100 text-orange-600' :
                          'border-transparent bg-white/60 text-slate-300'}`}
                    >
                      {day.status === 'done' && <Flame size={20} strokeWidth={2.5} className="fill-orange-400 text-orange-500" />}
                      {day.status === 'current' && (
                        <motion.span initial={{ opacity: 0.5, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                          <Flame size={22} strokeWidth={2.5} className="fill-orange-500 drop-shadow-sm text-orange-600" />
                        </motion.span>
                      )}
                      {day.status === 'future' && <Flame size={20} strokeWidth={2} className="opacity-50 text-slate-300" />}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase ${day.status === 'done' ? 'text-orange-500' : day.status === 'current' ? 'text-orange-600' : 'text-fg-muted/70'}`}>{day.day}</span>
                  </div>
                );
              })}
            </div>

            {/* Claim + Spin buttons */}
            <div className="relative z-10 flex items-center gap-3 mt-auto">
              <button
                type="button"
                onClick={handleDailyClaim}
                disabled={isStreakClaimed || isProcessing}
                className={`flex-1 min-h-12 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${isStreakClaimed
                  ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                  : 'bg-gradient-to-b from-orange-500 to-orange-600 text-white hover:brightness-110 border border-orange-600 hover:scale-[1.02] active:scale-95'
                  }`}
              >
                {isStreakClaimed ? <><Check size={18} strokeWidth={3} /> Sudah Klaim</> : (isProcessing ? 'Memproses...' : 'Klaim Sekarang')}
              </button>
              <button
                type="button"
                onClick={() => setShowSpinWheel(true)}
                className="px-4 min-h-12 flex items-center justify-center text-orange-600 bg-white hover:bg-orange-50 rounded-xl transition-all shadow-sm active:scale-95 border border-orange-200 shrink-0 gap-2 font-bold"
                title="Spin Harian"
              >
                <Sparkles size={18} strokeWidth={2.5} aria-hidden="true" />
                <span className="text-xs sm:text-sm whitespace-nowrap hidden sm:block">Spin Harian</span>
              </button>
            </div>
          </motion.section>
        </div>

        {/* ── ROW 2: MODE PERMAINAN ── */}
        <motion.section variants={sectionVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] sm:text-[20px] font-bold text-fg tracking-tight">Mode Permainan</h2>
            <span className="text-[11px] sm:text-xs text-primary-hover font-bold cursor-pointer hover:underline flex items-center gap-1">
              Pilih Mode <ChevronRight size={14} className="hidden sm:block" />
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAME_MODES.filter(m => m.id !== 'latihan').map((mode) => {
              // Bright Gamified Material colors per mode
              const accentMap: Record<string, { textColor: string; bgColor: string }> = {
                survival: { textColor: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100' },
                pvp: { textColor: 'text-pink-500', bgColor: 'bg-pink-50 hover:bg-pink-100' },
                tryout: { textColor: 'text-cyan-500', bgColor: 'bg-cyan-50 hover:bg-cyan-100' },
                catatan_salah: { textColor: 'text-purple-500', bgColor: 'bg-purple-50 hover:bg-purple-100' },
              };
              const accent = accentMap[mode.id] || { textColor: 'text-blue-500', bgColor: 'bg-blue-50 hover:bg-blue-100' };

              return (
                <GlassCard
                  key={mode.id}
                  icon={mode.icon}
                  title={mode.title}
                  description={mode.id === 'catatan_salah' && (profile?.catatan_salah?.length ?? 0) > 0 ? `${profile?.catatan_salah?.length} soal menunggu dipelajari ulang.` : mode.desc}
                  cost={mode.cost}
                  costType={mode.costType as 'energy' | 'coin'}
                  badge={mode.badge}
                  accentColor={accent.textColor}
                  glowColor={accent.bgColor}
                  bgImage={mode.id === 'survival' ? survivalCardBg : mode.id === 'pvp' ? pvpCardBg : mode.id === 'tryout' ? tryoutCardBg : mode.id === 'catatan_salah' ? catatanSalahCardBg : undefined}
                  bgClassName={mode.id === 'survival' ? 'w-full h-full object-cover object-[center_right]' : mode.id === 'pvp' ? 'w-full h-full object-cover object-[center_65%]' : mode.id === 'tryout' ? 'w-full h-full object-cover object-[center_bottom]' : mode.id === 'catatan_salah' ? 'w-full h-full object-cover object-[right_bottom]' : undefined}
                  illustration={dashboardIllustrations[mode.id === 'survival' ? 'survival' : mode.id === 'pvp' ? 'pvp' : mode.id === 'tryout' ? 'tryout' : 'wrongBook']}
                  onClick={() => setSelectedMode(mode)}
                />
              );
            })}
          </div>
        </motion.section>

        {/* ── ROW 3: STATS & QUESTS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Statistik Belajar */}
          <motion.section variants={sectionVariants} className="lg:col-span-7 m3-card flex flex-col relative overflow-hidden isolate">
            
            {/* ── Data Ambient Background ── */}
            <div className="absolute inset-0 z-[-1] pointer-events-none">
              {/* Soft Gradient Base */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#F0F7FF] via-transparent to-[#F5F3FF]" />
              
              {/* Subtle Grid Pattern */}
              <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  maskImage: 'radial-gradient(ellipse at top right, black 50%, transparent 80%)'
                }} 
              />
              
              {/* Abstract Analytics Chart Line */}
              <svg className="absolute bottom-0 left-0 w-full h-[55%] opacity-[0.05] text-[#2563EB]" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,90 Q15,80 25,65 T60,45 T100,20 L100,100 L0,100 Z" fill="url(#stat-grad)" />
                <path d="M0,90 Q15,80 25,65 T60,45 T100,20" fill="none" stroke="currentColor" strokeWidth="0.8" />
                <defs>
                  <linearGradient id="stat-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Soft Circular Abstract Shapes */}
              <div className="absolute -top-[10%] -right-[5%] w-[40%] aspect-square bg-blue-400/10 rounded-full blur-[40px]" />
              <div className="absolute -bottom-[15%] right-[5%] w-[35%] aspect-square bg-cyan-400/10 rounded-full blur-[30px]" />
              <div className="absolute -bottom-[20%] left-[20%] w-[50%] aspect-square bg-indigo-400/10 rounded-full blur-[50px]" />
            </div>

            {/* Content Container */}
            <div className="p-5 sm:p-6 flex flex-col flex-1 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[16px] sm:text-[18px] font-bold text-fg tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[var(--m3-shape-small)] bg-primary-container flex items-center justify-center overflow-hidden">
                    <img src={dashboardIllustrations.statistics} alt="" aria-hidden="true" className="w-7 h-7 object-contain" />
                  </div>
                  Statistik Belajar
                </h3>
                <select className="bg-surface-container rounded-[var(--m3-shape-small)] text-xs font-semibold text-fg px-3 py-2 outline-none cursor-pointer border border-border">
                  <option>7 Hari Terakhir</option>
                  <option>30 Hari Terakhir</option>
                  <option>Semua Waktu</option>
                </select>
              </div>

              <p className="text-xs text-fg-muted font-medium mb-5">Lihat perkembangan kemampuanmu</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              {[
                { icon: Activity, accentColor: 'text-emerald-400', value: totalDijawab, label: 'Dijawab', suffix: '', trend: '+12%', isUp: true },
                { icon: Crosshair, accentColor: 'text-blue-400', value: calculatedAkurasi, label: 'Akurasi', suffix: '%', trend: '+5%', isUp: true },
                { icon: Flame, accentColor: 'text-orange-400', value: calculatedCombo, label: 'Combo', suffix: '', prefix: 'x', trend: '+8%', isUp: true },
                { icon: Clock, accentColor: 'text-red-400', value: (profile?.catatan_salah?.length ?? 0), label: 'Soal Salah', suffix: '', trend: '-15%', isUp: false },
              ].map((stat, i) => (
                <GlassStatCard
                  key={i}
                  icon={stat.icon}
                  accentColor={stat.accentColor}
                  value={
                    <>
                      {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} />
                    </>
                  }
                  label={stat.label}
                  trend={stat.trend}
                  isUp={stat.isUp}
                />
              ))}
            </div>
            </div>
          </motion.section>

          {/* Quest Mingguan */}
          <motion.section variants={sectionVariants} className="lg:col-span-5 m3-card p-5 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h3 className="text-[16px] sm:text-[18px] font-bold text-fg tracking-tight flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--m3-shape-small)] bg-tertiary-container flex items-center justify-center overflow-hidden">
                  <img src={dashboardIllustrations.quest} alt="" aria-hidden="true" className="w-7 h-7 object-contain" />
                </div>
                Quest Mingguan
              </h3>
              <span className="text-[11px] sm:text-xs text-primary-hover font-bold cursor-pointer hover:underline flex items-center gap-1">
                Lihat Semua <ChevronRight size={14} className="hidden sm:block" />
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {WEEKLY_QUESTS_METADATA.map((quest, idx) => {
                const progress = profile?.quests_progress?.[quest.id] || 0;
                const isClaimed = progress === 999;
                const displayProgress = isClaimed ? quest.total : progress;
                const progressPercentage = Math.min((displayProgress / quest.total) * 100, 100);

                return (
                  <div key={quest.id} className={`flex flex-col gap-2 ${idx !== WEEKLY_QUESTS_METADATA.length - 1 ? 'border-b border-border pb-3' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--m3-shape-medium)] bg-tertiary-container text-tertiary flex items-center justify-center shrink-0 border border-tertiary/10">
                        <quest.icon size={18} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-fg leading-none">{quest.title}</h4>
                        <div className="flex items-center gap-1 mt-2">
                          <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-tertiary rounded-full m3-progress"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-fg-muted font-bold ml-2">{displayProgress}/{quest.total}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-coin-subtle px-2.5 py-1.5 rounded-full border border-warning/15 shrink-0 cursor-pointer hover:bg-warning/10 transition-colors" onClick={() => navigate('/quest')}>
                        <Coins size={12} className="text-coin fill-yellow-500" />
                        <span className="text-[10px] font-bold text-coin">+{quest.reward}</span>
                        <ChevronRight size={14} className="text-fg-muted ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>
      </motion.div>

      {/* ── Game Mode Modal ── */}
      <AnimatePresence>
        {selectedMode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCloseModal} className="absolute inset-0 bg-overlay" data-backdrop="true" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              ref={gameModeModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-mode-title"
              className="m3-card w-full max-w-md rounded-[var(--m3-shape-extra-large)] shadow-card-strong relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className={`h-24 ${selectedMode.bg} relative rounded-t-3xl`}>
                <button type="button" onClick={handleCloseModal} aria-label="Tutup Mode Game" className="absolute top-4 right-4 p-2 bg-surface-container hover:bg-surface-container-high rounded-full text-fg transition-colors">
                  <X size={20} />
                </button>
                <div className={`absolute -bottom-8 left-6 w-16 h-16 rounded-[var(--m3-shape-large)] flex items-center justify-center bg-primary-container border-4 border-surface shadow-sm ${selectedMode.color}`}>
                  <selectedMode.icon size={32} />
                </div>
              </div>
              <div className="p-6 pt-12">
                <h3 id="game-mode-title" className="text-2xl font-bold text-fg mb-1">{selectedMode.title}</h3>
                <p className="text-fg-muted text-sm mb-6">{selectedMode.desc}</p>
                {selectedMode.id === 'latihan' && (
                  <div className="m3-card-tonal p-4 rounded-[var(--m3-shape-medium)] mb-6">
                    <h4 className="text-sm font-bold text-fg mb-2">Tentang Mode Ini</h4>
                    <p className="text-xs text-fg-muted leading-relaxed">Selesaikan kuis harian tanpa batas waktu. Cocok untuk mengasah ingatan dan membangun fondasi pemahaman materi SKD dengan santai.</p>
                  </div>
                )}
                {selectedMode.id === 'catatan_salah' && (
                  <div className="bg-coin-subtle p-4 rounded-[var(--m3-shape-medium)] border border-warning/20 mb-6">
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
                        <div
                          onClick={() => setPvpState('matching')}
                          className="p-4 rounded-[var(--m3-shape-medium)] border border-info/20 bg-info-subtle hover:bg-info/10 cursor-pointer transition-colors flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-[var(--m3-shape-medium)] bg-info-subtle text-info flex items-center justify-center">
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
                        <div
                          onClick={() => setPvpSubMode('bot_setup')}
                          className="p-4 rounded-[var(--m3-shape-medium)] border border-warning/20 bg-coin-subtle hover:bg-warning/10 cursor-pointer transition-colors flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-[var(--m3-shape-medium)] bg-coin-subtle text-coin flex items-center justify-center">
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
                        <div
                          onClick={() => setPvpSubMode('friend_duel')}
                          className="p-4 rounded-[var(--m3-shape-medium)] border border-premium/20 bg-premium-subtle hover:bg-premium/10 cursor-pointer transition-colors flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-[var(--m3-shape-medium)] bg-premium-subtle text-premium flex items-center justify-center">
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
                        <div
                          onClick={() => setPvpSubMode('custom')}
                          className="p-4 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.06] cursor-pointer transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-white/[0.06] text-fg flex items-center justify-center group-hover:scale-110 transition-transform">
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
                            className="p-4 rounded-xl border border-yellow-500/30 bg-coin-subtle hover:bg-amber-500/15 cursor-pointer transition-colors"
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
                    {/* Custom Room / Friend Duel */}
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
                          <button onClick={pvpSubMode === 'custom' ? handleCreateRoom : handleCreateFriendDuel} className="w-full bg-info text-white hover:bg-info-hover font-bold py-2.5 rounded-lg text-sm transition-colors shadow-card-strong shadow-blue-500/20">
                            Buat Room Baru
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-white/10" /><span className="text-xs text-fg-muted font-medium uppercase">Atau</span><div className="flex-1 h-px bg-white/10" />
                        </div>
                        <div className="flex gap-2">
                          <input type="text" placeholder="Masukkan Kode Room" value={roomCode} onChange={(e) => setRoomCode(e.target.value)}
                            className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-4 text-sm font-mono text-fg outline-none focus:border-info transition-colors uppercase" maxLength={6} />
                          <button onClick={handleJoinRoom} disabled={roomCode.length < 4} className="bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] disabled:opacity-50 px-4 rounded-lg text-sm font-bold text-fg transition-colors">Join</button>
                        </div>
                      </motion.div>
                    )}
                    {/* Matchmaking */}
                    {pvpState === 'matching' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="m3-card-tonal rounded-[var(--m3-shape-large)] p-5 text-center space-y-6">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-info/15 text-info">
                            Quick Match
                          </span>
                          <h4 className="text-base font-bold text-fg">Mencari Lawan Duel 1v1...</h4>
                        </div>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-14 h-14 rounded-full bg-primary-container p-0.5 shadow-sm flex items-center justify-center shrink-0">
                              <div className="w-full h-full bg-surface rounded-full flex items-center justify-center font-bold text-sm text-fg">US</div>
                            </div>
                            <span className="text-xs font-black text-fg truncate max-w-[80px]">{profile?.nickname || profile?.username || 'Pejuang'}</span>
                            <span className="text-[9px] text-fg-muted font-bold">Lvl {profile?.level || 1}</span>
                          </div>
                          <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-surface border-2 border-info flex items-center justify-center font-black text-xs text-info relative z-10 shadow-sm">
                              VS
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <AnimatePresence mode="wait">
                              {opponentName ? (
                                <motion.div
                                  key="opponent-found"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="flex flex-col items-center gap-2"
                                >
                                  <div className="w-14 h-14 rounded-full bg-primary-container p-0.5 shadow-sm flex items-center justify-center shrink-0">
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
                                  animate={prefersReducedMotion ? { scale: 1, opacity: 1 } : { scale: [0.96, 1.04, 0.96], opacity: [0.65, 1, 0.65] }}
                                  transition={prefersReducedMotion ? { duration: 0.1 } : { repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                                  className="flex flex-col items-center gap-2"
                                >
                                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/20 bg-white/[0.04] flex items-center justify-center text-fg-muted font-black text-xl">
                                    ?
                                  </div>
                                  <span className="text-xs font-bold text-fg-muted animate-pulse">Mencari...</span>
                                  <span className="text-[9px] text-fg-muted font-bold">-</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
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
                          className="w-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] text-fg font-bold py-2 rounded-lg text-xs transition-colors"
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
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="m3-card-tonal rounded-[var(--m3-shape-large)] p-6 text-center space-y-4">
                        <div>
                          <p className="text-xs text-fg-muted uppercase font-bold tracking-widest mb-1">Kode Duel</p>
                          <div className="text-3xl font-black text-fg font-mono tracking-widest bg-white/[0.06] py-2 rounded-xl border border-white/10 flex items-center justify-center gap-3">
                            {activeRoom}
                            <button onClick={() => setToastMessage('Kode berhasil disalin!')} className="p-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg text-fg-muted hover:text-fg transition-colors">
                              <Copy size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400"><UserPlus size={24} /></div>
                          <div className="text-left">
                            <div className="text-2xl font-black text-fg">{playersCount}<span className="text-sm text-fg-muted font-medium">/2</span></div>
                            <div className="text-xs text-fg-muted">Pemain Bergabung</div>
                          </div>
                        </div>
                        {isHost ? (
                          <button onClick={handleStartHostGame} disabled={playersCount < 2} className="w-full mt-2 bg-tertiary hover:opacity-90 disabled:opacity-50 text-white font-semibold py-3 rounded-full shadow-sm transition-colors active:translate-y-px">
                            {playersCount < 2 ? 'Menunggu teman bergabung...' : 'Mulai Pertandingan'}
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-purple-400 pt-2">
                            <Loader2 className="animate-spin" size={14} />
                            <p className="text-xs font-bold">Menunggu Host Memulai Pertandingan...</p>
                          </div>
                        )}
                        <button
                          onClick={handleCancelMatching}
                          className="w-full mt-4 bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] text-fg font-bold py-2 rounded-lg text-xs transition-colors"
                        >
                          Batalkan Duel
                        </button>
                      </motion.div>
                    )}
                    {pvpState === 'waiting' && (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="m3-card-tonal rounded-[var(--m3-shape-large)] p-6 text-center space-y-4">
                        <div>
                          <p className="text-xs text-fg-muted uppercase font-bold tracking-widest mb-1">Kode Room</p>
                          <div className="text-3xl font-black text-fg font-mono tracking-widest bg-white/[0.06] py-2 rounded-xl border border-white/10">{activeRoom}</div>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400"><Users size={24} /></div>
                          <div className="text-left">
                            <div className="text-2xl font-black text-fg">{playersCount}<span className="text-sm text-fg-muted font-medium">/50</span></div>
                            <div className="text-xs text-fg-muted">Pemain Bergabung</div>
                          </div>
                        </div>
                        {isHost ? (
                          <button onClick={handleStartHostGame} disabled={playersCount < 2} className="w-full mt-2 bg-info text-white hover:bg-info-hover disabled:opacity-50 font-bold py-3 rounded-xl shadow-card-strong transition-colors active:scale-95">
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
                  <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 mb-6">
                    <h4 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2"><Trophy size={16} /> Try Out SKD</h4>
                    <p className="text-xs text-fg leading-relaxed mb-4">
                      Simulasi <strong>110 soal</strong> format BKN (30 TWK + 35 TIU + 45 TKP), soal tetap per paket.
                      <strong>Beli 1× (1.000 koin)</strong> → main kapan saja tanpa biaya attempt. Paket 1 & 2 dibuka.
                    </p>
                    <button
                      onClick={(e) => { e.preventDefault(); setSelectedMode(null); navigate('/tryout-lobby'); }}
                      className="w-full bg-tertiary text-white hover:opacity-90 font-semibold py-3 rounded-full text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Coins size={18} /> Pilih paket di Lobby • beli 1×
                    </button>
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
                      className={`transition-colors px-6 py-2.5 rounded-full font-semibold text-sm shadow-sm ${selectedMode.id === 'pvp' ? 'bg-info text-white hover:bg-info-hover' : 'bg-primary text-primary-fg hover:bg-primary-hover'}`}
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
