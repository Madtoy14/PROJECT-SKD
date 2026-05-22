import { motion } from 'framer-motion';
import { Target, CheckCircle2, Flame, Clock, Brain, Coins } from 'lucide-react';

const DAILY_QUESTS = [
  { id: 1, title: 'Jawab 10 Soal TWK', progress: 10, total: 10, reward: 100, completed: true, icon: Brain },
  { id: 2, title: 'Raih Combo 5x', progress: 3, total: 5, reward: 50, completed: false, icon: Flame },
  { id: 3, title: 'Selesaikan Latihan TIU', progress: 0, total: 1, reward: 150, completed: false, icon: Clock },
];

const WEEKLY_QUESTS = [
  { id: 4, title: 'Masuk Top 10 Liga', progress: 14, total: 10, reward: 500, completed: false, icon: Target },
  { id: 5, title: 'Survival Mode: Jawab 30 Soal', progress: 12, total: 30, reward: 300, completed: false, icon: Flame },
];

export default function Quest() {
  const renderQuestCard = (quest: any) => {
    const isCompleted = quest.progress >= quest.total;
    const progressPercentage = Math.min((quest.progress / quest.total) * 100, 100);

    return (
      <motion.div
        key={quest.id}
        whileHover={{ scale: 1.02 }}
        className={`p-4 md:p-5 rounded-2xl border flex items-center gap-4 relative overflow-hidden transition-all shadow-sm hover:shadow-md ${
          isCompleted 
            ? 'bg-skd-success/10 border-skd-success/50' 
            : 'bg-skd-card border-skd-border hover:border-skd-muted/30'
        }`}
      >
        {isCompleted && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-skd-success/20 blur-2xl rounded-full" />
        )}
        
        <div className={`w-12 h-12 md:w-14 md:h-14 flex shrink-0 items-center justify-center rounded-xl ${
          isCompleted ? 'bg-skd-success text-white' : 'bg-skd-muted/10 text-skd-text'
        }`}>
          {isCompleted ? <CheckCircle2 size={24} /> : <quest.icon size={24} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm md:text-base truncate mb-2 ${isCompleted ? 'text-skd-success' : 'text-skd-text'}`}>
            {quest.title}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 md:h-2.5 bg-skd-muted/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  isCompleted ? 'bg-skd-success' : 'bg-skd-accent'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-[10px] md:text-xs font-space font-bold text-skd-muted">
              {quest.progress}/{quest.total}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className={`flex items-center gap-1 font-space font-bold text-sm md:text-base ${isCompleted ? 'text-skd-success' : 'text-yellow-500'}`}>
            +{quest.reward} <Coins size={16} className={isCompleted ? 'text-skd-success fill-skd-success/20' : 'text-yellow-500 fill-yellow-500'} />
          </div>
          {isCompleted && (
            <span className="text-[10px] md:text-xs text-skd-success font-bold px-2 py-0.5 bg-skd-success/20 rounded-full">
              Selesai
            </span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 pb-24 max-w-5xl mx-auto">
      <header className="pt-2 md:pt-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-skd-text">Quest Harian & Mingguan</h1>
        <p className="text-sm md:text-base text-skd-muted mt-2">Selesaikan misi untuk mendapatkan koin dan XP ekstra.</p>
      </header>

      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-skd-border pb-2">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-skd-text">
            <Flame className="text-skd-danger" size={24} /> Quest Harian
          </h2>
          <span className="text-xs md:text-sm text-skd-muted font-space font-bold bg-skd-muted/10 px-3 py-1 rounded-full">Reset: 14:20:00</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {DAILY_QUESTS.map(renderQuestCard)}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 md:mb-6 border-b border-skd-border pb-2">
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-skd-text">
            <Target className="text-skd-premium" size={24} /> Quest Mingguan
          </h2>
          <span className="text-xs md:text-sm text-skd-muted font-space font-bold bg-skd-muted/10 px-3 py-1 rounded-full">Reset: 5 Hari</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {WEEKLY_QUESTS.map(renderQuestCard)}
        </div>
      </section>
    </div>
  );
}
