import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Flag, Brain, UserCheck, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Modul } from '../data/materi/index';
import twkData from '../data/materi/twk.json';
import tiuData from '../data/materi/tiu.json';
import tkpData from '../data/materi/tkp.json';
import { getCompletedCount, getTotalProgress } from '../calculations/belajarProgress';

const MODULS: Modul[] = [twkData[0] as Modul, tiuData[0] as Modul, tkpData[0] as Modul];

const MODUL_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Flag, Brain, UserCheck,
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};

export default function Belajar() {
  const totalSubBabs = useMemo(() => MODULS.reduce((sum, m) => sum + m.subBabs.length, 0), []);
  const overallProgress = useMemo(() => getTotalProgress(totalSubBabs), [totalSubBabs]);

  return (
    <div className="min-h-screen bg-bg p-4 md:p-8 pb-24 md:pb-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-fg flex items-center gap-2">
            <BookOpen size={28} className="text-primary" />
            Mode Belajar
          </h1>
          <p className="text-fg-muted text-sm md:text-base">
            Pelajari ringkasan materi SKD per sub-bab sebelum mengerjakan quiz.
          </p>
          {/* Overall Progress */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-2 bg-surface-subtle rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${totalSubBabs > 0 ? (overallProgress / totalSubBabs) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-primary to-premium rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-fg-muted whitespace-nowrap">
              {overallProgress}/{totalSubBabs} selesai
            </span>
          </div>
        </motion.div>

        {/* Modul Cards */}
        <div className="space-y-4">
          {MODULS.map((modul) => {
            const Icon = MODUL_ICONS[modul.icon] || BookOpen;
            const completed = getCompletedCount(modul.id, modul.subBabs.length);
            const total = modul.subBabs.length;

            return (
              <motion.div key={modul.id} variants={itemVariants}>
                <Link
                  to={`/belajar/${modul.id}`}
                  className={`block bg-surface border ${modul.border} rounded-2xl p-5 hover:shadow-md transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${modul.bg} flex items-center justify-center`}>
                      <Icon size={24} className={modul.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-fg">{modul.title}</h3>
                      <p className="text-sm text-fg-muted">{modul.subtitle}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-surface-subtle rounded-full overflow-hidden max-w-[200px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            className={`h-full rounded-full ${modul.id === 'twk' ? 'bg-purple-500' : modul.id === 'tiu' ? 'bg-blue-500' : 'bg-amber-500'}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-fg-muted">
                          {completed}/{total} sub-bab
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-fg-muted group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}