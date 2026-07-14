import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Lock, Unlock, ChevronRight, Play, History, List } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { fetchProfile, supabase, type UserProfile } from '../lib/supabase';
import { AVAILABLE_PACKAGES } from '../data/tryout_packages';
import TryOutHistory from './TryOutHistory';

export default function TryOutLobby() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'lobby' | 'history'>('lobby');

  useEffect(() => {
    fetchProfile().then(p => setProfile(p));
  }, []);

  const handleStart = (pkgId: string) => {
    // Navigate to quiz with the package ID, or custom mode
    // Assuming quiz handles "packageId" via state.
    navigate('/quiz', { state: { mode: 'tryout', packageId: pkgId } });
  };

  const handleReview = async (pkgId: string) => {
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) {
        alert("Sesi tidak valid. Silakan login kembali.");
        return;
      }
      
      const { data, error } = await supabase!
        .from('quiz_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('package_id', pkgId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (data && data.id) {
        navigate(`/review/${data.id}`);
      } else {
        alert("Anda belum pernah menyelesaikan Try Out ini. Silakan mulai terlebih dahulu.");
      }
    } catch(err) {
      console.error("Gagal memuat riwayat pembahasan:", err);
      alert("Terjadi kesalahan saat memuat riwayat. Coba lagi.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen">
      <header className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-black text-fg mb-2">Try Out</h1>
        <p className="text-fg-muted">Pilih paket Try Out untuk menguji kemampuan Anda dan lihat pembahasannya.</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-sm mb-8 mx-auto md:mx-0">
        <button 
          onClick={() => setActiveTab('lobby')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'lobby' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <List size={16} />
          Daftar Paket
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History size={16} />
          Riwayat Nilai
        </button>
      </div>

      {activeTab === 'lobby' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_PACKAGES.map((pkg) => {
            // Check if unlocked (free or purchased)
            const isUnlocked = pkg.cost === 0 || (profile?.purchased_packages?.includes(pkg.id));
            
            return (
            <div key={pkg.id} className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col transition-all ${pkg.isDevelopment ? 'opacity-80 grayscale-[20%]' : 'hover:shadow-md hover:-translate-y-1'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${isUnlocked && !pkg.isDevelopment ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-400'}`}>
                  <BookOpenCheck size={24} />
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${pkg.isDevelopment ? 'bg-slate-100 text-slate-500' : isUnlocked ? 'bg-emerald-50 text-success' : 'bg-slate-50 text-slate-500'}`}>
                  {pkg.isDevelopment ? <Lock size={14} /> : isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                  {pkg.isDevelopment ? 'Dalam Pengembangan' : isUnlocked ? 'Terbuka' : 'Terkunci'}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-fg mb-2 leading-tight">{pkg.title}</h3>
              <p className="text-sm text-fg-muted leading-relaxed mb-4 flex-1">{pkg.description}</p>
              
              <div className="flex items-center justify-between text-xs text-fg-muted font-bold mb-6">
                <span>{pkg.totalQuestions} Soal</span>
                <span>Skor Maks: {pkg.totalQuestions * 5}</span>
              </div>

              {pkg.isDevelopment ? (
                <Button 
                  variant="secondary" 
                  className="w-full justify-center group opacity-70"
                  disabled
                >
                  <span>Segera Hadir</span>
                </Button>
              ) : isUnlocked ? (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="primary" 
                    className="w-full justify-center group"
                    onClick={() => handleStart(pkg.id)}
                  >
                    <Play size={16} className="mr-2" />
                    <span>Mulai Sekarang</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between group"
                    onClick={() => handleReview(pkg.id)}
                  >
                    <span>Lihat Pembahasan</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full justify-between group"
                  onClick={() => navigate('/toko')}
                >
                  <span>Buka Akses ({pkg.cost} Koin)</span>
                  <Lock size={18} className="text-slate-400" />
                </Button>
              )}
            </div>
          )})}
        </div>
      )}

      {activeTab === 'history' && <TryOutHistory />}
    </div>
  );
}
