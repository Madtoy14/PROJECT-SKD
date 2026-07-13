import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { AVAILABLE_PACKAGES } from '../data/tryout_packages';
import { Loader2 } from 'lucide-react';

export default function TryOutHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('all');

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data: { user } } = await supabase!.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase!
          .from('quiz_results')
          .select('id, session_id, package_id, score, twk_score, tiu_score, tkp_score, passed_overall, completed_at')
          .eq('user_id', user.id)
          .eq('mode', 'tryout')
          .order('completed_at', { ascending: false });
          
        if (error) throw error;
        if (data) setHistory(data);
      } catch (err) {
        console.error("Gagal memuat riwayat", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filteredHistory = selectedPackage === 'all' 
    ? history 
    : history.filter(h => h.package_id === selectedPackage);

  const latestScore = filteredHistory.length > 0 ? filteredHistory[0].score : 0;
  const bestScore = filteredHistory.length > 0 ? Math.max(...filteredHistory.map(h => h.score)) : 0;

  return (
    <div className="w-full">
      {/* Stats & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-bold text-fg-muted mb-1">Nilai Terbaru</p>
                <p className="text-3xl font-black text-primary">{latestScore}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-fg-muted mb-1">Nilai Terbaik</p>
                <p className="text-3xl font-black text-emerald-500">{bestScore}</p>
            </div>
        </div>
        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center">
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-fg focus:outline-none focus:border-primary transition-colors cursor-pointer"
            value={selectedPackage}
            onChange={e => setSelectedPackage(e.target.value)}
          >
            <option value="all">Semua Paket Try Out</option>
            {AVAILABLE_PACKAGES.map(pkg => (
              <option key={pkg.id} value={pkg.id}>{pkg.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <p className="text-fg-muted font-bold text-lg">Belum ada riwayat Try Out.</p>
            <p className="text-sm text-slate-400 mt-2">Mulai kerjakan Try Out untuk melihat perkembangan Anda di sini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => {
             const pkg = AVAILABLE_PACKAGES.find(p => p.id === item.package_id);
             return (
               <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                 <div>
                   <h3 className="font-bold text-fg text-lg">{pkg?.title || 'Paket Try Out'}</h3>
                   <p className="text-xs text-fg-muted font-bold mb-3">{new Date(item.completed_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
                   <div className="flex flex-wrap items-center gap-2">
                     <span className={`px-2.5 py-1 text-[10px] font-black tracking-wide rounded-md uppercase ${item.passed_overall ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                       {item.passed_overall ? 'Lulus' : 'Tidak Lulus'}
                     </span>
                     <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                       TWK: <span className="text-fg">{item.twk_score}</span>
                     </span>
                     <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                       TIU: <span className="text-fg">{item.tiu_score}</span>
                     </span>
                     <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                       TKP: <span className="text-fg">{item.tkp_score}</span>
                     </span>
                   </div>
                 </div>
                 <div className="flex items-center gap-5 justify-between md:justify-end border-t border-slate-100 md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                   <div className="text-left md:text-right">
                     <p className="text-[10px] text-fg-muted font-bold uppercase tracking-wider">Skor Total</p>
                     <p className="text-2xl font-black text-primary leading-none mt-1">{item.score}</p>
                   </div>
                   <div className="flex flex-col gap-2 shrink-0">
                     <Link to={`/result/${item.session_id}`} className="px-4 py-1.5 bg-primary text-white font-bold text-xs rounded-lg hover:bg-primary/90 text-center transition-colors">
                       Lihat Hasil
                     </Link>
                     <Link to={`/review/${item.session_id}`} className="px-4 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 text-center transition-colors">
                       Pembahasan
                     </Link>
                   </div>
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
