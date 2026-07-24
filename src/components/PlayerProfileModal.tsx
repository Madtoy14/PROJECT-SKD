import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Swords, Shield, Star, Target, Activity, CheckCircle2, UserPlus, UserCheck } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile, Character } from '../lib/supabase';
import { dicebearUrl } from '../lib/constants';
import { sendFriendRequest, unfollowUser, isFollowing } from '../lib/supabaseHelpers';

interface PlayerProfileModalProps {
  playerId: string | null;
  onClose: () => void;
  /** Optional: parent refresh after follow/unfollow (counts, rival list) */
  onSocialChange?: () => void;
  /** Legacy: still supported — treated as follow + callback */
  onAddRival?: (player: UserProfile) => void;
  existingRivalIds?: string[];
}

export default function PlayerProfileModal({
  playerId,
  onClose,
  onSocialChange,
  onAddRival,
  existingRivalIds = [],
}: PlayerProfileModalProps) {
  const modalRef = useFocusTrap(!!playerId, onClose);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    let mounted = true;

    const fetchProfileData = async () => {
      if (mounted) {
        setProfile(null);
        setCharacter(null);
        setError('');
        setLoading(true);
        setFollowing(false);
      }

      if (!isSupabaseConfigured()) {
        if (mounted) {
          setError('Supabase tidak terkonfigurasi');
          setLoading(false);
        }
        return;
      }

      try {
        const { data: auth } = await supabase!.auth.getUser();
        const uid = auth.user?.id || null;
        if (mounted) setMyId(uid);

        const { data, error: err } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', playerId)
          .maybeSingle();

        if (err) throw err;
        if (!data) throw new Error('Pemain tidak ditemukan');
        if (mounted) setProfile(data as UserProfile);

        if (uid && uid !== playerId) {
          const f = await isFollowing(uid, playerId);
          if (mounted) setFollowing(f);
        }

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [now] = useState(() => Date.now());
  let isOnline = false;
  if (profile?.last_login) {
    const lastLogin = new Date(profile.last_login).getTime();
    isOnline = (now - lastLogin) / (1000 * 60) <= 15;
  }

  let totalDijawab = 0;
  let totalBenar = 0;
  if (profile?.akurasi) {
    (['TWK', 'TIU', 'TKP'] as const).forEach((cat) => {
      const catData = profile.akurasi![cat];
      if (catData) {
        totalDijawab += catData.total || 0;
        totalBenar += catData.correct || 0;
      }
    });
  }
  const akurasiTotal = totalDijawab > 0 ? Math.round((totalBenar / totalDijawab) * 100) : 0;
  const avatarUrl = character?.image_url || dicebearUrl(profile?.username || 'Guest');
  const isSelf = !!myId && !!profile && myId === profile.id;
  const showFollow = !!myId && !!profile && !isSelf;

  const handleFollowToggle = async () => {
    if (!myId || !profile || busy) return;
    setBusy(true);
    try {
      if (following) {
        const ok = await unfollowUser(myId, profile.id);
        if (ok) setFollowing(false);
      } else {
        const ok = await sendFriendRequest(myId, profile.id);
        if (ok) {
          setFollowing(true);
          onAddRival?.(profile);
        }
      }
      onSocialChange?.();
    } finally {
      setBusy(false);
    }
  };

  const isRival = existingRivalIds.includes(profile?.id || '');

  const modalContent = (
    <>
      {playerId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={onClose}
            className="fixed inset-0 bg-overlay backdrop-blur-sm z-0 animate-[fadeInScale_0.2s_ease-out_both]"
            data-backdrop="true"
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-profile-title"
            className="bg-surface shadow-sm border border-border w-full max-w-xs rounded-[1.75rem] shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-[fadeInUp_0.25s_ease-out_both]"
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
                <div className="h-16 bg-gradient-to-r from-skd-accent to-skd-premium relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Tutup Profil Pemain"
                    className="absolute top-3 right-3 w-7 h-7 bg-black/30 hover:bg-overlay backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-colors z-10"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="px-4 pb-4 relative pt-9">
                  <div className="absolute -top-9 left-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-surface shadow-sm border-[3px] border-surface overflow-hidden">
                        <img src={avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
                      </div>
                      <div
                        className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[3px] border-surface ${isOnline ? 'bg-success' : 'bg-gray-500'}`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <h2 id="player-profile-title" className="text-base sm:text-lg font-black text-fg leading-tight break-words">
                      {profile.nickname || profile.username}
                    </h2>
                    <p className="text-[11px] text-fg-muted font-space">@{profile.username}</p>
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
                      {isRival && (
                        <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Shield size={10} /> Rival
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface-subtle rounded-xl p-3 border border-white/5 mb-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Trophy size={9} className="text-primary" /> Total Skor
                        </span>
                        <span className="text-sm font-black text-fg truncate">{profile.score.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Swords size={9} className="text-red-400" /> PvP Wins
                        </span>
                        <span className="text-sm font-black text-fg">{profile.total_pvp_wins || 0}</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <CheckCircle2 size={9} className="text-success" /> Akurasi
                        </span>
                        <span className="text-sm font-black text-fg">{akurasiTotal}%</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-fg-muted font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Activity size={9} className="text-blue-400" /> Survival Max
                        </span>
                        <span className="text-sm font-black text-fg">{profile.highest_survival_score || 0}</span>
                      </div>
                    </div>
                  </div>

                  {profile.bio && <p className="text-xs text-fg-muted text-center italic mb-3">"{profile.bio}"</p>}

                  {showFollow && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleFollowToggle}
                      className={`w-full font-black py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60 ${
                        following
                          ? 'bg-surface-subtle border border-border text-fg hover:bg-danger/10 hover:text-danger hover:border-danger/30'
                          : 'bg-primary hover:bg-yellow-400 text-primary-fg'
                      }`}
                    >
                      {following ? (
                        <>
                          <UserCheck size={15} /> Mengikuti
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} /> Ikuti
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
