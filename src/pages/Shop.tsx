import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Scale, Lightbulb, Zap, LockKeyhole, Sparkles } from 'lucide-react';

const POWER_UPS = [
  { id: '5050', title: 'Eliminasi 50:50', description: 'Hapus 2 opsi jawaban yang salah.', cost: 300, icon: Scale, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'hint', title: 'Bocoran Rumus', description: 'Tampilkan rumus/petunjuk untuk soal hitungan.', cost: 250, icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'energy', title: 'Isi Energi Penuh', description: 'Isi bar energimu hingga maksimal.', cost: 500, icon: Zap, color: 'text-skd-success', bg: 'bg-skd-success/10' },
];

export default function Shop() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handlePurchase = (item: string) => {
    setToastMessage(`Berhasil membeli: ${item}!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 pb-24 relative min-h-screen max-w-5xl mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-skd-success text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] whitespace-nowrap"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="pt-2 md:pt-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-skd-text">Shop & Power-Ups</h1>
        <div className="flex items-center gap-1.5 bg-skd-card px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-skd-border shadow-sm">
          <Coins size={20} className="text-yellow-500 fill-yellow-500" />
          <span className="font-space font-bold text-skd-text md:text-lg">1,240</span>
        </div>
      </header>

      <section>
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-skd-text">Power-Ups</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {POWER_UPS.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handlePurchase(item.title)}
              className="bg-skd-card border border-skd-border hover:border-skd-muted/30 p-5 md:p-6 rounded-3xl flex flex-col items-start gap-4 text-left transition-all shadow-sm hover:shadow-md w-full"
            >
              <div className="flex items-center w-full justify-between">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                  <item.icon size={28} />
                </div>
                <div className="flex items-center gap-1.5 bg-skd-muted/10 px-4 py-2 rounded-xl shrink-0">
                  <Coins size={16} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-space font-bold text-yellow-600 dark:text-yellow-400">{item.cost}</span>
                </div>
              </div>
              
              <div className="flex-1 mt-2">
                <h3 className="font-bold text-base md:text-lg mb-2 text-skd-text">{item.title}</h3>
                <p className="text-sm text-skd-muted leading-relaxed">{item.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="pt-4">
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2 text-skd-text border-b border-skd-border pb-2">
          <Sparkles className="text-skd-premium" size={24} /> Premium Content
        </h2>
        
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handlePurchase('Paket Soal Rahasia TKP')}
          className="w-full relative rounded-[32px] p-[2px] bg-gradient-to-r from-skd-premium via-purple-500 to-skd-accent overflow-hidden group shadow-xl"
        >
          {/* Animated glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-skd-premium to-skd-accent blur opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none" />
          
          <div className="relative bg-[#1a1325] rounded-[30px] p-6 md:p-10 text-left flex flex-col md:flex-row items-start md:items-center gap-6 h-full">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-skd-premium to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <LockKeyhole size={32} className="text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-xl md:text-2xl text-white mb-2">Paket Soal Rahasia TKP</h3>
              <p className="text-sm md:text-base text-purple-200/80 mb-6 md:mb-0 max-w-xl leading-relaxed">
                Akses 100 soal HOTS terbaru dengan pembahasan super lengkap oleh tentor nasional.
              </p>
            </div>

            <div className="flex items-center justify-between md:flex-col md:items-end w-full md:w-auto gap-4">
              <div className="flex items-center gap-2 bg-black/40 px-5 py-2.5 rounded-2xl border border-white/10">
                <Coins size={20} className="text-yellow-400 fill-yellow-400" />
                <span className="font-space font-bold text-yellow-400 text-xl">1,000</span>
              </div>
              <div className="bg-skd-premium hover:bg-purple-500 transition-colors text-white text-sm font-bold px-6 py-3 rounded-full shadow-lg">
                Buka Akses
              </div>
            </div>
          </div>
        </motion.button>
      </section>
    </div>
  );
}
