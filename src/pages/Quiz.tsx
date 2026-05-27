import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Trophy, Skull, Users, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { fetchQuestionsFromSupabase } from '../lib/supabase';

// --- Dummy PvP Players for simulation ---
const DUMMY_PLAYERS = [
  { name: 'Player44', baseSpeed: 0.7 },
  { name: 'ASN_Pro',  baseSpeed: 0.85 },
  { name: 'JagoanSkd', baseSpeed: 0.5 },
  { name: 'Mager',    baseSpeed: 0.3 },
];

type RankEntry = { name: string; score: number; isMe?: boolean; delta?: number };

export default function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const gameMode = location.state?.mode || 'latihan';
  const opponentName = location.state?.opponent || 'ASN_Pro';
  const TOTAL_TIME = gameMode === 'survival' ? 20 : gameMode === 'tryout' ? 110 * 60 : 45;

  // --- Quiz state ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const selected = answers[currentQuestionIndex] || null;
  const [isGameOver, setIsGameOver] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [showRewardFloat, setShowRewardFloat] = useState<{ pts: number } | null>(null);
  
  // --- Explanation state ---
  const [showExplanation, setShowExplanation] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- PvP live rank state ---
  const [liveRanks, setLiveRanks] = useState<RankEntry[]>(() => {
    if (gameMode === 'pvp1v1') {
      return [
        { name: 'Anda', score: 0, isMe: true },
        { name: opponentName, score: 0 }
      ];
    }
    return [
      { name: 'Anda', score: 0, isMe: true },
      ...DUMMY_PLAYERS.map(p => ({ name: p.name, score: 0 }))
    ];
  });
  const [myRankPosition, setMyRankPosition] = useState(1);
  const totalScoreRef = useRef(0); // keep a ref so setTimeout closures can read latest value

  // Fetch questions on mount
  useEffect(() => {
    let mounted = true;
    fetchQuestionsFromSupabase(gameMode).then(data => {
      if (mounted) {
        setQuestions(data);
        setLoadingQuestions(false);
      }
    });
    return () => { mounted = false; };
  }, [gameMode]);

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
    return opt?.score ?? 0;
  };

  // --- Timer ---
  useEffect(() => {
    if (isGameOver) return;
    if (gameMode !== 'tryout' && selected) return; // Pause timer in normal modes when answered

    if (timeLeft <= 0) {
      if (gameMode === 'tryout') {
        finishTryout();
      } else {
        goNextOrFinish(0); // Auto-skip
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, selected, isGameOver, gameMode]);

  // --- Simulate PvP bots answering in real-time ---
  useEffect(() => {
    if (gameMode !== 'pvp' && gameMode !== 'pvp1v1') return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    const activePlayers = gameMode === 'pvp1v1'
      ? [{ name: opponentName, baseSpeed: 0.75 }]
      : DUMMY_PLAYERS;

    activePlayers.forEach(player => {
      // Each bot answers at a random time within the round
      const delay = Math.floor((1 - player.baseSpeed + Math.random() * 0.3) * TOTAL_TIME * 1000);
      const t = setTimeout(() => {
        // Bot picks a random option
        if (!currentQuestion) return;
        const opts = currentQuestion.options;
        const picked = opts[Math.floor(Math.random() * opts.length)];
        const botPts = currentQuestion.category === 'TKP' ? picked.score : (picked.id === currentQuestion.correct ? 50 : 0);

        setLiveRanks(prev => {
          const updated = prev.map(r => r.name === player.name ? { ...r, score: r.score + botPts } : r);
          return updated.sort((a, b) => b.score - a.score);
        });
      }, Math.min(delay, (TOTAL_TIME - 1) * 1000));

      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [currentQuestionIndex, gameMode]);

  // Sync my rank position when liveRanks changes
  useEffect(() => {
    const pos = liveRanks.findIndex(r => r.isMe) + 1;
    setMyRankPosition(pos);
  }, [liveRanks]);

  // --- Answer handler ---
  const handleSelect = (optionId: string) => {
    if (isGameOver) return;
    if (!currentQuestion) return;

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

    // Survival: wrong = game over (TKP not applicable for survival)
    if (gameMode === 'survival' && !isTKP && !isCorrect) {
      setIsGameOver(true);
      setTimeout(() => {
        navigate('/result', { state: { score: currentQuestionIndex * 50, mode: gameMode } });
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
    if (gameMode === 'pvp' || gameMode === 'pvp1v1') {
      setLiveRanks(prev => {
        const updated = prev.map(r => r.isMe ? { ...r, score: r.score + earned } : r);
        return updated.sort((a, b) => b.score - a.score);
      });
    }

    // Auto advance if not tryout mode (so they have time to click Pembahasan)
    autoAdvanceTimer.current = setTimeout(() => goNextOrFinish(newTotal), 3000); // 3s before auto next
  };

  const finishTryout = () => {
    let finalScore = 0;
    questions.forEach((q, idx) => {
      const ansId = answers[idx];
      if (ansId) {
        const opt = q.options.find((o: any) => o.id === ansId);
        finalScore += opt?.score ?? 0;
      }
    });
    navigate('/result', { state: { score: finalScore, mode: gameMode } });
  };

  const handleShowExplanation = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setShowExplanation(true);
  };

  const goNextOrFinish = (scoreSnapshot: number) => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowExplanation(false);
      if (gameMode !== 'tryout') setTimeLeft(TOTAL_TIME);
    } else {
      navigate('/result', { state: { score: scoreSnapshot, mode: gameMode, liveRanks } });
    }
  };

  // --- Score label helper ---
  const scoreBadge = (optionId: string) => {
    if (!currentQuestion) return null;
    const isTKP = currentQuestion.category === 'TKP';
    if (!isTKP) return null;
    const pts = calcScore(optionId);
    return pts;
  };

  return (
    <div className="flex flex-col h-screen bg-skd-bg relative transition-colors">
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
      {currentQuestion && <div className={`flex flex-1 overflow-hidden ${(gameMode === 'pvp' || gameMode === 'pvp1v1') ? 'flex-row' : 'flex-col items-center'}`}>

        {/* === Quiz Panel === */}
        <div className="flex flex-col flex-1 h-full min-w-0">
          {/* Header */}
          <header className="p-4 flex items-center justify-between border-b border-skd-border bg-skd-card/60 backdrop-blur-sm z-10">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-skd-muted/10 rounded-full transition-colors text-skd-text">
              <X size={20} />
            </button>

            <div className="flex-1 px-4">
              <div className="flex justify-between items-center text-xs mb-1.5 font-space font-bold text-skd-muted">
                <span>Soal {currentQuestionIndex + 1}{gameMode !== 'survival' && `/${totalQuestions}`}</span>
                <div className="flex items-center gap-2">
                  {gameMode === 'survival' && <span className="flex items-center gap-1 text-skd-danger bg-skd-danger/10 px-2 py-0.5 rounded-full"><Skull size={12} /> Survival</span>}
                  {gameMode === 'tryout'  && <span className="flex items-center gap-1 text-skd-premium bg-skd-premium/10 px-2 py-0.5 rounded-full"><Trophy size={12} /> Try Out</span>}
                  {(gameMode === 'pvp' || gameMode === 'pvp1v1') && <span className="flex items-center gap-1 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full"><Users size={12} /> {gameMode === 'pvp1v1' ? '1v1 Duel' : 'PvP'}</span>}
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
            <div className="relative w-11 h-11 flex items-center justify-center">
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
          </header>

          {/* PvP: My rank badge (mobile, under header) */}
          {(gameMode === 'pvp' || gameMode === 'pvp1v1') && (
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
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24">
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
                  <p className="text-base md:text-lg leading-relaxed text-skd-text font-medium">{currentQuestion.text}</p>
                </div>

                <div className="space-y-2 md:space-y-3">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selected === opt.id;
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

                    return (
                      <motion.button
                        key={opt.id}
                        whileTap={(!selected || gameMode === 'tryout') ? { scale: 0.98 } : {}}
                        onClick={() => handleSelect(opt.id)}
                        disabled={selected !== null && gameMode !== 'tryout'}
                        className={`w-full p-3.5 md:p-4 rounded-xl border text-left flex items-center gap-3 transition-all shadow-sm ${cardClass}`}
                      >
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-space font-bold shrink-0 text-base ${markerClass}`}>
                          {opt.id}
                        </div>
                        <span className="flex-1 leading-snug text-sm md:text-base font-medium text-skd-text">{opt.text}</span>

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
                      <button
                        onClick={handleShowExplanation}
                        className="w-full py-3 bg-skd-primary/10 hover:bg-skd-primary/20 text-skd-primary rounded-xl font-bold text-sm transition-colors"
                      >
                        Lihat Pembahasan Soal
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-xl space-y-3"
                      >
                        <h4 className="font-bold text-blue-400">Pembahasan:</h4>
                        <p className="text-sm md:text-base text-skd-text leading-relaxed">
                          {currentQuestion.explanation || 'Pembahasan tidak tersedia untuk soal ini.'}
                        </p>
                        <button
                          onClick={() => goNextOrFinish(totalScoreRef.current)}
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
                  <div className="flex justify-between items-center pt-4 mt-6 border-t border-skd-border">
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
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* === PvP Live Leaderboard Sidebar (desktop) === */}
        {(gameMode === 'pvp' || gameMode === 'pvp1v1') && (
          <div className="hidden lg:flex flex-col w-64 xl:w-72 border-l border-skd-border bg-skd-card/40 backdrop-blur-sm">
            <div className="p-4 border-b border-skd-border">
              <h3 className="font-bold text-blue-400 flex items-center gap-2 text-sm">
                <Users size={16} /> Live Ranking
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <AnimatePresence>
                {liveRanks.map((rank, idx) => {
                  const prevIdx = 0; // simplified
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
      </div>}
    </div>
  );
}
