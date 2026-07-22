import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getRandomQuestions, type Question, type QuestionOption } from '../data/questions/index';
import { updateRating, getDifficultyColor } from '../calculations/adaptive';

const cleanMathText = (text: string): string => {
  if (!text) return "";
  let cleaned = text;
  if (typeof document !== 'undefined') { const txt = document.createElement('textarea'); txt.innerHTML = cleaned; cleaned = txt.value; }
  // Replace LaTeX delimiters safely
  cleaned = cleaned.split('\\\\[').join(' ');
  cleaned = cleaned.split('\\\\]').join(' ');
  cleaned = cleaned.split('\\[').join(' ');
  cleaned = cleaned.split('\\]').join(' ');
  cleaned = cleaned.split('\\(').join(' ');
  cleaned = cleaned.split('\\)').join(' ');
  cleaned = cleaned.split('\\[').join(' ');
  cleaned = cleaned.split('\\]').join(' ');
  cleaned = cleaned.split('\\(').join(' ');
  cleaned = cleaned.split('\\)').join(' ');
  
  // Replace \frac{A}{B} and rac{A}{B} with A/B
  cleaned = cleaned.replace(/\\\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  
  // Replace \text{...} and 	ext{...} with ...
  cleaned = cleaned.replace(/\\\\text\{([^}]+)\}/g, '$1');
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, '$1');
  
  // Replace standard latex symbols
  cleaned = cleaned.split('\\\\times').join('x');
  cleaned = cleaned.split('\\times').join('x');
  cleaned = cleaned.split('\\\\div').join(':');
  cleaned = cleaned.split('\\div').join(':');
  cleaned = cleaned.split('\\\\').join('\n');
  cleaned = cleaned.split('\\{').join('{');
  cleaned = cleaned.split('\\}').join('}');
  cleaned = cleaned.split('\\\\{').join('{');
  cleaned = cleaned.split('\\\\}').join('}');
  cleaned = cleaned.split('\\\\cdot').join('·');
  cleaned = cleaned.split('\\cdot').join('·');
  cleaned = cleaned.split('\\\\pm').join('±');
  cleaned = cleaned.split('\\pm').join('±');
  cleaned = cleaned.split('\\\\approx').join('≈');
  cleaned = cleaned.split('\\approx').join('≈');
  cleaned = cleaned.split('\\\\neq').join('≠');
  cleaned = cleaned.split('\\neq').join('≠');
  cleaned = cleaned.split('\\\\leq').join('≤');
  cleaned = cleaned.split('\\leq').join('≤');
  cleaned = cleaned.split('\\\\geq').join('≥');
  cleaned = cleaned.split('\\geq').join('≥');
  
  // Clean multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Trophy, Skull, Users, ChevronUp, ChevronDown, Loader2, Menu, Zap, Eye, Heart, HeartCrack, Clock, Battery, Scale, Lightbulb, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchQuestionsFromSupabase, fetchProfile, consumeEnergy, consumePowerup, supabase, isSupabaseConfigured, saveWrongQuestion, incrementMastery } from '../lib/supabase';
