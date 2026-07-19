import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Flag, Brain, UserCheck, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import type { Modul, SubBab } from '../data/materi/index';
import twkData from '../data/materi/twk.json';
import tiuData from '../data/materi/tiu.json';
import tkpData from '../data/materi/tkp.json';
import { isSubBabComplete, getCompletedCount } from '../calculations/belajarProgress';

const MODULS: Modul[] = [twkData[0] as Modul, tiuData[0] as Modul, tkpData[0] as Modul];

const MODUL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Flag, Brain, UserCheck,
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function BelajarModul() {
  const { modul: modulId } = useParams<{ modul: string }>();
  const modul = MODULS.find(m => m.id === modulId);

  if (!modul) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <BookOpen size={48} className="text-fg-muted mx-auto" />
          <h2 className="text-xl font-bold text-fg">Modul tidak ditemukan</h2>
          <Link to="/belajar" className="text-primary font-bold hover:underline">← Kembali ke Mode Belajar</Link>
        </div>
      </div>
    );
  }

  const Icon = MODUL_ICONS[modul.icon] || BookOpen;
  const completed = getCompletedCount(modul.id, modul.subBabs.length);
  const total = modul.subBabs.length;

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8 pb-24 md:pb-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-3xl mx-auto space-y-6"
      >
        {/* Back */}
        <Link to="/belajar" className="inline-flex items-center gap-2 text-fg-muted hover:text-fg text-sm font-medium transition-colors">
          <ArrowLeft size={16} />
          Kembali
        </Link>

        {/* Modul Header */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${modul.bg} flex items-center justify-center`}>
            <Icon size={28} className={modul.color} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-fg">{modul.title}</h1>
            <p className="text-fg-muted">{modul.subtitle}</p>
          </div>
        </motion.div>

        {/* Progress */}
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-subtle rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-full rounded-full ${modul.id === 'twk' ? 'bg-purple-500' : modul.id === 'tiu' ? 'bg-blue-500' : 'bg-amber-500'}`}
            />
          </div>
          <span className="text-xs font-bold text-fg-muted">{completed}/{total} selesai</span>
        </motion.div>

        {/* Sub-bab List */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-lg font-bold text-fg">Daftar Sub-bab</h2>
          {modul.subBabs.map((subBab: SubBab) => {
            const done = isSubBabComplete(modul.id, subBab.id);
            const hasQuiz = subBab.quiz.length > 0;

            return (
              <Link
                key={subBab.id}
                to={`/belajar/${modul.id}/${subBab.id}`}
                className="flex items-center gap-4 bg-surface border border-border rounded-2xl p-4 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  done ? 'bg-success/10' : 'bg-surface-subtle'
                }`}>
                  {done ? (
                    <CheckCircle2 size={20} className="text-success" />
                  ) : (
                    <span className="text-fg-muted font-bold text-sm">{subBab.id === 'pancasila' ? '1' : subBab.id === 'uud1945' ? '2' : subBab.id === 'bhineka' ? '3' : subBab.id === 'sejarah' ? '4' : subBab.id === 'tata_negara' ? '5' : subBab.id === 'sinonim' ? '1' : subBab.id === 'antonim' ? '2' : subBab.id === 'analogi' ? '3' : subBab.id === 'aritmatika' ? '4' : subBab.id === 'deret' ? '5' : subBab.id === 'integritas' ? '1' : subBab.id === 'pelayanan' ? '2' : subBab.id === 'adaptasi' ? '3' : subBab.id === 'profesional' ? '4' : '5'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg group-hover:text-primary transition-colors">{subBab.title}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {hasQuiz ? `${subBab.quiz.length} soal mini quiz` : 'Tidak ada quiz'}
                  </p>
                </div>
                <ChevronRight size={18} className="text-fg-muted group-hover:text-primary transition-colors shrink-0" />
              </Link>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}