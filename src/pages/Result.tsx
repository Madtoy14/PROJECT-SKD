import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, ArrowRight, Coins, Zap, Trophy, Medal } from 'lucide-react';

const DUMMY_REVIEW = [
  {
    id: 1,
    question: "Berdasarkan UUD 1945 pasal 33 ayat 1, perekonomian disusun sebagai usaha bersama berdasar atas asas...",
    userAnswer: 'A',
    correctAnswer: 'A',
    explanation: "Pasal 33 ayat (1) UUD 1945 menegaskan bahwa 'Perekonomian disusun sebagai usaha bersama berdasar atas asas kekeluargaan.' Asas ini merupakan kristalisasi dari nilai Pancasila.",
  },
  {
    id: 2,
    question: "Jika 3x + 5 = 20, maka nilai dari x adalah...",
    userAnswer: 'C',
    correctAnswer: 'B',
    explanation: "Penyelesaian:\n3x + 5 = 20\n3x = 15\nx = 5\nJadi, jawaban yang benar adalah 5 (Opsi B).",
  }
];

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

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showReview, setShowReview] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const score = location.state?.score || 450;
  const gameMode = location.state?.mode || 'latihan';
  const receivedRanks: {name: string; score: number; isMe?: boolean}[] = location.state?.liveRanks || [];

  // Final leaderboard for PvP — use real data if available
  const finalRanks = receivedRanks.length > 0
    ? [...receivedRanks].sort((a, b) => b.score - a.score)
    : [
        { name: 'Anda', score: score, isMe: true },
        { name: 'Player44', score: 3200 },
        { name: 'ASN_Pro', score: 2850 },
        { name: 'JagoanSkd', score: 1500 },
        { name: 'Mager', score: 800 }
      ].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-skd-bg flex flex-col items-center transition-colors">
      <div className="w-full max-w-3xl p-4 md:p-8 flex flex-col items-center pt-8 md:pt-12 space-y-8 md:space-y-12">
        
        {/* Header Badges */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className={`bg-gradient-to-r p-1 rounded-full shadow-lg ${(gameMode === 'pvp' || gameMode === 'pvp1v1') ? 'from-blue-500 to-cyan-400' : 'from-skd-premium to-skd-accent'}`}
        >
          <div className="bg-skd-bg px-6 py-2 rounded-full font-bold tracking-widest text-sm text-skd-text uppercase">
            {(gameMode === 'pvp' || gameMode === 'pvp1v1') ? 'PvP BATTLE SELESAI' : gameMode === 'survival' ? 'SURVIVAL BERAKHIR' : 'LATIHAN SELESAI'}
          </div>
        </motion.div>

        {(gameMode === 'pvp' || gameMode === 'pvp1v1') ? (
          <div className="w-full max-w-xl space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-center text-skd-text mb-8">Papan Peringkat Akhir</h2>
            
            {/* Podium Top 3 */}
            <div className="flex items-end justify-center gap-2 md:gap-4 h-48 mb-12">
              {[finalRanks[1], finalRanks[0], finalRanks[2]].map((rank, idx) => {
                const isFirst = idx === 1;
                const isSecond = idx === 0;
                const isThird = idx === 2;
                if (!rank) return null;
                
                const height = isFirst ? 'h-40' : isSecond ? 'h-32' : 'h-24';
                const color = isFirst ? 'bg-yellow-500' : isSecond ? 'bg-gray-300' : 'bg-amber-600';
                
                return (
                  <motion.div 
                    key={rank.name}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.2, type: 'spring' }}
                    className="flex flex-col items-center flex-1"
                  >
                    <div className="text-xs md:text-sm font-bold mb-2 text-center break-all">
                      {rank.name === 'Anda' ? <span className="text-blue-500 font-black">ANDA</span> : rank.name}
                    </div>
                    <div className="text-xs font-bold text-skd-muted mb-2 font-space">{rank.score}</div>
                    <div className={`w-full ${height} ${color} rounded-t-lg relative flex justify-center shadow-lg`}>
                      <div className="absolute -top-5 bg-skd-card rounded-full p-1 border-2 border-skd-bg">
                        {isFirst ? <Trophy size={20} className="text-yellow-600" /> : <Medal size={20} className={isSecond ? 'text-gray-600' : 'text-amber-800'} />}
                      </div>
                      <div className="mt-8 font-black text-2xl text-skd-bg/50">{isFirst ? '1' : isSecond ? '2' : '3'}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Other Ranks */}
            <div className="space-y-3">
              {finalRanks.slice(3).map((rank, index) => (
                <div key={rank.name} className={`flex items-center justify-between p-4 rounded-xl border ${rank.isMe ? 'bg-blue-500/10 border-blue-500' : 'bg-skd-card border-skd-border'}`}>
                   <div className="flex items-center gap-4">
                     <span className="font-bold text-skd-muted w-6 text-center">{index + 4}</span>
                     <span className={`font-bold ${rank.isMe ? 'text-blue-500' : 'text-skd-text'}`}>{rank.name}</span>
                   </div>
                   <span className="font-space font-bold text-skd-muted">{rank.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 relative">
            <div className="absolute inset-0 bg-skd-accent/20 blur-[60px] -z-10 rounded-full" />
            <h1 className="text-7xl md:text-8xl font-black text-skd-text font-space tracking-tighter">
              <AnimatedCounter end={score} />
            </h1>
            <p className="text-skd-muted font-bold tracking-widest">TOTAL SKOR</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 w-full max-w-xl">
          <div className="bg-skd-card border border-skd-border p-6 rounded-3xl flex flex-col items-center shadow-sm">
            <div className="text-3xl md:text-4xl font-bold font-space text-skd-success">
              <AnimatedCounter end={85} suffix="%" />
            </div>
            <p className="text-sm text-skd-muted mt-2 font-bold uppercase tracking-wider">Akurasi</p>
          </div>
          <div className="bg-skd-card border border-skd-border p-6 rounded-3xl flex flex-col items-center shadow-sm">
            <div className="text-3xl md:text-4xl font-bold font-space text-skd-text">04:32</div>
            <p className="text-sm text-skd-muted mt-2 font-bold uppercase tracking-wider">Waktu</p>
          </div>
        </div>

        {/* Rewards */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xl bg-skd-card/80 border border-skd-border rounded-3xl p-5 md:p-6 flex justify-around items-center shadow-sm"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <Coins className="text-yellow-500 fill-yellow-500 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-skd-muted font-bold">Coins Earned</p>
              <p className="font-bold font-space text-xl md:text-2xl text-yellow-500">+<AnimatedCounter end={120} duration={2.5} /></p>
            </div>
          </div>
          <div className="w-px h-12 md:h-16 bg-skd-border" />
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-skd-premium/10 flex items-center justify-center">
              <Zap className="text-skd-premium fill-skd-premium w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-skd-muted font-bold">XP Gained</p>
              <p className="font-bold font-space text-xl md:text-2xl text-skd-premium">+<AnimatedCounter end={350} duration={2.5} /></p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="w-full max-w-xl space-y-3 pt-4">
          <button 
            onClick={() => setShowReview(!showReview)}
            className="w-full py-4 rounded-2xl border-2 border-skd-border text-skd-text font-bold hover:bg-skd-muted/5 transition-colors flex items-center justify-center gap-2"
          >
            {showReview ? 'Tutup Pembahasan' : 'Lihat Pembahasan'}
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl bg-skd-text text-skd-bg font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
          >
            Kembali ke Beranda <ArrowRight size={20} />
          </button>
        </div>

        {/* Review Accordion */}
        <AnimatePresence>
          {showReview && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full space-y-4 overflow-hidden pb-10"
            >
              <h3 className="font-bold text-xl pt-4 pb-2 text-skd-text border-b border-skd-border">Review Jawaban</h3>
              {DUMMY_REVIEW.map((item) => {
                const isCorrect = item.userAnswer === item.correctAnswer;
                const isOpen = openAccordion === item.id;
                
                return (
                  <div key={item.id} className="bg-skd-card border border-skd-border rounded-2xl overflow-hidden shadow-sm transition-colors">
                    <button 
                      onClick={() => setOpenAccordion(isOpen ? null : item.id)}
                      className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-skd-muted/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {isCorrect ? 
                          <CheckCircle2 className="text-skd-success shrink-0" size={24} /> : 
                          <XCircle className="text-skd-danger shrink-0" size={24} />
                        }
                        <span className="font-medium text-sm md:text-base text-skd-text line-clamp-1">{item.question}</span>
                      </div>
                      {isOpen ? <ChevronUp size={20} className="text-skd-muted shrink-0" /> : <ChevronDown size={20} className="text-skd-muted shrink-0" />}
                    </button>
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="px-4 md:px-5 pb-5 border-t border-skd-border text-sm md:text-base"
                        >
                          <div className="pt-4 space-y-4">
                            <p className="text-skd-text leading-relaxed">{item.question}</p>
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="bg-skd-muted/5 px-4 py-3 rounded-xl flex-1 border border-skd-border/50">
                                <span className="text-xs text-skd-muted font-bold block mb-1">Jawaban Kamu</span>
                                <span className={`font-bold ${isCorrect ? 'text-skd-success' : 'text-skd-danger'}`}>Opsi {item.userAnswer}</span>
                              </div>
                              {!isCorrect && (
                                <div className="bg-skd-success/5 px-4 py-3 rounded-xl flex-1 border border-skd-success/20">
                                  <span className="text-xs text-skd-muted font-bold block mb-1">Kunci Jawaban</span>
                                  <span className="font-bold text-skd-success">Opsi {item.correctAnswer}</span>
                                </div>
                              )}
                            </div>
                            <div className="bg-skd-accent/5 p-4 rounded-xl border border-skd-accent/20 text-skd-text">
                              <span className="font-bold text-skd-accent block mb-2 text-xs tracking-wider">PEMBAHASAN</span>
                              <p className="whitespace-pre-line leading-relaxed">{item.explanation}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
