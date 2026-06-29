import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle2, XCircle, ChevronLeft, ChevronRight, BookOpen, AlertCircle, HelpCircle, Menu,
  Lock, Unlock, Sparkles, Coins, ArrowRight, BookOpenCheck
} from 'lucide-react';
import { fetchProfile, fetchQuestionsFromSupabase } from '../lib/supabase';
import MathCard from '../components/MathCard';
import type { UserProfile } from '../lib/supabase';
function cleanMathText(text: string): string {
  if (!text) return "";
  let cleaned = text;
  if (typeof document !== 'undefined') { const txt = document.createElement('textarea'); txt.innerHTML = cleaned; cleaned = txt.value; }
  // Replace LaTeX delimiters safely
  cleaned = cleaned.split('\\\\[').join(' ');
  cleaned = cleaned.split('\\\\]').join(' ');
  cleaned = cleaned.split('\\[').join(' ');
  cleaned = cleaned.split('\\]').join(' ');
  cleaned = cleaned.split('\\(').join(' ');
  cleaned = cleaned.split('\\)').join(' ');
  cleaned = cleaned.split('\\[').join(' ');
  cleaned = cleaned.split('\\]').join(' ');
  cleaned = cleaned.split('\\(').join(' ');
  cleaned = cleaned.split('\\)').join(' ');
  
  // Replace \frac{A}{B} and rac{A}{B} with A/B
  cleaned = cleaned.replace(/\\\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2');
  
  // Replace \text{...} and 	ext{...} with ...
  cleaned = cleaned.replace(/\\\\text\{([^}]+)\}/g, '$1');
  cleaned = cleaned.replace(/\\text\{([^}]+)\}/g, '$1');
  
  // Replace standard latex symbols
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
  
  // Clean multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}
