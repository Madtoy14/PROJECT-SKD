import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Swords, Shield, Star, Target, Activity, CheckCircle2 } from 'lucide-react';
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

  // Reset state whenever playerId changes
  useEffect(() => {
    if (!playerId) return;

    setProfile(null);
    setCharacter(null);
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured()) {
      setError('Supabase tidak terkonfigurasi');
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchProfileData = async () => {
      try {
        const { data, error: err } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', playerId)
          .maybeSingle();

        if (err) throw err;
        if (!data) throw new Error('Pemain tidak ditemukan');

        if (mounted) setProfile(data as UserProfile);

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

    return () => {
      mounted = false;
    };
  }, [playerId]);

  // Tutup modal dengan Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Cek status online (aktif dalam 15 menit terakhir)
  let isOnline = false;
  if (profile?.last_login) {
    const lastLogin = new Date(profile.last_login).getTime();
    const now = Date.now();
    isOnline = (now - lastLogin) / (1000 * 60) <= 15;
  }

  // Akurasi Calculation
  let totalDijawab = 0;
  let totalBenar = 0;
  if (profile?.akurasi) {
    (['TWK', 'TIU', 'TKP'] as const).forEach(cat => {
      const catData = profile.akurasi![cat];
      if (catData) {
        totalDijawab += catData.total || 0;
        totalBenar += catData.correct || 0;
      }
    });
  }
  const akurasiTotal = totalDijawab > 0 ? Math.round((totalBenar / totalDijawab) * 100) : 0;
  const avatarUrl =
    character?.image_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'Guest'}`;

  // Gunakan portal agar modal selalu berada di atas semua stacking context
  const modalContent = (
    <AnimatePresence>
      {playerId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            key="card"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-[#1A1924] border border-white/10 w-full max-w-xs rounded-[1.75rem] shadow-2xl relative z-10 overflow-hidden"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center p-10 text-gray-400">
                <div className="animate-spin w-8 h-8 border-4 border-skd-accent/20 border-t-skd-accent rounded-full mb-3" />
                <p className="text-sm font-space">Memuat profil...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <X size={28} />
                </div>
                <h3 className="font-bold text-white mb-2">Terjadi Kesalahan</h3>
                <p className="text-gray-400 text-sm mb-5">{error}</p>
                <button
                  onClick={onClose}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl transition-colors text-sm font-bold"
                >
                  Tutup
                </button>
              </div>
            ) : profile ? (
              <div className="flex flex-col">
                {/* Header cover — lebih compact */}
                <div className="h-16 bg-gradient-to-r from-skd-accent to-skd-premium relative flex-shrink-0">
                  <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-7 h-7 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors z-10"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="px-4 pb-4 relative pt-9">
                  {/* Avatar — overlap cover */}
                  <div className="absolute -top-9 left-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-[#1A1924] border-[3px] border-[#1A1924] overflow-hidden">
                        <img
                          src={avatarUrl}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[3px] border-[#1A1924] ${isOnline ? 'bg-skd-success' : 'bg-gray-500'}`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                  </div>

                  {/* Nama & badges */}
                  <div className="mb-3">
                    <h2 className="text-lg font-black text-white leading-tight">{profile.username}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-skd-premium bg-skd-premium/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Star size={10} className="fill-skd-premium" /> Lv.{profile.level || 1}
                      </span>
                      {profile.target_kedinasan && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Target size={10} /> {profile.target_kedinasan.toUpperCase()}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOnline ? 'text-skd-success bg-skd-success/10' : 'text-gray-400 bg-white/5'}`}
                      >
                        {isOnline ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Stats grid 2x2 */}
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Trophy size={9} className="text-skd-accent" /> Total Skor
                        </span>
                        <span className="text-sm font-black text-white">{profile.score.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Swords size={9} className="text-red-400" /> PvP Wins
                        </span>
                        <span className="text-sm font-black text-white">{profile.total_pvp_wins || 0}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <CheckCircle2 size={9} className="text-skd-success" /> Akurasi
                        </span>
                        <span className="text-sm font-black text-white">{akurasiTotal}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Activity size={9} className="text-blue-400" /> Survival Max
                        </span>
                        <span className="text-sm font-black text-white">{profile.highest_survival_score || 0} Combo</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs text-gray-400 text-center italic mb-3">"{profile.bio}"</p>
                  )}

                  {/* Tombol tambah rival */}
                  {onAddRival && (
                    <button
                      onClick={() => {
                        onAddRival(profile);
                        onClose();
                      }}
                      className="w-full bg-skd-accent hover:bg-yellow-400 text-[#0F0E17] font-black py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <Shield size={15} /> Tambah Rival
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Portal ke document.body — melewati semua stacking context parent
  return createPortal(modalContent, document.body);
}
