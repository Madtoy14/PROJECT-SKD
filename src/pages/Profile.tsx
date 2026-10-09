import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Swords, Medal, Target, Zap, Trophy, X,
  UserPlus, Trash2, CheckCircle2, SquarePen, Lock,
  Bot, BarChart2, Settings, Flame, Coins, Star, ClipboardList, Handshake, CheckCircle
} from 'lucide-react';
import { useDuelMatchmaking } from '../context/DuelContext';
import { fetchProfile, updateProfile, supabase, isSupabaseConfigured, fetchAvailableCharacters } from '../lib/supabase';
import { getFollowCounts, getMutualRivals, unfollowUser } from '../lib/supabaseHelpers';
import type { UserProfile, Character } from '../lib/supabase';
import { ProfileSkeleton } from '../components/LoadingSkeleton';
import PlayerProfileModal from '../components/PlayerProfileModal';
import RankBadge, { RankCard } from '../components/RankBadge';
import { getUserAnalytics } from '../lib/supabase';
import { dicebearUrl } from '../lib/constants';

// lazy-loaded via React.lazy + Suspense.
const ProfileCharts = React.lazy(() => import('../components/ProfileCharts'));

export const getBadgeIcon = (iconName: string) => {
  switch (iconName) {
    case 'check': return <CheckCircle size={24} />;
    case 'flame': return <Flame size={24} />;
    case 'zap': return <Zap size={24} />;
    case 'medal': return <Medal size={24} />;
    case 'trophy': return <Trophy size={24} />;
    case 'handshake': return <Handshake size={24} />;
    default: return <Star size={24} />;
  }
};

const ALL_BADGES_DATA = [
  { id: 1, name: 'Pawang TWK', icon: 'check', desc: 'Total >100 jawaban benar.' },
  { id: 2, name: 'Veteran Silogisme', icon: 'flame', desc: 'Skor Survival >10.' },
  { id: 3, name: 'Speed Runner', icon: 'zap', desc: 'Menyelesaikan >10 Kuis.' },
  { id: 4, name: 'Master TIU', icon: 'medal', desc: 'Total >500 jawaban benar.' },
  { id: 5, name: 'Legendary TKP', icon: 'trophy', desc: 'Menyelesaikan >50 Kuis.' },
  { id: 6, name: 'Dewa Analogi', icon: 'handshake', desc: 'Memenangkan >5 match PvP.' },
];

const SCHOOLS = [
  { id: 'stmkg', name: 'STMKG' },
  { id: 'stan', name: 'PKN STAN' },
  { id: 'ipdn', name: 'IPDN' },
  { id: 'poltekim', name: 'Poltekimipas' },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};
