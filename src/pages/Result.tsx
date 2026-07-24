import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Coins, Zap, Award, AlertTriangle, CheckCircle, XCircle, Circle, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import MathCard from '../components/MathCard';

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

// Interfaces diletakkan di module scope agar bisa dipakai QuickReviewSummary
interface Option {
  id: string;
  text?: string;
  points?: number;
  score?: number;
}
interface QuizQuestion {
  id: string;
  text?: string;
  category: string;
  correct?: string;
  explanation?: string;
  options?: Option[];
}
interface QuizResultData {
  score: number;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  passed_twk: boolean;
  passed_tiu: boolean;
  passed_tkp: boolean;
  passed_overall: boolean;
  mode?: string;
  coins_earned?: number;
  xp_earned?: number;
  questions_json?: QuizQuestion[];
  answers_json?: Record<string, string>;
  package_id?: string;
}

// Komponen ringkasan pembahasan yang ditampilkan langsung di halaman Result
function QuickReviewSummary({
  questions,
  userAnswers,
  isTryout,
}: {
  questions: QuizQuestion[];
  userAnswers: Record<string, string>;
  isTryout: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Batasi preview ke 5 soal, sisanya toggle
  const PREVIEW_COUNT = 5;
  const visibleQuestions = expanded ? questions : questions.slice(0, PREVIEW_COUNT);

  // Normalise key: answers_json bisa pakai index string "0","1",... atau question id
  const getAnswer = (q: QuizQuestion, i: number): string | undefined =>
    userAnswers?.[String(i)] ?? userAnswers?.[q.id] ?? undefined;

  const getStatus = (q: QuizQuestion, i: number): 'correct' | 'wrong' | 'empty' => {
    const ansId = getAnswer(q, i);
    if (!ansId) return 'empty';
    if (q.category === 'TKP') {
      const opt = q.options?.find((o) => o.id === ansId);
      return (opt?.score ?? 0) >= 5 ? 'correct' : 'wrong';
    }
    return ansId === q.correct ? 'correct' : 'wrong';
  };

  const getCategoryColor = (cat: string) => {
    if (cat === 'TWK') return 'text-purple-500 bg-purple-50 border-purple-200';
    if (cat === 'TIU') return 'text-blue-500 bg-blue-50 border-blue-200';
    return 'text-orange-500 bg-orange-50 border-orange-200';
  };

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-fg uppercase tracking-wider">
          Ringkasan Jawaban
        </h3>
        <span className="text-xs text-fg-muted font-bold">
          {questions.length} soal{isTryout ? ' (tryout)' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {visibleQuestions.map((q, i) => {
          const status = getStatus(q, i);
          const ansId = getAnswer(q, i);
          const selectedOpt = q.options?.find((o) => o.id === ansId);
          const correctOpt = q.options?.find((o) => o.id === q.correct);
          const hasExplanation = !!q.explanation;

          return (
            <QuickReviewItem
              key={q.id ?? i}
              index={i}
              question={q}
              status={status}
              selectedOpt={selectedOpt}
              correctOpt={correctOpt}
              hasExplanation={hasExplanation}
              getCategoryColor={getCategoryColor}
            />
          );
        })}
      </div>

      {questions.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-xs font-bold text-fg-muted hover:bg-surface active:scale-[0.99] transition-all"
        >
          {expanded ? (
            <><ChevronUp size={14} /> Sembunyikan</>
          ) : (
            <><ChevronDown size={14} /> Tampilkan {questions.length - PREVIEW_COUNT} soal lainnya</>
          )}
        </button>
      )}
    </div>
  );
}

