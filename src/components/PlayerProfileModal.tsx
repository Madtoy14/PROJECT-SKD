import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Swords, Shield, Star, Target, Activity, CheckCircle2 } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, Character } from '../lib/supabase';

interface PlayerProfileModalProps {
  playerId: string | null;
  onClose: () => void;
  onAddRival?: (player: UserProfile) => void;
  existingRivalIds?: string[]; // ID rival yang sudah ada, untuk sembunyikan tombol
}

export default function PlayerProfileModal({ playerId, onClose, onAddRival, existingRivalIds = [] }: PlayerProfileModalProps) {
  const modalRef = useFocusTrap(!!playerId, onClose);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reset state whenever playerId changes
  useEffect(() => {
    if (!playerId) return;



    let mounted = true;

    const fetchProfileData = async () => {
      if (mounted) {
        setProfile(null);
        setCharacter(null);
        setError('');
        setLoading(true);
      }

      if (!isSupabaseConfigured()) {
        if (mounted) {
          setError('Supabase tidak terkonfigurasi');
          setLoading(false);
        }
        return;
      }

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
      } catch (err: unknown) {
        if (mounted) setError((err as Error).message || 'Gagal memuat profil');
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
  const [now] = useState(() => Date.now());
  let isOnline = false;
  if (profile?.last_login) {
    const lastLogin = new Date(profile.last_login).getTime();

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
    <>
      {playerId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={onClose}
            className="fixed inset-0 bg-overlay backdrop-blur-sm z-0 animate-[fadeInScale_0.2s_ease-out_both]"
            data-backdrop="true"
          />

          {/* Modal Card */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-profile-title"
            className="bg-surface shadow-sm border border-border w-full max-w-xs rounded-[1.75rem] shadow-2xl relative z-10 overflow-hidden animate-[fadeInUp_0.25s_ease-out_both]"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center p-10 text-fg-muted">
                <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full mb-3" />
                <p className="text-sm font-space">Memuat profil...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <X size={28} />
                </div>
                <h3 className="font-bold text-fg mb-2">Terjadi Kesalahan</h3>
                <p className="text-fg-muted text-sm mb-5">{error}</p>
                <button
                  onClick={onClose}
                  className="bg-surface-muted hover:bg-surface-subtle text-fg px-6 py-2 rounded-xl transition-colors text-sm font-bold"
                >
                  Tutup
                </button>
              </div>
            ) : profile ? (
              <div className="flex flex-col">
                {/* Header cover — lebih compact */}
                <div className="h-16 bg-gradient-to-r from-skd-accent to-skd-premium relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup Profil Pemain"
                    className="absolute top-3 right-3 w-7 h-7 bg-black/30 hover:bg-overlay backdrop-blur-sm text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors z-10"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="px-4 pb-4 relative pt-9">
                  {/* Avatar — overlap cover */}
                  <div className="absolute -top-9 left-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-surface shadow-sm border-[3px] border-surface overflow-hidden">
                        <img
                          src={avatarUrl}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[3px] border-surface ${isOnline ? 'bg-success' : 'bg-gray-500'}`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                  </div>

                  {/* Nama & badges */}
                  <div className="mb-3">
                    <h2 id="player-profile-title" className="text-lg font-black text-fg leading-tight">{profile.username}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-premium bg-premium/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Star size={10} className="fill-skd-premium" /> Lv.{profile.level || 1}
                      </span>
                      {profile.target_kedinasan && (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Target size={10} /> {profile.target_kedinasan.toUpperCase()}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOnline ? 'text-success bg-success/10' : 'text-fg-muted bg-surface-subtle'}`}
                      >
                        {isOnline ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Stats grid 2x2 */}
                  <div className="bg-surface-subtle rounded-xl p-3 border border-white/5 mb-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Trophy size={9} className="text-primary" /> Total Skor
                        </span>
                        <span className="text-sm font-black text-fg">{profile.score.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Swords size={9} className="text-red-400" /> PvP Wins
                        </span>
                        <span className="text-sm font-black text-fg">{profile.total_pvp_wins || 0}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <CheckCircle2 size={9} className="text-success" /> Akurasi
                        </span>
                        <span className="text-sm font-black text-fg">{akurasiTotal}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Activity size={9} className="text-blue-400" /> Survival Max
                        </span>
                        <span className="text-sm font-black text-fg">{profile.highest_survival_score || 0} Combo</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs text-fg-muted text-center italic mb-3">"{profile.bio}"</p>
                  )}

                  {/* Tombol tambah rival — hanya tampil jika belum ada di daftar rival */}
                  {onAddRival && !existingRivalIds.includes(profile.id) && (
                    <button
                      onClick={() => {
                        onAddRival(profile);
                        onClose();
                      }}
                      className="w-full bg-primary hover:bg-yellow-400 text-primary-fg font-black py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <Shield size={15} /> Tambah Rival
                    </button>
                  )}
                  {onAddRival && existingRivalIds.includes(profile.id) && (
                    <div className="w-full bg-surface-subtle border border-border text-fg-muted font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                      <Shield size={15} className="text-success" /> Sudah di Daftar Rival
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );

  // Portal ke document.body — melewati semua stacking context parent
  return createPortal(modalContent, document.body);
}
