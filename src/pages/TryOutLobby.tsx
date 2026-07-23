import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Lock, Unlock, ChevronRight, Play, History, List, Coins } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { fetchProfile, startTryoutAttempt, supabase, isSupabaseConfigured, type UserProfile } from '../lib/supabase';
import { AVAILABLE_PACKAGES } from '../data/tryout_packages';
import TryOutHistory from './TryOutHistory';

export default function TryOutLobby() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'lobby' | 'history'>('lobby');
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reloadProfile = () => fetchProfile().then(p => setProfile(p));

  useEffect(() => {
    reloadProfile();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const isPackageUnlocked = (pkgId: string, unlockCost: number) => {
    if (unlockCost === 0) return true;
    return !!profile?.purchased_packages?.includes(pkgId);
  };

  /** Model A: unlock permanen ≠ free attempt. Charge entry fee di lobby sebelum masuk quiz. */
  const handleStart = async (pkgId: string, attemptCost: number) => {
    if (!profile) return;
    if (startingId) return;

    // Free attempt (attemptCost 0) — langsung masuk
    if (attemptCost <= 0) {
      navigate('/quiz', {
        state: {
          mode: 'tryout',
          packageId: pkgId,
          coinCost: 0,
          tryoutPaid: true,
        },
      });
      return;
    }

    if ((profile.coins ?? 0) < attemptCost) {
      showToast(`Koin tidak cukup. Butuh ${attemptCost.toLocaleString('id-ID')} koin / attempt.`);
      return;
    }
    if (!isSupabaseConfigured()) {
      showToast('Koneksi server tidak tersedia.');
      return;
    }

    const tier = attemptCost >= 1500 ? 'akbar' : 'standar';
    setStartingId(pkgId);
    try {
      const result = await startTryoutAttempt(pkgId, tier);
      if (!result.success) {
        const r = (result.reason || '').toLowerCase();
        let msg = 'Gagal memotong biaya attempt. Coba lagi.';
        if (r === 'insufficient_coins') {
          msg = `Koin tidak cukup (butuh ${result.cost || attemptCost}).`;
        } else if (r === 'not_authenticated') {
          msg = 'Login dulu.';
        } else if (r.includes('could not find') || r.includes('does not exist') || r.includes('pgrst202')) {
          msg = 'RPC start_tryout_attempt belum ada di server. Apply SQL dulu.';
        } else if (r.includes('permission') || r.includes('42501')) {
          msg = 'Tidak punya izin RPC tryout. Cek GRANT authenticated.';
        } else if (result.reason && result.reason !== 'error' && result.reason !== 'failed') {
          msg = `Gagal attempt: ${result.reason}`;
        }
        showToast(msg);
        return;
      }
      // Sync saldo lokal
      setProfile((p) => (p ? { ...p, coins: result.coinsAfter } : p));
      navigate('/quiz', {
        state: {
          mode: 'tryout',
          packageId: pkgId,
          coinCost: 0, // sudah dibayar di lobby — Quiz jangan charge lagi
          tryoutPaid: true,
          tryoutCostPaid: result.cost,
        },
      });
    } catch (err) {
      console.error(err);
      showToast('Gagal memulai tryout.');
    } finally {
      setStartingId(null);
    }
  };

  const handleUnlock = async (pkgId: string, unlockCost: number, title: string) => {
    if (!profile) return;
    if (profile.purchased_packages?.includes(pkgId)) {
      showToast('Paket sudah terbuka.');
      return;
    }
    if ((profile.coins ?? 0) < unlockCost) {
      showToast(`Koin tidak cukup. Butuh ${unlockCost.toLocaleString('id-ID')} koin.`);
      return;
    }
    if (!isSupabaseConfigured() || !supabase) {
      showToast('Koneksi server tidak tersedia.');
      return;
    }

    setBuyingId(pkgId);
    try {
      // Server catalog menentukan harga; client hanya kirim item_id
      const { data, error } = await supabase.rpc('purchase_item', {
        p_item_id: pkgId,
        p_quantity: 1,
      });
      if (error || !data?.success) {
        showToast(data?.reason ?? error?.message ?? 'Gagal membuka paket');
        return;
      }
      await reloadProfile();
      showToast(`Berhasil unlock: ${title}`);
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat unlock paket');
    } finally {
      setBuyingId(null);
    }
  };

  const handleReview = async (pkgId: string) => {
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) {
        showToast('Sesi tidak valid. Silakan login kembali.');
        return;
      }

      const { data } = await supabase!
        .from('quiz_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('package_id', pkgId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        navigate(`/review/${data.id}`);
      } else {
        showToast('Anda belum pernah menyelesaikan Try Out ini.');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat riwayat pembahasan.');
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-screen">
      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-fg text-bg px-5 py-3 rounded-full text-sm font-bold shadow-lg">
          {toast}
        </div>
      )}

      <header className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-black text-fg mb-2">Try Out</h1>
        <p className="text-fg-muted">
          Simulasi <strong>110 soal</strong> format BKN (30 TWK + 35 TIU + 45 TKP), soal tetap per paket.
          Biaya: <strong>1.000 koin / attempt</strong>. Saat ini <strong>Paket 1 & 2</strong> dibuka; paket 3–6 menunggu review kualitas.
        </p>
        {profile && (
          <p className="text-sm text-fg-muted mt-2 flex items-center gap-1.5 justify-center md:justify-start">
            <Coins size={14} className="text-coin" />
            Saldo: <strong className="text-fg">{(profile.coins ?? 0).toLocaleString('id-ID')} koin</strong>
          </p>
        )}
      </header>

      <div className="flex bg-surface-subtle border border-border p-1 rounded-xl w-full max-w-sm mb-8 mx-auto md:mx-0">
        <button
          onClick={() => setActiveTab('lobby')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'lobby' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg'}`}
        >
          <List size={16} />
          Daftar Paket
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg'}`}
        >
          <History size={16} />
          Riwayat Nilai
        </button>
      </div>

      {activeTab === 'lobby' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_PACKAGES.map((pkg) => {
            const unlocked = isPackageUnlocked(pkg.id, pkg.unlockCost);

            return (
              <div
                key={pkg.id}
                className={`bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col transition-all ${
                  pkg.isDevelopment ? 'opacity-80 grayscale-[20%]' : 'hover:shadow-md hover:-translate-y-1'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${unlocked && !pkg.isDevelopment ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-fg-muted'}`}>
                    <BookOpenCheck size={24} />
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                    pkg.isDevelopment
                      ? 'bg-surface-subtle text-fg-muted'
                      : unlocked
                        ? 'bg-emerald-50 text-success'
                        : 'bg-surface-subtle text-fg-muted'
                  }`}>
                    {pkg.isDevelopment ? <Lock size={14} /> : unlocked ? <Unlock size={14} /> : <Lock size={14} />}
                    {pkg.isDevelopment
                      ? 'Segera Hadir'
                      : pkg.id === 'paket_tryout_1'
                        ? 'Direkomendasikan'
                        : unlocked
                          ? 'Terbuka'
                          : 'Terkunci'}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-fg mb-2 leading-tight">{pkg.title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed mb-4 flex-1">{pkg.description}</p>

                <div className="text-xs text-fg-muted font-bold mb-2 space-y-1">
                  <div className="flex justify-between">
                    <span>{pkg.totalQuestions} Soal</span>
                    <span>30 TWK · 35 TIU · 45 TKP</span>
                  </div>
                  {pkg.attemptCost > 0 && !pkg.isDevelopment && (
                    <div className="flex justify-between">
                      <span>Entry / attempt</span>
                      <span className="text-fg">{pkg.attemptCost.toLocaleString('id-ID')} koin</span>
                    </div>
                  )}
                  {!pkg.isDevelopment && (
                    <p className="text-[10px] font-medium text-success pt-1">
                      Soal tetap · tiap mulai bayar attempt
                    </p>
                  )}
                </div>

                {pkg.isDevelopment ? (
                  <Button variant="secondary" className="w-full justify-center opacity-70" disabled>
                    Segera Hadir · Review soal
                  </Button>
                ) : unlocked ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      disabled={startingId === pkg.id}
                      onClick={() => handleStart(pkg.id, pkg.attemptCost)}
                    >
                      <Play size={16} className="mr-2" />
                      {startingId === pkg.id
                        ? 'Memproses...'
                        : pkg.attemptCost > 0
                          ? `Mulai attempt · ${pkg.attemptCost.toLocaleString('id-ID')} koin`
                          : 'Mulai Sekarang'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleReview(pkg.id)}
                    >
                      <span>Lihat Pembahasan</span>
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      variant="primary"
                      className="w-full justify-center"
                      disabled={buyingId === pkg.id}
                      onClick={() => handleUnlock(pkg.id, pkg.unlockCost, pkg.title)}
                    >
                      {buyingId === pkg.id
                        ? 'Memproses...'
                        : `Unlock permanen · ${pkg.unlockCost.toLocaleString('id-ID')} koin`}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => navigate('/toko')}
                    >
                      <span>Atau beli di Toko</span>
                      <Lock size={16} className="text-fg-muted" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'history' && <TryOutHistory />}
    </div>
  );
}
