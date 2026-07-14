import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Brain, Activity, Clock, Flame, Shield, ArrowRight, Play, Loader2, Sparkles } from 'lucide-react';
import { fetchProfile, getWrongQuestions, getWrongBooksStats, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import MathCard from '../components/MathCard';

export default function WrongBook() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [stats, setStats] = useState({ twk: 0, tiu: 0, tkp: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'twk' | 'tiu' | 'tkp'>('all');

  useEffect(() => {
    async function loadData() {
      try {
        const p = await fetchProfile();
        setProfile(p);
        
        if (p?.id && isSupabaseConfigured()) {
          const fetchedStats = await getWrongBooksStats(p.id);
          setStats(fetchedStats);
          
          const filter = activeTab === 'all' ? undefined : activeTab;
          const fetchedQuestions = await getWrongQuestions(p.id, filter);
          setQuestions(fetchedQuestions);
        }
      } catch (err) {
        console.error('Error fetching wrong book data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTab]);

  const getCategoryColor = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'TWK': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'TIU': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'TKP': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getMasteryColor = (count: number) => {
    if (count === 0) return 'text-rose-500';
    if (count === 1) return 'text-amber-500';
    if (count === 2) return 'text-emerald-500';
    return 'text-primary';
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-syne animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <header className="pt-2 md:pt-4 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <BookOpen size={24} className="text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-fg">Buku Catatan Salah</h1>
          </div>
          <p className="text-sm md:text-base text-fg-muted">
            Latih kembali soal-soal yang pernah kamu jawab salah. Jawab benar 3 kali berturut-turut untuk mencapai level <strong className="text-primary">Mastery</strong>!
          </p>
        </div>
        
        <Button 
          onClick={() => navigate('/quiz', { state: { mode: 'catatan_salah' } })}
          disabled={questions.length === 0}
          className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all"
        >
          <Play size={18} className="fill-white" />
          Latih Ulang ({questions.length} Soal)
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { key: 'total', label: 'Total Soal Salah', value: stats.total, icon: Target, color: 'text-primary', bg: 'bg-primary/10' },
          { key: 'twk', label: 'Kelemahan TWK', value: stats.twk, icon: Brain, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { key: 'tiu', label: 'Kelemahan TIU', value: stats.tiu, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { key: 'tkp', label: 'Kelemahan TKP', value: stats.tkp, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map(s => (
          <div key={s.key} className="bg-surface border border-border p-5 rounded-3xl shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${s.bg}`}>
              <s.icon size={24} className={s.color} />
            </div>
            <div>
              <div className="text-sm font-bold text-fg-muted">{s.label}</div>
              <div className="text-2xl font-black font-space text-fg">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6">
        {[
          { id: 'all', label: 'Semua Kategori' },
          { id: 'twk', label: 'TWK' },
          { id: 'tiu', label: 'TIU' },
          { id: 'tkp', label: 'TKP' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all border-2 ${
              activeTab === tab.id
                ? 'border-primary bg-primary text-white shadow-md'
                : 'border-border bg-surface text-fg-muted hover:border-primary/50 hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
            <Loader2 size={40} className="animate-spin mb-4 text-primary" />
            <p className="font-medium">Memuat catatan salah...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-surface border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
              <Sparkles size={40} />
            </div>
            <h3 className="text-2xl font-bold text-fg mb-2">Luar Biasa!</h3>
            <p className="text-fg-muted max-w-md">
              Kamu tidak memiliki soal yang salah atau belum dikuasai di kategori ini. Teruskan performa hebatmu!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-surface border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  
                  {/* Info Badge */}
                  <div className="flex flex-row md:flex-col justify-between md:justify-start shrink-0 w-full md:w-32 gap-3">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border ${getCategoryColor(q.category)} inline-block text-center`}>
                      {q.category}
                    </span>
                    
                    <div className="bg-surface-subtle p-2 md:p-3 rounded-xl border border-border text-center flex-1 md:flex-none">
                      <div className="text-[10px] font-bold text-fg-muted uppercase mb-1">Mastery</div>
                      <div className="flex items-center justify-center gap-1">
                        <Flame size={16} className={getMasteryColor(q.mastery_count)} />
                        <span className={`font-space font-black text-lg ${getMasteryColor(q.mastery_count)}`}>
                          {q.mastery_count}<span className="text-sm opacity-50">/3</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-fg font-medium leading-relaxed mb-4">
                      <MathCard explanation={q.question} category={q.category} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                      {q.options.map((opt: any) => (
                        <div 
                          key={opt.id}
                          className={`p-3 rounded-xl text-sm border-2 flex items-start gap-3 ${
                            opt.id === q.correct
                              ? 'border-success/50 bg-success/10 text-success-foreground'
                              : 'border-border bg-surface-subtle text-fg-muted'
                          }`}
                        >
                          <div className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-lg font-space font-bold text-xs ${
                            opt.id === q.correct ? 'bg-success text-white' : 'bg-surface border border-border'
                          }`}>
                            {opt.id.toUpperCase()}
                          </div>
                          <div className="flex-1 pt-0.5 font-medium">
                            <MathCard explanation={opt.text} category={q.category} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