import { useQuizSession } from '../context/QuizSessionContext';
import MathCard from '../components/MathCard';
import { Button } from '../components/ui/Button';
import { ExitConfirmModal } from '../components/modals/ExitConfirmModal';
import { SubmitConfirmModal } from '../components/modals/SubmitConfirmModal';
// Konfigurasi Power up yang diijinkan per mode kuis
const ALLOWED_POWER_UPS: Record<string, string[]> = {
  latihan: ['item_5050', 'item_hint', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan'],
  pvp: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan', 'item_tinta_hitam', 'item_lompatan_kilat'],
  pvp1v1: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan', 'item_tinta_hitam', 'item_lompatan_kilat'],
  pvp_bot: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan', 'item_tinta_hitam', 'item_lompatan_kilat'],
  survival: ['item_waktu_beku', 'item_terawangan', 'item_kesempatan_kedua', 'item_shield'],
  catatan_salah: ['item_5050', 'item_hint', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan']
};

const MAX_POWERUP_USAGE: Record<string, Record<string, number>> = {
  latihan: { item_5050: 3, item_hint: 3, item_waktu_beku: 3, item_skor_ganda: 3, item_terawangan: 3 },
  catatan_salah: { item_5050: 3, item_hint: 3, item_waktu_beku: 3, item_skor_ganda: 3, item_terawangan: 3 },
  survival: { item_waktu_beku: 1, item_terawangan: 1, item_kesempatan_kedua: 3, item_shield: 3 },
  pvp: { item_5050: 1, item_waktu_beku: 1, item_skor_ganda: 1, item_terawangan: 1, item_tinta_hitam: 1, item_lompatan_kilat: 1 },
  pvp1v1: { item_5050: 1, item_waktu_beku: 1, item_skor_ganda: 1, item_terawangan: 1, item_tinta_hitam: 1, item_lompatan_kilat: 1 },
  pvp_bot: { item_5050: 1, item_waktu_beku: 1, item_skor_ganda: 1, item_terawangan: 1, item_tinta_hitam: 1, item_lompatan_kilat: 1 }
};

type RankEntry = { name: string; score: number; isMe?: boolean; delta?: number };
function getSurvivalTime(idx: number): number {
  return Math.max(10, 60 - idx * 5);
}
export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const gameMode = location.state?.mode || 'latihan';
  const opponentName = location.state?.opponent || 'Lawan';
  const energyCost = location.state?.energyCost || 0;
  const coinCost = location.state?.coinCost || 0;
  const botDifficulty = location.state?.botDifficulty || 'medium';
  const packageId = location.state?.packageId || undefined;
  const packageVersion = location.state?.packageVersion || 1;
  
    // --- Quiz Session ---
  const { activeSession, createSession, updateSession, abandonSession, completeSession, debouncedSave } = useQuizSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const answersRef = useRef<Record<number, string>>({});
  
  // --- Quiz state ---
    const [isEnergyDeducted, setIsEnergyDeducted] = useState(false);
  // Modal state digabung jadi satu object untuk mengurangi re-render
  const [modals, setModals] = useState({ exitConfirm: false, submitConfirm: false });
  const showExitConfirm = modals.exitConfirm;
  const showSubmitConfirm = modals.submitConfirm;
  const setShowExitConfirm = (v: boolean) => setModals(m => ({ ...m, exitConfirm: v }));
  const setShowSubmitConfirm = (v: boolean) => setModals(m => ({ ...m, submitConfirm: v }));
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noCatatanSalah, setNoCatatanSalah] = useState(false);
  const [retryKey, setRetryKey] = useState(0); // bump untuk re-trigger fetch soal
  const [showSecondChanceModal, setShowSecondChanceModal] = useState(false);
  const [pendingDeathData, setPendingDeathData] = useState<{earned: number} | null>(null);
  const pendingDeathCallback = useRef<(() => void) | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const TOTAL_TIME = gameMode === 'tryout' 
    ? 100 * 60 
    : gameMode === 'survival' 
    ? getSurvivalTime(currentQuestionIndex) 
    : 45;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const selected = answers[currentQuestionIndex] || null;
  const [isGameOver, setIsGameOver] = useState(false);
  const [heartBroken, setHeartBroken] = useState(false); // Sudden death visual
  // score authoritative via totalScoreRef; state only for re-render HUD if needed later
  const [, setTotalScore] = useState(0);
  const [doubtful, setDoubtful] = useState<Record<number, boolean>>({});
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<{
    waktuBeku: boolean;
    skorGanda: boolean;
    terawangan: boolean;
    secondChanceUsed: boolean;
    perisaiActive: boolean;
  }>({ waktuBeku: false, skorGanda: false, terawangan: false, secondChanceUsed: false, perisaiActive: false });
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    fetchProfile().then(p => {
      setProfile(p);
    });
  }, [gameMode]);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [tintaHitamActive, setTintaHitamActive] = useState(false);
  const [lompatanKilatUsed, setLompatanKilatUsed] = useState(false);
  const [powerUpUsageCount, setPowerUpUsageCount] = useState<Record<string, number>>({});
  const [consumingPowerup, setConsumingPowerup] = useState<string | null>(null);
  const [powerupToast, setPowerupToast] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const lastFinishRef = useRef<{
    payload: {
      score: number;
      twkScore?: number;
      tiuScore?: number;
      tkpScore?: number;
      coinsEarned: number;
      xpEarned: number;
      finalAnswers?: Record<number, string>;
    };
    navState: Record<string, unknown>;
  } | null>(null);

  const checkPowerupLimit = (itemKey: string): boolean => {
    const limits = MAX_POWERUP_USAGE[gameMode] || {};
    const max = limits[itemKey] || 0;
    const current = powerUpUsageCount[itemKey] || 0;
    return current < max;
  };

  const showPowerupToast = (msg: string) => {
    setPowerupToast(msg);
    setTimeout(() => setPowerupToast(''), 3000);
  };

  /** Server-authoritative consume. Efek HANYA setelah RPC sukses. */
  const spendPowerup = async (itemId: string): Promise<{ ok: boolean; remaining: number }> => {
    if (!sessionId) {
      showPowerupToast('Sesi belum siap. Coba lagi.');
      return { ok: false, remaining: 0 };
    }
    if (consumingPowerup) return { ok: false, remaining: 0 };
    if (!profile?.inventory || (profile.inventory[itemId] || 0) <= 0 || !checkPowerupLimit(itemId)) {
      return { ok: false, remaining: 0 };
    }

    setConsumingPowerup(itemId);
    try {
      const result = await consumePowerup(sessionId, itemId);
      if (!result.success) {
        const reasonMsg: Record<string, string> = {
          item_not_available: 'Stok item habis.',
          session_not_found: 'Sesi tidak ditemukan.',
          session_not_active: 'Sesi tidak aktif.',
          not_your_session: 'Sesi tidak valid.',
          not_authenticated: 'Login dulu.',
        };
        showPowerupToast(reasonMsg[result.reason || ''] || 'Gagal memakai item.');
        return { ok: false, remaining: result.itemRemaining };
      }

      setPowerUpUsageCount(p => ({ ...p, [itemId]: (p[itemId] || 0) + 1 }));
      setProfile((prev: any) => {
        if (!prev?.inventory) return prev;
        return {
          ...prev,
          inventory: { ...prev.inventory, [itemId]: result.itemRemaining },
        };
      });
      return { ok: true, remaining: result.itemRemaining };
    } finally {
      setConsumingPowerup(null);
    }
  };

  const useTintaHitam = async () => {
    const { ok } = await spendPowerup('item_tinta_hitam');
    if (!ok) return;
    broadcastPowerUp('item_tinta_hitam');
  };

  const useLompatanKilat = async () => {
    if (lompatanKilatUsed) return;
    const { ok } = await spendPowerup('item_lompatan_kilat');
    if (!ok) return;
    setLompatanKilatUsed(true);
    broadcastPowerUp('item_lompatan_kilat');

    // Otomatis pilih jawaban paling benar agar dapat poin!
    const correctOpt = currentQuestion.category === 'TKP'
       ? currentQuestion.options.find((o: QuestionOption) => o.score === 5)?.id
       : currentQuestion.correct;

    if (correctOpt) {
       handleSelect(correctOpt);
    } else {
       goNextOrFinish(totalScoreRef.current);
    }
  };
  const use5050 = async () => {
    if (!currentQuestion) return;
    const { ok } = await spendPowerup('item_5050');
    if (!ok) return;

    // Find incorrect options
    const correctId = currentQuestion.correct;
    const incorrects = currentQuestion.options.filter((o: QuestionOption) => o.id !== correctId).map((o: QuestionOption) => o.id);
    const shuffled = incorrects.sort(() => 0.5 - Math.random());
    setEliminatedOptions(shuffled.slice(0, 2));
    broadcastPowerUp('item_5050');
  };
  const useHint = async () => {
    const { ok } = await spendPowerup('item_hint');
    if (!ok) return;
    setShowHint(true);
    broadcastPowerUp('item_hint');
  };
  const useWaktuBeku = async () => {
    const { ok } = await spendPowerup('item_waktu_beku');
    if (!ok) return;
    setActivePowerUps(p => ({...p, waktuBeku: true}));
    setTimeout(() => setActivePowerUps(p => ({...p, waktuBeku: false})), 5000);
    broadcastPowerUp('item_waktu_beku');

    // Mencegah timer anjlok setelah freeze, kita geser startedAt 5 detik ke masa depan
    if (sessionId && activeSession?.startedAt) {
       const newStart = new Date(new Date(activeSession.startedAt).getTime() + 5000).toISOString();
       updateSession(sessionId, { startedAt: newStart });
    }
  };
  const useSkorGanda = async () => {
    const { ok } = await spendPowerup('item_skor_ganda');
    if (!ok) return;
    setActivePowerUps(p => ({...p, skorGanda: true}));
    broadcastPowerUp('item_skor_ganda');
  };
  const useTerawangan = async () => {
    const { ok } = await spendPowerup('item_terawangan');
    if (!ok) return;
    setActivePowerUps(p => ({...p, terawangan: true}));
    broadcastPowerUp('item_terawangan');
  };

  const togglePerisai = () => {
    // Toggle UI only — konsumsi item_shield saat salah (proaktif)
    if (!profile || !profile.inventory) return;
    const hasStock = (profile.inventory.item_shield || 0) > 0;
    const underLimit = checkPowerupLimit('item_shield');
    if (hasStock && underLimit) {
      setActivePowerUps(p => ({ ...p, perisaiActive: !p.perisaiActive }));
    }
  };
  const [showRewardFloat, setShowRewardFloat] = useState<{ pts: number } | null>(null);
  
  // --- Explanation state ---
  const [showExplanation, setShowExplanation] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // --- Sidebar category state (Try Out) ---
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    TWK: true,
    TIU: true,
    TKP: true
  });
  const toggleCategory = (cat: string) => setOpenCategories(prev => ({...prev, [cat]: !prev[cat]}));
  
  const [liveRanks, setLiveRanks] = useState<RankEntry[]>(() => {
    const isRealtime = isSupabaseConfigured() && !!location.state?.roomId;
    if (isRealtime) {
      return [{ name: profile?.nickname || profile?.username || 'Anda', score: 0, isMe: true }];
    }
    if (gameMode === 'pvp1v1') {
      return [
        { name: 'Anda', score: 0, isMe: true },
        { name: opponentName, score: 0 }
      ];
    }
    if (gameMode === 'pvp_bot') {
      return [
        { name: 'Anda', score: 0, isMe: true },
        { name: `Bot (${botDifficulty})`, score: 0 }
      ];
    }
    return [{ name: 'Anda', score: 0, isMe: true }];
  });
  const [myRankPosition, setMyRankPosition] = useState(1);
  const totalScoreRef = useRef(0); // keep a ref so setTimeout closures can read latest value
  
  // --- Real-time PvP Supabase Integration ---
  const [pvpNotification, setPvpNotification] = useState('');
  const channelRef = useRef<any>(null);
  const isRealtimePvP = isSupabaseConfigured() && !!location.state?.roomId;
  
  const showPvpToast = (msg: string) => {
    setPvpNotification(msg);
    setTimeout(() => setPvpNotification(''), 3500);
  };

  useEffect(() => {
    if (profile?.username && !isRealtimePvP) {
      setLiveRanks(prev => prev.map(r => r.isMe ? { ...r, name: profile.username } : r));
    }
  }, [profile, isRealtimePvP]);

  useEffect(() => {
    const roomId = location.state?.roomId;
    if (!isRealtimePvP || !roomId) return;
    
    const myName = profile?.nickname || profile?.username || 'Anda';
    const channel = supabase!.channel(`game_${roomId}`);
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const ranks: RankEntry[] = [];
      for (const key in state) {
        const player = state[key][0] as any;
        ranks.push({
          name: player.name,
          score: player.score || 0,
          isMe: player.id === profile?.id
        });
      }
      setLiveRanks(ranks.sort((a, b) => b.score - a.score));
    });

    channel.on('broadcast', { event: 'powerup_use' }, (payload) => {
      const { name, powerUpName } = payload.payload;
      if (name === myName) return;
      
      if (powerUpName === 'item_tinta_hitam') {
        setTintaHitamActive(true);
        setTimeout(() => setTintaHitamActive(false), 5000);
        showPvpToast(`💀 ${name} menyiram layarmu dengan Tinta Hitam!`);
        return;
      }
      if (powerUpName === 'item_lompatan_kilat') {
        showPvpToast(`⚡ ${name} melakukan Lompatan Kilat (Lewati Soal)!`);
        return;
      }
      const cleanNames: Record<string, string> = {
        item_5050: '50:50',
        item_hint: 'Petunjuk',
        item_waktu_beku: 'Beku Waktu',
        item_skor_ganda: 'Skor Ganda',
        item_terawangan: 'Teropong',
        item_tinta_hitam: 'Tinta Hitam',
        item_lompatan_kilat: 'Lompatan Kilat',
        item_kesempatan_kedua: 'Kesempatan Kedua',
        item_shield: 'Perisai'
      };
      showPvpToast(`${name} menggunakan ${cleanNames[powerUpName] || powerUpName}!`);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && profile) {
        await channel.track({ id: profile.id, name: myName, score: totalScoreRef.current });
      }
    });

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [profile, location.state?.roomId]);
  const broadcastPowerUp = (powerUpName: string) => {
    if (isRealtimePvP && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'powerup_use',
        payload: { name: profile?.username || 'Lawan', powerUpName }
      });
    }
  };
  // Fetch questions on mount
  useEffect(() => {
    let mounted = true;
    // Reset state saat retry
    setLoadingQuestions(true);
    setError(null);
    setNoCatatanSalah(false);
    const initQuestions = async (data: any[]) => {
      if (mounted) {
        setQuestions(data);
        setLoadingQuestions(false);
        try {
          const id = await createSession(gameMode, data, packageId, packageVersion);
          if (mounted) setSessionId(id);
        } catch (err: unknown) {
          if (mounted) {
            setError((err as Error).message || "Gagal membuat sesi kuis.");
            setLoadingQuestions(false);
          }
        }
      }
    };

    if (gameMode === 'catatan_salah') {
      // Fetch catatan_salah langsung dari Supabase agar selalu up-to-date
      const loadCatatanSalah = async () => {
        try {
          let catatanData: Question[] = [];
          if (isSupabaseConfigured()) {
            const { data: { user } } = await supabase!.auth.getUser();
            if (user) {
              const { data } = await supabase!
                .from('profiles')
                .select('catatan_salah')
                .eq('id', user.id)
                .maybeSingle();
              if (data?.catatan_salah) {
                const raw: Array<{id: string; type: string}> = typeof data.catatan_salah === 'string'
                  ? JSON.parse(data.catatan_salah)
                  : data.catatan_salah;
                if (Array.isArray(raw)) {
                  const { ALL_QUESTIONS } = await import('../data/questions/index');
                  catatanData = raw
                    .map((ref: {id: string; type: string}) => ALL_QUESTIONS.find(q => q.id === ref.id))
                    .filter((q): q is Question => !!q);
                }
              }
            }
          } else {
            // Fallback ke profil lokal jika Supabase tidak terkonfigurasi
            const p = await fetchProfile();
            const refs = p?.catatan_salah as Array<{id: string; type: string}> || [];
            if (refs.length > 0) {
              const { ALL_QUESTIONS } = await import('../data/questions/index');
              catatanData = refs
                .map((ref) => ALL_QUESTIONS.find(q => q.id === ref.id))
                .filter((q): q is Question => !!q);
            }
          }

          if (!mounted) return;

          if (catatanData.length === 0) {
            // Tampilkan layar informatif, bukan silent redirect
            setNoCatatanSalah(true);
            setLoadingQuestions(false);
          } else {
            // Acak urutan soal catatan salah
            const shuffled = [...catatanData].sort(() => Math.random() - 0.5);
            initQuestions(shuffled);
          }
        } catch (err) {
          if (mounted) {
            setNoCatatanSalah(true);
            setLoadingQuestions(false);
          }
        }
      };
      loadCatatanSalah();
    } else {
      fetchQuestionsFromSupabase(gameMode, packageId)
        .then(initQuestions)
        .catch(() => {
          // Fallback ke data lokal jika Supabase gagal
          if (mounted) {
            const localData = getRandomQuestions('ALL');
            if (localData.length > 0) {
              initQuestions(localData);
            } else {
              setError("Gagal memuat soal dari database.");
              setLoadingQuestions(false);
            }
          }
        });
    }
    return () => { mounted = false; };
  }, [gameMode, retryKey]);

  // Keep answers ref synced for auto-save
  useEffect(() => { answersRef.current = answers; }, [answers]);

    // Auto-Save interval 30 detik dihapus.
  // Digantikan oleh debouncedSave yang dipanggil langsung di handleSelect (save-on-answer).
  // Derived values – safely computed after hooks (not hooks themselves)
  // Memoize currentQuestion agar tidak dihitung ulang setiap render
  const currentQuestion = useMemo(
    () => questions[currentQuestionIndex] ?? null,
    [questions, currentQuestionIndex]
  );
  
  // Memoize cleaned text untuk menghindari 40+ string operations setiap render
  const cleanedQuestionText = useMemo(
    () => currentQuestion?.text ? cleanMathText(currentQuestion.text) : '',
    [currentQuestion?.text]
  );
  
  const cleanedExplanation = useMemo(
    () => currentQuestion?.explanation ? cleanMathText(currentQuestion.explanation) : '',
    [currentQuestion?.explanation]
  );
  
  const cleanedOptions = useMemo(
    () => currentQuestion?.options?.map((opt: QuestionOption) => ({
      ...opt,
      cleanedText: cleanMathText(opt.text || '')
    })) ?? [] as (QuestionOption & { cleanedText: string })[],
    [currentQuestion?.options]
  );
  
  const totalQuestions = questions.length;
  const progress = (timeLeft / TOTAL_TIME) * 100;
  const strokeDashoffset = ((100 - progress) / 100) * 113.097;
  const timerColor = timeLeft <= 10 ? 'text-danger font-bold' : timeLeft <= 20 ? 'text-primary' : 'text-success';
  // Calculate score: TWK/TIU = +5 flat if correct, TKP = opt.score (1-5)
  const calcScore = (optionId: string): number => {
    if (!currentQuestion) return 0;
    const isTKP = currentQuestion.category === 'TKP';
    let pts: number;
    if (isTKP) {
      const opt = currentQuestion.options.find((o: QuestionOption) => o.id === optionId);
      pts = Number(opt?.score ?? 0); // bobot 1-5
    } else {
      pts = optionId === currentQuestion.correct ? 5 : 0; // TWK/TIU: +5 atau 0
    }
    if (activePowerUps.skorGanda) {
      pts *= 2;
      setActivePowerUps(p => ({ ...p, skorGanda: false }));
    }
    return pts;
  };
  
  // --- Timer Sync (Hardcore Anti-Cheat) ---
  useEffect(() => {
    if (isGameOver || !activeSession?.id) return;
    
    // Jika waktuBeku aktif, timer berhenti secara visual
    if (activePowerUps.waktuBeku) {
      return;
    }

    if (timeLeft <= 0) {
      if (gameMode === 'tryout') finishTryout();
      else goNextOrFinish(totalScoreRef.current);
      return;
    }

    const t = setTimeout(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isGameOver, gameMode, activePowerUps.waktuBeku, activeSession?.id]);
  // --- Simulate Bot AI answering ---
  useEffect(() => {
    if (gameMode !== 'pvp_bot' || !currentQuestion) return;
    
    // Easy: 50% chance correct, delay 5-15s
    // Medium: 80% chance correct, delay 3-8s
    // Hard: 95% chance correct, delay 1-3s
    let baseChance = 0.8;
    let minDelay = 3;
    let maxDelay = 8;
    
    if (botDifficulty === 'easy') {
      baseChance = 0.5;
      minDelay = 5;
      maxDelay = 15;
    } else if (botDifficulty === 'hard') {
      baseChance = 0.95;
      minDelay = 1;
      maxDelay = 3;
    }
    
    const delayMs = Math.floor((minDelay + Math.random() * (maxDelay - minDelay)) * 1000);
    
    const t = setTimeout(() => {
      let botPts = 0;
      if (currentQuestion.category === 'TKP') {
        // TKP Bot logic
        botPts = Math.random() > 0.5 ? 50 : 40;
      } else {
        const isCorrect = Math.random() <= baseChance;
        botPts = isCorrect ? 50 : 0;
      }
      
      setLiveRanks(prev => {
        const botName = `Bot (${botDifficulty})`;
        const updated = prev.map(r => r.name === botName ? { ...r, score: r.score + botPts } : r);
        return updated.sort((a, b) => b.score - a.score);
      });
    }, Math.min(delayMs, (TOTAL_TIME - 1) * 1000));
    
    return () => clearTimeout(t);
  }, [currentQuestionIndex, gameMode, botDifficulty, currentQuestion]);
  // Sync my rank position when liveRanks changes
  useEffect(() => {
    const pos = liveRanks.findIndex(r => r.isMe) + 1;
    setMyRankPosition(pos);
  }, [liveRanks]);
  // --- Answer handler ---
  const handleSelect = (optionId: string) => {
    if (isGameOver) return;
    if (!currentQuestion) return;

    // Deferred Cost Deduction: Potong energi/koin saat pemain PERTAMA KALI menjawab
    if (!isEnergyDeducted && profile) {
      if (energyCost > 0 || coinCost > 0) {
        if (energyCost > 0) {
          // SEC-01: atomic RPC — prevents race-condition double-spend
          consumeEnergy(energyCost).then(({ success, energyAfter }) => {
            if (success) {
              setProfile((p: import('../lib/supabase').UserProfile | null) => p ? { ...p, energy: energyAfter } : p);
            }
          });
        }
        if (coinCost > 0) {
          // ponytail: entry tryout belum punya RPC potong koin atomik;
          // UI optimistic saja — ganti ke purchase_tryout / consume_coins saat siap
          setProfile((p: import('../lib/supabase').UserProfile | null) =>
            p ? { ...p, coins: Math.max(0, (p.coins || 0) - coinCost) } : p
          );
        }
      }
      setIsEnergyDeducted(true);
    }

        if (gameMode === 'tryout') {
      // In tryout, user can change answer freely, no auto-advance
      const newAnswers = { ...answers, [currentQuestionIndex]: optionId };
      setAnswers(newAnswers);
      answersRef.current = newAnswers;
      // Save-on-answer dengan debounce 3 detik (menggantikan interval 30 detik)
      if (sessionId) {
        debouncedSave(sessionId, { currentIndex: currentQuestionIndex, answers: newAnswers });
      }
      return;
    }
    if (selected) return; // Prevent changing in normal modes
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionId }));
    const earned = calcScore(optionId);
    const isTKP = currentQuestion.category === 'TKP';
        const isCorrect = optionId === currentQuestion.correct;
        const isFullyCorrect = (!isTKP && isCorrect) || (isTKP && earned >= 5);

        // Adaptive Difficulty: update user rating based on correctness
        const cat = currentQuestion.category as 'TWK' | 'TIU' | 'TKP';
        updateRating(cat, isFullyCorrect);

        // Tracker Catatan Salah / Mastery
    if (profile?.id) {
      if (!isFullyCorrect) {
        saveWrongQuestion(profile.id, currentQuestion.id, currentQuestion.category);
      } else if (gameMode === 'catatan_salah') {
        incrementMastery(profile.id, currentQuestion.id);
      }
    }

    const applyAnswerProgress = (earnedPts: number) => {
      // Update my score
      const newTotal = totalScoreRef.current + earnedPts;
      setTotalScore(newTotal);
      totalScoreRef.current = newTotal;

      // Real-time Update Database (Crucial for LiveRanking)
      const newAnswers = { ...answers, [currentQuestionIndex]: optionId };
      setAnswers(newAnswers);
      answersRef.current = newAnswers;
      // Save-on-answer dengan debounce 3 detik
      if (sessionId) {
        debouncedSave(sessionId, { score: newTotal, answers: newAnswers, currentIndex: currentQuestionIndex });
      }

      // Floating reward
      if (earnedPts > 0) {
        setShowRewardFloat({ pts: earnedPts });
        setTimeout(() => setShowRewardFloat(null), 1200);
      }
      // Update live rank for PvP
      if (gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') {
        setLiveRanks(prev => {
          let updated = prev.map(r => r.isMe ? { ...r, score: r.score + earnedPts } : r);
          if (gameMode === 'pvp_bot') {
            // Simulasi bot mencetak skor: 60% peluang benar (50 pts)
            const botEarned = currentQuestion?.category === 'TKP'
              ? Math.floor(Math.random() * 3 + 3) // 3-5 poin TKP
              : (Math.random() > 0.4 ? 50 : 0);

            updated = updated.map(r => (!r.isMe && r.name.includes('Bot')) ? { ...r, score: r.score + botEarned } : r);
          }
          return updated.sort((a, b) => b.score - a.score);
        });
        if (isRealtimePvP && channelRef.current) {
          channelRef.current.track({
            id: profile?.id,
            name: profile?.nickname || profile?.username || 'Anda',
            score: newTotal
          });
        }

        // Auto-advance in PvP/1v1 modes after 1 second
        autoAdvanceTimer.current = setTimeout(() => {
          goNextOrFinish(newTotal);
        }, 1000);
      }
      // Auto advance removed, user must manually proceed after seeing Pembahasan
    };

    function triggerSuddenDeath() {
      setHeartBroken(true);
      setTimeout(() => {
        setIsGameOver(true);
        const finalScore = totalScoreRef.current + earned;
        const finalAnswers = { ...answersRef.current, [currentQuestionIndex]: optionId };
        void finishQuiz({
          score: finalScore,
          coinsEarned: Math.floor(finalScore * 0.2 * 10),
          xpEarned: finalScore * 10,
          finalAnswers,
        }, {
          score: finalScore,
          mode: gameMode,
          sessionId,
          userAnswers: finalAnswers,
        });
      }, 1000); // Wait 1 second to show red flash
    };

    // Survival: wrong = game over
    if (gameMode === 'survival' && ((!isTKP && !isCorrect) || (isTKP && earned < 5))) {
      // 1. Shield aktif (proaktif) — consume_powerup dulu, efek hanya jika sukses
      if (activePowerUps.perisaiActive) {
        void (async () => {
          const { ok } = await spendPowerup('item_shield');
          if (ok) {
            setActivePowerUps(p => ({ ...p, perisaiActive: false }));
            applyAnswerProgress(earned);
          } else {
            triggerSuddenDeath();
          }
        })();
        return;
      // 2. Punya kesempatan_kedua — tampilkan popup (reaktif)
      } else if ((profile?.inventory?.item_kesempatan_kedua || 0) > 0 && checkPowerupLimit('item_kesempatan_kedua')) {
        setPendingDeathData({ earned });
        pendingDeathCallback.current = triggerSuddenDeath;
        setShowSecondChanceModal(true);
        return;
      } else {
        triggerSuddenDeath();
        return;
      }
    }

    applyAnswerProgress(earned);
  };
  /** Satu alur finish untuk semua mode. Navigate result HANYA jika ada result_id. */
  const finishQuiz = async (
    payload: {
      score: number;
      twkScore?: number;
      tiuScore?: number;
      tkpScore?: number;
      coinsEarned: number;
      xpEarned: number;
      finalAnswers?: Record<number, string>;
    },
    navState: Record<string, unknown>
  ) => {
    if (!sessionId) {
      setFinishError('Sesi tidak ditemukan. Kembali ke dashboard dan mulai lagi.');
      return;
    }
    if (isFinishing) return;

    lastFinishRef.current = { payload, navState };
    setIsFinishing(true);
    setFinishError(null);
    try {
      const resultId = await completeSession(sessionId, payload);
      if (!resultId) {
        throw new Error('result_id kosong');
      }
      navigate(`/result/${resultId}`, {
        state: { ...navState, sessionId },
      });
    } catch (err: unknown) {
      // Session tetap aktif di context — user bisa retry
      setIsFinishing(false);
      setFinishError((err as Error)?.message || 'Gagal mengirim hasil. Coba lagi.');
    }
  };

  const retryFinish = () => {
    const last = lastFinishRef.current;
    if (!last) return;
    void finishQuiz(last.payload, last.navState);
  };

  const finishTryout = () => {
    let finalScore = 0, twkScore = 0, tiuScore = 0, tkpScore = 0;
    const finalAnswers = answersRef.current;

    questions.forEach((q, idx) => {
      const ansId = finalAnswers[idx];
      let isFullyCorrect = false;
      if (ansId) {
        const opt = q.options.find((o: QuestionOption) => o.id === ansId);
        // Score sudah dinormalisasi ke skala 0-5 oleh fetchQuestionsFromSupabase
        const pts = Number(opt?.score ?? 0);
        finalScore += pts;
        if (q.category === 'TWK') twkScore += pts;
        else if (q.category === 'TIU') tiuScore += pts;
        else if (q.category === 'TKP') tkpScore += pts;

        const isTKP = q.category === 'TKP';
        // TKP: jawaban terbaik = score 5 (maks); TWK/TIU: benar = score 5
        isFullyCorrect = isTKP ? pts >= 5 : pts === 5;
      }

      // Tracking Catatan Salah (Tryout batch)
      if (!isFullyCorrect && profile?.id) {
        saveWrongQuestion(profile.id, q.id, q.category);
      }
    });

    const earnedCoins = gameMode === 'tryout' ? 300 : 50;
    const gainedXP = gameMode === 'tryout' ? 500 : 150;

    void finishQuiz(
      { score: finalScore, twkScore, tiuScore, tkpScore, coinsEarned: earnedCoins, xpEarned: gainedXP, finalAnswers },
      {
        score: finalScore,
        mode: gameMode,
        sessionId,
        twkScore,
        tiuScore,
        tkpScore,
        userAnswers: finalAnswers,
        doubtfulMap: doubtful,
      }
    );
  };
  const handleShowExplanation = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setShowExplanation(true);
  };

  // Keyboard shortcut: 1-5 pilih jawaban
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isGameOver || !currentQuestion) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < cleanedOptions.length) {
        const opt = cleanedOptions[idx];
        if (opt && !eliminatedOptions.includes(opt.id)) handleSelect(opt.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isGameOver, currentQuestion, cleanedOptions, eliminatedOptions, handleSelect]);
  const goNextOrFinish = (scoreSnapshot: number) => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < totalQuestions) {
      setCurrentQuestionIndex(nextIdx);
      setShowExplanation(false);
      
      // RESET Power up aktif untuk soal berikutnya
      setActivePowerUps(p => ({
        ...p,
        waktuBeku: false,
        skorGanda: false,
        terawangan: false,
      }));
      setEliminatedOptions([]);
      setShowHint(false);
      if (gameMode === 'survival') {
        setTimeLeft(getSurvivalTime(nextIdx));
      } else if (gameMode !== 'tryout') {
        setTimeLeft(TOTAL_TIME);
      }

      if (sessionId) {
        const updates: { currentIndex: number; startedAt?: string } = { currentIndex: nextIdx };
        if (gameMode !== 'tryout') {
          updates.startedAt = new Date().toISOString();
        }
        updateSession(sessionId, updates);
      }
    } else {
      const finalScore = totalScoreRef.current;
      const finalAnswers = answersRef.current;
      void finishQuiz(
        {
          score: finalScore,
          coinsEarned: Math.floor(finalScore * 0.2 * 10),
          xpEarned: finalScore * 10,
          finalAnswers,
        },
        {
          score: scoreSnapshot,
          mode: gameMode,
          sessionId,
          liveRanks,
          userAnswers: finalAnswers,
        }
      );
    }
  };
  // --- Score label helper ---
  /*
const scoreBadge = (optionId: string) => {
    if (!currentQuestion) return null;
    const isTKP = currentQuestion.category === 'TKP';
    if (!isTKP) return null;
    const pts = calcScore(optionId);
    return pts;
  };
*/
  if (profile && (gameMode === 'survival' || gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && profile.energy <= 0) {
    return (
    <div className="min-h-screen bg-background font-syne pb-24 md:pb-8 flex justify-center text-center">
      {/* Sudden Death Flash Overlay */}
      <div className={`fixed inset-0 z-50 pointer-events-none transition-colors duration-300 ${heartBroken ? 'bg-danger/30' : 'bg-transparent'}`} />

      {/* Main Container */}
      <div className="w-full max-w-7xl px-4 md:px-8 flex gap-6 relative">
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-4 border border-danger/20">
          <Battery size={32} className="text-danger fill-red-500/30 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-fg mb-2">Energi Anda Habis!</h2>
        <p className="text-xs text-fg-muted max-w-sm mb-6 leading-relaxed">
          Untuk menjaga kestabilan belajar, Anda memerlukan energi untuk bermain di mode kompetitif. Pulihkan energi Anda secara instan di Toko menggunakan koin, atau tunggu pemulihan otomatis (+1 energi setiap 15 menit).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
          <Link
            to="/toko"
            className="px-6 py-3 bg-primary hover:bg-primary-hover text-primary-fg font-bold rounded-xl shadow-md transition-colors text-center w-full"
          >
            Beli Energi di Toko
          </Link>
          <Button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-locked-subtle hover:bg-locked-subtle text-fg font-bold rounded-xl transition-colors w-full"
          >
            Kembali ke Beranda
          </Button>
        </div>
        {/* Tinta Hitam crisp overlay */}
        {tintaHitamActive && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md p-4 text-center">
            <div className="bg-surface shadow-sm/95 border-2 border-danger rounded-[2rem] p-8 shadow-[0_0_50px_rgba(239,68,68,0.4)] max-w-xs flex flex-col items-center gap-4 animate-bounce">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center text-danger border border-danger/20 text-3xl font-black shadow-inner">
                💀
              </div>
              <h3 className="text-xl font-black text-fg">Efek Tinta Hitam!</h3>
              <p className="text-xs text-fg-muted leading-relaxed font-medium">Lawan mengaburkan layarmu. Tunggu 5 detik hingga tinta memudar...</p>
            </div>
          </div>
        )}
      </div>
    </div>
    );
  }
  return (
        <div className="flex flex-col h-screen bg-bg relative transition-colors">
      {/* Real-time PvP Notifications */}
      {pvpNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-premium/95 border border-premium text-white font-bold py-2 px-6 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.4)] backdrop-blur-md text-xs animate-bounce flex items-center gap-2">
          <Users size={14} className="text-warning" />
          <span>{pvpNotification}</span>
        </div>
      )}
      {powerupToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-danger/95 border border-danger text-white font-bold py-2 px-6 rounded-2xl shadow-lg backdrop-blur-md text-xs flex items-center gap-2">
          <span>{powerupToast}</span>
        </div>
      )}
      {finishError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,28rem)] bg-surface border border-danger/40 text-fg shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-danger">Gagal mengirim hasil</p>
          <p className="text-xs text-fg-muted leading-relaxed">{finishError}</p>
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={isFinishing}
              onClick={retryFinish}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            >
              {isFinishing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                </span>
              ) : (
                'Coba kirim lagi'
              )}
            </Button>
            <Button
              variant="ghost"
              disabled={isFinishing}
              onClick={() => setFinishError(null)}
              className="px-4 py-2.5 rounded-xl text-sm"
            >
              Tutup
            </Button>
          </div>
        </div>
      )}
      {activePowerUps.waktuBeku && (
        <div className="pointer-events-none fixed inset-0 z-50 rounded-none"
          style={{ boxShadow: 'inset 0 0 80px 20px rgba(34,211,238,0.25)' }} />
      )}
      {/* Loading Screen */}
      {(loadingQuestions || (!currentQuestion && !noCatatanSalah && !error)) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <h2 className="text-xl font-bold text-fg animate-pulse">Mempersiapkan Arena...</h2>
        </div>
      )}

      {/* Error Screen */}
      {error && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg gap-6 p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-danger-subtle border-2 border-danger/30 flex items-center justify-center text-5xl">
            ⚠️
          </div>
          <div>
            <h2 className="text-2xl font-black text-fg mb-2">Terjadi Kesalahan</h2>
            <p className="text-fg-muted text-sm max-w-xs leading-relaxed">
              {error}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-8 py-3 bg-primary hover:bg-primary-hover text-primary-fg font-black rounded-xl transition-all shadow-lg text-sm"
            >
              Coba Lagi
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/', { replace: true })}
              className="px-8 py-3 bg-surface-subtle hover:bg-surface text-fg-muted font-black rounded-xl transition-all text-sm"
            >
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      )}

      {/* Layar kosong Catatan Salah */}
      {noCatatanSalah && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg gap-6 p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-success-subtle border-2 border-success/30 flex items-center justify-center text-5xl">
            🎉
          </div>
          <div>
            <h2 className="text-2xl font-black text-fg mb-2">Catatan Bersih!</h2>
            <p className="text-fg-muted text-sm max-w-xs leading-relaxed">
              Kamu belum pernah menjawab soal dengan salah, atau sudah berhasil mempelajari semua soal yang pernah salah. Pertahankan!
            </p>
          </div>
          <Button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="px-8 py-3 bg-primary hover:bg-primary-hover text-primary-fg font-black rounded-xl transition-all shadow-lg text-sm"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      )}
      {/* Floating Score Reward */}
      {showRewardFloat && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounce">
          <span className="text-3xl font-black text-coin drop-shadow-xl">
            +{showRewardFloat.pts} pts
          </span>
        </div>
      )}
      {/* Main layout — only render when data is ready */}
      {currentQuestion && <div className={`flex flex-1 overflow-hidden ${(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'tryout') ? 'flex-row' : 'flex-col items-center'}`}>
        {/* === Quiz Panel === */}
        <div className="flex flex-col flex-1 h-full min-w-0 w-full max-w-5xl mx-auto">
          {/* Header */}
          <header className={`sticky top-0 p-3 md:p-4 flex items-center justify-between gap-3 md:gap-4 border-b z-40 shadow-sm backdrop-blur-md ${gameMode === 'survival' ? 'border-danger bg-danger-subtle/90' : 'border-border bg-surface/90'}`}>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setShowExitConfirm(true)} className="!p-2 bg-surface-subtle hover:bg-surface text-fg-muted rounded-full shrink-0 border border-border">
                <X size={20} />
              </Button>
              
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 shrink-0">
                <span className="font-space font-bold text-sm text-fg whitespace-nowrap">Soal {currentQuestionIndex + 1}{gameMode !== 'survival' && `/${totalQuestions}`}</span>
                <div className="flex items-center gap-1.5">
                  {gameMode === 'survival' && <span className="flex items-center gap-1 text-destructive bg-rose-50 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-rose-100"><Skull size={10} /> Survival</span>}
                  {gameMode === 'catatan_salah' && <span className="flex items-center gap-1 text-info bg-info/10 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-info/20">📖 {totalQuestions} Soal</span>}
                  {gameMode === 'tryout'  && <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-purple-100"><Trophy size={10} /> Try Out</span>}
                  {(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && <span className="flex items-center gap-1 text-primary bg-blue-50 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-blue-100"><Users size={10} /> PvP</span>}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                    currentQuestion.category === 'TWK' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                    currentQuestion.category === 'TIU' ? 'bg-blue-50 text-primary border-blue-100' :
                    'bg-amber-50 text-warning border-amber-100'
                  }`}>Bagian: {currentQuestion.category}</span>
                  {/* Adaptive Difficulty Badge */}
                  {currentQuestion?.difficulty && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                      {currentQuestion.difficulty === 'mudah' && '🟢 '}
                      {currentQuestion.difficulty === 'sulit' && '🔴 '}
                      {currentQuestion.difficulty === 'mudah' ? 'Mudah' : currentQuestion.difficulty === 'sulit' ? 'Sulit' : 'Sedang'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 hidden md:block px-6">
              <div className="h-2 bg-surface-subtle rounded-full overflow-hidden w-full max-w-md mx-auto">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Timer and Survival Heart */}
            <div className="flex items-center gap-2 shrink-0">
              {gameMode === 'survival' && (
                <div className="flex items-center justify-center mr-2">
                  {heartBroken ? (
                    <HeartCrack size={28} className="text-danger animate-ping" />
                  ) : (
                    <Heart size={28} className="text-danger fill-danger animate-pulse" />
                  )}
                </div>
              )}
              <div className="relative w-14 h-10 flex items-center justify-center" role="timer" aria-label={`Sisa waktu ${timeLeft} detik`} aria-live="off">
                {gameMode === 'tryout' ? (
                  <div className={`font-space font-bold text-xs bg-surface px-2 py-1 rounded-md border border-border ${timerColor}`}>
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </div>
                ) : (
                  <>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" className="stroke-surface-subtle" strokeWidth="3" />
                      <circle
                        cx="20" cy="20" r="18" fill="none"
                        className={`stroke-current transition-all duration-1000 ease-linear ${timerColor}`}
                        strokeWidth="3" strokeDasharray="113.097" strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`absolute font-space font-bold text-sm ${timerColor}`}>{timeLeft}</span>
                  </>
                )}
              </div>
              
              {gameMode === 'tryout' && (
                <Button 
                  variant="ghost"
                  onClick={() => setShowSidebarMobile(true)} 
                  className="lg:hidden !p-2 text-fg-muted hover:bg-surface-subtle rounded-full shrink-0"
                >
                  <Menu size={20} />
                </Button>
              )}
            </div>
          </header>
          {/* PvP: My rank badge (mobile, under header) */}
          {(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && (
            <div className="lg:hidden px-4 py-2 border-b border-border bg-surface/30 flex flex-col gap-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-fg-muted font-bold">Peringkat Saya: <span className="text-primary font-black">#{myRankPosition} <span className="font-normal text-fg-muted">/ {liveRanks.length}</span></span></span>
                <span className="font-space font-bold text-primary">{liveRanks.find(r => r.isMe)?.score ?? 0} pts (Anda)</span>
              </div>
              {liveRanks.length > 1 && (
                <div className="flex justify-between items-center pt-1 border-t border-border/50">
                  <span className="text-fg-muted font-bold truncate pr-2">Lawan ({liveRanks.find(r => !r.isMe)?.name}):</span>
                  <span className="font-space font-bold text-fg">{liveRanks.find(r => !r.isMe)?.score ?? 0} pts</span>
                </div>
              )}
            </div>
          )}
          {/* Question Body */}
          <main className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24 relative ${tintaHitamActive ? 'blur-md pointer-events-none transition-all duration-300' : 'transition-all duration-300'}`}>
            <div key={currentQuestion.id} className="space-y-4">
                {/* TKP indicator */}
                {currentQuestion.category === 'TKP' && (
                  <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
                    <span className="font-bold">TKP — Pilih jawaban terbaik.</span>
                    <span className="text-fg-muted">Setiap pilihan memiliki bobot poin berbeda (10–50).</span>
                  </div>
                )}
                <div className="bg-surface rounded-3xl p-8 md:px-12 md:py-10 border border-border shadow-sm mb-6 mt-2 md:mt-4">
                  <p className="text-[20px] font-semibold leading-[1.6] text-fg">{cleanedQuestionText}</p>
                </div>
                {/* Bocoran Rumus Hint Box */}
                {showHint && currentQuestion.explanation && (
                  <div className="bg-coin-subtle border border-yellow-500/30 p-4 rounded-2xl text-coin text-xs sm:text-sm font-medium leading-relaxed shadow-sm">
                    <span className="font-bold flex items-center gap-1.5 mb-1 text-primary"><Lightbulb size={14}/> Petunjuk Rumus / Soal:</span>
                    <span>{cleanedExplanation.slice(0, 180) + (cleanedExplanation.length > 180 ? '...' : '')}</span>
                  </div>
                )}
                <div className="space-y-2 md:space-y-3">
                  {cleanedOptions.map((opt: QuestionOption & { cleanedText: string }) => {
                    const isSelected = selected === opt.id;
                    
                    // Sembunyikan opsi tereliminasi oleh Power up 50:50
                    if (eliminatedOptions.includes(opt.id)) return null;
                    const isCorrect  = opt.id === currentQuestion.correct;
                    const showStatus = selected !== null;
                    const isTKP = currentQuestion.category === 'TKP';
                    let cardClass = 'bg-surface border-border hover:border-primary hover:bg-primary/10';
                    let markerClass = 'bg-surface-subtle text-fg-muted font-bold';
                    
                    if (gameMode === 'tryout') {
                      if (isSelected) {
                        cardClass = 'bg-blue-50 border-primary shadow-sm';
                        markerClass = 'bg-primary text-white';
                      }
                    } else if (showStatus) {
                      if (isTKP) {
                        const optScoreNum = Number(opt.score || 0);
                        if (isSelected) {
                            cardClass = optScoreNum === 5 ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 
                                        optScoreNum >= 3 ? 'bg-orange-50 border-orange-400 shadow-sm' : 
                                        'bg-rose-50 border-destructive shadow-sm';
                            markerClass = optScoreNum === 5 ? 'bg-emerald-500 text-white' : 
                                          optScoreNum >= 3 ? 'bg-orange-400 text-white' : 
                                          'bg-destructive text-white';
                        } else if (optScoreNum === 5) {
                            cardClass = 'bg-emerald-50 border-emerald-500 shadow-sm opacity-60';
                            markerClass = 'bg-emerald-500 text-white';
                        } else {
                            cardClass = 'bg-surface border-border opacity-40';
                        }
                      } else {
                        if (isCorrect) {
                          cardClass = 'bg-emerald-50 border-emerald-500 shadow-sm';
                          markerClass = 'bg-emerald-500 text-white';
                        } else if (isSelected) {
                          cardClass = 'bg-rose-50 border-destructive shadow-sm';
                          markerClass = 'bg-destructive text-white';
                        } else {
                          cardClass = 'bg-surface border-border opacity-40';
                        }
                      }
                    }
                                        const terawanganPercent = activePowerUps.terawangan ? (isCorrect ? ((opt.text.length * 7) % 20) + 60 : ((opt.text.length * 13) % 30)) : 0;
                    return (
                      <motion.button
                                              key={opt.id}
                                              whileHover={{ scale: 1.02 }}
                                              whileTap={{ scale: 0.97 }}
                                              onClick={() => handleSelect(opt.id)}
                                              disabled={selected !== null && gameMode !== 'tryout'}
                                              className={`w-full min-h-[44px] p-3.5 md:p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all shadow-sm relative z-0 overflow-hidden ${cardClass}`}
                                            >
                        {activePowerUps.terawangan && (
                          <div className="absolute left-0 bottom-0 top-0 bg-premium/10 -z-10 rounded-xl transition-all duration-1000" style={{ width: `${terawanganPercent}%` }} />
                        )}
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-space font-bold shrink-0 text-base ${markerClass}`}>
                          {opt.id}
                        </div>
                        <span className="flex-1 leading-[1.6] text-base md:text-lg font-semibold text-fg">{opt.cleanedText}</span>
                        {/* TKP score badge revealed after answering (not in tryout) */}
                        {showStatus && isTKP && gameMode !== 'tryout' && (
                          <span className={`ml-auto shrink-0 text-xs font-bold px-2 py-1 rounded-lg
                            ${Number(opt.score) === 5 ? 'bg-success/20 text-success' :
                              Number(opt.score) >= 3 ? 'bg-orange-500/15 text-orange-400' :
                              'bg-locked-subtle text-fg-muted'}`}>
                            {opt.score} pts
                          </span>
                        )}
                        {/* Score tag for TWK/TIU revealed after answering (not in tryout) */}
                        {showStatus && !isTKP && isCorrect && gameMode !== 'tryout' && (
                          <span className="ml-auto shrink-0 text-xs font-bold bg-success/20 text-success px-2 py-1 rounded-lg">5 pts</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {/* Explanation Box (Pembahasan) */}
                {selected !== null && gameMode !== 'tryout' && (
                  <div className="pt-4">
                    {!showExplanation ? (
                      <div className="flex gap-3">
                        <Button
                          variant="ghost"
                          onClick={handleShowExplanation}
                          className="flex-1 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl"
                        >
                          Lihat Pembahasan
                        </Button>
                        <Button
                          variant="primary"
                          disabled={isFinishing}
                          onClick={() => {
                            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                            goNextOrFinish(totalScoreRef.current);
                          }}
                          className="flex-1 py-3 rounded-xl shadow-md active:scale-95"
                        >
                          {isFinishing ? (
                            <span className="flex items-center justify-center gap-2">
                               <Loader2 className="w-5 h-5 animate-spin" /> Memproses...
                            </span>
                          ) : (
                            currentQuestionIndex === totalQuestions - 1 ? 'Selesai' : 'Lanjut'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-info/10 border border-info/20 p-5 rounded-xl space-y-3">
                        <h4 className="font-bold text-primary">Pembahasan:</h4>
                        <p className="text-sm md:text-base text-fg leading-relaxed">
                          <MathCard explanation={cleanedExplanation || "Pembahasan tidak tersedia untuk soal ini."} category={currentQuestion.category} />
                        </p>
                        <Button
                          variant="primary"
                          disabled={isFinishing}
                          onClick={() => {
                            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                            goNextOrFinish(totalScoreRef.current);
                          }}
                          className="mt-4 w-full py-3 rounded-xl shadow-lg active:scale-95"
                        >
                          {isFinishing ? (
                            <span className="flex items-center justify-center gap-2">
                               <Loader2 className="w-5 h-5 animate-spin" /> Memproses...
                            </span>
                          ) : (
                            currentQuestionIndex === totalQuestions - 1 ? 'Selesai' : 'Lanjut ke Soal Berikutnya'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {/* Tryout Navigation Buttons */}
                {gameMode === 'tryout' && (
                  <div className="flex flex-col gap-4 pt-4 mt-6 border-t border-border">
                    <div className="flex justify-end gap-2">
                      {selected && (
                        <Button variant="danger" onClick={() => {
                          setAnswers(p => { const n = {...p}; delete n[currentQuestionIndex]; return n; });
                        }} className="px-4 py-2 rounded-xl text-sm shadow-sm">
                          Batalkan Jawaban
                        </Button>
                      )}
                      <Button onClick={() => setDoubtful(p => ({...p, [currentQuestionIndex]: !p[currentQuestionIndex]}))} className={`px-4 py-2 border rounded-xl text-sm flex items-center gap-2 active:scale-95 ${doubtful[currentQuestionIndex] ? 'bg-danger text-white border-danger shadow-md' : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'}`}>
                        Ragu-Ragu
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="px-5 py-2.5 bg-surface border border-border rounded-xl text-fg disabled:opacity-30 hover:bg-locked-subtle"
                    >
                      Sebelumnya
                    </Button>
                    
                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <Button
                        variant="primary"
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-5 py-2.5 rounded-xl shadow-md active:scale-95"
                      >
                        Selanjutnya
                      </Button>
                    ) : (
                        <Button
                          variant="success"
                          disabled={isFinishing}
                          onClick={finishTryout}
                          className="px-6 py-2.5 rounded-xl shadow-lg shadow-sm active:scale-95"
                        >
                          {isFinishing ? (
                            <span className="flex items-center justify-center gap-2">
                               <Loader2 className="w-5 h-5 animate-spin" /> Memproses...
                            </span>
                          ) : (
                            'Kumpulkan Ujian'
                          )}
                        </Button>
                    )}
                  </div>
                  </div>
                )}
              </div>
          </main>

          {/* Quick Slots (Power Ups) at the bottom */}
          {gameMode !== 'tryout' && profile && (
            <div className="flex gap-4 px-4 py-3 border-t border-border bg-surface/50 backdrop-blur-md overflow-x-auto shrink-0 mt-auto shadow-[0_-4px_20px_rgba(0,0,0,0.02)] relative z-30">
              {profile.inventory?.item_5050 > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_5050') && (
                <Button variant="custom" onClick={use5050} disabled={!!consumingPowerup || !checkPowerupLimit('item_5050')} aria-label={`50:50 - Hapus 2 jawaban salah - ${profile.inventory.item_5050} tersisa ${!checkPowerupLimit('item_5050') ? '(habis)' : ''}`} className={`relative px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-blue-50 text-primary transition-colors border border-blue-100 shadow-sm min-h-[36px] ${!!consumingPowerup || !checkPowerupLimit('item_5050') ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-blue-100'}`}><Scale size={14}/> 50:50<span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-primary text-white">{profile.inventory.item_5050}</span></Button>
              )}
              {profile.inventory?.item_hint > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_hint') && (
                <Button variant="custom" onClick={useHint} disabled={!!consumingPowerup || !checkPowerupLimit('item_hint')} aria-label={`Petunjuk - Tampilkan hint rumus - ${profile.inventory.item_hint} tersisa ${!checkPowerupLimit('item_hint') ? '(habis)' : ''}`} className={`relative px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-amber-50 text-warning transition-colors border border-amber-100 shadow-sm min-h-[36px] ${!!consumingPowerup || !checkPowerupLimit('item_hint') ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-amber-100'}`}><Lightbulb size={14}/> Petunjuk<span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-warning text-white">{profile.inventory.item_hint}</span></Button>
              )}
              {profile.inventory?.item_waktu_beku > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_waktu_beku') && (
                <Button variant="custom" onClick={useWaktuBeku} disabled={!!consumingPowerup || !checkPowerupLimit('item_waktu_beku')} aria-label={`Waktu Beku - Hentikan timer - ${profile.inventory.item_waktu_beku} tersisa ${activePowerUps.waktuBeku ? '(aktif)' : ''} ${!checkPowerupLimit('item_waktu_beku') ? '(habis)' : ''}`} className={`relative px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border min-h-[36px] ${!!consumingPowerup || !checkPowerupLimit('item_waktu_beku') ? 'opacity-50 grayscale cursor-not-allowed bg-surface-subtle text-fg-muted border-border' : activePowerUps.waktuBeku ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-inner ring-2 ring-cyan-400' : 'bg-surface border-border text-fg-muted hover:bg-surface-subtle shadow-sm'}`}><Clock size={14}/> Waktu Beku<span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-cyan-500 text-white">{profile.inventory.item_waktu_beku}</span></Button>
              )}
              {profile.inventory?.item_skor_ganda > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_skor_ganda') && (
                <Button variant="custom" onClick={useSkorGanda} disabled={!!consumingPowerup || !checkPowerupLimit('item_skor_ganda')} aria-label={`Skor Ganda - Poin ×2 - ${profile.inventory.item_skor_ganda} tersisa ${activePowerUps.skorGanda ? '(aktif)' : ''} ${!checkPowerupLimit('item_skor_ganda') ? '(habis)' : ''}`} className={`relative px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border min-h-[36px] ${!!consumingPowerup || !checkPowerupLimit('item_skor_ganda') ? 'opacity-50 grayscale cursor-not-allowed bg-surface-subtle text-fg-muted border-border' : activePowerUps.skorGanda ? 'bg-amber-50 border-amber-200 text-warning shadow-inner ring-2 ring-amber-400' : 'bg-surface border-border text-fg-muted hover:bg-surface-subtle shadow-sm'}`}><Zap size={14}/> Skor Ganda<span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-warning text-white">{profile.inventory.item_skor_ganda}</span></Button>
              )}
              {profile.inventory?.item_terawangan > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_terawangan') && (
                <Button variant="custom" onClick={useTerawangan} disabled={!!consumingPowerup || !checkPowerupLimit('item_terawangan')} aria-label={`Terawangan - Lihat persentase jawaban - ${profile.inventory.item_terawangan} tersisa ${activePowerUps.terawangan ? '(aktif)' : ''} ${!checkPowerupLimit('item_terawangan') ? '(habis)' : ''}`} className={`relative px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border min-h-[36px] ${!!consumingPowerup || !checkPowerupLimit('item_terawangan') ? 'opacity-50 grayscale cursor-not-allowed bg-surface-subtle text-fg-muted border-border' : activePowerUps.terawangan ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-inner ring-2 ring-purple-400' : 'bg-surface border-border text-fg-muted hover:bg-surface-subtle shadow-sm'}`}><Eye size={14}/> Terawangan<span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full bg-purple-500 text-white">{profile.inventory.item_terawangan}</span></Button>
              )}
              {profile.inventory?.item_tinta_hitam > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_tinta_hitam') && (
                <Button variant="custom" onClick={useTintaHitam} disabled={!!consumingPowerup || !checkPowerupLimit('item_tinta_hitam')} className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-rose-50 text-destructive transition-colors border border-rose-100 shrink-0 shadow-sm ${!!consumingPowerup || !checkPowerupLimit('item_tinta_hitam') ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-rose-100'}`}><Skull size={14}/> Tinta Hitam ({profile.inventory.item_tinta_hitam})</Button>
              )}
              {profile.inventory?.item_lompatan_kilat > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_lompatan_kilat') && !lompatanKilatUsed && (
                <Button variant="custom" onClick={useLompatanKilat} disabled={!!consumingPowerup || !checkPowerupLimit('item_lompatan_kilat')} className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-blue-50 text-primary transition-colors border border-blue-100 shrink-0 shadow-sm ${!!consumingPowerup || !checkPowerupLimit('item_lompatan_kilat') ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-blue-100'}`}><Zap size={14}/> Lompatan Kilat ({profile.inventory.item_lompatan_kilat})</Button>
              )}
              {(profile.inventory?.item_shield || 0) > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_shield') && (
                <Button variant="custom" onClick={togglePerisai} disabled={!!consumingPowerup || !checkPowerupLimit('item_shield')} aria-label={`Perisai - Toggle proteksi survival - ${profile.inventory.item_shield} tersisa`} className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border shrink-0 ${!!consumingPowerup || !checkPowerupLimit('item_shield') ? 'opacity-50 grayscale bg-surface-subtle text-fg-muted border-border cursor-not-allowed' : activePowerUps.perisaiActive ? 'bg-success-subtle text-success border-success shadow-inner' : 'bg-surface border-border text-fg-muted hover:bg-surface-subtle shadow-sm'}`}><Shield size={14}/> Perisai ({profile.inventory.item_shield || 0})</Button>
              )}
            </div>
          )}
        </div>
        {/* === PvP Live Leaderboard Sidebar (desktop) === */}
        {(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && (
          <div className="hidden lg:flex flex-col w-64 xl:w-72 border-l border-border bg-surface/40 backdrop-blur-sm">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-primary flex items-center gap-2 text-sm">
                <Users size={16} /> Live Ranking
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {liveRanks.map((rank, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return (
                  <div
                    key={rank.name}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                      ${rank.isMe
                        ? 'bg-info-subtle border-info/40 shadow-md shadow-primary/10'
                        : 'bg-bg/50 border-border/50'}`}
                  >
                    <div className="flex items-center gap-4 bg-surface p-2 md:p-3 rounded-2xl shadow-sm border border-border shrink-0">
                      {/* Score */}
                      <span className="text-base w-6 text-center">{medal}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${rank.isMe ? 'text-primary' : 'text-fg'}`}>
                        {rank.name}{rank.isMe && ' 👤'}
                      </p>
                      <p className="text-[10px] text-fg-muted font-space">{rank.score} pts</p>
                    </div>
                    {/* Score bar */}
                    <div className="w-10 h-1.5 bg-locked-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-400 ${rank.isMe ? 'bg-primary' : 'bg-surface-subtle0'}`}
                        style={{ width: `${Math.min((rank.score / 300) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* My score summary at bottom */}
            <div className="p-4 border-t border-border bg-info/5">
              <div className="text-center">
                <p className="text-[10px] text-fg-muted uppercase font-bold tracking-wider mb-1">Total Skor Anda</p>
                <p className="text-2xl font-black text-primary font-space">{liveRanks.find(r => r.isMe)?.score ?? 0}</p>
                <p className="text-[10px] text-fg-muted mt-0.5">Soal {currentQuestionIndex + 1}/{totalQuestions}</p>
              </div>
            </div>
          </div>
        )}
        {/* === Try Out Sidebar (desktop & tablet) === */}
        {gameMode === 'tryout' && (
          <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-border bg-surface/40 backdrop-blur-sm">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-fg flex items-center gap-2 text-sm">
                Navigasi Soal
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {['TWK', 'TIU', 'TKP'].map(cat => {
                const catQuestions = questions.map((q, idx) => ({ q, idx })).filter(item => item.q.category === cat);
                if (catQuestions.length === 0) return null;
                const isOpen = openCategories[cat];
                return (
                  <div key={cat} className="mb-4">
                    <Button
                      variant="ghost"
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center justify-between w-full p-2 mb-2 bg-locked-subtle hover:bg-locked-subtle rounded-lg text-sm font-bold text-fg transition-colors"
                    >
                      <span>{cat}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                    {isOpen && (
                      <div className="grid grid-cols-5 gap-2 overflow-hidden transition-all">
                        {catQuestions.map(({ idx }) => {
                          const isAnswered = answers[idx] !== undefined;
                          const isCurrent = currentQuestionIndex === idx;
                          let btnClass = 'bg-bg border-border text-fg-muted hover:bg-locked-subtle';
                          if (isCurrent) {
                            btnClass = 'bg-info text-info-fg border-info shadow-md ring-2 ring-info/50 ring-offset-1 ring-offset-skd-card';
                          } else if (doubtful[idx]) {
                            btnClass = 'bg-danger text-white border-danger shadow-sm';
                          } else if (isAnswered) {
                            btnClass = 'bg-success text-white border-success shadow-sm';
                          }
                          return (
                            <Button
                              variant="custom"
                              key={idx}
                              onClick={() => setCurrentQuestionIndex(idx)}
                              className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-bold transition-all ${btnClass}`}
                            >
                              {idx + 1}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-border bg-bg">
              <Button
                variant="success"
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full py-3 rounded-xl shadow-lg shadow-sm active:scale-95"
              >
                Kumpulkan Ujian
              </Button>
            </div>
          </div>
        )}
        {/* === Try Out Sidebar (mobile drawer) === */}
        {gameMode === 'tryout' && showSidebarMobile && (
          <>
            {/* Overlay Backdrop */}
            <div 
              onClick={() => setShowSidebarMobile(false)}
              className="fixed inset-0 bg-overlay backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            />
            
            {/* Drawer Container */}
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-surface border-l border-border z-50 flex flex-col lg:hidden transition-transform duration-300">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold text-fg flex items-center gap-2 text-sm">
                    Navigasi Soal
                  </h3>
                  <Button 
                    variant="ghost"
                    onClick={() => setShowSidebarMobile(false)}
                    className="!p-2 bg-surface-subtle hover:bg-surface text-fg-muted rounded-full"
                  >
                    <X size={20} />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {['TWK', 'TIU', 'TKP'].map(cat => {
                    const catQuestions = questions.map((q, idx) => ({ q, idx })).filter(item => item.q.category === cat);
                    if (catQuestions.length === 0) return null;
                    const isOpen = openCategories[cat];
                    return (
                      <div key={cat} className="mb-4">
                        <Button
                          variant="ghost"
                          onClick={() => toggleCategory(cat)}
                          className="flex items-center justify-between w-full p-2 mb-2 bg-locked-subtle hover:bg-locked-subtle rounded-lg text-sm text-fg"
                        >
                          <span>{cat}</span>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                        {isOpen && (
                          <div className="grid grid-cols-5 gap-2 overflow-hidden transition-all">
                            {catQuestions.map(({ idx }) => {
                              const isAnswered = answers[idx] !== undefined;
                              const isCurrent = currentQuestionIndex === idx;
                              let btnClass = 'bg-bg border-border text-fg-muted hover:bg-locked-subtle';
                              if (isCurrent) {
                                btnClass = 'bg-info text-info-fg border-info shadow-md ring-2 ring-info/50 ring-offset-1 ring-offset-skd-card';
                              } else if (doubtful[idx]) {
                                btnClass = 'bg-danger text-white border-danger shadow-sm';
                              } else if (isAnswered) {
                                btnClass = 'bg-success text-white border-success shadow-sm';
                              }
                              return (
                                <Button
                                  variant="custom"
                                  key={idx}
                                  onClick={() => {
                                    setCurrentQuestionIndex(idx);
                                    setShowSidebarMobile(false);
                                  }}
                                  className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-bold ${btnClass}`}
                                >
                                  {idx + 1}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-4 border-t border-border bg-bg">
                  <Button
                    variant="success"
                    onClick={() => {
                      setShowSidebarMobile(false);
                      setShowSubmitConfirm(true);
                    }}
                    className="w-full py-3 rounded-xl shadow-lg shadow-sm active:scale-95"
                  >
                    Kumpulkan Ujian
                  </Button>
                </div>
            </div>
          </>
        )}
      </div>}
      {/* Second Chance Modal — muncul otomatis saat jawab salah di Survival */}
      {showSecondChanceModal && pendingDeathData && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="text-5xl">💔</div>
            <h3 className="text-lg font-black text-fg">Jawaban Salah!</h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              Pakai <span className="font-bold text-danger">Kesempatan Kedua</span> untuk lanjutkan?
              <br/>
              <span className="text-xs text-fg-muted">Stok: {profile.inventory?.item_kesempatan_kedua ?? 0} tersisa</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSecondChanceModal(false);
                  setPendingDeathData(null);
                  pendingDeathCallback.current?.();
                  pendingDeathCallback.current = null;
                }}
                className="flex-1 py-2.5 rounded-xl border border-border text-fg-muted text-sm font-bold hover:bg-surface-subtle transition-colors"
              >
                Menyerah
              </button>
              <button
                disabled={consumingPowerup === 'item_kesempatan_kedua'}
                onClick={async () => {
                  // Terima — RPC dulu; efek hanya jika sukses
                  const savedEarned = pendingDeathData.earned;
                  const { ok } = await spendPowerup('item_kesempatan_kedua');
                  if (!ok) {
                    setShowSecondChanceModal(false);
                    setPendingDeathData(null);
                    pendingDeathCallback.current?.();
                    pendingDeathCallback.current = null;
                    return;
                  }
                  setShowSecondChanceModal(false);
                  setPendingDeathData(null);
                  pendingDeathCallback.current = null;
                  // lanjut survival setelah saved
                  const newTotal = totalScoreRef.current + savedEarned;
                  setTotalScore(newTotal);
                  totalScoreRef.current = newTotal;
                  if (sessionId) {
                    debouncedSave(sessionId, {
                      score: newTotal,
                      answers: answersRef.current,
                      currentIndex: currentQuestionIndex,
                    });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-black hover:bg-danger/90 transition-colors shadow-lg disabled:opacity-50"
              >
                {consumingPowerup === 'item_kesempatan_kedua' ? 'Memakai...' : 'Pakai! ❤️'}
              </button>
            </div>
            <p className="text-[10px] text-fg-muted">Auto-menyerah dalam 5 detik jika tidak ada pilihan</p>
          </div>
        </div>
      )}
      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => {
          if (sessionId) abandonSession(sessionId);
          navigate('/');
        }}
        isEnergyDeducted={isEnergyDeducted}
      />
      
      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={() => {
          setShowSubmitConfirm(false);
          finishTryout();
        }}
      />
    </div>
  );
}