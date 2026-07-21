import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Swords, Medal, Target, Zap, Trophy, X,
  UserPlus, Trash2, CheckCircle2, SquarePen, Lock,
  Bot, BarChart2
} from 'lucide-react';
import { useDuelMatchmaking } from '../context/DuelContext';
import { fetchProfile, updateProfile, supabase, isSupabaseConfigured, fetchAvailableCharacters } from '../lib/supabase';
import type { UserProfile, Character } from '../lib/supabase';
import { ProfileSkeleton } from '../components/LoadingSkeleton';
import PlayerProfileModal from '../components/PlayerProfileModal';
import avatarPdh from '../assets/avatar_pdh.webp';
import RankBadge, { RankCard } from '../components/RankBadge';
import { getUserAnalytics } from '../lib/supabase';
import { dicebearUrl } from '../lib/constants';

// ponytail: chart.js (~630KB) lazy-loaded via React.lazy + Suspense.
// ProfileCharts wrapper owns ChartJS.register; pass typed data as props.
const ProfileCharts = React.lazy(() => import('../components/ProfileCharts'));

const ALL_BADGES_DATA = [
  { id: 1, name: 'Pawang TWK', icon: '📜', desc: 'Total >100 jawaban benar.' },
  { id: 2, name: 'Veteran Silogisme', icon: '✨', desc: 'Skor Survival >10.' },
  { id: 3, name: 'Speed Runner', icon: '⚡', desc: 'Menyelesaikan >10 Kuis.' },
  { id: 4, name: 'Master TIU', icon: '🎓', desc: 'Total >500 jawaban benar.' },
  { id: 5, name: 'Legendary TKP', icon: '🏆', desc: 'Menyelesaikan >50 Kuis.' },
  { id: 6, name: 'Dewa Analogi', icon: '🤝', desc: 'Memenangkan >5 match PvP.' },
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
      setAvailableCharacters(chars);

      fetchProfile()
        .then(p => {
          if (!p) return;
          setProfile(p);
          setUsernameInput(p.nickname || p.username);
          setFriends(p.friends || []);
          setTargetKedinasan(p.target_kedinasan || 'IPDN');

          const currentEquipped = chars.find(o => o.id === p.selected_avatar) || chars[0] || null;
          setSelectedAvatar(currentEquipped);

          // Fetch Social Stats
          if (isSupabaseConfigured()) {
            supabase!.from('friends').select('id', { count: 'exact', head: true })
              .eq('friend_id', p.id).eq('status', 'accepted')
              .then(({ count }) => setFollowersCount(count || 0));

            supabase!.from('friends').select('id', { count: 'exact', head: true })
              .eq('user_id', p.id).eq('status', 'accepted')
              .then(({ count }) => setFollowingCount(count || 0));
              
            getUserAnalytics(p.id).then(a => setAnalytics(a));
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

  const handleRemoveFriend = (id: number) => {
    const friend = friends.find(f => f.id === id);
    const newFriendsList = friends.filter(f => f.id !== id);
    setFriends(newFriendsList);
    updateProfile({ friends: newFriendsList });
    showToast(`Menghapus ${friend?.name ?? 'Rival'} dari daftar.`, 'info');
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
    <div className="p-4 md:p-8 space-y-8 pb-24 relative max-w-5xl mx-auto min-h-screen">

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
            className="fixed inset-0 bg-overlay backdrop-blur-sm backdrop-blur-md z-[100] flex items-center justify-center p-4"
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
                {/* Avatar / Seragam Karakter */}
                <div>
                  <h4 className="text-sm font-bold text-fg-muted mb-3 mt-6">PILIH KARAKTER PRIA</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {availableCharacters.filter(c => c.gender === 'male').map(opt => {
                      const isUnlocked = opt.is_free || profile?.unlocked_avatars?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (isUnlocked) {
                              setSelectedAvatar(opt);
                            } else {
                              showToast(`Kostum "${opt.name}" terkunci!`, 'error');
                            }
                          }}
                          className={`cursor-pointer rounded-2xl border-2 transition-all p-1.5 flex flex-col items-center gap-1 relative ${selectedAvatar?.id === opt.id
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : isUnlocked ? 'border-border hover:border-primary bg-surface-subtle' : 'border-border opacity-50'
                            }`}
                        >
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface shadow-sm">
                            <img src={opt.image_url} alt={opt.name} className="w-full h-full object-cover" />
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center">
                                <Lock size={16} className="text-fg" />
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] font-bold text-center leading-tight">{opt.name.split('-')[1]?.trim() || opt.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  <h4 className="text-sm font-bold text-fg-muted mb-3 mt-6">PILIH KARAKTER WANITA</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {availableCharacters.filter(c => c.gender === 'female').map(opt => {
                      const isUnlocked = opt.is_free || profile?.unlocked_avatars?.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (isUnlocked) {
                              setSelectedAvatar(opt);
                            } else {
                              showToast(`Kostum "${opt.name}" terkunci!`, 'error');
                            }
                          }}
                          className={`cursor-pointer rounded-2xl border-2 transition-all p-1.5 flex flex-col items-center gap-1 relative ${selectedAvatar?.id === opt.id
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : isUnlocked ? 'border-border hover:border-primary bg-surface-subtle' : 'border-border opacity-50'
                            }`}
                        >
                          <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-surface shadow-sm">
                            <img src={opt.image_url} alt={opt.name} className="w-full h-full object-cover" />
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center">
                                <Lock size={16} className="text-fg" />
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] font-bold text-center leading-tight">{opt.name.split('-')[1]?.trim() || opt.name}</span>
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
                          {badge.icon}
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
        className="space-y-8"
      >
        {/* Main Hero Card (Identity and Avatar) */}
        <motion.section
          variants={itemVariants}
          className="relative bg-surface border border-border rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden group shadow-lg hover:shadow-xl transition-all"
        >
          {/* Neon background decorations */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
          {/* Avatar Picture with Equipped Dress */}
          <div className="relative group/avatar">
            <div className="absolute -inset-1.5 bg-xp text-primary-fg rounded-full blur opacity-25 group-hover/avatar:opacity-40 transition-opacity" />
            <img
              src={selectedAvatar?.image_url || avatarPdh}
              alt="Avatar"
              className="w-48 h-48 rounded-full border-[6px] border-surface shadow-2xl relative z-10 object-cover"
            />
            <div className="absolute top-4 left-4 bg-premium text-primary-fg text-primary-fg font-space font-black text-xs px-3 py-1 rounded-full border border-yellow-300 shadow-md relative z-20">
              {selectedAvatar?.name ? selectedAvatar.name.split('-')[1]?.trim() || selectedAvatar.name : 'Profil'}
            </div>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute bottom-4 right-0 md:bottom-6 md:-right-2 bg-primary text-primary-fg p-2.5 rounded-full shadow-[0_0_15px_rgba(245,166,35,0.4)] hover:shadow-[0_0_25px_rgba(245,166,35,0.8)] transition-all z-30 group-hover:scale-110"
            >
              <SquarePen size={20} />
            </button>
          </div>
          {/* User Details */}
          <div className="flex-1 text-center md:text-left w-full">
            <div className="inline-flex items-center px-4 py-1.5 bg-coin-subtle border border-yellow-500/30 text-coin rounded-full text-xs font-bold mb-4 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
              Target: {SCHOOLS.find(s => s.id === (profile?.target_kedinasan || 'ipdn'))?.name || 'Sekolah Kedinasan'}
            </div>
            <h2 className="text-4xl font-black mb-1 tracking-tight text-fg flex flex-wrap items-center gap-2">
              {profile ? (profile.nickname || profile.username) : 'Pejuang SKD'}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-2">
              {isMasterTwk && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                  ⭐ MASTER TWK
                </span>
              )}
              {isMasterTiu && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  ⚡ MASTER TIU
                </span>
              )}
              {isMasterTkp && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                  🔥 MASTER TKP
                </span>
              )}
              {!isMasterTwk && !isMasterTiu && !isMasterTkp && (
                <span className="text-[10px] text-fg-muted italic">Selesaikan 50+ soal akurasi &gt;= 80% untuk gelar</span>
              )}
            </div>
            <p className="text-fg-muted mb-3 font-space">
              @{profile ? profile.username.toLowerCase().replace(/\s/g, '') : 'pejuang_skd'}
            </p>

            {/* Rank Badge */}
            <div className="mb-4">
              <RankBadge score={profile ? profile.score : 1250} size="md" />
            </div>
            {/* Follower Stats */}
            <div className="flex gap-4 sm:gap-6 justify-center md:justify-start mb-6 items-center">
              <div
                className="text-center cursor-pointer group"
                onClick={() => { setFollowModalTab('mengikuti'); setIsFollowModalOpen(true); }}
              >
                <span className="block text-2xl font-black font-space group-hover:text-primary group-hover:scale-105 transition-all text-fg">{followingCount}</span>
                <span className="text-[10px] text-fg-muted font-bold uppercase tracking-wider group-hover:text-fg transition-colors">Mengikuti</span>
              </div>
              <div className="w-px h-8 bg-surface-subtle" />
              <div
                className="text-center cursor-pointer group"
                onClick={() => { setFollowModalTab('pengikut'); setIsFollowModalOpen(true); }}
              >
                <span className="block text-2xl font-black font-space group-hover:text-primary group-hover:scale-105 transition-all text-fg">{followersCount}</span>
                <span className="text-[10px] text-fg-muted font-bold uppercase tracking-wider group-hover:text-fg transition-colors">Pengikut</span>
              </div>
              <div className="w-px h-8 bg-surface-subtle" />
              <button
                onClick={() => setSearchFriendModal(true)}
                className="w-12 h-12 rounded-full bg-surface-subtle border border-border flex items-center justify-center hover:bg-premium-subtle hover:border-premium hover:text-premium transition-all"
                title="Cari & Tambah Teman"
              >
                <UserPlus size={20} />
              </button>
            </div>
            {/* Level Experience Bar */}
            <div className="space-y-2 max-w-md">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-primary">Level {profile ? profile.level : 14}</span>
                <span className="text-fg-muted font-space">
                  {currentXPProgress.toLocaleString()} / {levelXPRequired.toLocaleString()} XP
                </span>
              </div>
              <div className="h-4 w-full bg-surface shadow-sm rounded-full overflow-hidden border border-border shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-skd-accent to-yellow-500 rounded-full shadow-[0_0_10px_rgba(245,166,35,0.4)]"
                />
              </div>
            </div>
          </div>
        </motion.section>
        {/* Dynamic Rank Card & stats info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {/* Season Rank Card */}
            <motion.section variants={itemVariants}>
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Trophy size={24} className="text-primary" />
                Rank Musim Ini
              </h3>
              <RankCard score={profile ? profile.score : 1250} />
            </motion.section>

            {/* Career Statistics */}
            <motion.section variants={itemVariants}>
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Zap size={24} className="text-energy" />
                Statistik Karir
              </h3>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: 'Total Kuis Selesai', value: (profile?.total_quizzes_completed || 0).toLocaleString(), icon: Target, color: 'text-blue-400' },
                  { label: 'Win PvP', value: `${profile?.total_pvp_wins || 0} Menang`, icon: Swords, color: 'text-red-400' },
                  { label: 'Total Jawaban Benar', value: (profile?.total_correct_answers || 0).toLocaleString(), icon: Zap, color: 'text-coin' },
                  { label: 'Skor Survival', value: (profile?.highest_survival_score || 0).toLocaleString(), icon: Trophy, color: 'text-purple-400' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-surface-subtle border border-border rounded-[1.5rem] p-5 backdrop-blur-sm hover:bg-surface-subtle/50 transition-colors group shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl bg-surface-subtle ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon size={20} />
                      </div>
                      <span className="text-xs text-fg-muted font-bold tracking-wide">{stat.label}</span>
                    </div>
                    <div className="text-3xl font-black font-space tracking-tight text-fg">{stat.value}</div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Analisis Radar Chart & Rekomendasi Belajar */}
            <motion.section variants={itemVariants} className="bg-surface-subtle border border-border rounded-[2rem] p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F5A623]/5 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-fg">
                <BarChart2 size={24} className="text-primary" />
                Analisis Kemampuan & Rekomendasi AI
              </h3>

              <Suspense fallback={<div className="w-full min-h-[220px] flex items-center justify-center text-fg-muted text-sm">Memuat grafik...</div>}>
                <ProfileCharts
                  radarData={radarData}
                  radarOptions={radarOptions}
                  lineData={lineData}
                  lineOptions={lineOptions}
                />
              </Suspense>

              <div className="flex flex-col items-center gap-8">
                {/* Recommendation Texts */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="bg-surface shadow-sm border border-border rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-black tracking-wider text-[#F5A623] uppercase">Status Kesiapan CAT CPNS BKN</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-surface-subtle border border-border text-center">
                        <span className="block text-[10px] text-fg-muted font-bold">TWK (Min 65)</span>
                        <span className={`text-xs font-black font-space ${twkScore >= 65 ? 'text-success' : 'text-danger'}`}>
                          {twkScore >= 65 ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface-subtle border border-border text-center">
                        <span className="block text-[10px] text-fg-muted font-bold">TIU (Min 80)</span>
                        <span className={`text-xs font-black font-space ${tiuScore >= 80 ? 'text-success' : 'text-danger'}`}>
                          {tiuScore >= 80 ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface-subtle border border-border text-center">
                        <span className="block text-[10px] text-fg-muted font-bold">TKP (Min 166)</span>
                        <span className={`text-xs font-black font-space ${tkpScore >= 166 ? 'text-success' : 'text-danger'}`}>
                          {tkpScore >= 166 ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-fg-muted leading-relaxed font-medium">
                    <p className="flex items-start gap-2">
                      <Bot className="text-[#F5A623] shrink-0" size={16} />
                      <span>{rekomendasiAI}</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Lencana Kehormatan */}
            <motion.section variants={itemVariants}>
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Medal size={24} className="text-primary" />
                Lencana Kehormatan
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {dynamicBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="bg-surface-subtle border border-border rounded-[1.5rem] p-4 flex flex-col items-center text-center backdrop-blur-sm hover:bg-surface-subtle/50 transition-all duration-300 shadow-sm"
                  >
                    {badge.unlocked ? (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:scale-110 transition-all duration-300 mb-3">
                        {badge.icon}
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-surface-subtle border-2 border-border text-fg opacity-40 grayscale relative mb-3">
                        <span className="blur-[0.5px]">{badge.icon}</span>
                        <div className="absolute -top-1 -right-1 bg-black/80 border border-border p-0.5 rounded-full text-white/60">
                          <Lock size={10} />
                        </div>
                      </div>
                    )}

                    <h4 className="font-bold text-fg text-xs mb-1 font-space">{badge.name}</h4>
                    <p className="text-fg-muted text-[9px] leading-snug max-w-[130px]">{badge.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          </div>
          {/* Right Column: Friends / Rivals */}
          <motion.section variants={itemVariants} className="md:col-span-1 flex flex-col">
            <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
              <Swords size={24} className="text-red-400" />
              Daftar Rival
            </h3>

            <div className="bg-surface-subtle border border-border rounded-[1.5rem] p-5 backdrop-blur-sm shadow-sm flex flex-col flex-1 max-h-[500px]">

              {/* Filter Friend Form */}
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                  <input
                    type="text"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Cari rival..."
                    className="w-full bg-surface shadow-sm border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors text-fg"
                  />
                </div>
              </div>
              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {filteredFriends.length === 0 ? (
                  <p className="text-fg-muted text-xs text-center py-8">Belum ada rival terdaftar atau ditemukan.</p>
                ) : (
                  filteredFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border hover:border-border transition-colors group gap-2 overflow-hidden">
                      {/* Kiri: Avatar + Nama — flex-1 + min-w-0 agar bisa truncate */}
                      <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1" onClick={() => setSelectedPlayerId(String(friend.id))}>
                        <div className="relative flex-shrink-0">
                          <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full bg-surface shadow-sm" />
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${friend.online ? 'bg-success' : 'bg-gray-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs truncate text-fg">{friend.name}</h4>
                          <p className="text-[10px] font-space text-fg-muted truncate">{friend.username}</p>
                        </div>
                      </div>
                      {/* Kanan: Action buttons — flex-shrink-0 agar tidak stretch */}
                      <div className={`flex-shrink-0 flex items-center gap-1 transition-opacity ${inviteStatus === 'inviting' && targetId === String(friend.id)
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                        }`}>
                        <button
                          disabled={inviteStatus === 'inviting'}
                          onClick={(e) => { e.stopPropagation(); sendInvite(String(friend.id), friend.name); }}
                          className={`px-2.5 py-1.5 font-black rounded-lg text-[10px] transition-colors whitespace-nowrap ${inviteStatus === 'inviting' && targetId === String(friend.id)
                              ? 'bg-yellow-500 text-primary-fg animate-pulse'
                              : 'bg-primary hover:bg-slate-800 text-primary-fg disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                        >
                          {inviteStatus === 'inviting' && targetId === String(friend.id) ? 'Tunggu' : 'Duel'}
                        </button>
                        {inviteStatus === 'inviting' && targetId === String(friend.id) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); cancelInvite(); }}
                            className="px-2.5 py-1.5 font-black rounded-lg text-[10px] bg-danger hover:bg-red-600 text-white transition-colors whitespace-nowrap"
                          >
                            Batal
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend.id); }}
                          className="p-1.5 bg-danger-subtle hover:bg-danger-subtle text-danger rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </motion.div>

      {/* Search Friend Modal */}
      <AnimatePresence>
        {searchFriendModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-overlay backdrop-blur-sm backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface shadow-sm border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col"
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
            className="fixed inset-0 bg-overlay backdrop-blur-sm backdrop-blur-md z-[100] flex items-center justify-center p-4"
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
          onAddRival={(player) => {
            if (!friends.find(f => String(f.id) === String(player.id))) {
              const newFriend = {
                id: player.id,
                name: player.username,
                username: `@${player.username.toLowerCase()}`,
                online: false, // akan di-update dari last_login fetch
                avatar: player.selected_avatar ? availableCharacters.find(o => o.id === player.selected_avatar)?.image_url || avatarPdh : `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`,
                score: player.score
              };
              const newFriendsList = [...friends, newFriend];
              setFriends(newFriendsList);
              updateProfile({ friends: newFriendsList });
              showToast(`Berhasil menambahkan ${player.username} ke Rival!`, 'success');
            }
          }}
        />
      )}
    </div>
  );
}