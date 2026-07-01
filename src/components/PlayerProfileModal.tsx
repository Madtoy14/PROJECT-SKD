import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Swords, Shield, Star, Target, Activity, CheckCircle2, Clock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, Character } from '../lib/supabase';

interface PlayerProfileModalProps {
  playerId: string | null;
  onClose: () => void;
  onAddRival?: (player: UserProfile) => void;
}

export default function PlayerProfileModal({ playerId, onClose, onAddRival }: PlayerProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!playerId || !isSupabaseConfigured()) return;

    let mounted = true;
    setLoading(true);

    const fetchProfileData = async () => {
      try {
        const { data, error: err } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', playerId)
          .maybeSingle();

        if (err) throw err;
        if (!data) throw new Error("Pemain tidak ditemukan");
        
        if (mounted) setProfile(data as UserProfile);

        // Fetch character image if selected_avatar exists
        if (data.selected_avatar) {
          const { data: charData } = await supabase!
            .from('characters')
            .select('*')
            .eq('id', data.selected_avatar)
            .maybeSingle();
            
          if (mounted && charData) setCharacter(charData as Character);
        }

      } catch (err: any) {
        if (mounted) setError(err.message || 'Gagal memuat profil');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfileData();

    return () => { mounted = false; };
  }, [playerId]);

  if (!playerId) return null;

  // Cek status online (aktif dalam 15 menit terakhir)
  let isOnline = false;
  if (profile?.last_login) {
    const lastLogin = new Date(profile.last_login).getTime();
    const now = new Date().getTime();
    const diffMinutes = (now - lastLogin) / (1000 * 60);
    isOnline = diffMinutes <= 15;
  }

  // Akurasi Calculation
  let totalDijawab = 0;
  let totalBenar = 0;
  if (profile?.akurasi) {
    ['TIU', 'TWK', 'TKP'].forEach(cat => {
      if (profile.akurasi && (profile.akurasi as any)[cat]) {
        totalDijawab += (profile.akurasi as any)[cat].total || 0;
        totalBenar += (profile.akurasi as any)[cat].correct || 0;
      }
    });
  }
  const akurasiTotal = totalDijawab > 0 ? Math.round((totalBenar / totalDijawab) * 100) : 0;
  const avatarUrl = character?.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'Guest'}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#1A1924] border border-white/10 w-full max-w-xs rounded-[2rem] shadow-2xl relative z-10 overflow-hidden"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <div className="animate-spin w-8 h-8 border-4 border-skd-accent/20 border-t-skd-accent rounded-full mb-3" />
              <p className="text-sm font-space">Memuat profil dewa...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <X size={32} />
              </div>
              <h3 className="font-bold text-white mb-2">Terjadi Kesalahan</h3>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors text-sm font-bold">
                Tutup
              </button>
            </div>
          ) : profile ? (
            <div className="flex flex-col">
              {/* Header / Cover */}
              <div className="h-24 bg-gradient-to-r from-skd-accent to-skd-premium relative">
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors z-10">
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 pb-5 relative pt-10">
                {/* Avatar */}
                <div className="absolute -top-12 left-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-[#1A1924] border-4 border-[#1A1924] overflow-hidden">
                      <img src={avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
                    </div>
                    <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-[#1A1924] shadow-sm ${isOnline ? 'bg-skd-success' : 'bg-gray-500'}`} title={isOnline ? 'Online' : 'Offline'} />
                  </div>
                </div>

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h2 className="text-xl font-black text-white">{profile.username}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-skd-premium bg-skd-premium/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Star size={12} className="fill-skd-premium" /> Level {profile.level || 1}
                      </span>
                      {profile.target_kedinasan && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Target size={12} /> {profile.target_kedinasan}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 mb-4 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Trophy size={10} className="text-skd-accent" /> Total Skor
                      </span>
                      <span className="text-base font-black text-white">{profile.score.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Swords size={10} className="text-red-400" /> PvP Wins
                      </span>
                      <span className="text-base font-black text-white">{profile.total_pvp_wins || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-skd-success" /> Akurasi
                      </span>
                      <span className="text-base font-black text-white">{akurasiTotal}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Activity size={10} className="text-blue-400" /> Survival Max
                      </span>
                      <span className="text-base font-black text-white">{profile.highest_survival_score || 0} Combo</span>
                    </div>
                  </div>
                </div>

                {/* Optional Bio */}
                {profile.bio && (
                  <p className="text-sm text-gray-400 text-center italic mb-4">"{profile.bio}"</p>
                )}

                {onAddRival && (
                  <button 
                    onClick={() => {
                      onAddRival(profile);
                      onClose();
                    }}
                    className="w-full bg-skd-accent hover:bg-yellow-400 text-[#0F0E17] font-black py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Shield size={18} /> Tambahkan ke Daftar Rival
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