export default function PembahasanTryout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(() => {
    return location.state?.quizQuestions ? 'live_tryout' : null;
  });
  const [loadedQuestions, setLoadedQuestions] = useState<any[]>(() => location.state?.quizQuestions || []);
  const [loadedAnswers, setLoadedAnswers] = useState<Record<number, string>>(() => location.state?.userAnswers || {});
  const [loadedDoubtful, setLoadedDoubtful] = useState<Record<number, boolean>>(() => location.state?.doubtfulMap || {});
  const [activeIndex, setActiveIndex] = useState(0);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'TWK' | 'TIU' | 'TKP' | 'RAGU'>('ALL');
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showLockedToast, setShowLockedToast] = useState<string | null>(null);
  useEffect(() => {
    fetchProfile().then(p => setProfile(p));
  }, []);
  const handleSelectPackage = async (pkgId: string) => {
    const isUnlocked = pkgId === 'paket_tryout_gratis' || profile?.unlocked_avatars?.includes(pkgId);
    if (!isUnlocked) {
      setShowLockedToast(`Oops! Paket ini masih terkunci. Silakan buka Paket Premium di Toko!`);
      setTimeout(() => setShowLockedToast(null), 3000);
      return;
    }
    try {
      // Ambil data asli database Supabase!
      const questionsData = await fetchQuestionsFromSupabase('tryout');
      
      let finalQuestions = [...questionsData];
      
      if (pkgId === 'paket_tryout_gratis') {
        finalQuestions = questionsData;
      } else if (pkgId.includes('_tkp')) {
        finalQuestions = questionsData.filter((q: any) => q.category === 'TKP');
      } else if (pkgId.includes('_tiu')) {
        finalQuestions = questionsData.filter((q: any) => q.category === 'TIU');
      } else if (pkgId.includes('_twk')) {
        finalQuestions = questionsData.filter((q: any) => q.category === 'TWK');
      }
      // Customize questions dynamically per package to make them unique and catalog-ready!
      if (pkgId !== 'paket_tryout_gratis') {
        const pkgSuffix = pkgId === 'paket_premium_tkp_1' ? ' [TKP Premium HOTS 1]'
          : pkgId === 'paket_premium_tkp_2' ? ' [TKP Profesionalisme 2]'
          : pkgId === 'paket_premium_tiu_1' ? ' [TIU Kuantitatif 1]'
          : pkgId === 'paket_premium_tiu_2' ? ' [TIU Analitis 2]'
          : pkgId === 'paket_premium_twk_1' ? ' [TWK UUD 1945 1]'
          : pkgId === 'paket_premium_twk_2' ? ' [TWK Bela Negara 2]'
          : pkgId === 'paket_tryout_akbar_1' ? ' [TO Akbar CPNS 1]'
          : pkgId === 'paket_tryout_akbar_2' ? ' [TO Akbar CPNS 2]'
          : pkgId === 'paket_spesialis_bumn' ? ' [Simulasi BUMN]'
          : '';
        finalQuestions = finalQuestions.map((q: any, idx: number) => {
          const cloned = JSON.parse(JSON.stringify(q));
          cloned.id = cloned.id + `_${pkgId}`;
          cloned.text = `[${pkgSuffix.trim()}] Soal ${idx + 1}: ${cloned.text.replace(/^Soal \d+:\s*/i, '')}`;
          return cloned;
        });
      }
      setLoadedQuestions(finalQuestions);
      setLoadedAnswers({});
      setLoadedDoubtful({});
      setActiveIndex(0);
      setFilterCategory('ALL');
      setSelectedPackageId(pkgId);
    } catch (err) {
      console.error("Failed to load questions", err);
    }
  };
  const PACKAGES = [
    { id: 'paket_tryout_gratis', title: 'CAT Try Out Standar', type: 'Gratis', description: 'Simulasi lengkap try out BKN standar nasional TWK, TIU, TKP.', cost: 0, isFree: true, gradient: 'from-blue-600/20 to-cyan-600/20', iconColor: 'text-blue-400' },
    { id: 'paket_premium_tkp_1', title: 'Paket Soal Rahasia TKP 1', type: 'Premium HOTS', description: 'Pembahasan 100 soal TKP HOTS pilar pelayanan publik & profesionalisme.', cost: 1000, isFree: false, gradient: 'from-amber-600/20 to-purple-600/20', iconColor: 'text-amber-400' },
    { id: 'paket_premium_tkp_2', title: 'Paket Soal Rahasia TKP 2', type: 'Premium HOTS', description: 'Pembahasan soal TKP bertema jejaring kerja & anti radikalisme.', cost: 1000, isFree: false, gradient: 'from-amber-600/20 to-red-600/20', iconColor: 'text-amber-400' },
    { id: 'paket_premium_tiu_1', title: 'Trik TIU Numerik 1', type: 'Premium Trik', description: 'Pembahasan trik matematika numerik, deret aritmatika cepat, & penalaran logis.', cost: 1000, isFree: false, gradient: 'from-purple-600/20 to-pink-600/20', iconColor: 'text-purple-400' },
    { id: 'paket_premium_tiu_2', title: 'Trik TIU Analitis 2', type: 'Premium Trik', description: 'Pembahasan taktis silogisme, diagram venn, & penalaran analitis spasial.', cost: 1000, isFree: false, gradient: 'from-purple-600/20 to-indigo-600/20', iconColor: 'text-purple-400' },
    { id: 'paket_premium_twk_1', title: 'Hafalan UUD TWK 1', type: 'Premium Hafalan', description: 'Pembahasan materi pilar negara, UUD 1945, & nasionalisme secara mendalam.', cost: 1000, isFree: false, gradient: 'from-emerald-600/20 to-teal-600/20', iconColor: 'text-emerald-400' },
    { id: 'paket_premium_twk_2', title: 'Pilar Negara TWK 2', type: 'Premium Hafalan', description: 'Pembahasan soal TWK bela negara, patriotisme, & sejarah perjuangan bangsa.', cost: 1000, isFree: false, gradient: 'from-emerald-600/20 to-cyan-600/20', iconColor: 'text-emerald-400' },
    { id: 'paket_tryout_akbar_1', title: 'Try Out Akbar CPNS 1', type: 'Tryout Akbar', description: 'Pembahasan lengkap Try Out Akbar CAT serentak peringkat nasional 1.', cost: 1500, isFree: false, gradient: 'from-blue-600/20 to-indigo-600/20', iconColor: 'text-blue-400' },
    { id: 'paket_tryout_akbar_2', title: 'Try Out Akbar CPNS 2', type: 'Tryout Akbar', description: 'Pembahasan lengkap Try Out Akbar CAT serentak peringkat nasional 2.', cost: 1500, isFree: false, gradient: 'from-blue-600/20 to-violet-600/20', iconColor: 'text-blue-400' },
    { id: 'paket_spesialis_bumn', title: 'Simulasi Khusus BUMN', type: 'Spesialis BUMN', description: 'Materi soal pembahasan TKD & Core Values Akhlak persiapan BUMN.', cost: 2000, isFree: false, gradient: 'from-orange-600/20 to-yellow-600/20', iconColor: 'text-orange-400' },
  ];
  // Render Package Selection Dashboard if no package is selected
  if (!selectedPackageId) {
    return (
      <div className="min-h-screen bg-skd-bg text-skd-text p-4 md:p-10 pb-24 relative overflow-y-auto max-w-5xl mx-auto flex flex-col justify-start">
        {/* Back to Home Button */}
        <div className="flex justify-start mb-6 mt-2">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-xs font-bold text-skd-muted hover:text-skd-text transition-colors bg-skd-card/40 px-4 py-2 rounded-full border border-skd-border shadow-sm active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </button>
        </div>
        {/* Toast Notification */}
        <AnimatePresence>
          {showLockedToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-skd-danger shadow-[0_0_20px_rgba(239,68,68,0.4)] text-white px-6 py-3 rounded-full font-bold whitespace-nowrap"
            >
              {showLockedToast}
            </motion.div>
          )}
        </AnimatePresence>
        <header className="mb-8 text-center max-w-2xl mx-auto">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 mx-auto bg-skd-primary/10 rounded-3xl flex items-center justify-center border border-skd-primary/20 mb-4 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
          >
            <BookOpenCheck className="text-skd-primary" size={32} />
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-skd-text to-skd-muted bg-clip-text text-transparent">Pembahasan Try Out Premium</h1>
          <p className="text-sm text-skd-muted mt-2 leading-relaxed">
            Pilih paket pembahasan untuk memperdalam materi ujian CAT SKD. Konten premium terproteksi memerlukan pembelian terlebih dahulu.
          </p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {PACKAGES.map((pkg, idx) => {
            const isUnlocked = pkg.isFree || profile?.unlocked_avatars?.includes(pkg.id);
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.03 }}
                className={`bg-skd-card/60 backdrop-blur-sm border border-skd-border hover:border-skd-primary/30 p-6 rounded-[32px] relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all group`}
              >
                {/* Background glow gradient */}
                <div className={`absolute -inset-10 bg-gradient-to-br ${pkg.gradient} blur-2xl opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none`} />
                <div className="relative mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full ${pkg.isFree ? 'bg-skd-success/15 text-skd-success border border-skd-success/20' : 'bg-skd-premium/10 text-skd-accent border border-skd-premium/20'}`}>
                      {pkg.type}
                    </span>
                    {isUnlocked ? (
                      <Unlock className="text-skd-success" size={18} />
                    ) : (
                      <Lock className="text-skd-muted" size={18} />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-skd-text mb-2 tracking-tight">{pkg.title}</h3>
                  <p className="text-xs text-skd-muted leading-relaxed mb-6 h-12 overflow-hidden">{pkg.description}</p>
                </div>
                <div className="relative pt-4 border-t border-skd-border/40 mt-4">
                  {isUnlocked ? (
                    <button
                      onClick={() => handleSelectPackage(pkg.id)}
                      className="w-full py-3 bg-gradient-to-r from-skd-primary to-purple-600 hover:from-purple-600 hover:to-skd-primary text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5 text-sm"
                    >
                      <span>Buka Pembahasan</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-skd-muted font-medium">Buka Kunci:</span>
                        <span className="font-space font-bold text-yellow-400 flex items-center gap-1">
                          <Coins size={14} className="fill-yellow-400" />
                          {pkg.cost} Koin
                        </span>
                      </div>
                      <Link
                        to="/toko"
                        className="w-full py-3 bg-skd-muted/10 hover:bg-skd-muted/20 text-skd-text font-black rounded-2xl text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-skd-border"
                      >
                        <Sparkles size={14} className="text-skd-premium animate-pulse" />
                        <span>Beli di Toko</span>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }
  const userAnswers = loadedAnswers;
  const quizQuestions = loadedQuestions;
  const doubtfulMap = loadedDoubtful;
  const activeQuestion = quizQuestions[activeIndex];
  const totalQuestions = quizQuestions.length;
  // Filtered indices list
  const filteredIndices = quizQuestions
    .map((q: any, idx: number) => ({ q, idx }))
    .filter((item: any) => {
      if (filterCategory === 'ALL') return true;
      if (filterCategory === 'RAGU') return doubtfulMap[item.idx] === true;
      return item.q.category === filterCategory;
    });
  // Status helpers
  const getQuestionStatus = (idx: number) => {
    const q = quizQuestions[idx];
    const userAns = userAnswers[idx];
    if (!userAns) return 'unanswered';
    return userAns === q.correct ? 'correct' : 'incorrect';
  };
  const answeredCorrectCount = quizQuestions.filter((q: any, idx: number) => userAnswers[idx] === q.correct).length;
  const answeredIncorrectCount = quizQuestions.filter((q: any, idx: number) => userAnswers[idx] && userAnswers[idx] !== q.correct).length;
  const unansweredCount = totalQuestions - (answeredCorrectCount + answeredIncorrectCount);
  // Radar Chart calculations for Try Out
  const isTryoutResult = !!location.state?.quizQuestions;
  let twkScore = 0;
  let tiuScore = 0;
  let tkpScore = 0;
  let twkQuestionsCount = 0;
  let tiuQuestionsCount = 0;
  let tkpQuestionsCount = 0;
  if (isTryoutResult) {
    quizQuestions.forEach((q: any, idx: number) => {
      const isTWK = q.category === 'TWK';
      const isTIU = q.category === 'TIU';
      const isTKP = q.category === 'TKP';
      if (isTWK) twkQuestionsCount++;
      if (isTIU) tiuQuestionsCount++;
      if (isTKP) tkpQuestionsCount++;
      const ans = userAnswers[idx];
      if (ans) {
        const opt = q.options.find((o: any) => o.id === ans);
        if (opt) {
          if (isTWK) twkScore += opt.score;
          if (isTIU) tiuScore += opt.score;
          if (isTKP) tkpScore += opt.score;
        }
      }
    });
  }
  const twkPassThreshold = twkQuestionsCount === 30 ? 65 : Math.round(twkQuestionsCount * 2.16);
  const tiuPassThreshold = tiuQuestionsCount === 35 ? 80 : Math.round(tiuQuestionsCount * 2.28);
  const tkpPassThreshold = tkpQuestionsCount === 45 ? 166 : Math.round(tkpQuestionsCount * 3.69);
  const isLulusSkd = twkScore >= twkPassThreshold && tiuScore >= tiuPassThreshold && tkpScore >= tkpPassThreshold;
  const getRadarPoint = (cx: number, cy: number, r: number, angleDeg: number, val: number, max: number) => {
    const factor = Math.min(1, Math.max(0, val / (max || 1)));
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = cx + r * factor * Math.cos(angleRad);
    const y = cy + r * factor * Math.sin(angleRad);
    return { x, y };
  };
  // Next / Prev actions
  const handlePrev = () => {
    const currentFilteredPos = filteredIndices.findIndex((item: any) => item.idx === activeIndex);
    if (currentFilteredPos > 0) {
      setActiveIndex(filteredIndices[currentFilteredPos - 1].idx);
    }
  };
  const handleNext = () => {
    const currentFilteredPos = filteredIndices.findIndex((item: any) => item.idx === activeIndex);
    if (currentFilteredPos < filteredIndices.length - 1) {
      setActiveIndex(filteredIndices[currentFilteredPos + 1].idx);
    }
  };
  return (
    <div className="flex flex-col h-screen bg-skd-bg text-skd-text font-syne overflow-hidden">
      
      {/* Top Navigation Header */}
      <header className="p-4 border-b border-skd-border bg-skd-card/60 backdrop-blur-md z-10 flex items-center justify-between shrink-0">
        <button 
          onClick={() => {
            if (location.state?.quizQuestions) {
              navigate('/pembahasan-tryout', { replace: true, state: null });
              setSelectedPackageId(null);
            } else {
              setSelectedPackageId(null);
            }
          }} 
          className="flex items-center gap-2 text-xs font-bold text-skd-muted hover:text-skd-text transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{location.state?.quizQuestions ? 'Kembali ke Katalog' : 'Kembali ke Katalog'}</span>
        </button>
        <div className="text-center">
          <h1 className="text-xs md:text-base font-black tracking-tight uppercase flex items-center gap-1.5 justify-center">
            <BookOpen size={16} className="text-skd-accent shrink-0" />
            <span className="hidden md:inline">ANALISIS LEMBAR PEMBAHASAN TRY OUT</span>
            <span className="md:hidden">PEMBAHASAN TO</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 font-space text-[10px] font-bold text-skd-muted bg-[#1A1924] px-4 py-1.5 rounded-full border border-skd-border">
            <span className="text-skd-success">Benar: {answeredCorrectCount}</span>
            <span className="text-white/20">|</span>
            <span className="text-skd-danger">Salah: {answeredIncorrectCount}</span>
            <span className="text-white/20">|</span>
            <span className="text-gray-400">Kosong: {unansweredCount}</span>
          </div>
          <button onClick={() => setShowSidebarMobile(true)} className="lg:hidden p-2 text-skd-text hover:bg-skd-muted/10 rounded-xl transition-colors">
            <Menu size={20} />
          </button>
        </div>
      </header>
      {/* Main Split Layout container */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* === SIDEBAR: Kisi Soal Navigasi (Left) === */}
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-r border-skd-border bg-skd-card/30 backdrop-blur-sm h-full shrink-0">
          
          {/* Radar Chart Analysis if viewing live results */}
          {isTryoutResult && (
            <div className="p-4 border-b border-skd-border shrink-0 flex flex-col items-center gap-2 bg-white/5">
              <h4 className="text-[10px] font-black text-skd-accent uppercase tracking-widest font-space">Rapor Kompetensi CAT</h4>
              
              <div className="relative w-40 h-40 flex items-center justify-center">
                {(() => {
                  const cx = 80;
                  const cy = 80;
                  const r = 50;
                  
                  const maxTWK = twkQuestionsCount * 5 || 150;
                  const maxTIU = tiuQuestionsCount * 5 || 175;
                  const maxTKP = tkpQuestionsCount * 5 || 225;
                  
                  const twkOuter = getRadarPoint(cx, cy, r, -90, maxTWK, maxTWK);
                  const tiuOuter = getRadarPoint(cx, cy, r, 30, maxTIU, maxTIU);
                  const tkpOuter = getRadarPoint(cx, cy, r, 150, maxTKP, maxTKP);
                  
                  const grids = [0.25, 0.5, 0.75, 1.0].map(scale => {
                    const pTWK = getRadarPoint(cx, cy, r, -90, maxTWK * scale, maxTWK);
                    const pTIU = getRadarPoint(cx, cy, r, 30, maxTIU * scale, maxTIU);
                    const pTKP = getRadarPoint(cx, cy, r, 150, maxTKP * scale, maxTKP);
                    return `${pTWK.x},${pTWK.y} ${pTIU.x},${pTIU.y} ${pTKP.x},${pTKP.y}`;
                  });
                  
                  const twkMin = getRadarPoint(cx, cy, r, -90, twkPassThreshold, maxTWK);
                  const tiuMin = getRadarPoint(cx, cy, r, 30, tiuPassThreshold, maxTIU);
                  const tkpMin = getRadarPoint(cx, cy, r, 150, tkpPassThreshold, maxTKP);
                  const minPoints = `${twkMin.x},${twkMin.y} ${tiuMin.x},${tiuMin.y} ${tkpMin.x},${tkpMin.y}`;
                  
                  const twkUser = getRadarPoint(cx, cy, r, -90, twkScore, maxTWK);
                  const tiuUser = getRadarPoint(cx, cy, r, 30, tiuScore, maxTIU);
                  const tkpUser = getRadarPoint(cx, cy, r, 150, tkpScore, maxTKP);
                  const userPoints = `${twkUser.x},${twkUser.y} ${tiuUser.x},${tiuUser.y} ${tkpUser.x},${tkpUser.y}`;
                  
                  return (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 160 160">
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
                        fill="rgba(239,68,68,0.05)" 
                        stroke="#EF4444" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />
                      
                      <polygon 
                        points={userPoints} 
                        fill={isLulusSkd ? "rgba(16,185,129,0.18)" : "rgba(245,166,35,0.18)"} 
                        stroke={isLulusSkd ? "#10B981" : "#F5A623"} 
                        strokeWidth="2" 
                      />
                      
                      <circle cx={cx} cy={cy} r="2" fill="#FFF" opacity="0.3" />
                      
                      <text x={twkOuter.x} y={twkOuter.y - 6} textAnchor="middle" className="fill-purple-400 font-bold font-space text-[8px]">
                        TWK ({twkScore})
                      </text>
                      
                      <text x={tiuOuter.x + 6} y={tiuOuter.y + 3} textAnchor="start" className="fill-blue-400 font-bold font-space text-[8px]">
                        TIU ({tiuScore})
                      </text>
                      
                      <text x={tkpOuter.x - 6} y={tkpOuter.y + 3} textAnchor="end" className="fill-orange-400 font-bold font-space text-[8px]">
                        TKP ({tkpScore})
                      </text>
                    </svg>
                  );
                })()}
              </div>
              <div className="flex gap-4 text-[9px] font-bold mt-1 text-skd-muted">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-skd-accent rounded-full" /> Skor Anda</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-skd-danger rounded-full" /> Passing Grade</span>
              </div>
            </div>
          )}
          
          {/* Category Filter buttons */}
          <div className="p-4 border-b border-skd-border shrink-0">
            <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-wide">KATEGORI SOAL</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {(['ALL', 'TWK', 'TIU', 'TKP', 'RAGU'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilterCategory(cat);
                    // Reset activeIndex to the first question in that filter
                    const match = quizQuestions.findIndex((q: any, i: number) => cat === 'ALL' || (cat === 'RAGU' ? doubtfulMap[i] === true : q.category === cat));
                    if (match !== -1) setActiveIndex(match);
                  }}
                  className={`py-1.5 text-[10px] font-black rounded-lg border text-center transition-all ${
                    cat === 'RAGU' && filterCategory === 'RAGU' ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/10' :
                    cat === 'RAGU' ? 'bg-[#1A1924] border-red-500/30 text-red-400 hover:text-red-300' :
                    filterCategory === cat
                      ? 'bg-skd-accent border-skd-accent text-[#0F0E17] shadow-sm shadow-skd-accent/10'
                      : 'bg-[#1A1924] border-skd-border text-skd-muted hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Numbers Grid Container */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredIndices.map(({ q, idx }: { q: any; idx: number }) => {
                const status = getQuestionStatus(idx);
                const isCurrent = activeIndex === idx;
                let btnClass = 'bg-[#1A1924] border-skd-border text-gray-500 hover:border-white/20';
                
                if (isCurrent) {
                  btnClass = 'bg-blue-500 border-blue-500 text-white shadow-lg ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#1A1924] scale-105 z-10';
                } else if (status === 'correct') {
                  btnClass = 'bg-skd-success/15 border-skd-success/50 text-skd-success font-black';
                } else if (status === 'incorrect') {
                  btnClass = 'bg-skd-danger/15 border-skd-danger/50 text-skd-danger font-black';
                }
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`w-10 h-10 lg:w-9 lg:h-9 xl:w-11 xl:h-11 rounded-xl border flex items-center justify-center text-xs font-bold transition-all relative ${btnClass}`}
                  >
                    {idx + 1}
                    {/* Small category dot */}
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      q.category === 'TWK' ? 'bg-purple-400' : q.category === 'TIU' ? 'bg-blue-400' : 'bg-orange-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Legend indicators */}
          <div className="p-4 border-t border-skd-border bg-skd-card/50 text-[10px] font-bold text-skd-muted grid grid-cols-3 gap-2 text-center shrink-0">
            <div className="flex flex-col items-center p-1 rounded bg-skd-success/10 text-skd-success border border-skd-success/20">
              <span>BENAR</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-skd-danger/10 text-skd-danger border border-skd-danger/20">
              <span>SALAH</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-white/5 border border-white/10 text-gray-400">
              <span>KOSONG</span>
            </div>
          </div>
        
        </aside>
        {/* Mobile Sidebar */}
        <AnimatePresence>
          {showSidebarMobile && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebarMobile(false)} />
              <motion.aside initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'spring', damping:25, stiffness:200}} className="fixed inset-y-0 left-0 w-80 bg-skd-bg border-r border-skd-border z-50 lg:hidden flex flex-col shadow-2xl">
                <div className="p-4 border-b border-skd-border flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-skd-text text-sm flex items-center gap-2"><BookOpen size={16}/> Navigasi</h3>
                  <button onClick={() => setShowSidebarMobile(false)} className="p-1 text-skd-muted hover:text-skd-text"><XCircle size={20}/></button>
                </div>
                
          {/* Category Filter buttons */}
          <div className="p-4 border-b border-skd-border shrink-0">
            <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-wide">KATEGORI SOAL</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {(['ALL', 'TWK', 'TIU', 'TKP', 'RAGU'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilterCategory(cat);
                    // Reset activeIndex to the first question in that filter
                    const match = quizQuestions.findIndex((q: any, i: number) => cat === 'ALL' || (cat === 'RAGU' ? doubtfulMap[i] === true : q.category === cat));
                    if (match !== -1) setActiveIndex(match);
                  }}
                  className={`py-1.5 text-[10px] font-black rounded-lg border text-center transition-all ${
                    cat === 'RAGU' && filterCategory === 'RAGU' ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/10' :
                    cat === 'RAGU' ? 'bg-[#1A1924] border-red-500/30 text-red-400 hover:text-red-300' :
                    filterCategory === cat
                      ? 'bg-skd-accent border-skd-accent text-[#0F0E17] shadow-sm shadow-skd-accent/10'
                      : 'bg-[#1A1924] border-skd-border text-skd-muted hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Numbers Grid Container */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredIndices.map(({ q, idx }: { q: any; idx: number }) => {
                const status = getQuestionStatus(idx);
                const isCurrent = activeIndex === idx;
                let btnClass = 'bg-[#1A1924] border-skd-border text-gray-500 hover:border-white/20';
                
                if (isCurrent) {
                  btnClass = 'bg-blue-500 border-blue-500 text-white shadow-lg ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#1A1924] scale-105 z-10';
                } else if (status === 'correct') {
                  btnClass = 'bg-skd-success/15 border-skd-success/50 text-skd-success font-black';
                } else if (status === 'incorrect') {
                  btnClass = 'bg-skd-danger/15 border-skd-danger/50 text-skd-danger font-black';
                }
                return (
                  <button
                    key={idx}
                    onClick={() => { setActiveIndex(idx); setShowSidebarMobile(false); }}
                    className={`w-10 h-10 lg:w-9 lg:h-9 xl:w-11 xl:h-11 rounded-xl border flex items-center justify-center text-xs font-bold transition-all relative ${btnClass}`}
                  >
                    {idx + 1}
                    {/* Small category dot */}
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      q.category === 'TWK' ? 'bg-purple-400' : q.category === 'TIU' ? 'bg-blue-400' : 'bg-orange-400'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Legend indicators */}
          <div className="p-4 border-t border-skd-border bg-skd-card/50 text-[10px] font-bold text-skd-muted grid grid-cols-3 gap-2 text-center shrink-0">
            <div className="flex flex-col items-center p-1 rounded bg-skd-success/10 text-skd-success border border-skd-success/20">
              <span>BENAR</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-skd-danger/10 text-skd-danger border border-skd-danger/20">
              <span>SALAH</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-white/5 border border-white/10 text-gray-400">
              <span>KOSONG</span>
            </div>
          </div>
        
              </motion.aside>
            </>
          )}
        </AnimatePresence>
  
        {/* === MAIN PANEL: Soal & Teori Pembahasan (Right) === */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              
              {/* Question Header Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-skd-border pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    activeQuestion.category === 'TWK' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    activeQuestion.category === 'TIU' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  }`}>
                    {activeQuestion.category} Soal Ke-{activeIndex + 1}
                  </span>
                  {userAnswers[activeIndex] ? (
                    userAnswers[activeIndex] === activeQuestion.correct ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-skd-success/10 text-skd-success border border-skd-success/20">
                        <CheckCircle2 size={14} /> Benar
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-skd-danger/10 text-skd-danger border border-skd-danger/20">
                        <XCircle size={14} /> Salah
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/5 text-gray-400 border border-white/10">
                      Tidak Dijawab
                    </span>
                  )}
                </div>
                
                {/* Weight indicator for TKP */}
                {activeQuestion.category === 'TKP' && (
                  <span className="text-xs font-space font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                    Nilai Bobot TKP: {userAnswers[activeIndex] ? (activeQuestion.options.find((o: any) => o.id === userAnswers[activeIndex])?.score || 0) : 0} / 5 pts
                  </span>
                )}
              </div>
              {/* Question Text Box */}
              <div className="bg-skd-card p-6 md:p-8 rounded-[1.5rem] border border-skd-border shadow-sm">
                <p className="text-base md:text-lg leading-relaxed text-skd-text font-medium" dangerouslySetInnerHTML={{ __html: cleanMathText(activeQuestion.text) }} />
              </div>
              {/* Options comparison */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 tracking-wide uppercase">Pilihan Jawaban & Hasil Analisis:</h3>
                {activeQuestion.options.map((opt: any) => {
                  const isUserPick = userAnswers[activeIndex] === opt.id;
                  const isBestKey  = opt.id === activeQuestion.correct;
                  const isTKP = activeQuestion.category === 'TKP';
                  let cardClass = 'bg-skd-card border-skd-border opacity-40';
                  let markerClass = 'bg-skd-muted/10 text-skd-muted';
                  let statusLabel = null;
                  if (isBestKey) {
                    cardClass = 'bg-skd-success/15 border-skd-success shadow-sm';
                    markerClass = 'bg-skd-success text-white font-black';
                    statusLabel = (
                      <span className="ml-auto flex items-center gap-1 text-xs font-black text-skd-success bg-skd-success/10 px-3 py-1 rounded-full border border-skd-success/20">
                        {isTKP ? 'Skor 5 (Kunci Terbaik)' : 'Kunci Jawaban'}
                      </span>
                    );
                  } 
                  
                  if (isUserPick) {
                    if (isBestKey) {
                      cardClass = 'bg-skd-success/20 border-skd-success ring-2 ring-skd-success/20 shadow-md';
                      markerClass = 'bg-skd-success text-white font-black animate-pulse';
                    } else {
                      cardClass = 'bg-skd-danger/15 border-skd-danger shadow-sm opacity-100';
                      markerClass = 'bg-skd-danger text-white font-black';
                      statusLabel = (
                        <span className="ml-auto flex items-center gap-1 text-xs font-black text-skd-danger bg-skd-danger/10 px-3 py-1 rounded-full border border-skd-danger/20">
                          {isTKP ? `Pilihan Anda (Skor ${opt.score})` : 'Pilihan Anda (Salah)'}
                        </span>
                      );
                    }
                  } else if (isTKP) {
                    // Show points score for TKP other options as they are always slightly active
                    cardClass = 'bg-skd-card border-skd-border/80 opacity-75';
                    if (!isBestKey) {
                      statusLabel = (
                        <span className="ml-auto text-[10px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">
                          Skor {opt.score}
                        </span>
                      );
                    }
                  }
                  return (
                    <div 
                      key={opt.id}
                      className={`w-full p-4 md:p-5 rounded-2xl border transition-all flex items-center gap-4 ${cardClass}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold font-space ${markerClass}`}>
                        {opt.id}
                      </div>
                      <span className="text-xs md:text-sm font-medium leading-relaxed text-skd-text" dangerouslySetInnerHTML={{ __html: cleanMathText(opt.text) }} />
                      {statusLabel}
                    </div>
                  );
                })}
              </div>
              {/* Theory Explanation Card */}
              <div className="bg-skd-card border border-skd-border rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-skd-border pb-3">
                  <div className="w-9 h-9 rounded-xl bg-skd-accent/10 text-skd-accent flex items-center justify-center">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-skd-text">Analisis Teori & Pembahasan</h4>
                    <p className="text-[10px] text-skd-muted font-bold font-space uppercase">Teori CAT CPNS BKN Standar Nasional</p>
                  </div>
                </div>
                <MathCard explanation={activeQuestion.explanation ? cleanMathText(activeQuestion.explanation) : "Pembahasan terperinci belum tersedia untuk soal ini. Untuk penyelesaian kuis Try Out ini, bacalah rangkuman teori dasar CPNS mengenai kompetensi ini."} category={activeQuestion.category} />
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Navigation buttons at bottom of Right Panel */}
          <div className="max-w-4xl mx-auto flex items-center justify-between border-t border-skd-border pt-6 mt-8 shrink-0">
            <button
              disabled={filteredIndices.findIndex((item: any) => item.idx === activeIndex) === 0}
              onClick={handlePrev}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1924] hover:bg-white/5 border border-skd-border text-skd-muted disabled:opacity-30 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              <ChevronLeft size={16} />
              <span>Sebelumnya</span>
            </button>
            <span className="text-[10px] text-skd-muted font-space font-black uppercase">
              Soal {filteredIndices.findIndex((item: any) => item.idx === activeIndex) + 1} dari {filteredIndices.length} Terfilter
            </span>
            <button
              disabled={filteredIndices.findIndex((item: any) => item.idx === activeIndex) === filteredIndices.length - 1}
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-skd-accent hover:bg-yellow-400 text-[#0F0E17] rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
            >
              <span>Selanjutnya</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}