import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Scale, Lightbulb, Zap, LockKeyhole, Sparkles, Check, Clock, Eye, Heart, Battery, Shield, Skull } from 'lucide-react';
import { fetchProfile, updateProfile, supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import { logCoinPurchase, logItemSale, logEnergyPurchase, validatePurchase } from '../lib/transactions';

const POWER_UPS = [
  { id: 'item_5050', title: 'Eliminasi 50:50', description: 'Hapus 2 opsi jawaban yang salah.', cost: 300, icon: Scale, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'item_hint', title: 'Bocoran Rumus', description: 'Tampilkan rumus/petunjuk untuk soal hitungan.', cost: 250, icon: Lightbulb, color: 'text-info', bg: 'bg-info-subtle' },
  { id: 'item_waktu_beku', title: 'Waktu Beku', description: 'Bekukan timer selama 30 detik.', cost: 300, icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'item_skor_ganda', title: 'Skor Ganda', description: 'Gandakan perolehan poin untuk 1 soal berikutnya.', cost: 350, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'item_terawangan', title: 'Terawangan', description: 'Lihat tebakan mayoritas pengguna lain.', cost: 400, icon: Eye, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'item_kesempatan_kedua', title: 'Kesempatan Kedua', description: 'Batalkan 1x kesalahan di mode Survival.', cost: 500, icon: Heart, color: 'text-red-400', bg: 'bg-danger/10' },
  { id: 'item_shield', title: 'Perisai Survival', description: 'Membatalkan 1x kesalahan (Lama).', cost: 500, icon: Shield, color: 'text-success', bg: 'bg-success/10' },
  { id: 'item_energy_refill', title: 'Isi Ulang Energi', description: 'Pulihkan 5 energi.', cost: 150, icon: Battery, color: 'text-green-400', bg: 'bg-success/10' },
  { id: 'item_streak_protector', title: 'Streak Protector', description: 'Melindungi streak harian belajar Anda jika lupa login.', cost: 500, icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'item_coin_booster', title: 'Koin Booster 2x', description: 'Gandakan koin yang didapat untuk 3 kuis berikutnya.', cost: 300, icon: Sparkles, color: 'text-coin', bg: 'bg-coin-subtle' },
  { id: 'item_tinta_hitam', title: 'Tinta Hitam (PvP)', description: 'Mengaburkan layar soal lawan selama 5 detik.', cost: 350, icon: Skull, color: 'text-danger', bg: 'bg-danger/10' },
  { id: 'item_lompatan_kilat', title: 'Lompatan Kilat (PvP)', description: 'Otomatis temukan jawaban benar tanpa menghabiskan waktu.', cost: 450, icon: Zap, color: 'text-info', bg: 'bg-info-subtle' },
];

const PREMIUM_PACKAGES = [
  { id: 'paket_premium_tkp_1', title: 'Paket Soal Rahasia TKP 1', description: 'Pembahasan 100 soal TKP HOTS pilar pelayanan publik & profesionalisme.', cost: 1000 },
  { id: 'paket_premium_tkp_2', title: 'Paket Soal Rahasia TKP 2', description: 'Pembahasan soal TKP bertema jejaring kerja & anti radikalisme.', cost: 1000 },
  { id: 'paket_premium_tiu_1', title: 'Trik TIU Numerik 1', description: 'Pembahasan trik matematika numerik, deret aritmatika cepat, & penalaran logis.', cost: 1000 },
  { id: 'paket_premium_tiu_2', title: 'Trik TIU Analitis 2', description: 'Pembahasan taktis silogisme, diagram venn, & penalaran analitis spasial.', cost: 1000 },
  { id: 'paket_premium_twk_1', title: 'Hafalan UUD TWK 1', description: 'Pembahasan materi pilar negara, UUD 1945, & nasionalisme secara mendalam.', cost: 1000 },
  { id: 'paket_premium_twk_2', title: 'Pilar Negara TWK 2', description: 'Pembahasan soal TWK bela negara, patriotisme, & sejarah perjuangan bangsa.', cost: 1000 },
  { id: 'paket_tryout_akbar_1', title: 'Try Out Akbar CPNS 1', description: 'Pembahasan lengkap Try Out Akbar CAT serentak peringkat nasional 1.', cost: 1500 },
  { id: 'paket_tryout_akbar_2', title: 'Try Out Akbar CPNS 2', description: 'Pembahasan lengkap Try Out Akbar CAT serentak peringkat nasional 2.', cost: 1500 },
  { id: 'paket_spesialis_bumn', title: 'Simulasi Khusus BUMN', description: 'Materi soal pembahasan TKD & Core Values Akhlak persiapan BUMN.', cost: 2000 },
];

export default function Shop() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [purchasing, setPurchasing] = useState<string | null>(null); // loading state per item

  useEffect(() => {
    fetchProfile().then(p => setProfile(p));
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToastType(type);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // itemType: 'inventory' | 'avatar' | 'premium_package' | 'energy'
  const handlePurchase = async (
    itemId: string,
    itemTitle: string,
    cost: number,
    itemType: 'inventory' | 'avatar' | 'premium_package' | 'energy' = 'inventory'
  ) => {
    if (!profile || purchasing) return;

    // ── Guard: sudah punya? ──
    if (itemType === 'avatar' && profile.unlocked_avatars?.includes(itemId)) {
      showToast(`Anda sudah memiliki ${itemTitle}!`, 'error');
      return;
    }
    if (itemType === 'premium_package' && profile.purchased_packages?.includes(itemId)) {
      showToast(`Anda sudah memiliki ${itemTitle}!`, 'error');
      return;
    }

    // ── Guard client-side koin (UX only) ──
    if (profile.coins < cost) {
      showToast(`Koin tidak cukup untuk membeli ${itemTitle}!`, 'error');
      return;
    }

    setPurchasing(itemId);
    try {
      // ── Validasi rate-limit client ──
      const validation = await validatePurchase(itemId, cost);
      if (!validation.valid) {
        showToast(validation.reason || 'Pembelian tidak valid', 'error');
        return;
      }

      let coinsAfter = profile.coins - cost;

      // ── SERVER-SIDE VALIDATION via RPC (atomic deduct koin) ──
      if (isSupabaseConfigured()) {
        const { data: rpcResult, error: rpcError } = await supabase!.rpc('purchase_item', {
          p_item_id: itemId,
          p_cost: cost,
          p_item_type: itemType
        });

        if (rpcError || !rpcResult?.success) {
          // RPC belum ada (fungsi belum dibuat di Supabase) — fallback ke client-side
          if (rpcError?.code === 'PGRST202' || rpcError?.message?.includes('Could not find')) {
            console.warn('RPC purchase_item belum tersedia, menggunakan client-side fallback');
            // Lanjut dengan client-side deduct di bawah
          } else {
            showToast(rpcResult?.reason || rpcError?.message || 'Pembelian gagal di server', 'error');
            return;
          }
        } else {
          coinsAfter = rpcResult.coins_after;
        }
      }

      // ── Update item / avatar / paket di profil ──
      let profileUpdate: Partial<UserProfile> = { coins: coinsAfter };

      if (itemType === 'premium_package') {
        profileUpdate.purchased_packages = [...(profile.purchased_packages || []), itemId];
      } else if (itemType === 'avatar') {
        profileUpdate.unlocked_avatars = [...(profile.unlocked_avatars || []), itemId];
      } else if (itemType === 'energy') {
        profileUpdate.energy = Math.min(25, (profile.energy || 0) + 5);
        await logEnergyPurchase(cost, 5, coinsAfter);
      } else {
        // inventory biasa
        const currentInv = profile.inventory || {
          item_5050: 0, item_hint: 0, item_shield: 0, item_waktu_beku: 0,
          item_skor_ganda: 0, item_terawangan: 0, item_kesempatan_kedua: 0,
          item_energy_refill: 0, item_streak_protector: 0, item_coin_booster: 0,
          item_tinta_hitam: 0, item_lompatan_kilat: 0
        };
        const invKey = itemId as keyof NonNullable<typeof profile.inventory>;
        profileUpdate.inventory = { ...currentInv, [invKey]: (currentInv[invKey] || 0) + 1 };
      }

      const updatedProfile = await updateProfile(profileUpdate);
      setProfile(updatedProfile);

      // ── Log transaksi ──
      if (itemType !== 'energy') {
        await logCoinPurchase(itemId, cost, coinsAfter, {
          item_title: itemTitle,
          item_type: itemType
        });
      }

      showToast(`Berhasil membeli ${itemTitle}!`, 'success');
    } catch (err: any) {
      console.error('Purchase error:', err);
      showToast('Terjadi kesalahan saat pembelian', 'error');
    } finally {
      setPurchasing(null);
    }
  };

  const handleSellBack = async (itemId: string, itemTitle: string, cost: number) => {
    if (!profile || !profile.inventory) return;
    const currentInv = profile.inventory;
    const count = currentInv[itemId as keyof typeof currentInv] || 0;
    if (count <= 0) {
      setToastType('error');
      setToastMessage(`Anda tidak memiliki ${itemTitle} untuk dijual!`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const reward = Math.floor(cost * 0.5);
    const updatedCoins = profile.coins + reward;
    
    const updatedInv = {
      ...currentInv,
      [itemId]: count - 1
    };

    // Update profile
    const updatedProfile = await updateProfile({
      coins: updatedCoins,
      inventory: updatedInv
    });
    setProfile(updatedProfile);
    
    // Log transaction
    await logItemSale(itemId, reward, updatedCoins, {
      item_title: itemTitle,
      original_price: cost,
      quantity_remaining: count - 1
    });
    
    setToastType('success');
    setToastMessage(`Berhasil menjual 1 ${itemTitle} (+${reward} Koin)!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 pb-24 relative min-h-screen max-w-5xl mx-auto font-syne">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 ${
              toastType === 'success' ? 'bg-success shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-danger shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            } text-fg px-6 py-3 rounded-full font-bold whitespace-nowrap`}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="pt-2 md:pt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-fg">Shop & Power up</h1>
          <p className="text-sm text-fg-muted mt-1">Belanjakan koin untuk meningkatkan peluang kelulusanmu atau cairkan kembali barang berlebih!</p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface px-4 py-2 md:px-5 md:py-2.5 rounded-full border border-border shadow-sm">
          <Coins size={20} className="text-coin fill-yellow-500 animate-pulse" />
          <span className="font-space font-bold text-fg md:text-lg">
            {profile ? profile.coins.toLocaleString() : '1,240'}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border pb-1 shrink-0">
        <button
          onClick={() => setActiveTab('buy')}
          className={`pb-3 font-bold text-sm md:text-base border-b-2 transition-all ${
            activeTab === 'buy' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          Beli Item
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className={`pb-3 font-bold text-sm md:text-base border-b-2 transition-all ${
            activeTab === 'sell' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          Jual Balik (Sell Back)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'buy' ? (
          <motion.div
            key="buy"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 md:space-y-12"
          >
            {/* Power up Section */}
            <section>
              <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-fg border-b border-border pb-2">Power up Kuis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {POWER_UPS.map((item) => {
                  const count = profile?.inventory?.[item.id as keyof NonNullable<typeof profile.inventory>] || 0;

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={purchasing === item.id}
                      onClick={() => item.id === 'item_energy_refill'
                        ? handlePurchase(item.id, item.title, item.cost, 'energy')
                        : handlePurchase(item.id, item.title, item.cost, 'inventory')
                      }
                      className="bg-surface border border-border hover:border-border p-5 md:p-6 rounded-3xl flex flex-col items-start gap-4 text-left transition-all shadow-sm hover:shadow-md w-full relative overflow-hidden group"
                    >
                      {count > 0 && (
                        <div className="absolute top-0 right-0 bg-primary-subtle text-primary border-l border-b border-primary px-3 py-1 text-xs font-bold rounded-bl-xl font-space">
                          Miliki: {count}
                        </div>
                      )}
                      
                      <div className="flex items-center w-full justify-between mt-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                          <item.icon size={28} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-locked-subtle px-4 py-2 rounded-xl shrink-0">
                          <Coins size={16} className="text-coin fill-yellow-500" />
                          <span className="font-space font-bold text-yellow-600 ">{item.cost}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 mt-2">
                        <h3 className="font-bold text-base md:text-lg mb-2 text-fg">{item.title}</h3>
                        <p className="text-sm text-fg-muted leading-relaxed">{item.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* Premium Section */}
            <section className="pt-4">
              <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2 text-fg border-b border-border pb-2">
                <Sparkles className="text-premium" size={24} /> Paket Pembahasan Premium
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PREMIUM_PACKAGES.map((pkg) => {
                  // Gunakan purchased_packages, bukan unlocked_avatars
                  const isUnlocked = profile?.purchased_packages?.includes(pkg.id);
                  const isLoading = purchasing === pkg.id;

                  return (
                    <motion.div
                      key={pkg.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-surface border border-border p-6 rounded-3xl flex flex-col justify-between transition-all shadow-sm hover:shadow-md relative overflow-hidden group text-left"
                    >
                      <div>
                        <div className="w-12 h-12 bg-gradient-to-br from-premium to-purple-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                          <LockKeyhole size={24} className="text-fg" />
                        </div>
                        <h3 className="font-bold text-base text-fg mb-2 tracking-tight">{pkg.title}</h3>
                        <p className="text-xs text-fg-muted leading-relaxed mb-6 h-12 overflow-hidden">{pkg.description}</p>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40">
                        {isUnlocked ? (
                          <div className="w-full py-2.5 bg-success text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 justify-center">
                            <Check size={16} /> Terbuka
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 bg-surface-subtle px-3 py-1.5 rounded-xl border border-border shrink-0">
                              <Coins size={14} className="text-coin fill-yellow-400" />
                              <span className="font-space font-bold text-coin text-sm">{pkg.cost}</span>
                            </div>
                            <button
                              disabled={isLoading}
                              onClick={() => handlePurchase(pkg.id, pkg.title, pkg.cost, 'premium_package')}
                              className="px-4 py-2 bg-premium text-primary-fg hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                            >
                              {isLoading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-primary rounded-full animate-spin" /> Memproses...</> : 'Buka Akses'}
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="sell"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <section>
              <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-fg border-b border-border pb-2">Jual Balik Power up</h2>
              <p className="text-xs text-fg-muted mb-6 leading-relaxed max-w-xl">
                Jual kembali Power up cadangan Anda yang tidak terpakai ke Toko. Dapatkan pengembalian **50% Koin instan** dari harga belinya!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {POWER_UPS.map((item) => {
                  const count = profile?.inventory?.[item.id as keyof NonNullable<typeof profile.inventory>] || 0;
                  const sellReward = Math.floor(item.cost * 0.5);

                  if (count <= 0) return null;

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.03 }}
                      className="bg-surface border border-border p-5 md:p-6 rounded-3xl flex flex-col items-start justify-between gap-4 text-left transition-all shadow-sm hover:shadow-md w-full relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 bg-success/20 text-success border-l border-b border-success px-3 py-1 text-xs font-bold rounded-bl-xl font-space">
                        Miliki: {count}
                      </div>
                      
                      <div className="flex items-center w-full justify-between mt-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                          <item.icon size={28} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-locked-subtle px-4 py-2 rounded-xl shrink-0">
                          <Coins size={16} className="text-coin fill-yellow-500" />
                          <span className="font-space font-bold text-yellow-600 ">Jual: {sellReward}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 mt-2 w-full">
                        <h3 className="font-bold text-base md:text-lg mb-2 text-fg">{item.title}</h3>
                        <p className="text-xs text-fg-muted leading-relaxed mb-4">{item.description}</p>
                        
                        <button
                          onClick={() => handleSellBack(item.id, item.title, item.cost)}
                          className="w-full py-2.5 bg-success hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Coins size={14} className="text-yellow-200 fill-yellow-200" />
                          <span>Jual Balik (+{sellReward} Koin)</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                {/* If no items are owned */}
                {(!profile?.inventory || Object.entries(profile.inventory).filter(([k, v]) => k.startsWith('item_') && (v as number) > 0).length === 0) && (
                  <div className="col-span-full py-12 text-center text-sm text-fg-muted bg-surface/30 rounded-[32px] border border-dashed border-border max-w-lg mx-auto w-full">
                    <Shield className="mx-auto text-fg-muted mb-3 opacity-40 animate-pulse" size={40} />
                    <span>Anda tidak memiliki stok Power up apa pun di inventori untuk dijual saat ini.</span>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