export default function Profile() {
  const navigate = useNavigate();

  // Profile loading state
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  // Accuracy & Radar Chart state
  const [akurasi, setAkurasi] = useState<{
    TWK: { correct: number; total: number };
    TWK_total?: number; // legacy fallback if any
    TIU: { correct: number; total: number };
    TKP: { correct: number; total: number };
  }>({
    TWK: { correct: 0, total: 0 },
    TIU: { correct: 0, total: 0 },
    TKP: { correct: 0, total: 0 }
  });

  // Accuracy from profile
  useEffect(() => {
    if (profile?.akurasi) {
      setAkurasi(profile.akurasi as any);
    }
  }, [profile]);

  const getAcc = (cat: 'TWK' | 'TIU' | 'TKP') => {
    const data = akurasi[cat] || { correct: 0, total: 0 };
    return data.total > 0 ? (data.correct / data.total) * 100 : 0;
  };

  const twkAcc = getAcc('TWK') || 60; // fallback for radar viz
  const tiuAcc = getAcc('TIU') || 60;
  const tkpAcc = getAcc('TKP') || 60;

  // Estimasi skor berdasarkan passing grade maksimum: TWK(150), TIU(175), TKP(225)
  const twkScore = Math.round((twkAcc / 100) * 150);
  const tiuScore = Math.round((tiuAcc / 100) * 175);
  const tkpScore = Math.round((tkpAcc / 100) * 225);

  let radarTwk = twkAcc;
  let radarTiu = tiuAcc;
  let radarTkp = tkpAcc;
  
  if (analytics?.wrongStats) {
    const ws = analytics.wrongStats;
    if (ws.total > 0) {
      radarTwk = Math.max(0, 100 - ((ws.twk / ws.total) * 100));
      radarTiu = Math.max(0, 100 - ((ws.tiu / ws.total) * 100));
      radarTkp = Math.max(0, 100 - ((ws.tkp / ws.total) * 100));
    }
  }

  const radarData = useMemo(() => ({
    labels: ['TWK', 'TIU', 'TKP'],
    datasets: [
      {
        label: 'SKD Mastery',
        data: [radarTwk, radarTiu, radarTkp],
        backgroundColor: 'rgba(243, 160, 76, 0.2)',
        borderColor: '#F3A04C',
        borderWidth: 2,
        pointBackgroundColor: '#F3A04C',
      },
    ],
  }), [radarTwk, radarTiu, radarTkp]);
  
  const radarOptions = useMemo(() => ({
    scales: {
      r: {
        angleLines: { color: 'rgba(150, 150, 150, 0.2)' },
        grid: { color: 'rgba(150, 150, 150, 0.2)' },
        pointLabels: { color: '#888', font: { size: 11, weight: 'bold' as const } },
        ticks: { display: false, min: 0, max: 100 }
      }
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false
  }), []);

  const lineData = useMemo(() => ({
    labels: analytics?.trend?.labels || ['Hari Ini'],
    datasets: [
      {
        label: 'Skor Rata-rata',
        data: analytics?.trend?.data || [0],
        borderColor: '#40B43E',
        backgroundColor: 'rgba(64, 180, 62, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: '#40B43E'
      }
    ]
  }), [analytics?.trend?.labels, analytics?.trend?.data]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { grid: { color: 'rgba(150, 150, 150, 0.1)' }, ticks: { color: '#888', font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } }
    },
    plugins: { legend: { display: false } }
  }), []);

  // Title badges logic
  const checkTitle = (cat: 'TWK' | 'TIU' | 'TKP') => {
    const data = akurasi[cat] || { correct: 0, total: 0 };
    return data.total >= 50 && (data.correct / data.total) >= 0.8;
  };
  const isMasterTwk = checkTitle('TWK');
  const isMasterTiu = checkTitle('TIU');
  const isMasterTkp = checkTitle('TKP');

  // Compute recommendations
  let rekomendasiAI = 'Selesaikan kuis untuk mendapatkan analisis detail kemampuan dan rekomendasi belajar Anda.';
  const failedCategories: string[] = [];
  if (getAcc('TWK') > 0 && twkScore < 65) failedCategories.push('TWK (Skor < 65)');
  if (getAcc('TIU') > 0 && tiuScore < 80) failedCategories.push('TIU (Skor < 80)');
  if (getAcc('TKP') > 0 && tkpScore < 166) failedCategories.push('TKP (Skor < 166)');

  if (getAcc('TWK') === 0 && getAcc('TIU') === 0 && getAcc('TKP') === 0) {
    rekomendasiAI = 'Mari mulai belajar dengan kuis Latihan Harian, PvP, atau Tryout agar AI kami bisa memetakan kekuatan Anda!';
  } else if (failedCategories.length === 0) {
    rekomendasiAI = 'Luar biasa! Skor akurasi Anda di semua sub-tes telah melampaui passing grade BKN nasional. Pertahankan performa ini dan terus berlatih simulasi CAT!';
  } else {
    rekomendasiAI = `AI merekomendasikan Anda untuk fokus meningkatkan materi pada kategori ${failedCategories.join(', ')} karena saat ini akurasi Anda masih di bawah ambang batas kelulusan nasional BKN.`;
  }
  const { inviteStatus, targetId, sendInvite, resetInviteState, activeDuelRoomId, cancelInvite } = useDuelMatchmaking();

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'mengikuti' | 'pengikut'>('mengikuti');
  if (isFollowModalOpen || followModalTab === 'mengikuti') { }

  // Form edit states
  const [usernameInput, setUsernameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<Character | null>(null);
  const [pinnedBadges, setPinnedBadges] = useState<number[]>([1, 2, 3]);
  const [targetKedinasan, setTargetKedinasan] = useState('IPDN');
  const [friends, setFriends] = useState<any[]>([]);
  const [newFriendName, setNewFriendName] = useState('');

  // Follow stats & Search friend
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);
  const [searchFriendModal, setSearchFriendModal] = useState(false);
  const [searchFriendResult, setSearchFriendResult] = useState<any>(null);
  const [searchFriendError, setSearchFriendError] = useState(false);
  const [isSearchingFriend, setIsSearchingFriend] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Dynamic Badges based on Profile
  const dynamicBadges = ALL_BADGES_DATA.map(badge => {
    let unlocked = false;
    if (profile) {
      switch (badge.id) {
        case 1: unlocked = (profile.total_correct_answers || 0) >= 100; break;
        case 2: unlocked = (profile.highest_survival_score || 0) >= 10; break;
        case 3: unlocked = (profile.total_quizzes_completed || 0) >= 10; break;
        case 4: unlocked = (profile.total_correct_answers || 0) >= 500; break;
        case 5: unlocked = (profile.total_quizzes_completed || 0) >= 50; break;
        case 6: unlocked = (profile.total_pvp_wins || 0) >= 5; break;
      }
    }
    return { ...badge, unlocked };
  });

  // Invite toast state
  const [inviteToast, setInviteToast] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastType(type);
    setInviteToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setInviteToast(''), 3500);
  };
  useEffect(() => {
    setLoading(true);

    fetchAvailableCharacters().then(chars => {
      // OVERRIDE: Map existing database character IDs (or defaults) to animal avatars 1-10
      const mappedChars = Array.from({ length: 10 }, (_, i) => {
        const num = i + 1;
        const existingChar = chars[i];
        return {
          id: existingChar ? existingChar.id : String(num),
          name: `Avatar ${num}`,
          image_url: supabase ? supabase.storage.from('avatars').getPublicUrl(`${num}.png`).data.publicUrl : '',
          is_free: existingChar ? existingChar.is_free : (num === 1)
        };
      });
      setAvailableCharacters(mappedChars);

      fetchProfile()
        .then(p => {
          if (!p) return;
          setProfile(p);
          setUsernameInput(p.nickname || p.username);
          setTargetKedinasan(p.target_kedinasan || 'IPDN');

          const currentEquipped = mappedChars.find(o => o.id === p.selected_avatar) || mappedChars[0] || null;
          setSelectedAvatar(currentEquipped);

          // Social: tabel friends only (mutual = rival). No dual-write profiles.friends.
          if (isSupabaseConfigured()) {
            getFollowCounts(p.id).then(({ followers, following }) => {
              setFollowersCount(followers);
              setFollowingCount(following);
            });
            getMutualRivals(p.id).then(list => setFriends(list));
            getUserAnalytics(p.id).then(a => setAnalytics(a));
          } else {
            setFriends(p.friends || []);
          }
        })
        .finally(() => setLoading(false));
    });
  }, []);

  // Fetch status online rival dari Supabase berdasarkan last_login
  useEffect(() => {
    if (!isSupabaseConfigured() || friends.length === 0) return;

    const friendIds = friends.map(f => String(f.id));
    supabase!
      .from('profiles')
      .select('id, last_login')
      .in('id', friendIds)
      .then(({ data }) => {
        if (!data) return;
        const now = Date.now();
        const onlineMap: Record<string, boolean> = {};
        data.forEach(p => {
          const lastLogin = p.last_login ? new Date(p.last_login).getTime() : 0;
          onlineMap[p.id] = (now - lastLogin) / (1000 * 60) <= 15;
        });
        setFriends(prev => prev.map(f => ({
          ...f,
          online: onlineMap[String(f.id)] ?? false
        })));
      });
  }, [friends.length]); // run setiap kali jumlah rival berubah
  useEffect(() => {
    if (inviteStatus === 'rejected') {
      const friend = friends.find(f => String(f.id) === targetId);
      showToast(`${friend?.name ?? 'Pemain'} menolak duelmu.`, 'error');
      setTimeout(resetInviteState, 3500);
    } else if (inviteStatus === 'timeout') {
      showToast('Pemain tidak merespons.', 'error');
      setTimeout(resetInviteState, 3500);
    } else if (inviteStatus === 'accepted') {
      const friend = friends.find(f => String(f.id) === targetId);
      showToast(`${friend?.name ?? 'Pemain'} menerima tantanganmu!`, 'success');
      setTimeout(() => {
        const roomId = activeDuelRoomId;
        resetInviteState();
        navigate('/quiz', { state: { mode: 'pvp1v1', opponent: friend?.name, roomId: roomId, isHost: true } });
      }, 1500);
    }
  }, [inviteStatus]);
  const filteredFriends = friends.filter(f => 
    f.name?.toLowerCase().includes(newFriendName.toLowerCase()) || 
    f.username?.toLowerCase().includes(newFriendName.toLowerCase())
  );

  const handleRemoveFriend = async (id: number | string) => {
    const friend = friends.find(f => String(f.id) === String(id));
    if (!profile) return;
    const ok = await unfollowUser(profile.id, String(id));
    if (!ok) {
      showToast('Gagal hapus rival.', 'error');
      return;
    }
    setFriends(prev => prev.filter(f => String(f.id) !== String(id)));
    getFollowCounts(profile.id).then(({ followers, following }) => {
      setFollowersCount(followers);
      setFollowingCount(following);
    });
    showToast(`Berhenti mengikuti ${friend?.name ?? 'Rival'}.`, 'info');
  };

  const refreshSocial = async () => {
    if (!profile) return;
    const [{ followers, following }, rivals] = await Promise.all([
      getFollowCounts(profile.id),
      getMutualRivals(profile.id),
    ]);
    setFollowersCount(followers);
    setFollowingCount(following);
    setFriends(rivals);
  };
  const handleSearchProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchVal = newFriendName.trim().replace(/^@/, '');
    if (!searchVal || !profile) return;

    setIsSearchingFriend(true);
    setSearchFriendResult(null);
    setSearchFriendError(false);
    try {
      const { data } = await supabase!
        .from('profiles')
        .select('id, username, score, selected_avatar')
        .ilike('username', searchVal)
        .neq('id', profile.id) // Jangan cari diri sendiri
        .maybeSingle();

      if (data) {
        setSearchFriendResult(data);
      } else {
        setSearchFriendError(true);
      }
    } catch (err) {
      console.error(err);
      setSearchFriendError(true);
    }
    setIsSearchingFriend(false);
  };

  useEffect(() => {
    if (isFollowModalOpen && profile) {
      setIsFollowListLoading(true);
      const fetchFollowData = async () => {
        try {
          if (followModalTab === 'pengikut') {
            const { data } = await supabase!.from('friends')
              .select('id, user_id, profiles!friends_user_id_fkey(id, username, selected_avatar, score)')
              .eq('friend_id', profile.id)
              .eq('status', 'accepted');
            setFollowersList(data || []);
          } else {
            const { data } = await supabase!.from('friends')
              .select('id, friend_id, profiles!friends_friend_id_fkey(id, username, selected_avatar, score)')
              .eq('user_id', profile.id)
              .eq('status', 'accepted');
            setFollowingList(data || []);
          }
        } catch (err) {
          console.error("Gagal menarik data pertemanan", err);
        } finally {
          setIsFollowListLoading(false);
        }
      };
      fetchFollowData();
    }
  }, [isFollowModalOpen, followModalTab, profile]);

  const togglePinBadge = (id: number) => {
    setPinnedBadges(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 3) {
        showToast('Maksimal hanya boleh menyematkan 3 lencana!', 'error');
        return prev;
      }
      return [...prev, id];
    });
  };
  const handleSaveProfile = async () => {
    if (!profile || !selectedAvatar) return;

    // Check lock status for avatar
    const isUnlocked = selectedAvatar.is_free || profile.unlocked_avatars?.includes(selectedAvatar.id);
    if (!isUnlocked) {
      showToast(`Kostum "${selectedAvatar.name}" belum dibeli di Toko!`, 'error');
      return;
    }
    const updatedProfile = await updateProfile({
      username: usernameInput || profile.username,
      nickname: usernameInput || profile.nickname,
      selected_avatar: selectedAvatar.id,
      target_kedinasan: targetKedinasan
    });

    setProfile(updatedProfile);
    setIsEditProfileOpen(false);
    showToast('Profil berhasil diperbarui!', 'success');
  };
  // Dynamic Level XP Progression
  const levelXPRequired = profile ? profile.level * 1000 : 15000;
  const currentXPProgress = profile ? profile.score % levelXPRequired : 12450;
  const progressPercent = Math.min((currentXPProgress / levelXPRequired) * 100, 100);

  if (loading) return <ProfileSkeleton />;

  return (
      <div className="min-h-screen bg-[#F4F7FC] pb-32 font-sans text-slate-800 relative overflow-x-hidden selection:bg-blue-500/20">
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#E2E8F0]/80 to-transparent pointer-events-none" />
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-300/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-300/10 blur-[120px] pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 relative z-10 space-y-8">
          <h1 className="text-lg font-black text-fg">Profil</h1>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-xl border border-border bg-surface-subtle hover:bg-primary/10 hover:border-primary/30 text-fg flex items-center justify-center transition-colors"
            aria-label="Pengaturan"
            title="Pengaturan"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Toast Notification */}
      <AnimatePresence>
        {inviteToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-bold shadow-2xl transition-all whitespace-nowrap ${toastType === 'success' ? 'bg-success shadow-sm' :
                toastType === 'error' ? 'bg-danger shadow-sm' : 'bg-primary text-primary-fg shadow-sm'
              }`}
          >
            {inviteToast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-surface shadow-sm border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="font-bold text-lg">Edit Profil & Karakter</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="text-fg-muted hover:text-fg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                {/* Username Input */}
                <div>
                  <h4 className="text-sm font-bold text-fg-muted mb-3">NAMA PEJUANG CPNS</h4>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan nama..."
                    maxLength={15}
                    className="w-full bg-surface shadow-sm border border-border rounded-xl p-3 text-sm font-bold outline-none focus:border-primary transition-colors text-fg"
                  />
                </div>
                {/* Target Kedinasan */}
                <div>
                  <h4 className="text-sm font-bold text-fg-muted mb-3">TARGET KEDINASAN</h4>
                  <div className="relative">
                    <select
                      value={targetKedinasan}
                      onChange={(e) => setTargetKedinasan(e.target.value)}
                      className="w-full bg-surface shadow-sm border border-border rounded-xl p-3 text-sm font-bold appearance-none outline-none focus:border-primary transition-colors"
                    >
                      {SCHOOLS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Avatar Selection */}
                <div>
                  <h4 className="text-sm font-bold text-fg-muted mb-3 mt-6">PILIH AVATAR</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {availableCharacters.map(opt => {
                      const isUnlocked = opt.is_free || profile?.unlocked_avatars?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (isUnlocked) {
                              setSelectedAvatar(opt);
                            } else {
                              showToast(`Avatar "${opt.name}" terkunci! Beli di Toko.`, 'error');
                            }
                          }}
                          className={`cursor-pointer rounded-2xl border-2 transition-all p-1.5 flex flex-col items-center gap-1 relative ${selectedAvatar?.id === opt.id
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : isUnlocked ? 'border-border hover:border-primary bg-surface-subtle' : 'border-border opacity-50'
                            }`}
                        >
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface shadow-sm">
                            <img src={opt.image_url} alt={opt.name} className="w-full h-full object-contain p-1" />
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center">
                                <Lock size={16} className="text-fg" />
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] font-bold text-center leading-tight">{opt.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Badge pinning */}
                <div>
                  <h4 className="text-sm font-bold text-fg-muted mb-3">PIN LENCANA (MAKS. 3)</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {dynamicBadges.filter(b => b.unlocked).map(badge => {
                      const isPinned = pinnedBadges.includes(badge.id);
                      return (
                        <div
                          key={badge.id}
                          onClick={() => togglePinBadge(badge.id)}
                          className={`cursor-pointer w-full aspect-square rounded-2xl border-2 flex items-center justify-center text-2xl transition-all relative
                            ${isPinned ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'}
                          `}
                        >
                          {getBadgeIcon(badge.icon as string)}
                          {isPinned && <CheckCircle2 size={14} className="absolute -top-2 -right-2 text-primary bg-surface shadow-sm rounded-full" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleSaveProfile}
                  className="w-full bg-primary text-primary-fg font-bold py-3 rounded-xl hover:bg-coin transition-colors shadow-lg shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 lg:space-y-8"
      >
        {/* ============================================================== */}
        {/* 1. MAIN HERO SECTION (CHARACTER SHOWCASE + PROFILE INFO)         */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          
          {/* LEFT: CHARACTER SHOWCASE */}
          <motion.div 
            variants={itemVariants}
            className="xl:col-span-5 relative flex flex-col items-center justify-center bg-gradient-to-b from-[#F8FAFC] to-[#E2E8F0] rounded-[2.5rem] border border-white/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-8 overflow-hidden min-h-[400px] lg:min-h-[500px]"
          >
            {/* Soft background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,1)_0%,transparent_70%)] pointer-events-none" />
            
            {/* Banner element hanging from top (like SKD QUEST flag) */}
            <div className="absolute top-0 left-8 bg-blue-600 text-white px-4 pb-6 pt-8 rounded-b-2xl shadow-lg border-x-4 border-b-4 border-blue-700 flex flex-col items-center">
               <Trophy size={24} className="text-yellow-400 mb-2" />
               <span className="font-black text-sm tracking-widest uppercase writing-vertical-rl rotate-180">SKD QUEST</span>
            </div>

            {/* Platform / Pedestal */}
            <div className="absolute bottom-16 lg:bottom-24 w-[280px] h-[60px] bg-black/10 rounded-[100%] blur-xl" />
            <div className="absolute bottom-16 lg:bottom-24 w-[220px] h-[40px] bg-gradient-to-b from-white/40 to-slate-300/40 rounded-[100%] border border-white/50 shadow-inner z-0" />

            {/* Avatar Image */}
            <img 
              src={selectedAvatar?.image_url || (supabase ? supabase.storage.from('avatars').getPublicUrl('1.png').data.publicUrl : '')} 
              alt="Character" 
              className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] lg:w-[360px] lg:h-[360px] object-contain relative z-10 hover:scale-105 transition-transform duration-500 drop-shadow-2xl"
            />

            {/* Change Avatar Button */}
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute bottom-6 relative z-20 bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 font-bold py-3 px-8 rounded-full shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_35px_-10px_rgba(59,130,246,0.3)] hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2 text-sm group"
            >
              <Zap size={16} className="text-yellow-500 group-hover:animate-pulse" />
              Ganti Avatar
            </button>
          </motion.div>

          {/* RIGHT: PLAYER IDENTITY & STATS */}
          <div className="xl:col-span-7 flex flex-col gap-6 lg:gap-8">
            
            {/* Profile Identity Card */}
            <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-xl p-6 lg:p-8 rounded-[2.5rem] border border-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
              {/* Subtle background flair */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex-1 relative z-10">
                <div className="inline-flex items-center px-4 py-1.5 bg-yellow-400 text-yellow-950 rounded-full text-xs font-black tracking-widest mb-4 shadow-sm border border-yellow-300">
                  TARGET: {SCHOOLS.find(s => s.id === (profile?.target_kedinasan || 'ipdn'))?.name || 'SEKOLAH KEDINASAN'}
                </div>
                
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 uppercase tracking-tight mb-1 drop-shadow-sm">
                  {profile ? (profile.nickname || profile.username) : 'PEJUANG SKD'}
                  <button onClick={() => setIsEditProfileOpen(true)} className="inline-block ml-3 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 p-2 rounded-full transition-colors align-middle">
                     <SquarePen size={18} />
                  </button>
                </h1>
                
                <p className="text-slate-500 font-bold flex items-center gap-3 mb-6 flex-wrap">
                  @{profile ? profile.username.toLowerCase().replace(/\s/g, '') : 'pejuang_skd'}
                  {isMasterTwk && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-black tracking-wider shadow-sm inline-flex items-center gap-1"><Star size={10} /> MASTER TWK</span>}
                  {isMasterTiu && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black tracking-wider shadow-sm inline-flex items-center gap-1"><Zap size={10} /> MASTER TIU</span>}
                  {isMasterTkp && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black tracking-wider shadow-sm inline-flex items-center gap-1"><Flame size={10} /> MASTER TKP</span>}
                </p>

                {/* Level & Rank Integration */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full max-w-lg">
                  {/* Rank Badge */}
                  <div className="flex items-center gap-3 bg-slate-800 text-white pl-2 pr-5 py-2 rounded-2xl shadow-lg border border-slate-700 shrink-0">
                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center border border-slate-600">
                      <Swords size={20} className="text-yellow-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rank Saat Ini</div>
                      <div className="font-black text-sm">Warrior <span className="text-slate-500 ml-1">&gt;</span></div>
                    </div>
                  </div>
                  
                  {/* Level Progress */}
                  <div className="flex-1 w-full bg-slate-100/80 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center text-xs font-black text-slate-600 mb-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">LEVEL {profile?.level || 1}</span>
                      <span className="text-slate-500 font-space">{currentXPProgress.toLocaleString()} / {levelXPRequired.toLocaleString()} XP</span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-300">
                      <motion.div 
                        initial={{width:0}} 
                        animate={{width:`${progressPercent}%`}} 
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full relative"
                      >
                         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+')] opacity-50 mix-blend-overlay"></div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Horizontal Stats Strip */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { label: 'Hari Streak', value: profile?.streak || 0, icon: <Flame size={24} />, color: 'from-orange-400 to-red-500', shadow: 'shadow-orange-200' },
                 { label: 'Energi', value: `${profile?.energy || 0} / 25`, icon: <Zap size={24} />, color: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-200' },
                 { label: 'Koin', value: (profile?.coins || 0).toLocaleString(), icon: <Coins size={24} />, color: 'from-yellow-500 to-yellow-600', shadow: 'shadow-yellow-300' },
                 { label: 'Soal Selesai', value: profile?.total_quizzes_completed || 0, icon: <Star size={24} />, color: 'from-blue-400 to-indigo-500', shadow: 'shadow-blue-200' },
               ].map((stat, i) => (
                 <div key={i} className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 group">
                   <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform duration-300`}>
                     {stat.icon}
                   </div>
                   <div className="text-center">
                     <div className="text-2xl font-black text-slate-800 font-space">{stat.value}</div>
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                   </div>
                 </div>
               ))}
            </motion.div>

            {/* Performance & Analysis Blocks */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full flex-1">
               {/* Performa Belajar */}
               <div className="bg-white/80 backdrop-blur-xl p-6 lg:p-8 rounded-[2rem] text-slate-800 shadow-xl relative overflow-hidden flex flex-col h-full border border-white">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-center mb-8 relative z-10">
                    <h3 className="font-bold flex items-center gap-3 text-lg"><BarChart2 size={20} className="text-blue-500" /> Performa Belajar</h3>
                    <button className="text-[10px] text-blue-500 hover:text-blue-600 font-bold tracking-widest uppercase">Lihat Semua &gt;</button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-auto relative z-10">
                    <div className="text-center group">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto rounded-full border-[6px] border-slate-100 bg-white flex items-center justify-center mb-3 shadow-inner relative overflow-hidden">
                         <div className="absolute bottom-0 left-0 w-full bg-blue-500/20 transition-all duration-1000" style={{height: '60%'}}></div>
                         <span className="font-black text-xl lg:text-2xl relative z-10 text-slate-800 drop-shadow-sm font-space">{profile?.total_quizzes_completed || 0}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider group-hover:text-blue-600 transition-colors">Total Soal</span>
                    </div>
                    <div className="text-center group">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto rounded-full border-[6px] border-slate-100 bg-white flex items-center justify-center mb-3 shadow-inner relative overflow-hidden">
                         <div className="absolute bottom-0 left-0 w-full bg-green-500/20 transition-all duration-1000" style={{height: `${Math.round((getAcc('TWK') + getAcc('TIU') + getAcc('TKP')) / 3 || 0)}%`}}></div>
                         <span className="font-black text-xl lg:text-2xl relative z-10 text-slate-800 drop-shadow-sm font-space">{Math.round((getAcc('TWK') + getAcc('TIU') + getAcc('TKP')) / 3 || 0)}%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider group-hover:text-green-600 transition-colors">Akurasi</span>
                    </div>
                    <div className="text-center group">
                      <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto rounded-full border-[6px] border-slate-100 bg-white flex items-center justify-center mb-3 shadow-inner relative overflow-hidden">
                         <div className="absolute bottom-0 left-0 w-full bg-orange-500/20 transition-all duration-1000" style={{height: '30%'}}></div>
                         <span className="font-black text-xl lg:text-2xl relative z-10 text-slate-800 drop-shadow-sm font-space">{profile?.highest_survival_score || 0}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider group-hover:text-orange-600 transition-colors">Skor Survival</span>
                    </div>
                  </div>
               </div>

               {/* Analisis SKD */}
               <div className="bg-white/80 backdrop-blur-xl p-6 lg:p-8 rounded-[2rem] text-slate-800 shadow-xl relative overflow-hidden flex flex-col h-full border border-white">
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex justify-between items-center mb-6 relative z-10">
                     <h3 className="font-bold flex items-center gap-3 text-lg"><Target size={20} className="text-indigo-500" /> Analisis SKD</h3>
                     <button className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold tracking-widest uppercase">&gt;</button>
                  </div>
                  <div className="flex-1 w-full min-h-[160px] relative z-10">
                     <Suspense fallback={<div className="flex items-center justify-center h-full text-xs text-slate-400">Memuat Grafik...</div>}>
                       <ProfileCharts 
                          radarData={radarData} 
                          radarOptions={{
                             ...radarOptions, 
                             scales: {
                               r: {
                                 angleLines: { color: 'rgba(0,0,0,0.05)' },
                                 grid: { color: 'rgba(0,0,0,0.05)' },
                                 pointLabels: { color: '#64748b', font: { size: 11, weight: 'bold' } },
                                 ticks: { display: false, min: 0, max: 100 }
                               }
                             },
                          }} 
                          lineData={lineData} 
                          lineOptions={lineOptions} 
                       />
                     </Suspense>
                  </div>
                  <div className="flex justify-between mt-6 px-4 relative z-10 bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-inner">
                    <div className="text-center"><div className="text-[10px] font-black text-slate-400 mb-1">TWK</div><div className={`font-space font-black text-lg ${twkScore >= 65 ? 'text-green-500' : 'text-red-500'}`}>{twkScore}</div></div>
                    <div className="w-px bg-slate-200" />
                    <div className="text-center"><div className="text-[10px] font-black text-slate-400 mb-1">TIU</div><div className={`font-space font-black text-lg ${tiuScore >= 80 ? 'text-green-500' : 'text-red-500'}`}>{tiuScore}</div></div>
                    <div className="w-px bg-slate-200" />
                    <div className="text-center"><div className="text-[10px] font-black text-slate-400 mb-1">TKP</div><div className={`font-space font-black text-lg ${tkpScore >= 166 ? 'text-green-500' : 'text-red-500'}`}>{tkpScore}</div></div>
                  </div>
               </div>
            </motion.div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. AVATAR COLLECTION                                             */}
        {/* ============================================================== */}
        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white shadow-xl p-6 lg:p-8 relative mt-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
             <div>
               <h3 className="font-black text-2xl flex items-center gap-3 text-slate-800 mb-2">
                 <Star className="text-yellow-500" size={28} /> Koleksi Avatar
               </h3>
               <p className="text-sm font-bold text-slate-500">Pilih karakter yang akan menemani perjalanan belajarmu.</p>
             </div>
          </div>
          
          <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 custom-scrollbar snap-x scroll-smooth -mx-6 px-6 lg:mx-0 lg:px-0">
            {availableCharacters.map(char => {
               const isUnlocked = char.is_free || profile?.unlocked_avatars?.includes(char.id);
               const isActive = selectedAvatar?.id === char.id;
               return (
                 <div 
                   key={char.id} 
                   onClick={() => isUnlocked ? setSelectedAvatar(char) : showToast('Kostum ini terkunci! Beli di Toko.', 'error')}
                   className={`snap-center flex-shrink-0 w-36 sm:w-44 rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 relative border-4 flex flex-col
                     ${isActive ? 'border-blue-500 shadow-[0_20px_40px_-15px_rgba(59,130,246,0.5)] -translate-y-4 bg-gradient-to-b from-blue-50 to-blue-100' : 
                       isUnlocked ? 'border-transparent bg-white hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)]' : 
                       'border-transparent bg-slate-100 opacity-60 grayscale hover:grayscale-0 transition-all'}
                   `}
                 >
                   <div className={`aspect-square relative p-4 flex items-center justify-center flex-1 ${isActive ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                      {isActive && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]"></div>}
                      <img src={char.image_url} alt={char.name} className="w-full h-full object-contain relative z-10 drop-shadow-xl" />
                      {!isUnlocked && (
                         <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                           <Lock className="text-slate-400 drop-shadow-sm" size={32} />
                         </div>
                      )}
                   </div>
                   <div className={`py-4 px-3 text-center flex-shrink-0 ${isActive ? 'bg-blue-500 text-white' : 'bg-white text-slate-800 border-t border-slate-100'}`}>
                     <h4 className="font-black text-sm uppercase tracking-widest truncate">{char.name}</h4>
                     {isActive && (
                        <div className="mt-2 inline-flex items-center justify-center bg-white text-blue-600 font-black text-[10px] px-3 py-1 rounded-full tracking-wider shadow-sm">
                           AKTIF
                        </div>
                     )}
                   </div>
                 </div>
               )
            })}
          </div>
        </motion.div>

        {/* ============================================================== */}
        {/* 3. ACHIEVEMENTS & RECENT ACTIVITY                              */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mt-8">
          
          {/* LEFT: Pencapaian (Achievements) */}
          <motion.div variants={itemVariants} className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl p-6 lg:p-8 flex flex-col relative overflow-hidden border border-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
               <div>
                 <h3 className="font-black text-xl flex items-center gap-3 text-slate-800 mb-2">
                   <Trophy size={24} className="text-yellow-500" /> Pencapaian
                 </h3>
                 <p className="text-sm font-bold text-slate-500">Kumpulkan pencapaian untuk menunjukkan progresmu.</p>
               </div>
               <button className="text-xs text-blue-500 font-bold hover:text-blue-600 tracking-widest uppercase bg-blue-50 px-4 py-2 rounded-xl transition-colors">Lihat Semua &gt;</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              {dynamicBadges.map(badge => (
                 <div key={badge.id} className={`flex items-center gap-4 p-4 rounded-[1.5rem] border-2 transition-all group ${badge.unlocked ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-300' : 'border-slate-100 bg-slate-50 opacity-60 grayscale hover:grayscale-0'}`}>
                    <div className={`w-16 h-16 flex-shrink-0 rounded-2xl flex items-center justify-center shadow-sm border border-white ${badge.unlocked ? 'bg-gradient-to-br from-yellow-200 to-yellow-400 text-yellow-800 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-slate-200 text-slate-500'}`}>
                       {getBadgeIcon(badge.icon as string)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-black text-sm text-slate-800 truncate mb-1 group-hover:text-yellow-600 transition-colors">{badge.name}</h4>
                       <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">{badge.desc}</p>
                    </div>
                 </div>
              ))}
            </div>
          </motion.div>

          {/* RIGHT: Aktivitas Terbaru (Recent Activity) */}
          <motion.div variants={itemVariants} className="xl:col-span-1 bg-white/80 backdrop-blur-xl border border-white rounded-[2.5rem] shadow-xl p-6 lg:p-8 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
               <h3 className="font-black text-xl flex items-center gap-3 text-slate-800">
                 <Zap size={20} className="text-blue-500" /> Aktivitas Terbaru
               </h3>
               <button className="text-[10px] text-blue-600 font-bold hover:text-blue-800 tracking-widest uppercase">Lihat Semua &gt;</button>
            </div>
            
            <div className="space-y-4 relative z-10 flex-1">
              {[
                { title: 'Menyelesaikan 1 sesi Latihan Harian', desc: '20 soal • Akurasi 75%', time: '2 jam lalu', icon: <ClipboardList size={20} />, color: 'text-blue-600 bg-blue-100', border: 'border-blue-200' },
                { title: 'Bermain PvP Battle', desc: 'Hasil: Menang', time: '5 jam lalu', icon: <Swords size={20} />, color: 'text-orange-600 bg-orange-100', border: 'border-orange-200' },
                { title: 'Menyelesaikan Try Out', desc: '110 soal • Skor 328', time: '1 hari lalu', icon: <Target size={20} />, color: 'text-green-600 bg-green-100', border: 'border-green-200' },
                { title: 'Membuka pencapaian baru', desc: 'Konsisten - Login 7 hari', time: '1 hari lalu', icon: <Trophy size={20} />, color: 'text-yellow-600 bg-yellow-100', border: 'border-yellow-200' }
              ].map((act, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100 cursor-default">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-sm border ${act.color} ${act.border} group-hover:scale-110 transition-transform`}>
                     {act.icon}
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-sm text-slate-800 truncate mb-0.5 group-hover:text-blue-600 transition-colors">{act.title}</h4>
                      <p className="text-xs text-slate-500 truncate font-medium">{act.desc}</p>
                   </div>
                   <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider whitespace-nowrap pt-2">{act.time}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </motion.div>

      {/* Search Friend Modal */}
      <AnimatePresence>
        {searchFriendModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface shadow-sm border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] mx-1"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="font-bold text-lg">Cari Teman</h3>
                <button onClick={() => setSearchFriendModal(false)} className="text-fg-muted hover:text-fg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5">
                <form onSubmit={handleSearchProfile} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Masukkan username..."
                    className="flex-1 bg-surface-subtle border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 text-fg"
                    disabled={isSearchingFriend}
                  />
                  <button
                    type="submit"
                    disabled={isSearchingFriend || !newFriendName.trim()}
                    className="bg-primary text-primary-fg px-4 rounded-lg font-bold hover:bg-coin disabled:opacity-50 transition-colors"
                  >
                    Cari
                  </button>
                </form>

                {isSearchingFriend ? (
                  <div className="flex flex-col items-center justify-center py-8 text-fg-muted">
                    <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-skd-accent rounded-full mb-3" />
                    <p className="text-sm">Mencari pemain...</p>
                  </div>
                ) : searchFriendError ? (
                  <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 flex flex-col items-center text-center text-red-400 mt-2">
                    <UserPlus size={32} className="mb-2 opacity-50" />
                    <p className="text-sm font-bold">Pemain tidak ditemukan</p>
                    <p className="text-xs mt-1 opacity-70">Pastikan username yang dimasukkan benar.</p>
                  </div>
                ) : searchFriendResult && (
                  <div 
                    onClick={() => {
                      setSelectedPlayerId(searchFriendResult.id);
                      setSearchFriendModal(false);
                    }}
                    className="bg-surface-subtle border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-surface-subtle/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={searchFriendResult.selected_avatar ? availableCharacters.find(o => o.id === searchFriendResult.selected_avatar)?.image_url || avatarPdh : dicebearUrl(searchFriendResult.username)}
                        alt={searchFriendResult.username}
                        className="w-14 h-14 rounded-full bg-surface shadow-sm object-cover border border-border"
                      />
                      <div>
                        <h4 className="font-bold text-fg group-hover:text-primary transition-colors">@{searchFriendResult.username}</h4>
                        <div className="text-xs font-bold text-premium">
                          Skor: {searchFriendResult.score}
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface-subtle p-2 rounded-full group-hover:bg-primary group-hover:text-primary-fg transition-all">
                      <UserPlus size={16} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Follow Details Modal */}
      <AnimatePresence>
        {isFollowModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface shadow-sm border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-border">
                <h3 className="font-bold text-lg">{followModalTab === 'mengikuti' ? 'Mengikuti' : 'Pengikut'}</h3>
                <button onClick={() => setIsFollowModalOpen(false)} className="text-fg-muted hover:text-fg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-border">
                <button
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${followModalTab === 'mengikuti' ? 'text-primary border-b-2 border-primary' : 'text-fg-muted hover:text-fg'}`}
                  onClick={() => setFollowModalTab('mengikuti')}
                >
                  Mengikuti
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-bold transition-colors ${followModalTab === 'pengikut' ? 'text-primary border-b-2 border-primary' : 'text-fg-muted hover:text-fg'}`}
                  onClick={() => setFollowModalTab('pengikut')}
                >
                  Pengikut
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar min-h-[250px]">
                {isFollowListLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-skd-accent rounded-full" />
                  </div>
                ) : (
                  <>
                    {followModalTab === 'mengikuti' && (
                      followingList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
                          <UserPlus size={32} className="mb-2" />
                          <p className="text-sm">Tidak ada yang diikuti.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {followingList.map(item => {
                            const p = item.profiles;
                            if (!p) return null;
                            return (
                              <div key={item.id} onClick={() => setSelectedPlayerId(p.id)} className="flex items-center gap-3 bg-surface-subtle p-3 rounded-xl border border-border cursor-pointer hover:bg-surface-subtle/50 transition-colors group">
                                <img
                                  src={p.selected_avatar ? availableCharacters.find(o => o.id === p.selected_avatar)?.image_url || avatarPdh : dicebearUrl(p.username)}
                                  alt={p.username}
                                  className="w-10 h-10 rounded-full bg-surface shadow-sm object-cover"
                                />
                                <div>
                                  <h4 className="font-bold text-sm text-fg group-hover:text-primary transition-colors">@{p.username}</h4>
                                  <p className="text-[10px] text-premium font-bold">Skor: {p.score}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}

                    {followModalTab === 'pengikut' && (
                      followersList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center opacity-50">
                          <UserPlus size={32} className="mb-2" />
                          <p className="text-sm">Tidak ada pengikut.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {followersList.map(item => {
                            const p = item.profiles;
                            if (!p) return null;
                            return (
                              <div key={item.id} onClick={() => setSelectedPlayerId(p.id)} className="flex items-center gap-3 bg-surface-subtle p-3 rounded-xl border border-border cursor-pointer hover:bg-surface-subtle/50 transition-colors group">
                                <img
                                  src={p.selected_avatar ? availableCharacters.find(o => o.id === p.selected_avatar)?.image_url || avatarPdh : dicebearUrl(p.username)}
                                  alt={p.username}
                                  className="w-10 h-10 rounded-full bg-surface shadow-sm object-cover"
                                />
                                <div>
                                  <h4 className="font-bold text-sm text-fg group-hover:text-primary transition-colors">@{p.username}</h4>
                                  <p className="text-[10px] text-premium font-bold">Skor: {p.score}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Universal Player Profile Modal */}
      {selectedPlayerId && (
        <PlayerProfileModal 
          playerId={selectedPlayerId} 
          onClose={() => setSelectedPlayerId(null)}
          existingRivalIds={friends.map(f => String(f.id))}
          onSocialChange={() => { void refreshSocial(); }}
        />
      )}
    </div>
  );
}