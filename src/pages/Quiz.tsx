import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const DUMMY_QUESTION = {
  id: 1,
  text: "Berdasarkan UUD 1945 pasal 33 ayat 1, perekonomian disusun sebagai usaha bersama berdasar atas asas...",
  options: [
    { id: 'A', text: 'Kekeluargaan' },
    { id: 'B', text: 'Keadilan sosial' },
    { id: 'C', text: 'Kesejahteraan' },
    { id: 'D', text: 'Demokrasi ekonomi' },
    { id: 'E', text: 'Gotong royong' }
  ],
  correct: 'A'
};

export default function Quiz() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(45);
  const [selected, setSelected] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  
  const TOTAL_TIME = 60;
  const progress = (timeLeft / TOTAL_TIME) * 100;
  const strokeDashoffset = ((100 - progress) / 100) * 113.097; // 2 * PI * 18

  const timerColor = timeLeft <= 15 ? 'text-skd-danger' : timeLeft <= 30 ? 'text-skd-accent' : 'text-skd-success';

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelect = (id: string) => {
    if (selected) return;
    setSelected(id);
    
    if (id === DUMMY_QUESTION.correct) {
      setShowReward(true);
    }

    setTimeout(() => {
      navigate('/result');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-skd-bg relative transition-colors items-center">
      {/* Floating Reward Animation */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -100, scale: 1.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-2xl font-black text-yellow-500 drop-shadow-lg flex items-center gap-2"
          >
            + 50 <span className="text-xl">🪙</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-3xl flex flex-col h-full">
        {/* Header */}
        <header className="p-4 flex items-center justify-between border-b border-skd-border bg-skd-card/50 backdrop-blur-sm z-10 relative">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-skd-muted/10 rounded-full transition-colors text-skd-text">
            <X size={20} />
          </button>
          
          <div className="flex-1 px-6">
            <div className="flex justify-between text-xs mb-1.5 font-space font-bold text-skd-muted">
              <span>Soal 1/35</span>
              <span>TWK</span>
            </div>
            <div className="h-1.5 bg-skd-muted/20 rounded-full overflow-hidden">
              <div className="h-full bg-skd-premium w-[5%] rounded-full" />
            </div>
          </div>

          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="none" className="stroke-skd-muted/20" strokeWidth="3" />
              <circle 
                cx="20" cy="20" r="18" fill="none" 
                className={`stroke-current transition-all duration-1000 ease-linear ${timerColor}`}
                strokeWidth="3"
                strokeDasharray="113.097"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute font-space font-bold text-sm ${timerColor}`}>{timeLeft}</span>
          </div>
        </header>

        {/* Question Body */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8 pb-24 space-y-6 md:space-y-8">
          <div className="bg-skd-card p-6 md:p-8 rounded-3xl border border-skd-border shadow-sm">
            <p className="text-lg md:text-xl leading-relaxed text-skd-text font-medium">{DUMMY_QUESTION.text}</p>
          </div>

          <div className="space-y-3 md:space-y-4">
            {DUMMY_QUESTION.options.map((opt) => {
              const isSelected = selected === opt.id;
              const isCorrect = opt.id === DUMMY_QUESTION.correct;
              const showStatus = selected !== null;
              
              let bgClass = "bg-skd-card hover:bg-skd-muted/5 border-skd-border text-skd-text";
              if (showStatus) {
                if (isCorrect) bgClass = "bg-skd-success/20 border-skd-success text-skd-text";
                else if (isSelected) bgClass = "bg-skd-danger/20 border-skd-danger text-skd-text";
                else bgClass = "bg-skd-card border-skd-border opacity-50 text-skd-text";
              }

              return (
                <motion.button
                  key={opt.id}
                  whileTap={!selected ? { scale: 0.98 } : {}}
                  onClick={() => handleSelect(opt.id)}
                  disabled={selected !== null}
                  className={`w-full p-4 md:p-5 rounded-2xl border text-left flex items-center gap-4 transition-all shadow-sm ${bgClass}`}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-space font-bold text-lg shrink-0
                    ${showStatus && isCorrect ? 'bg-skd-success text-white' : 
                      showStatus && isSelected ? 'bg-skd-danger text-white' : 'bg-skd-muted/10 text-skd-text'}`}
                  >
                    {opt.id}
                  </div>
                  <span className="flex-1 leading-tight md:text-lg font-medium">{opt.text}</span>
                </motion.button>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
