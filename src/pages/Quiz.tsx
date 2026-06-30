import { useState, useEffect, useRef } from 'react';
function cleanMathText(text: string): string {
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
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Trophy, Skull, Users, ChevronUp, ChevronDown, Loader2, Menu, Zap, Eye, Heart, Clock, Battery, Scale, Lightbulb, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchQuestionsFromSupabase, fetchProfile, updateProfile, supabase, isSupabaseConfigured } from '../lib/supabase';
import { useQuizSession } from '../context/QuizSessionContext';
import MathCard from '../components/MathCard';
// Konfigurasi Power up yang diijinkan per mode kuis
const ALLOWED_POWER_UPS: Record<string, string[]> = {
  latihan: ['item_5050', 'item_hint', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan'],
  pvp: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan', 'item_tinta_hitam', 'item_lompatan_kilat'],
  pvp1v1: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan', 'item_tinta_hitam', 'item_lompatan_kilat'],
  pvp_bot: ['item_5050', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan'],
  survival: ['item_waktu_beku', 'item_terawangan', 'item_kesempatan_kedua', 'item_shield'],
  catatansalah: ['item_5050', 'item_hint', 'item_waktu_beku', 'item_skor_ganda', 'item_terawangan']
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
  
  // --- Quiz Session ---
  const { createSession, updateSession, abandonSession } = useQuizSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const answersRef = useRef<Record<number, string>>({});
  
  // --- Quiz state ---
  const [isEnergyDeducted, setIsEnergyDeducted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
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
  const [totalScore, setTotalScore] = useState(0);
  const [doubtful, setDoubtful] = useState<Record<number, boolean>>({});
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<{
    waktuBeku: boolean;
    skorGanda: boolean;
    terawangan: boolean;
    secondChanceUsed: boolean;
  }>({ waktuBeku: false, skorGanda: false, terawangan: false, secondChanceUsed: false });
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

  const useTintaHitam = () => {
    if (!profile || !profile.inventory || (profile.inventory.item_tinta_hitam || 0) <= 0) return;
    const updatedInv = { ...profile.inventory, item_tinta_hitam: profile.inventory.item_tinta_hitam - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    broadcastPowerUp('item_tinta_hitam');
  };

  const useLompatanKilat = () => {
    if (!profile || !profile.inventory || (profile.inventory.item_lompatan_kilat || 0) <= 0 || lompatanKilatUsed) return;
    const updatedInv = { ...profile.inventory, item_lompatan_kilat: profile.inventory.item_lompatan_kilat - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    setLompatanKilatUsed(true);
    broadcastPowerUp('item_lompatan_kilat');
    goNextOrFinish(totalScore);
  };
  const use5050 = () => {
    if (!profile || !profile.inventory || profile.inventory.item_5050 <= 0 || !currentQuestion) return;
    const updatedInv = { ...profile.inventory, item_5050: profile.inventory.item_5050 - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    
    // Find incorrect options
    const correctId = currentQuestion.correct;
    const incorrects = currentQuestion.options.filter((o: any) => o.id !== correctId).map((o: any) => o.id);
    const shuffled = incorrects.sort(() => 0.5 - Math.random());
    setEliminatedOptions(shuffled.slice(0, 2));
    broadcastPowerUp('item_5050');
  };
  const useHint = () => {
    if (!profile || !profile.inventory || profile.inventory.item_hint <= 0) return;
    const updatedInv = { ...profile.inventory, item_hint: profile.inventory.item_hint - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    setShowHint(true);
    broadcastPowerUp('item_hint');
  };
  const useWaktuBeku = () => {
    if (!profile || !profile.inventory || profile.inventory.item_waktu_beku <= 0) return;
    const updatedInv = { ...profile.inventory, item_waktu_beku: profile.inventory.item_waktu_beku - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    setActivePowerUps(p => ({...p, waktuBeku: true}));
    setTimeout(() => setActivePowerUps(p => ({...p, waktuBeku: false})), 30000);
    broadcastPowerUp('item_waktu_beku');
  };
  const useSkorGanda = () => {
    if (!profile || !profile.inventory || profile.inventory.item_skor_ganda <= 0) return;
    const updatedInv = { ...profile.inventory, item_skor_ganda: profile.inventory.item_skor_ganda - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    setActivePowerUps(p => ({...p, skorGanda: true}));
    broadcastPowerUp('item_skor_ganda');
  };
  const useTerawangan = () => {
    if (!profile || !profile.inventory || profile.inventory.item_terawangan <= 0) return;
    const updatedInv = { ...profile.inventory, item_terawangan: profile.inventory.item_terawangan - 1 };
    updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
    setActivePowerUps(p => ({...p, terawangan: true}));
    broadcastPowerUp('item_terawangan');
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
    const initQuestions = async (data: any[]) => {
      if (mounted) {
        setQuestions(data);
        setLoadingQuestions(false);
        try {
          const id = await createSession(gameMode, data);
          if (mounted) setSessionId(id);
        } catch (err) {
          console.error("Failed to create quiz session:", err);
        }
      }
    };

    if (gameMode === 'catatansalah') {
      fetchProfile().then(p => {
        const data = p?.catatan_salah || [];
        if (data.length === 0) {
          navigate('/dashboard', { replace: true });
        } else {
          initQuestions(data);
        }
      });
    } else {
      fetchQuestionsFromSupabase(gameMode).then(initQuestions);
    }
    return () => { mounted = false; };
  }, [gameMode]);

  // Keep answers ref synced for auto-save
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // --- Auto-Save Sync ---
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      // Hitung skor tiap kategori dari answersRef
      let twkPts = 0, tiuPts = 0, tkpPts = 0;
      questions.forEach((q, idx) => {
        const ansId = answersRef.current[idx];
        if (ansId) {
          const opt = q.options.find((o: any) => o.id === ansId);
          if (opt) {
            if (q.category === 'TWK') twkPts += opt.score;
            else if (q.category === 'TIU') tiuPts += opt.score;
            else if (q.category === 'TKP') tkpPts += opt.score;
          }
        }
      });
      
      updateSession(sessionId, {
        currentIndex: currentQuestionIndex,
        answers: answersRef.current,
        score: totalScoreRef.current,
        twkScore: twkPts,
        tiuScore: tiuPts,
        tkpScore: tkpPts,
        timeSpent: TOTAL_TIME - timeLeft
      }).catch(err => console.error("Auto-save failed", err));
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId, currentQuestionIndex, timeLeft, questions]);
  // Derived values – safely computed after hooks (not hooks themselves)
  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions = questions.length;
  const progress = (timeLeft / TOTAL_TIME) * 100;
  const strokeDashoffset = ((100 - progress) / 100) * 113.097;
  const timerColor = timeLeft <= 10 ? 'text-skd-danger' : timeLeft <= 20 ? 'text-skd-accent' : 'text-skd-success';
  // Calculate score for a picked option (safe-guarded)
  const calcScore = (optionId: string): number => {
    if (!currentQuestion) return 0;
    const opt = currentQuestion.options.find((o: any) => o.id === optionId);
    let pts = opt?.score ?? 0;
    if (activePowerUps.skorGanda) {
      pts *= 2;
      setActivePowerUps(p => ({ ...p, skorGanda: false }));
    }
    return pts;
  };
  // --- Timer ---
  useEffect(() => {
    if (isGameOver || activePowerUps.waktuBeku) return;
    if (timeLeft <= 0) {
      if (gameMode === 'tryout') {
        finishTryout();
      } else {
        goNextOrFinish(totalScoreRef.current);
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isGameOver, gameMode]);
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
        const updates: any = {};
        if (energyCost > 0) {
          updates.energy = Math.max(0, profile.energy - energyCost);
          if (profile.energy >= 25) {
            updates.last_energy_update = new Date().toISOString();
          }
        }
        if (coinCost > 0) updates.coins = Math.max(0, profile.coins - coinCost);
        updateProfile(updates);
      }
      setIsEnergyDeducted(true);
    }

    if (gameMode === 'tryout') {
      // In tryout, user can change answer freely, no auto-advance
      setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionId }));
      return;
    }
    if (selected) return; // Prevent changing in normal modes
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionId }));
    const earned = calcScore(optionId);
    const isTKP = currentQuestion.category === 'TKP';
    const isCorrect = optionId === currentQuestion.correct;
    const isFullyCorrect = (!isTKP && isCorrect) || (isTKP && earned >= 50);

    // Supabase stats update dipindahkan ke Result.tsx agar dilakukan dalam satu kali API call
    // Survival: wrong = game over (TKP not applicable for survival)
    if (gameMode === 'survival' && ((!isTKP && !isCorrect) || (isTKP && earned < 50))) {
      if (!activePowerUps.secondChanceUsed) {
        if (profile?.inventory?.item_kesempatan_kedua > 0) {
          setActivePowerUps(p => ({...p, secondChanceUsed: true}));
          const updatedInv = { ...profile.inventory, item_kesempatan_kedua: profile.inventory.item_kesempatan_kedua - 1 };
          updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
          return;
        } else if (profile?.inventory?.item_shield > 0) {
          setActivePowerUps(p => ({...p, secondChanceUsed: true}));
          const updatedInv = { ...profile.inventory, item_shield: profile.inventory.item_shield - 1 };
          updateProfile({ inventory: updatedInv }).then(p => setProfile(p));
          return;
        }
      }
      setIsGameOver(true);
      setTimeout(() => {
        navigate('/result', { 
          state: { 
            score: currentQuestionIndex * 50 + earned, 
            mode: gameMode,
            sessionId,
            userAnswers: { ...answers, [currentQuestionIndex]: optionId },
            quizQuestions: questions
          } 
        });
      }, 1800);
      return;
    }
    // Update my score
    const newTotal = totalScore + earned;
    setTotalScore(newTotal);
    totalScoreRef.current = newTotal;
    // Floating reward
    if (earned > 0) {
      setShowRewardFloat({ pts: earned });
      setTimeout(() => setShowRewardFloat(null), 1200);
    }
    // Update live rank for PvP
    if (gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') {
      setLiveRanks(prev => {
        const updated = prev.map(r => r.isMe ? { ...r, score: r.score + earned } : r);
        return updated.sort((a, b) => b.score - a.score);
      });
      if (isRealtimePvP && channelRef.current) {
        channelRef.current.track({
          id: profile?.id,
          name: profile?.nickname || profile?.username || 'Anda',
          score: newTotal
        });
      }
      
      // Auto-advance in PvP/1v1 modes after 2 seconds for a fast-paced multiplayer experience!
      autoAdvanceTimer.current = setTimeout(() => {
        goNextOrFinish(newTotal);
      }, 2000);
    }
    // Auto advance removed, user must manually proceed after seeing Pembahasan
  };
  const finishTryout = () => {
    let finalScore = 0, twkScore = 0, tiuScore = 0, tkpScore = 0;
    
    // Supabase stats update dipindahkan ke Result.tsx

    questions.forEach((q, idx) => {
      const ansId = answers[idx];
      if (ansId) {
        const opt = q.options.find((o: any) => o.id === ansId);
        const pts = opt?.score ?? 0;
        finalScore += pts;
        if (q.category === 'TWK') twkScore += pts;
        else if (q.category === 'TIU') tiuScore += pts;
        else if (q.category === 'TKP') tkpScore += pts;
      }
    });
    navigate('/result', { 
      state: { 
        score: finalScore, 
        mode: gameMode,
        sessionId,
        twkScore,
        tiuScore,
        tkpScore,
        userAnswers: answers,
        quizQuestions: questions,
        doubtfulMap: doubtful
      } 
    });
  };
  const handleShowExplanation = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setShowExplanation(true);
  };
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
    } else {
      navigate('/result', { 
        state: { 
          score: scoreSnapshot, 
          mode: gameMode, 
          sessionId,
          liveRanks,
          userAnswers: answers,
          quizQuestions: questions
        } 
      });
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
      <div className="min-h-screen bg-skd-bg flex flex-col items-center justify-center p-6 text-center font-syne">
        <div className="w-16 h-16 bg-red-500/10 text-skd-danger rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
          <Battery size={32} className="text-red-500 fill-red-500/30 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-skd-text mb-2">Energi Anda Habis!</h2>
        <p className="text-xs text-skd-muted max-w-sm mb-6 leading-relaxed">
          Untuk menjaga kestabilan belajar, Anda memerlukan energi untuk bermain di mode kompetitif. Pulihkan energi Anda secara instan di Toko menggunakan koin, atau tunggu pemulihan otomatis (+1 energi setiap 15 menit).
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
          <Link
            to="/toko"
            className="px-6 py-3 bg-skd-accent hover:bg-yellow-400 text-[#0F0E17] font-bold rounded-xl shadow-md transition-colors text-center w-full"
          >
            Beli Energi di Toko
          </Link>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-skd-muted/10 hover:bg-skd-muted/20 text-skd-text font-bold rounded-xl transition-colors w-full"
          >
            Kembali ke Beranda
          </button>
        </div>
        {/* Tinta Hitam crisp overlay */}
        {tintaHitamActive && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md p-4 text-center">
            <div className="bg-[#1A1924]/95 border-2 border-red-500/30 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(239,68,68,0.4)] max-w-xs flex flex-col items-center gap-4 animate-bounce">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 text-3xl font-black shadow-inner">
                💀
              </div>
              <h3 className="text-xl font-black text-white">Efek Tinta Hitam!</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">Lawan mengaburkan layarmu. Tunggu 5 detik hingga tinta memudar...</p>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
        <div className="flex flex-col h-screen bg-skd-bg relative transition-colors">
      {/* Real-time PvP Notifications */}
      {pvpNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#8B5CF6]/95 border border-purple-500 text-white font-bold py-2 px-6 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.4)] backdrop-blur-md text-xs animate-bounce flex items-center gap-2">
          <Users size={14} className="text-[#F5A623]" />
          <span>{pvpNotification}</span>
        </div>
      )}
      {activePowerUps.waktuBeku && (
        <div className="pointer-events-none fixed inset-0 z-50 rounded-none"
          style={{ boxShadow: 'inset 0 0 80px 20px rgba(34,211,238,0.25)' }} />
      )}
      {/* Loading Screen */}
      {(loadingQuestions || !currentQuestion) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-skd-bg gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <h2 className="text-xl font-bold text-skd-text animate-pulse">Mempersiapkan Arena...</h2>
        </div>
      )}
      {/* Floating Score Reward */}
      <AnimatePresence>
        {showRewardFloat && (
          <motion.div
            key="reward"
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: 1, y: -80, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <span className="text-3xl font-black text-yellow-400 drop-shadow-xl">
              +{showRewardFloat.pts} pts
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main layout — only render when data is ready */}
      {currentQuestion && <div className={`flex flex-1 overflow-hidden ${(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'tryout') ? 'flex-row' : 'flex-col items-center'}`}>
        {/* === Quiz Panel === */}
        <div className="flex flex-col flex-1 h-full min-w-0 w-full max-w-5xl mx-auto">
          {/* Header */}
          <header className="p-4 flex items-center justify-between border-b border-skd-border bg-skd-card/60 backdrop-blur-sm z-10">
            <button onClick={() => setShowExitConfirm(true)} className="p-2 hover:bg-skd-muted/10 rounded-full transition-colors text-skd-text">
              <X size={20} />
            </button>
            <div className="flex-1 px-4">
              <div className="flex justify-between items-center text-xs mb-1.5 font-space font-bold text-skd-muted">
                <span>Soal {currentQuestionIndex + 1}{gameMode !== 'survival' && `/${totalQuestions}`}</span>
                <div className="flex items-center gap-2">
                  {gameMode === 'survival' && <span className="flex items-center gap-1 text-skd-danger bg-skd-danger/10 px-2 py-0.5 rounded-full"><Skull size={12} /> Survival</span>}
                  {gameMode === 'tryout'  && <span className="flex items-center gap-1 text-skd-premium bg-skd-premium/10 px-2 py-0.5 rounded-full"><Trophy size={12} /> Try Out</span>}
                  {(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full"><Users size={12} /> {gameMode === 'pvp1v1' ? '1v1 Duel' : 'PvP'}</span>}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    currentQuestion.category === 'TWK' ? 'bg-purple-500/10 text-purple-400' :
                    currentQuestion.category === 'TIU' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-orange-500/10 text-orange-400'
                  }`}>{currentQuestion.category}</span>
                </div>
              </div>
              <div className="h-1.5 bg-skd-muted/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-skd-premium rounded-full"
                  initial={{ width: `${(currentQuestionIndex / totalQuestions) * 100}%` }}
                  animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            {/* Circular Timer (or text for Tryout) */}
            <div className="flex items-center gap-2">
              <div className="relative w-16 h-11 flex items-center justify-center">
                {gameMode === 'tryout' ? (
                  <div className={`font-space font-bold text-xs bg-skd-card px-2 py-1 rounded border border-skd-border ${timerColor}`}>
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </div>
                ) : (
                  <>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" className="stroke-skd-muted/20" strokeWidth="3" />
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
                <button 
                  onClick={() => setShowSidebarMobile(true)} 
                  className="lg:hidden p-2 text-skd-text hover:bg-skd-muted/10 rounded-xl transition-colors shrink-0"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>
                    </header>
          {/* Quick Slots */}
          {gameMode !== 'tryout' && profile && (
            <div className="flex gap-2 px-4 py-2 border-b border-skd-border bg-skd-card/30 overflow-x-auto shrink-0">
              {profile.inventory?.item_5050 > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_5050') && (
                <button onClick={use5050} className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"><Scale size={12}/> 50:50 ({profile.inventory.item_5050})</button>
              )}
              {profile.inventory?.item_hint > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_hint') && (
                <button onClick={useHint} className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"><Lightbulb size={12}/> Bocoran Rumus ({profile.inventory.item_hint})</button>
              )}
              {profile.inventory?.item_waktu_beku > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_waktu_beku') && (
                <button onClick={useWaktuBeku} className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activePowerUps.waktuBeku ? 'bg-cyan-500/30 text-cyan-300' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'}`}><Clock size={12}/> Waktu Beku ({profile.inventory.item_waktu_beku})</button>
              )}
              {profile.inventory?.item_skor_ganda > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_skor_ganda') && (
                <button onClick={useSkorGanda} className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activePowerUps.skorGanda ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}><Zap size={12}/> Skor Ganda ({profile.inventory.item_skor_ganda})</button>
              )}
              {profile.inventory?.item_terawangan > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_terawangan') && (
                <button onClick={useTerawangan} className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 ${activePowerUps.terawangan ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}><Eye size={12}/> Terawangan ({profile.inventory.item_terawangan})</button>
              )}
              {profile.inventory?.item_tinta_hitam > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_tinta_hitam') && (
                <button onClick={useTintaHitam} className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0"><Skull size={12}/> Tinta Hitam ({profile.inventory.item_tinta_hitam})</button>
              )}
              {profile.inventory?.item_lompatan_kilat > 0 && ALLOWED_POWER_UPS[gameMode]?.includes('item_lompatan_kilat') && !lompatanKilatUsed && (
                <button onClick={useLompatanKilat} className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 shrink-0"><Zap size={12}/> Lompatan Kilat ({profile.inventory.item_lompatan_kilat})</button>
              )}
              {(profile.inventory?.item_kesempatan_kedua > 0 || profile.inventory?.item_shield > 0) && ALLOWED_POWER_UPS[gameMode]?.includes('item_kesempatan_kedua') && (
                <div className="px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 shrink-0"><Shield size={12}/> Perisai Aktif ({(profile.inventory.item_kesempatan_kedua || 0) + (profile.inventory.item_shield || 0)})</div>
              )}
            </div>
          )}
          {/* PvP: My rank badge (mobile, under header) */}
          {(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && (
            <div className="lg:hidden px-4 py-2 border-b border-skd-border bg-skd-card/30 flex items-center justify-between text-xs">
              <span className="text-skd-muted font-bold">Peringkat Saya:</span>
              <span className="font-black text-blue-500 flex items-center gap-1">
                #{myRankPosition}
                <span className="font-normal text-skd-muted">dari {liveRanks.length}</span>
              </span>
              <span className="font-space font-bold text-skd-text">{liveRanks.find(r => r.isMe)?.score ?? 0} pts</span>
            </div>
          )}
          {/* Question Body */}
          <main className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24 relative ${tintaHitamActive ? 'blur-md pointer-events-none transition-all duration-300' : 'transition-all duration-300'}`}>
            {/* Tinta Hitam overlay inside main is blurred, but let's make an overlay outside it to be sharp */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* TKP indicator */}
                {currentQuestion.category === 'TKP' && (
                  <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
                    <span className="font-bold">TKP — Pilih jawaban terbaik.</span>
                    <span className="text-skd-muted">Setiap pilihan memiliki bobot poin berbeda (10–50).</span>
                  </div>
                )}
                <div className="bg-skd-card p-5 md:p-7 rounded-2xl border border-skd-border shadow-sm">
                  <p className="text-base md:text-lg leading-relaxed text-skd-text font-medium" dangerouslySetInnerHTML={{ __html: cleanMathText(currentQuestion.text) }} />
                </div>
                {/* Bocoran Rumus Hint Box */}
                {showHint && currentQuestion.explanation && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl text-yellow-400 text-xs sm:text-sm font-medium leading-relaxed shadow-sm">
                    <span className="font-bold flex items-center gap-1.5 mb-1 text-skd-accent"><Lightbulb size={14}/> Petunjuk Rumus / Soal:</span>
                    <span dangerouslySetInnerHTML={{ __html: cleanMathText(currentQuestion.explanation.slice(0, 180) + '...') }} />
                  </div>
                )}
                <div className="space-y-2 md:space-y-3">
                  {currentQuestion.options.map((opt: any) => {
                    const isSelected = selected === opt.id;
                    
                    // Sembunyikan opsi tereliminasi oleh Power up 50:50
                    if (eliminatedOptions.includes(opt.id)) return null;
                    const isCorrect  = opt.id === currentQuestion.correct;
                    const showStatus = selected !== null;
                    const isTKP = currentQuestion.category === 'TKP';
                    let cardClass = 'bg-skd-card hover:bg-skd-muted/5 border-skd-border';
                    let markerClass = 'bg-skd-muted/10 text-skd-text';
                    
                    if (gameMode === 'tryout') {
                      if (isSelected) {
                        cardClass = 'bg-blue-500/15 border-blue-400';
                        markerClass = 'bg-blue-500 text-white';
                      }
                    } else if (showStatus) {
                      if (isTKP) {
                        if (isSelected) {
                          cardClass = 'bg-orange-500/15 border-orange-400';
                          markerClass = 'bg-orange-400 text-white';
                        }
                        else cardClass = 'bg-skd-card border-skd-border opacity-50';
                      } else {
                        if (isCorrect) {
                          cardClass = 'bg-skd-success/20 border-skd-success';
                          markerClass = 'bg-skd-success text-white';
                        }
                        else if (isSelected) {
                          cardClass = 'bg-skd-danger/20 border-skd-danger';
                          markerClass = 'bg-skd-danger text-white';
                        }
                        else cardClass = 'bg-skd-card border-skd-border opacity-40';
                      }
                    }
                                        const terawanganPercent = activePowerUps.terawangan ? (isCorrect ? Math.floor(Math.random() * 20) + 60 : Math.floor(Math.random() * 30)) : 0;
                    return (
                      <motion.button
                        key={opt.id}
                        whileTap={(!selected || gameMode === 'tryout') ? { scale: 0.98 } : {}}
                        onClick={() => handleSelect(opt.id)}
                        disabled={selected !== null && gameMode !== 'tryout'}
                        className={`w-full p-3.5 md:p-4 rounded-xl border text-left flex items-center gap-3 transition-all shadow-sm relative z-0 overflow-hidden ${cardClass}`}
                      >
                        {activePowerUps.terawangan && (
                          <div className="absolute left-0 bottom-0 top-0 bg-purple-500/10 -z-10 rounded-xl transition-all duration-1000" style={{ width: `${terawanganPercent}%` }} />
                        )}
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-space font-bold shrink-0 text-base ${markerClass}`}>
                          {opt.id}
                        </div>
                        <span className="flex-1 leading-snug text-sm md:text-base font-medium text-skd-text" dangerouslySetInnerHTML={{ __html: cleanMathText(opt.text) }} ></span>
                        {/* TKP score badge revealed after answering (not in tryout) */}
                        {showStatus && isTKP && gameMode !== 'tryout' && (
                          <span className={`ml-auto shrink-0 text-xs font-bold px-2 py-1 rounded-lg
                            ${opt.score === 50 ? 'bg-skd-success/20 text-skd-success' :
                              opt.score >= 30 ? 'bg-orange-500/15 text-orange-400' :
                              'bg-skd-muted/10 text-skd-muted'}`}>
                            {opt.score} pts
                          </span>
                        )}
                        {/* Score tag for TWK/TIU revealed after answering (not in tryout) */}
                        {showStatus && !isTKP && isCorrect && gameMode !== 'tryout' && (
                          <span className="ml-auto shrink-0 text-xs font-bold bg-skd-success/20 text-skd-success px-2 py-1 rounded-lg">50 pts</span>
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
                        <button
                          onClick={handleShowExplanation}
                          className="flex-1 py-3 bg-skd-primary/10 hover:bg-skd-primary/20 text-skd-primary rounded-xl font-bold text-sm transition-colors"
                        >
                          Lihat Pembahasan
                        </button>
                        <button
                          onClick={() => {
                            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                            goNextOrFinish(totalScoreRef.current);
                          }}
                          className="flex-1 py-3 bg-skd-primary hover:bg-skd-primary-hover text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                        >
                          Lanjut
                        </button>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl space-y-3"
                      >
                        <h4 className="font-bold text-blue-400">Pembahasan:</h4>
                        <p className="text-sm md:text-base text-skd-text leading-relaxed">
                          <MathCard explanation={cleanMathText(currentQuestion.explanation || "Pembahasan tidak tersedia untuk soal ini.")} category={currentQuestion.category} />
                        </p>
                        <button
                          onClick={() => {
                            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
                            goNextOrFinish(totalScoreRef.current);
                          }}
                          className="mt-4 w-full py-3 bg-skd-primary hover:bg-skd-primary-hover text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
                        >
                          Lanjut ke Soal Berikutnya
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}
                {/* Tryout Navigation Buttons */}
                {gameMode === 'tryout' && (
                  <div className="flex flex-col gap-4 pt-4 mt-6 border-t border-skd-border">
                    <div className="flex justify-end gap-2">
                      {selected && (
                        <button onClick={() => {
                          setAnswers(p => { const n = {...p}; delete n[currentQuestionIndex]; return n; });
                        }} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors shadow-sm">
                          Batalkan Jawaban
                        </button>
                      )}
                      <button onClick={() => setDoubtful(p => ({...p, [currentQuestionIndex]: !p[currentQuestionIndex]}))} className={`px-4 py-2 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 ${doubtful[currentQuestionIndex] ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20'}`}>
                        Ragu-Ragu
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="px-5 py-2.5 bg-skd-card border border-skd-border rounded-xl font-bold text-skd-text disabled:opacity-30 transition-all hover:bg-skd-muted/10"
                    >
                      Sebelumnya
                    </button>
                    
                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-5 py-2.5 bg-skd-primary hover:bg-skd-primary-hover text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
                      >
                        Selanjutnya
                      </button>
                    ) : (
                      <button
                        onClick={finishTryout}
                        className="px-6 py-2.5 bg-skd-success hover:bg-skd-success/90 text-white rounded-xl font-black shadow-lg shadow-skd-success/20 transition-all active:scale-95"
                      >
                        Kumpulkan Ujian
                      </button>
                    )}
                  </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        {/* === PvP Live Leaderboard Sidebar (desktop) === */}
        {(gameMode === 'pvp' || gameMode === 'pvp1v1' || gameMode === 'pvp_bot') && (
          <div className="hidden lg:flex flex-col w-64 xl:w-72 border-l border-skd-border bg-skd-card/40 backdrop-blur-sm">
            <div className="p-4 border-b border-skd-border">
              <h3 className="font-bold text-blue-400 flex items-center gap-2 text-sm">
                <Users size={16} /> Live Ranking
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <AnimatePresence>
                {liveRanks.map((rank, idx) => {
                  // const prevIdx = 0; // simplified
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <motion.div
                      key={rank.name}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                        ${rank.isMe
                          ? 'bg-blue-500/15 border-blue-500/40 shadow-md shadow-blue-500/10'
                          : 'bg-skd-bg/50 border-skd-border/50'}`}
                    >
                      <span className="text-base w-6 text-center">{medal}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${rank.isMe ? 'text-blue-400' : 'text-skd-text'}`}>
                          {rank.name}{rank.isMe && ' 👤'}
                        </p>
                        <p className="text-[10px] text-skd-muted font-space">{rank.score} pts</p>
                      </div>
                      {/* Score bar */}
                      <div className="w-10 h-1.5 bg-skd-muted/20 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${rank.isMe ? 'bg-blue-400' : 'bg-skd-muted/50'}`}
                          animate={{ width: `${Math.min((rank.score / 300) * 100, 100)}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {/* My score summary at bottom */}
            <div className="p-4 border-t border-skd-border bg-blue-500/5">
              <div className="text-center">
                <p className="text-[10px] text-skd-muted uppercase font-bold tracking-wider mb-1">Total Skor Anda</p>
                <p className="text-2xl font-black text-blue-400 font-space">{liveRanks.find(r => r.isMe)?.score ?? 0}</p>
                <p className="text-[10px] text-skd-muted mt-0.5">Soal {currentQuestionIndex + 1}/{totalQuestions}</p>
              </div>
            </div>
          </div>
        )}
        {/* === Try Out Sidebar (desktop & tablet) === */}
        {gameMode === 'tryout' && (
          <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-skd-border bg-skd-card/40 backdrop-blur-sm">
            <div className="p-4 border-b border-skd-border">
              <h3 className="font-bold text-skd-text flex items-center gap-2 text-sm">
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
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center justify-between w-full p-2 mb-2 bg-skd-muted/10 hover:bg-skd-muted/20 rounded-lg text-sm font-bold text-skd-text transition-colors"
                    >
                      <span>{cat}</span>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="grid grid-cols-5 gap-2 overflow-hidden"
                        >
                          {catQuestions.map(({ idx }) => {
                            const isAnswered = answers[idx] !== undefined;
                            const isCurrent = currentQuestionIndex === idx;
                            let btnClass = 'bg-skd-bg border-skd-border text-skd-muted hover:bg-skd-muted/20';
                            if (isCurrent) {
                              btnClass = 'bg-blue-500 text-white border-blue-500 shadow-md ring-2 ring-blue-500/50 ring-offset-1 ring-offset-skd-card';
                            } else if (doubtful[idx]) {
                              btnClass = 'bg-red-500 text-white border-red-600 shadow-sm';
                            } else if (isAnswered) {
                              btnClass = 'bg-skd-success text-white border-skd-success shadow-sm';
                            }
                            return (
                              <button
                                key={idx}
                                onClick={() => setCurrentQuestionIndex(idx)}
                                className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-bold transition-all ${btnClass}`}
                              >
                                {idx + 1}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-skd-border bg-skd-bg">
              <button
                onClick={finishTryout}
                className="w-full py-3 bg-skd-success hover:bg-skd-success/90 text-white rounded-xl font-black shadow-lg shadow-skd-success/20 transition-all active:scale-95"
              >
                Kumpulkan Ujian
              </button>
            </div>
          </div>
        )}
        {/* === Try Out Sidebar (mobile drawer) === */}
        <AnimatePresence>
          {gameMode === 'tryout' && showSidebarMobile && (
            <>
              {/* Overlay Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSidebarMobile(false)}
                className="fixed inset-0 bg-black z-40 lg:hidden"
              />
              
              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-80 bg-skd-card border-l border-skd-border z-50 flex flex-col lg:hidden"
              >
                <div className="p-4 border-b border-skd-border flex items-center justify-between">
                  <h3 className="font-bold text-skd-text flex items-center gap-2 text-sm">
                    Navigasi Soal
                  </h3>
                  <button 
                    onClick={() => setShowSidebarMobile(false)}
                    className="p-1 hover:bg-skd-muted/10 rounded-full transition-colors text-skd-text"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {['TWK', 'TIU', 'TKP'].map(cat => {
                    const catQuestions = questions.map((q, idx) => ({ q, idx })).filter(item => item.q.category === cat);
                    if (catQuestions.length === 0) return null;
                    const isOpen = openCategories[cat];
                    return (
                      <div key={cat} className="mb-4">
                        <button
                          onClick={() => toggleCategory(cat)}
                          className="flex items-center justify-between w-full p-2 mb-2 bg-skd-muted/10 hover:bg-skd-muted/20 rounded-lg text-sm font-bold text-skd-text transition-colors"
                        >
                          <span>{cat}</span>
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="grid grid-cols-5 gap-2 overflow-hidden"
                            >
                              {catQuestions.map(({ idx }) => {
                                const isAnswered = answers[idx] !== undefined;
                                const isCurrent = currentQuestionIndex === idx;
                                let btnClass = 'bg-skd-bg border-skd-border text-skd-muted hover:bg-skd-muted/20';
                                if (isCurrent) {
                                  btnClass = 'bg-blue-500 text-white border-blue-500 shadow-md ring-2 ring-blue-500/50 ring-offset-1 ring-offset-skd-card';
                                } else if (doubtful[idx]) {
                                  btnClass = 'bg-red-500 text-white border-red-600 shadow-sm';
                                } else if (isAnswered) {
                                  btnClass = 'bg-skd-success text-white border-skd-success shadow-sm';
                                }
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setCurrentQuestionIndex(idx);
                                      setShowSidebarMobile(false);
                                    }}
                                    className={`w-10 h-10 rounded-md border flex items-center justify-center text-xs font-bold transition-all ${btnClass}`}
                                  >
                                    {idx + 1}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
                
                <div className="p-4 border-t border-skd-border bg-skd-bg">
                  <button
                    onClick={() => {
                      setShowSidebarMobile(false);
                      finishTryout();
                    }}
                    className="w-full py-3 bg-skd-success hover:bg-skd-success/90 text-white rounded-xl font-black shadow-lg shadow-skd-success/20 transition-all active:scale-95"
                  >
                    Kumpulkan Ujian
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>}
      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowExitConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-skd-bg border border-skd-border rounded-3xl p-6 md:p-8 max-w-sm w-full relative z-10 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 text-skd-danger rounded-2xl flex items-center justify-center mb-6 mx-auto border border-red-500/20">
                <X size={32} />
              </div>
              <h2 className="text-xl font-black text-center text-skd-text mb-3">Yakin Ingin Keluar?</h2>
              <p className="text-sm text-center text-skd-muted mb-8 leading-relaxed">
                {!isEnergyDeducted 
                  ? "Kuis belum selesai. Jika Anda keluar sekarang, biaya permainan (energi/koin) Anda tidak akan terpotong."
                  : "Kuis belum selesai. Anda sudah menjawab soal sehingga biaya permainan sudah terpotong. Progress tidak akan tersimpan!"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 px-4 bg-skd-muted/10 hover:bg-skd-muted/20 text-skd-text font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    if (sessionId) abandonSession(sessionId);
                    navigate('/');
                  }}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
                >
                  Ya, Keluar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}