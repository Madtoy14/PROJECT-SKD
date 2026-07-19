import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, ChevronDown, ChevronUp, Menu, Loader2, AlertTriangle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import MathCard from '../components/MathCard';

// cleanMathText from Quiz.tsx
function cleanMathText(text: string): string {
  if (!text) return "";
  let cleaned = text;
  if (typeof document !== 'undefined') { const txt = document.createElement('textarea'); txt.innerHTML = cleaned; cleaned = txt.value; }
  cleaned = cleaned.split('\\\\[').join(' ');
  cleaned = cleaned.split('\\\\]').join(' ');
  cleaned = cleaned.split('\\[').join(' ');
  cleaned = cleaned.split('\\]').join(' ');
  cleaned = cleaned.split('\\(').join(' ');
  cleaned = cleaned.split('\\)').join(' ');
  cleaned = cleaned.replace(/\\\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  cleaned = cleaned.replace(/\\\\text\{([^}]+)\}/g, '$1');
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, '$1');
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
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

export default function ReviewDetail() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Define interfaces to replace any
  interface Option {
    id: string;
    text: string;
    points?: number;
    score?: number;
  }
  interface QuizQuestion {
    id: string;
    category: string;
    text: string;
    correct?: string;
    explanation?: string;
    options: Option[];
  }
  
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizMode, setQuizMode] = useState<string>('latihan');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'TWK': true,
    'TIU': true,
    'TKP': true
  });

  useEffect(() => {
    const loadData = async () => {
      if (!attemptId) {
        setError("ID Percobaan tidak ditemukan.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: err } = await supabase!
          .from('quiz_results')
          .select('questions_json, answers_json, mode')
          .or(`id.eq.${attemptId},session_id.eq.${attemptId}`)
          .single();
        
        if (err) throw err;
        setQuizQuestions(data.questions_json || []);
        setUserAnswers(data.answers_json || {});
        setQuizMode(data.mode || 'latihan');
      } catch (err) {
        console.error(err);
        setError("Gagal memuat detail pembahasan.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <h2 className="text-xl font-bold text-fg">Memuat Pembahasan...</h2>
      </div>
    );
  }

  if (error || quizQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-3xl p-8 text-center space-y-6">
          <AlertTriangle className="text-danger mx-auto" size={48} />
          <div>
            <h2 className="text-xl font-bold text-fg mb-2">{error || "Data tidak ditemukan"}</h2>
            <p className="text-sm text-fg-muted">Tidak ada detail pembahasan untuk ID percobaan ini.</p>
          </div>
          <Button onClick={() => navigate(-1)} className="w-full">Kembali</Button>
        </div>
      </div>
    );
  }

  const hasAnswers = Object.keys(userAnswers).length > 0;
  const totalQuestions = quizQuestions.length;
  const currentQuestion = quizQuestions[currentQuestionIndex];

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getQuestionStatus = (idx: number) => {
    if (!hasAnswers) return 'unanswered';
    const q = quizQuestions[idx];
    const ansId = userAnswers[idx];
    if (!ansId) return 'empty';
    
    if (q.category === 'TKP') {
      const opt = q.options?.find((o: Option) => o.id === ansId);
      return (opt?.score ?? 0) === 5 ? 'correct' : 'incorrect';
    } else {
      return ansId === q.correct ? 'correct' : 'incorrect';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg text-fg flex flex-row font-syne">
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 w-full max-w-5xl mx-auto overflow-hidden">
        
        {/* Header */}
        <header className="sticky top-0 p-3 md:p-4 flex items-center justify-between gap-3 md:gap-4 border-b border-border bg-surface/90 backdrop-blur-md z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="!p-2 bg-surface-subtle hover:bg-surface text-fg-muted rounded-full shrink-0 border border-border">
              <X size={20} />
            </Button>
            
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 shrink-0">
              <span className="font-space font-bold text-sm text-fg whitespace-nowrap">
                Soal {currentQuestionIndex + 1}/{totalQuestions}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border border-purple-100">
                  Pembahasan {quizMode === 'tryout' ? 'Try Out' : quizMode === 'survival' ? 'Survival' : quizMode.includes('pvp') ? 'PvP' : 'Latihan'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                  currentQuestion.category === 'TWK' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                  currentQuestion.category === 'TIU' ? 'bg-blue-50 text-primary border-blue-100' :
                  'bg-amber-50 text-warning border-amber-100'
                }`}>
                  {currentQuestion.category}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="ghost"
              onClick={() => setShowSidebarMobile(true)} 
              className="lg:hidden !p-2 text-fg-muted hover:bg-surface-subtle rounded-full shrink-0"
            >
              <Menu size={20} />
            </Button>
          </div>
        </header>

        {/* Scrollable Question Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24">
          <div key={currentQuestion.id || currentQuestionIndex} className="space-y-4 max-w-3xl mx-auto">
              {currentQuestion.category === 'TKP' && (
                <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
                  <span className="font-bold">TKP — Pilih jawaban terbaik.</span>
                  <span className="text-fg-muted">Setiap pilihan memiliki bobot poin berbeda (10–50).</span>
                </div>
              )}
              
              <div className="bg-surface rounded-3xl p-8 md:px-12 md:py-10 border border-border shadow-sm mb-6 mt-2 md:mt-4">
                <p className="text-lg font-semibold leading-loose text-fg" dangerouslySetInnerHTML={{ __html: cleanMathText(currentQuestion.text) }} />
              </div>

              <div className="space-y-2 md:space-y-3">
                {currentQuestion.options.map((opt: Option) => {
                  const ansId = hasAnswers ? userAnswers[currentQuestionIndex] : null;
                  const isSelected = ansId === opt.id;
                  const isTKP = currentQuestion.category === 'TKP';
                  const isCorrect = isTKP ? (opt.score === 5) : (opt.id === currentQuestion.correct);
                  
                  let cardClass = 'bg-surface border-border opacity-60';
                  let markerClass = 'bg-surface-subtle text-fg-muted font-bold';

                  if (isCorrect) {
                    cardClass = 'bg-emerald-50 border-emerald-500 shadow-sm';
                    markerClass = 'bg-emerald-500 text-white';
                  } else if (isSelected) {
                    cardClass = 'bg-rose-50 border-destructive shadow-sm';
                    markerClass = 'bg-destructive text-white';
                  }

                  return (
                    <div
                      key={opt.id}
                      className={`w-full p-3.5 md:p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all shadow-sm ${cardClass}`}
                    >
                      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-space font-bold shrink-0 text-base ${markerClass}`}>
                        {isCorrect ? '✓' : (isSelected ? '✗' : opt.id)}
                      </div>
                      <span className="flex-1 leading-snug text-sm md:text-base font-semibold text-fg" dangerouslySetInnerHTML={{ __html: cleanMathText(opt.text) }} ></span>
                      
                      {isTKP && (
                        <span className={`ml-auto shrink-0 text-xs font-bold px-2 py-1 rounded-lg
                          ${(opt.score || 0) === 5 ? 'bg-success/20 text-success' :
                            (opt.score || 0) >= 3 ? 'bg-orange-500/15 text-orange-400' :
                            'bg-locked-subtle text-fg-muted'}`}>
                          {opt.score || 0} pts
                        </span>
                      )}
                      
                      {!isTKP && isCorrect && (
                        <span className="ml-auto shrink-0 text-xs font-bold bg-success/20 text-success px-2 py-1 rounded-lg">5 pts</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pembahasan Box */}
              <div className="pt-4">
                <div className="bg-info/10 border border-info/20 p-5 rounded-xl space-y-3 mt-4">
                  <h4 className="font-bold text-primary">Penjelasan & Pembahasan:</h4>
                  <div className="text-sm md:text-base text-fg leading-relaxed">
                    <MathCard explanation={cleanMathText(currentQuestion.explanation || "Pembahasan tidak tersedia untuk soal ini.")} category={currentQuestion.category} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-6 border-t border-border">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-5 py-2.5 bg-surface border border-border rounded-xl text-fg disabled:opacity-30 hover:bg-locked-subtle"
                >
                  Sebelumnya
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="px-5 py-2.5 rounded-xl shadow-md active:scale-95 disabled:opacity-30"
                >
                  Selanjutnya
                </Button>
              </div>
          </div>
        </main>
      </div>

      {/* Sidebar (Desktop) */}
      <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-border bg-surface/40 backdrop-blur-sm h-full">
        <div className="p-4 border-b border-border">
          <h3 className="font-bold text-fg flex items-center gap-2 text-sm">
            Navigasi Soal
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {['TWK', 'TIU', 'TKP'].map(cat => {
            const catQuestions = quizQuestions.map((q: QuizQuestion, idx: number) => ({ q, idx })).filter((item) => item.q.category === cat);
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
                    <div 
                      className="grid grid-cols-5 gap-2 overflow-hidden"
                    >
                      {catQuestions.map(({ idx }: {idx: number}) => {
                        const isCurrent = currentQuestionIndex === idx;
                        const status = getQuestionStatus(idx);
                        
                        let btnClass = 'bg-bg border-border text-fg-muted hover:bg-locked-subtle';
                        if (isCurrent) {
                          btnClass = 'bg-info text-white border-info shadow-md ring-2 ring-info/50';
                        } else if (status === 'correct') {
                          btnClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                        } else if (status === 'incorrect') {
                          btnClass = 'bg-rose-50 text-destructive border-rose-200';
                        } else if (status === 'empty') {
                          btnClass = 'bg-surface text-fg-muted border-border hover:bg-surface-subtle';
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
      </div>

              {/* Sidebar Mobile Overlay */}
              {showSidebarMobile && (
                <>
                  <div 
                    onClick={() => setShowSidebarMobile(false)}
                    className="fixed inset-0 bg-overlay backdrop-blur-sm z-[60] lg:hidden animate-[fadeInUp_0.2s_ease-out_both]"
                  />
                  <div 
                    className="fixed inset-y-0 right-0 w-72 bg-surface border-l border-border z-[70] flex flex-col shadow-2xl lg:hidden transition-transform duration-300 ease-out translate-x-0"
                  >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-fg">Navigasi Soal</h3>
                <Button variant="ghost" onClick={() => setShowSidebarMobile(false)} className="!p-2 bg-surface-subtle hover:bg-surface text-fg-muted rounded-full">
                  <X size={20} />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {['TWK', 'TIU', 'TKP'].map(cat => {
                  const catQuestions = quizQuestions.map((q: QuizQuestion, idx: number) => ({ q, idx })).filter((item) => item.q.category === cat);
                  if (catQuestions.length === 0) return null;
                  const isOpen = openCategories[cat];
                  
                  return (
                    <div key={cat} className="mb-4">
                      <Button
                        variant="ghost"
                        onClick={() => toggleCategory(cat)}
                        className="flex items-center justify-between w-full p-2 mb-2 bg-locked-subtle rounded-lg text-sm font-bold text-fg"
                      >
                        <span>{cat}</span>
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </Button>
                      <AnimatePresence>
                        {isOpen && (
                          <div 
                            className="grid grid-cols-5 gap-2 overflow-hidden"
                          >
                            {catQuestions.map(({ idx }: {idx: number}) => {
                              const isCurrent = currentQuestionIndex === idx;
                              const status = getQuestionStatus(idx);
                              
                              let btnClass = 'bg-bg border-border text-fg-muted';
                              if (isCurrent) {
                                btnClass = 'bg-info text-white border-info shadow-md';
                              } else if (status === 'correct') {
                                btnClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                              } else if (status === 'incorrect') {
                                btnClass = 'bg-rose-50 text-destructive border-rose-200';
                              } else if (status === 'empty') {
                                btnClass = 'bg-surface text-fg-muted border-border hover:bg-surface-subtle';
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
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
    </div>
  );
}
