import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Lightbulb, HelpCircle, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react';
import type { Modul, SubBabQuiz } from '../data/materi/index';
import twkData from '../data/materi/twk.json';
import tiuData from '../data/materi/tiu.json';
import tkpData from '../data/materi/tkp.json';
import { isSubBabComplete, markSubBabComplete } from '../calculations/belajarProgress';

const MODULS: Modul[] = [twkData[0] as Modul, tiuData[0] as Modul, tkpData[0] as Modul];

export default function BelajarSubBab() {
  const { modul: modulId, subbab: subBabId } = useParams<{ modul: string; subbab: string }>();
  
  const modul = useMemo(() => MODULS.find(m => m.id === modulId), [modulId]);
  const subBab = useMemo(() => modul?.subBabs.find(s => s.id === subBabId), [modul, subBabId]);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(isSubBabComplete(modulId || '', subBabId || ''));

  if (!modul || !subBab) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <HelpCircle size={48} className="text-fg-muted mx-auto" />
          <h2 className="text-xl font-bold text-fg">Materi tidak ditemukan</h2>
          <Link to="/belajar" className="text-primary font-bold hover:underline">← Kembali ke Mode Belajar</Link>
        </div>
      </div>
    );
  }

  // Find prev/next sub-bab
  const subBabIndex = modul.subBabs.findIndex(s => s.id === subBabId);
  const prevSubBab = subBabIndex > 0 ? modul.subBabs[subBabIndex - 1] : null;
  const nextSubBab = subBabIndex < modul.subBabs.length - 1 ? modul.subBabs[subBabIndex + 1] : null;

  const handleQuizAnswer = (quizIdx: number, answerId: string) => {
    if (quizSubmitted[quizIdx]) return;
    setQuizAnswers(prev => ({ ...prev, [quizIdx]: answerId }));
  };

  const handleQuizSubmit = (quizIdx: number) => {
    setQuizSubmitted(prev => ({ ...prev, [quizIdx]: true }));
  };

  const handleMarkComplete = () => {
    markSubBabComplete(modulId!, subBabId!);
    setCompleted(true);
  };

  const quiz: SubBabQuiz[] = subBab.quiz || [];

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8 pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Back Navigation */}
        <Link
          to="/belajar"
          className="inline-flex items-center gap-2 text-fg-muted hover:text-fg text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Kembali ke Mode Belajar
        </Link>

        {/* Modul Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-bold ${modul.id === 'twk' ? 'text-purple-600' : modul.id === 'tiu' ? 'text-blue-600' : 'text-amber-600'}`}>
            {modul.title}
          </span>
          <ChevronRight size={14} className="text-fg-muted" />
          <span className="text-fg-muted">{subBab.title}</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-fg">{subBab.title}</h1>
          <p className="text-fg-muted mt-1">Modul {modul.subtitle}</p>
        </div>

        {/* Ringkasan */}
        {subBab.ringkasan.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-border rounded-2xl p-5 md:p-6 space-y-3"
          >
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              Ringkasan Materi
            </h2>
            {subBab.ringkasan.map((paragraf, i) => (
              <p key={i} className="text-fg-muted leading-relaxed text-[15px]">{paragraf}</p>
            ))}
          </motion.div>
        )}

        {/* Tips */}
        {subBab.tips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 space-y-3"
          >
            <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2">
              <Lightbulb size={18} />
              Tips & Trik
            </h2>
            <ul className="space-y-2">
              {subBab.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-900 text-[15px]">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Mini Quiz */}
        {quiz.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-border rounded-2xl p-5 md:p-6 space-y-5"
          >
            <h2 className="text-lg font-bold text-fg flex items-center gap-2">
              <HelpCircle size={18} className="text-info" />
              Mini Quiz ({quiz.length} soal)
            </h2>

            {quiz.map((q, qi) => (
              <div key={qi} className="border border-border rounded-xl p-4 space-y-3">
                <p className="font-semibold text-fg text-[15px]">
                  {qi + 1}. {q.pertanyaan}
                </p>
                <div className="space-y-2">
                  {q.opsi.map(opt => {
                    const isSelected = quizAnswers[qi] === opt.id;
                    const isCorrect = opt.id === q.kunci;
                    const showResult = quizSubmitted[qi];

                    let optClass = 'border-border hover:border-primary cursor-pointer';
                    if (showResult && isCorrect) optClass = 'border-success bg-success/5 border-2';
                    else if (showResult && isSelected && !isCorrect) optClass = 'border-danger bg-danger/5 border-2';
                    else if (isSelected && !showResult) optClass = 'border-primary bg-primary/5';

                    return (
                      <button
                        key={opt.id}
                        disabled={quizSubmitted[qi]}
                        onClick={() => handleQuizAnswer(qi, opt.id)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-[14px] ${optClass}`}
                      >
                        <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0
                          ${showResult && isCorrect ? 'border-success bg-success text-white' :
                            showResult && isSelected && !isCorrect ? 'border-danger bg-danger text-white' :
                            isSelected ? 'border-primary bg-primary text-white' : 'border-border text-fg-muted'}`}
                        >
                          {opt.id}
                        </span>
                        <span className="text-fg">{opt.text}</span>
                        {showResult && isCorrect && <CheckCircle2 size={16} className="text-success ml-auto" />}
                      </button>
                    );
                  })}
                </div>

                {!quizSubmitted[qi] && quizAnswers[qi] && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuizSubmit(qi)}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                  >
                    Cek Jawaban
                  </motion.button>
                )}

                <AnimatePresence>
                  {quizSubmitted[qi] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-3 rounded-xl text-sm ${
                        quizAnswers[qi] === q.kunci
                          ? 'bg-success/10 border border-success/30 text-success'
                          : 'bg-danger/10 border border-danger/30 text-danger'
                      }`}
                    >
                      <p className="font-bold mb-1">
                        {quizAnswers[qi] === q.kunci ? '✅ Benar!' : '❌ Kurang tepat'}
                      </p>
                      <p className="text-fg-muted">{q.pembahasan}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        )}

        {/* Mark Complete & Navigation */}
        <div className="flex flex-col gap-4">
          {!completed && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleMarkComplete}
              className="w-full py-3 bg-success text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-success/90 transition-colors"
            >
              <CheckCircle2 size={20} />
              Tandai Sudah Dibaca
            </motion.button>
          )}

          {completed && (
            <div className="flex items-center justify-center gap-2 text-success font-bold text-sm py-2">
              <CheckCircle2 size={16} />
              Materi sudah dipelajari
            </div>
          )}

          {/* Prev/Next */}
          <div className="flex gap-3">
            {prevSubBab ? (
              <Link
                to={`/belajar/${modulId}/${prevSubBab.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface border border-border rounded-2xl text-fg-muted font-medium hover:bg-surface-subtle transition-colors"
              >
                <ChevronLeft size={16} />
                {prevSubBab.title}
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {nextSubBab && (
              <Link
                to={`/belajar/${modulId}/${nextSubBab.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors"
              >
                {nextSubBab.title}
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}