// Item per-soal dengan toggle untuk menampilkan explanation
function QuickReviewItem({
  index,
  question,
  status,
  selectedOpt,
  correctOpt,
  hasExplanation,
  getCategoryColor,
}: {
  index: number;
  question: QuizQuestion;
  status: 'correct' | 'wrong' | 'empty';
  selectedOpt?: Option;
  correctOpt?: Option;
  hasExplanation: boolean;
  getCategoryColor: (cat: string) => string;
}) {
  const [showExplanation, setShowExplanation] = useState(false);

  const statusConfig = {
    correct: { icon: <CheckCircle size={15} className="text-success" />, bg: 'bg-success-subtle border-success' },
    wrong:   { icon: <XCircle size={15} className="text-danger" />,    bg: 'bg-danger-subtle border-danger' },
    empty:   { icon: <Circle size={15} className="text-fg-muted" />,    bg: 'bg-surface-subtle border-border' },
  };

  const { icon, bg } = statusConfig[status];

  return (
    <div className={`rounded-xl border p-3 ${bg} transition-all`}>
      <div className="flex items-start gap-2.5">
        {/* Status icon */}
        <div className="mt-0.5 shrink-0">{icon}</div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-fg-muted">#{index + 1}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${getCategoryColor(question.category)}`}>
              {question.category}
            </span>
            {question.category === 'TKP' && selectedOpt && (
              <span className="text-[9px] text-fg-muted font-bold ml-1">
                Skor: {selectedOpt.score ?? selectedOpt.points ?? 0}
              </span>
            )}
          </div>

          {/* Teks soal — maks 2 baris */}
          {question.text && (
            <MathCard
              explanation={question.text}
              category={question.category}
            />
          )}

          {/* Jawaban user vs benar (hanya untuk wrong/empty di TWK & TIU) */}
          {status !== 'correct' && question.category !== 'TKP' && (
            <div className="flex flex-col gap-0.5 mt-1">
              {status === 'wrong' && selectedOpt && (
                <div className="flex items-center gap-1 text-[10px] text-danger font-bold">
                  <XCircle size={10} />
                  <span>Jawabanmu: {selectedOpt.text || selectedOpt.id}</span>
                </div>
              )}
              {status === 'empty' && (
                <div className="flex items-center gap-1 text-[10px] text-fg-muted font-bold">
                  <Circle size={10} />
                  <span>Tidak dijawab</span>
                </div>
              )}
              {correctOpt && (
                <div className="flex items-center gap-1 text-[10px] text-success font-bold">
                  <CheckCircle size={10} />
                  <span>Kunci: {correctOpt.text || correctOpt.id}</span>
                </div>
              )}
            </div>
          )}

          {/* Toggle explanation jika ada */}
          {hasExplanation && (
            <button
              onClick={() => setShowExplanation((v) => !v)}
              className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-600"
            >
              <BookOpen size={11} />
              {showExplanation ? 'Sembunyikan pembahasan' : 'Lihat pembahasan'}
              {showExplanation ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}

          {/* Explanation text */}
          {showExplanation && question.explanation && (
            <div className="mt-2 p-2.5 rounded-lg bg-white/70 border border-blue-100">
              <MathCard
                explanation={question.explanation}
                category={question.category}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Result() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
    const [resultData, setResultData] = useState<QuizResultData | null>(null);

    useEffect(() => {
    if (!attemptId) {
      setError('Attempt ID tidak ditemukan');
      setLoading(false);
      return;
    }

    const loadResult = async () => {
      setLoading(true);
      try {
        // Jalankan parallel — tidak ada dependency antar keduanya
        let data = null;
        let resultError = null;
        let retries = 3;

        while (retries > 0) {
          // ponytail: select kolom spesifik — hindari transfer payload berlebih
                    const res = await supabase!
                      .from('quiz_results')
                      .select('id,session_id,mode,score,twk_score,tiu_score,tkp_score,passed_twk,passed_tiu,passed_tkp,passed_overall,coins_earned,xp_earned,answers_json,questions_json,package_id,created_at')
                      .or(`id.eq.${attemptId},session_id.eq.${attemptId}`)
                      .limit(1)
                      .maybeSingle();

          data = res.data;
          resultError = res.error;

          if (data && !resultError) break;

          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (resultError) throw resultError;
        setResultData(data);
      } catch (err: any) {
        console.error('Failed to load result:', err);
        setError(`Gagal memuat hasil kuis. Detail: ${err.message || JSON.stringify(err)}`);
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center font-syne">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-fg mb-2">Memuat Hasil...</h2>
      </div>
    );
  }

  if (error || !resultData) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="text-danger" size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-fg mb-2">
              {error || 'Data Tidak Ditemukan'}
            </h2>
            <p className="text-sm text-fg-muted">
              Tidak dapat memuat hasil kuis. Data mungkin sudah kadaluarsa atau Anda tidak memiliki akses.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/')} className="w-full">
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  const gameMode = resultData.mode || 'latihan';
  const isTryout = gameMode === 'tryout';
  
    const score = resultData.score || 0;
  // Skor kategori diambil langsung dari DB — akurat karena dihitung server-side di completeSession
  const twkScore = resultData.twk_score ?? 0;
  const tiuScore = resultData.tiu_score ?? 0;
  const tkpScore = resultData.tkp_score ?? 0;

  // answers_json disimpan dengan key string (dari Object.entries di completeSession)
  const userAnswers: Record<string, string> = resultData.answers_json || {};
  const quizQuestions = resultData.questions_json || [];

  const earnedCoins = resultData.coins_earned || 0;
  const gainedXP = resultData.xp_earned || 0;

  // PvP Support
  const receivedRanks: { name: string; score: number; isMe?: boolean }[] = location.state?.liveRanks || [];

    const totalQuestions = quizQuestions?.length || 0;
    // answers_json key bisa berupa index angka ("0", "1", ...) — normalisasi ke string
    const correctCount = quizQuestions?.filter((q: QuizQuestion, i: number) => {
      const ansId = userAnswers?.[String(i)] ?? userAnswers?.[i as unknown as string];
      if (!ansId) return false;
      if (q.category === 'TKP') {
        const opt = q.options?.find((o: Option) => o.id === ansId);
        // threshold TKP >= 5 (skala 0-5), konsisten dengan finishTryout di Quiz.tsx
        return (opt?.score ?? 0) >= 5;
      }
      return ansId === q.correct;
    }).length || 0;
    const emptyCount = quizQuestions?.filter((_q: QuizQuestion, i: number) =>
      !userAnswers?.[String(i)] && !userAnswers?.[i as unknown as string]
    ).length || 0;
    const incorrectCount = totalQuestions - correctCount - emptyCount;

  const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const circleCircumference = 2 * Math.PI * 120;
  const strokeDashoffset = circleCircumference - (percentage / 100) * circleCircumference;

  // PvP: hanya 2 player dari liveRanks. Jangan fallback dummy liga.
  const finalRanks = receivedRanks.length > 0
    ? [...receivedRanks].sort((a, b) => b.score - a.score)
    : [{ name: 'Anda', score: score, isMe: true }];

  // Dynamic Passing Grade Ambang Batas Calculations based on questions count
  const twkQuestionsCount = quizQuestions?.filter((q: QuizQuestion) => q.category === 'TWK').length || 30;
  const tiuQuestionsCount = quizQuestions?.filter((q: QuizQuestion) => q.category === 'TIU').length || 35;
  const tkpQuestionsCount = quizQuestions?.filter((q: QuizQuestion) => q.category === 'TKP').length || 45;

  // Scale passing grades proportionally if question count is less than CPNS standard
  const twkPassThreshold = twkQuestionsCount < 30 ? Math.ceil(twkQuestionsCount * 0.433 * 5) : 65;
  const tiuPassThreshold = tiuQuestionsCount < 35 ? Math.ceil(tiuQuestionsCount * 0.457 * 5) : 80;
  const tkpPassThreshold = tkpQuestionsCount < 45 ? Math.ceil(tkpQuestionsCount * 0.293 * 5) : 166;

  const isTwkPass = twkScore >= twkPassThreshold;
  const isTiuPass = tiuScore >= tiuPassThreshold;
  const isTkpPass = tkpScore >= tkpPassThreshold;
  const isLulusSkd = isTwkPass && isTiuPass && isTkpPass;

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center transition-colors pb-24">
      <div className="w-full max-w-3xl p-4 md:p-8 flex flex-col items-center pt-8 md:pt-12 space-y-8 md:space-y-12">

                {/* Header Badges */}
        <div
          style={{ animation: 'fadeInScale 0.4s ease-out' }}
          className="bg-gradient-to-r p-[2px] rounded-full shadow-lg from-skd-premium to-skd-accent"
        >
                    <div className="bg-bg px-6 py-2 rounded-full font-bold tracking-widest text-xs text-fg uppercase">
            {isTryout ? 'TRY OUT CPNS SELESAI' : (gameMode === 'pvp' || gameMode === 'pvp1v1') ? 'PvP BATTLE SELESAI' : gameMode === 'survival' ? 'SURVIVAL BERAKHIR' : 'LATIHAN SELESAI'}
          </div>
        </div>

                {/* Passing Grade Banner for Try Out */}
        {isTryout && (
          <div
            style={{ animation: 'slideDown 0.35s ease-out' }}
            className={`w-full max-w-xl rounded-3xl p-[2px] overflow-hidden shadow-2xl relative ${isLulusSkd
              ? 'bg-gradient-to-r from-skd-success via-emerald-400 to-green-500 shadow-sm'
              : 'bg-gradient-to-r from-skd-danger via-rose-500 to-red-600 shadow-sm/20'
              }`}
          >
            <div className="bg-surface shadow-sm rounded-[22px] p-6 text-center space-y-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${isLulusSkd ? 'bg-success-subtle border-success/20 text-success' : 'bg-danger-subtle border-danger/20 text-danger'
                }`}>
                {isLulusSkd ? <Award size={36} /> : <AlertTriangle size={36} />}
              </div>
              <div>
                <h2 className={`text-2xl font-black ${isLulusSkd ? 'text-success' : 'text-danger font-bold'}`}>
                  {isLulusSkd ? 'LULUS AMBANG BATAS!' : 'BELUM MEMENUHI AMBANG BATAS'}
                </h2>
                <p className="text-xs text-fg-muted mt-2 leading-relaxed max-w-md mx-auto">
                  {isLulusSkd
                    ? 'Luar biasa! Skor perolehan Anda pada semua kategori (TWK, TIU, TKP) berhasil melewati ambang batas nasional Seleksi Kompetensi Dasar BKN!'
                    : 'Jangan berkecil hati. Masih ada kategori nilai yang berada di bawah standar kelulusan nasional. Mari tinjau kembali pembahasan soal dan perbanyak latihan!'}
                </p>
              </div>
                        </div>
          </div>
        )}

                {/* PvP Leaderboard podiums */}
        {(gameMode === 'pvp' || gameMode === 'pvp1v1') ? (
          <div className="w-full max-w-xl space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-center text-fg mb-8">Papan Peringkat Akhir</h2>

            <div className="flex items-end justify-center gap-2 md:gap-4 h-48 mb-12">
              {[finalRanks[1], finalRanks[0], finalRanks[2]].map((rank, idx) => {
                const isFirst = idx === 1;
                const isSecond = idx === 0;
                if (!rank) return null;

                const height = isFirst ? 'h-40' : isSecond ? 'h-32' : 'h-24';
                const color = isFirst ? 'bg-warning shadow-yellow-500/20' : isSecond ? 'bg-gray-300 shadow-white/10' : 'bg-warning shadow-amber-500/10';

                                return (
                  <div
                    key={rank.name}
                    style={{ animation: `slideUp 0.4s ease-out ${idx * 0.1}s both` }}
                    className="flex flex-col items-center flex-1"
                  >
                    <span className="text-sm md:text-base font-bold text-fg mb-3 truncate max-w-[120px]">{rank.name}</span>
                    <div className={`w-full ${height} ${color} rounded-t-2xl shadow-lg border border-white/5 flex flex-col justify-center items-center text-skd-bg`}>
                      <span className="text-4xl md:text-5xl font-black font-space">{isFirst ? '1' : isSecond ? '2' : '3'}</span>
                      <span className="text-sm md:text-base font-black font-space mt-1">{rank.score} pts</span>
                                        </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              {finalRanks.slice(3).map((rank, index) => (
                <div key={rank.name} className={`flex items-center justify-between p-4 rounded-xl border ${rank.isMe ? 'bg-info/10 border-info' : 'bg-surface border-border'}`}>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-fg-muted w-6 text-center">{index + 4}</span>
                    <span className={`font-bold ${rank.isMe ? 'text-primary' : 'text-fg'}`}>{rank.name}</span>
                  </div>
                  <span className="font-space font-bold text-fg-muted">{rank.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center relative mb-8 mt-6">
            <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] -z-10 rounded-full" />
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 256 256">
                <circle cx="128" cy="128" r="120" fill="none" stroke="currentColor" strokeWidth="16" className="text-destructive" />
                <circle
                    cx="128" cy="128" r="120" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round"
                    className="text-emerald-500"
                    style={{
                      strokeDasharray: circleCircumference,
                      strokeDashoffset,
                      transition: 'stroke-dashoffset 1.5s ease-out'
                    }}
                  />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-fg font-space"><AnimatedCounter end={score} /></span>
                <span className="text-xs font-bold text-fg-muted tracking-widest mt-1">TOTAL SKOR</span>
              </div>
            </div>
          </div>
        )}

        {/* Radar Chart SVG for Tryout Analysis */}
        {isTryout && (
          <div className="w-full max-w-xl bg-surface border border-border rounded-3xl p-6 flex flex-col items-center shadow-sm gap-4 mb-6">
            <h3 className="text-xs md:text-sm font-bold text-fg uppercase tracking-wider font-space">Analisis Rapor Kompetensi CAT</h3>
            
            <div className="relative w-64 h-64 flex items-center justify-center">
              {(() => {
                const cx = 128;
                const cy = 128;
                const r = 85;
                
                const getPt = (angleDeg: number, val: number, max: number) => {
                  const factor = Math.min(1, Math.max(0, val / (max || 1)));
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const x = cx + r * factor * Math.cos(angleRad);
                  const y = cy + r * factor * Math.sin(angleRad);
                  return { x, y };
                };
                
                const maxTWK = twkQuestionsCount * 5;
                const maxTIU = tiuQuestionsCount * 5;
                const maxTKP = tkpQuestionsCount * 5;
                
                const twkOuter = getPt(-90, maxTWK, maxTWK);
                const tiuOuter = getPt(30, maxTIU, maxTIU);
                const tkpOuter = getPt(150, maxTKP, maxTKP);
                
                const grids = [0.25, 0.5, 0.75, 1.0].map(scale => {
                  const pTWK = getPt(-90, maxTWK * scale, maxTWK);
                  const pTIU = getPt(30, maxTIU * scale, maxTIU);
                  const pTKP = getPt(150, maxTKP * scale, maxTKP);
                  return `${pTWK.x},${pTWK.y} ${pTIU.x},${pTIU.y} ${pTKP.x},${pTKP.y}`;
                });
                
                const twkMin = getPt(-90, twkPassThreshold, maxTWK);
                const tiuMin = getPt(30, tiuPassThreshold, maxTIU);
                const tkpMin = getPt(150, tkpPassThreshold, maxTKP);
                const minPoints = `${twkMin.x},${twkMin.y} ${tiuMin.x},${tiuMin.y} ${tkpMin.x},${tkpMin.y}`;
                
                const twkUser = getPt(-90, twkScore, maxTWK);
                const tiuUser = getPt(30, tiuScore, maxTIU);
                const tkpUser = getPt(150, tkpScore, maxTKP);
                const userPoints = `${twkUser.x},${twkUser.y} ${tiuUser.x},${tiuUser.y} ${tkpUser.x},${tkpUser.y}`;
                
                return (
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 256 256">
                    {grids.map((pts, i) => (
                      <polygon 
                        key={i} 
                        points={pts} 
                        fill="none" 
                        stroke="rgba(255,255,255,0.06)" 
                        strokeWidth="1" 
                      />
                    ))}
                    
                    <line x1={cx} y1={cy} x2={twkOuter.x} y2={twkOuter.y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <line x1={cx} y1={cy} x2={tiuOuter.x} y2={tiuOuter.y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <line x1={cx} y1={cy} x2={tkpOuter.x} y2={tkpOuter.y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    
                    <polygon 
                      points={minPoints} 
                      fill="rgba(239,68,68,0.08)" 
                      stroke="#EF4444" 
                      strokeWidth="1.5" 
                      strokeDasharray="3,3" 
                    />
                    
                    <polygon 
                      points={userPoints} 
                      fill={isLulusSkd ? "rgba(16,185,129,0.22)" : "rgba(245,166,35,0.22)"} 
                      stroke={isLulusSkd ? "#10B981" : "#F5A623"} 
                      strokeWidth="2.5" 
                    />
                    
                    <circle cx={cx} cy={cy} r="3" fill="#FFF" opacity="0.3" />
                    
                    <text x={twkOuter.x} y={twkOuter.y - 12} textAnchor="middle" className="fill-purple-400 font-bold font-space text-[10px]">
                      TWK ({twkScore})
                    </text>
                    <text x={twkOuter.x} y={twkOuter.y - 3} textAnchor="middle" className="fill-skd-muted text-[8px]">
                      Min. {twkPassThreshold}
                    </text>
                    
                    <text x={tiuOuter.x + 10} y={tiuOuter.y + 4} textAnchor="start" className="fill-blue-400 font-bold font-space text-[10px]">
                      TIU ({tiuScore})
                    </text>
                    <text x={tiuOuter.x + 10} y={tiuOuter.y + 13} textAnchor="start" className="fill-skd-muted text-[8px]">
                      Min. {tiuPassThreshold}
                    </text>
                    
                    <text x={tkpOuter.x - 10} y={tkpOuter.y + 4} textAnchor="end" className="fill-orange-400 font-bold font-space text-[10px]">
                      TKP ({tkpScore})
                    </text>
                    <text x={tkpOuter.x - 10} y={tkpOuter.y + 13} textAnchor="end" className="fill-skd-muted text-[8px]">
                      Min. {tkpPassThreshold}
                    </text>
                  </svg>
                );
              })()}
            </div>
            
            <div className="flex gap-4 text-[10px] font-bold font-space mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1.5 bg-danger rounded-sm border-t border-b border-dashed border-danger" />
                <span className="text-red-400">Ambang Batas BKN</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-1.5 rounded-sm ${isLulusSkd ? 'bg-success' : 'bg-primary'}`} />
                <span className={isLulusSkd ? 'text-success' : 'text-primary'}>Skor Anda</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Category Scores Breakdown for Tryout (Real scaled passing grade) */}
        {isTryout && (
          <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 font-space">
            {/* TWK Card */}
            <div className={`p-4 rounded-2xl border text-center bg-surface shadow-sm ${isTwkPass ? 'border-success/40' : 'border-danger/40'}`}>
              <span className="block text-[9px] text-fg-muted font-bold uppercase mb-1">Wawasan Kebangsaan</span>
              <span className="block text-xl font-black text-fg">{twkScore} <span className="text-xs text-fg-muted">/ {twkQuestionsCount * 5}</span></span>
              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isTwkPass ? 'bg-success/20 text-success' : 'bg-danger-subtle text-danger'}`}>
                {isTwkPass ? `Lolos (Min. ${twkPassThreshold})` : `Gagal (Min. ${twkPassThreshold})`}
              </span>
            </div>

            {/* TIU Card */}
            <div className={`p-4 rounded-2xl border text-center bg-surface shadow-sm ${isTiuPass ? 'border-success/40' : 'border-danger/40'}`}>
              <span className="block text-[9px] text-fg-muted font-bold uppercase mb-1">Inteligensia Umum</span>
              <span className="block text-xl font-black text-fg">{tiuScore} <span className="text-xs text-fg-muted">/ {tiuQuestionsCount * 5}</span></span>
              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isTiuPass ? 'bg-success/20 text-success' : 'bg-danger-subtle text-danger'}`}>
                {isTiuPass ? `Lolos (Min. ${tiuPassThreshold})` : `Gagal (Min. ${tiuPassThreshold})`}
              </span>
            </div>

            {/* TKP Card */}
            <div className={`p-4 rounded-2xl border text-center bg-surface shadow-sm ${isTkpPass ? 'border-success/40' : 'border-danger/40'}`}>
              <span className="block text-[9px] text-fg-muted font-bold uppercase mb-1">Karakteristik Pribadi</span>
              <span className="block text-xl font-black text-fg">{tkpScore} <span className="text-xs text-fg-muted">/ {tkpQuestionsCount * 5}</span></span>
              <span className={`inline-block mt-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${isTkpPass ? 'bg-success/20 text-success' : 'bg-danger-subtle text-danger'}`}>
                {isTkpPass ? `Lolos (Min. ${tkpPassThreshold})` : `Gagal (Min. ${tkpPassThreshold})`}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {!isTryout && quizQuestions && (
          <div className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-xl mb-6">
            <div className="bg-success-subtle border border-success p-4 md:p-6 rounded-2xl flex flex-col items-center shadow-sm">
              <CheckCircle className="text-success mb-2" size={32} />
              <div className="text-3xl md:text-4xl font-black font-space text-success">{correctCount}</div>
              <p className="text-xs md:text-sm text-success font-bold uppercase tracking-wider mt-1">Benar</p>
            </div>
            <div className="bg-danger-subtle border border-danger p-4 md:p-6 rounded-2xl flex flex-col items-center shadow-sm">
              <XCircle className="text-danger mb-2" size={32} />
              <div className="text-3xl md:text-4xl font-black font-space text-danger">{incorrectCount}</div>
              <p className="text-xs md:text-sm text-danger font-bold uppercase tracking-wider mt-1">Salah</p>
            </div>
            <div className="bg-surface-subtle border border-border p-4 md:p-6 rounded-2xl flex flex-col items-center shadow-sm">
              <Circle className="text-fg-muted mb-2" size={32} />
              <div className="text-3xl md:text-4xl font-black font-space text-fg-muted">{emptyCount}</div>
              <p className="text-xs md:text-sm text-fg-muted font-bold uppercase tracking-wider mt-1">Kosong</p>
            </div>
          </div>
        )}

                {/* Rewards section */}
        <div
          style={{ animation: 'fadeInUp 0.4s ease-out 0.3s both' }}
          className="w-full max-w-xl bg-surface/80 border border-border rounded-3xl p-5 md:p-6 flex justify-around items-center shadow-sm"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-coin-subtle flex items-center justify-center">
              <Coins className="text-coin fill-yellow-500 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-fg-muted font-bold">Koin Diperoleh</p>
              <p className="font-bold font-space text-xl md:text-2xl text-coin">+<AnimatedCounter end={earnedCoins} duration={2.5} /></p>
            </div>
          </div>
          <div className="w-px h-12 md:h-16 bg-skd-border" />
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-premium-subtle flex items-center justify-center">
              <Zap className="text-premium fill-skd-premium w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-fg-muted font-bold">XP Diperoleh</p>
              <p className="font-bold font-space text-xl md:text-2xl text-premium">+<AnimatedCounter end={gainedXP} duration={2.5} /></p>
            </div>
                    </div>
        </div>

                {/* Ringkasan Pembahasan — tampil jika questions_json tersedia */}
        {quizQuestions.length > 0 && (
          <QuickReviewSummary
            questions={quizQuestions}
            userAnswers={userAnswers}
            isTryout={isTryout}
          />
        )}

        {/* Pembahasan Action */}
        {quizQuestions.length > 0 && (
          <div className="w-full max-w-xl">
            <Button
              variant="outline"
              onClick={() => {
                const reviewPkg = resultData.package_id || 'latihan';
                navigate(`/review/${reviewPkg}/${attemptId}`);
              }}
              className="w-full py-4 rounded-2xl shadow-sm border-2 border-border text-fg hover:bg-surface-subtle hover:border-primary active:scale-[0.99] font-bold flex items-center justify-center gap-2"
            >
              <BookOpen size={18} />
              Lihat Pembahasan Detail Lengkap
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full max-w-xl space-y-3 pt-6">
          <Button
            variant="primary"
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl shadow-lg active:scale-[0.99]"
          >
            Selesai Review & Kembali
          </Button>
        </div>

      </div>
    </div>
  );
}
