import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  Swords, Medal, Target, Zap, Trophy, X, 
  UserPlus, Trash2, CheckCircle2, SquarePen, Lock
} from 'lucide-react';
import { useDuelMatchmaking } from '../context/DuelContext';
import { fetchProfile, updateProfile, supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import avatarPdh from '../assets/avatar_pdh.png';
import RankBadge, { RankCard } from '../components/RankBadge';
const MOCK_STATS = [
  { label: 'Total Soal Dijawab', value: '1,452', icon: Target, color: 'text-blue-400' },
  { label: 'Win-Rate PvP', value: '78%', icon: Swords, color: 'text-red-400' },
  { label: 'Akurasi Rata-rata', value: '92%', icon: Zap, color: 'text-yellow-400' },
  { label: 'Rekor Liga Tertinggi', value: 'Diamond I', icon: Trophy, color: 'text-purple-400' },
];
const ALL_BADGES = [
  { id: 1, name: 'Pawang TWK', icon: '📜', unlocked: true, desc: 'Menjawab 500 soal TWK dengan benar tanpa ragu.' },
  { id: 2, name: 'Veteran Silogisme', icon: '✨', unlocked: true, desc: 'Meraih akurasi 100% di 10 match PvP berturut-turut.' },
  { id: 3, name: 'Speed Runner', icon: '⚡', unlocked: true, desc: 'Selesai kuis di bawah 5 menit dengan skor sempurna.' },
  { id: 4, name: 'Master TIU', icon: '🎓', unlocked: false, desc: 'Menjawab 1000 soal TIU dengan benar.' },
  { id: 5, name: 'Legendary TKP', icon: '🏆', unlocked: false, desc: 'Meraih skor sempurna di 5 simulasi TKP.' },
  { id: 6, name: 'Dewa Analogi', icon: '🤝', unlocked: false, desc: 'Memenangkan 50 match PvP kategori TIU.' },
];
const INITIAL_FRIENDS = [
  { id: '1', name: 'Budi Santoso', username: '@budi.s', online: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi' },
  { id: '2', name: 'Siti Rahma', username: '@siti_r', online: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti' },
  { id: '3', name: 'Andi Wijaya', username: '@andi.wijaya', online: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andi' },
];
const AVATAR_OPTIONS = [
  { id: 'stmkg', name: 'STMKG (Klimatologi)', filter: 'hue-rotate-0', isFree: true },
  { id: 'ipdn', name: 'IPDN (Pemerintahan)', filter: 'hue-rotate-30', isFree: true },
  { id: 'stan', name: 'STAN (Keuangan)', filter: 'hue-rotate-[160deg]', isFree: true },
  { id: 'hitamputih', name: 'Seragam Seleksi CAT', filter: 'grayscale brightness-110', isFree: false },
  { id: 'korpri', name: 'Batik Korpri Biru', filter: 'hue-rotate-[220deg] saturate-125', isFree: false },
  { id: 'pdh_kemendagri', name: 'Baju Dinas PDH Cokelat', filter: 'brightness-95 contrast-105 saturate-110', isFree: false },
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

  useEffect(() => {
    const stored = localStorage.getItem('skdquest_akurasi');
    if (stored) {
      try {
        setAkurasi(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const getAcc = (cat: 'TWK' | 'TIU' | 'TKP') => {
    const data = akurasi[cat] || { correct: 0, total: 0 };
    return data.total > 0 ? (data.correct / data.total) * 100 : 0;
  };

  const twkAcc = getAcc('TWK') || 60; // fallback for radar viz
  const tiuAcc = getAcc('TIU') || 60;
  const tkpAcc = getAcc('TKP') || 60;

  const cx = 120;
  const cy = 110;
  const rMax = 80;
  const angles = [
    -Math.PI / 2, // TWK at 12 o'clock
    (7 * Math.PI) / 6, // TIU at 7 o'clock
    (11 * Math.PI) / 6 // TKP at 5 o'clock
  ];

  const getPoint = (index: number, radius: number) => {
    const x = cx + radius * Math.cos(angles[index]);
    const y = cy + radius * Math.sin(angles[index]);
    return `${x},${y}`;
  };

  const userPoints = [
    getPoint(0, rMax * (twkAcc / 100)),
    getPoint(1, rMax * (tiuAcc / 100)),
    getPoint(2, rMax * (tkpAcc / 100))
  ].join(' ');

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
  if (getAcc('TWK') > 0 && getAcc('TWK') < 65) failedCategories.push('TWK (Akurasi < 65%)');
  if (getAcc('TIU') > 0 && getAcc('TIU') < 80) failedCategories.push('TIU (Akurasi < 80%)');
  if (getAcc('TKP') > 0 && getAcc('TKP') < 72) failedCategories.push('TKP (Akurasi < 72%)');

  if (getAcc('TWK') === 0 && getAcc('TIU') === 0 && getAcc('TKP') === 0) {
    rekomendasiAI = 'Mari mulai belajar dengan kuis Latihan Harian, PvP, atau Tryout agar AI kami bisa memetakan kekuatan Anda!';
  } else if (failedCategories.length === 0) {
    rekomendasiAI = 'Luar biasa! Skor akurasi Anda di semua sub-tes telah melampaui passing grade BKN nasional. Pertahankan performa ini dan terus berlatih simulasi CAT!';
  } else {
    rekomendasiAI = `AI merekomendasikan Anda untuk fokus meningkatkan materi pada kategori ${failedCategories.join(', ')} karena saat ini akurasi Anda masih di bawah ambang batas kelulusan nasional BKN.`;
  }
  const { inviteStatus, targetId, sendInvite, resetInviteState, activeDuelRoomId, cancelInvite } = useDuelMatchmaking();
  
  // Profile loading state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'mengikuti' | 'pengikut'>('mengikuti');
  if (isFollowModalOpen || followModalTab === 'mengikuti') {}
  
  // Form edit states
  const [usernameInput, setUsernameInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [pinnedBadges, setPinnedBadges] = useState<number[]>([1, 2, 3]);
  const [friends, setFriends] = useState<any[]>(() => {
    const local = localStorage.getItem('skdquest_friends');
    return local ? JSON.parse(local) : INITIAL_FRIENDS;
  });
  useEffect(() => {
    localStorage.setItem('skdquest_friends', JSON.stringify(friends));
  }, [friends]);
  const [newFriendName, setNewFriendName] = useState('');
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
    fetchProfile().then(p => {
      setProfile(p);
      setUsernameInput(p.username);
      
      const currentEquipped = AVATAR_OPTIONS.find(o => o.id === p.equipped_avatar_id) || AVATAR_OPTIONS[0];
      setSelectedAvatar(currentEquipped);
    });
  }, []);
  // Watch for invite status changes and show toast
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
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const searchVal = newFriendName.trim();
    if (!searchVal) return;
    if (isSupabaseConfigured()) {
      try {
        const searchUsername = searchVal.replace(/^@/, '');
        const { data, error } = await supabase!
          .from('profiles')
          .select('id, username, score')
          .eq('username', searchUsername)
          .maybeSingle();
        if (data) {
          const newFriend = {
            id: data.id,
            name: data.username,
            username: `@${data.username.toLowerCase()}`,
            online: true,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
            score: data.score
          };
          setFriends(prev => {
            if (prev.some(f => String(f.id) === String(data.id))) {
              showToast(`${data.username} sudah ada di daftar Rival!`, 'info');
              return prev;
            }
            return [...prev, newFriend];
          });
          setNewFriendName('');
          showToast(`Berhasil menambahkan ${data.username} ke Rival!`, 'success');
          return;
        }
      } catch (err) {
        console.error('Error searching Supabase user:', err);
      }
    }
    const newFriend = {
      id: String(Date.now()),
      name: searchVal,
      username: `@${searchVal.toLowerCase().replace(/\s/g, '')}`,
      online: Math.random() > 0.5,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${searchVal}`,
      score: 1200 + Math.floor(Math.random() * 600)
    };
    setFriends(prev => {
      if (prev.some(f => f.name.toLowerCase() === searchVal.toLowerCase())) {
        showToast(`${searchVal} sudah ada di daftar Rival!`, 'info');
        return prev;
      }
      return [...prev, newFriend];
    });
    setNewFriendName('');
    showToast(`Rival ${newFriend.name} berhasil ditambahkan!`, 'success');
  };
  const handleRemoveFriend = (id: number) => {
    const friend = friends.find(f => f.id === id);
    setFriends(prev => prev.filter(f => f.id !== id));
    showToast(`Menghapus ${friend?.name ?? 'Rival'} dari daftar.`, 'info');
  };
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
    if (!profile) return;
    
    // Check lock status for avatar
    const isUnlocked = selectedAvatar.isFree || profile.unlocked_avatars?.includes(selectedAvatar.id);
    if (!isUnlocked) {
      showToast(`Kostum "${selectedAvatar.name}" belum dibeli di Toko!`, 'error');
      return;
    }
    const updatedProfile = await updateProfile({
      username: usernameInput || profile.username,
      equipped_avatar_id: selectedAvatar.id
    });
    
    setProfile(updatedProfile);
    setIsEditProfileOpen(false);
    showToast('Profil berhasil diperbarui!', 'success');
  };
  // Dynamic Level XP Progression
  const levelXPRequired = profile ? profile.level * 1000 : 15000;
  const currentXPProgress = profile ? profile.score % levelXPRequired : 12450;
  const progressPercent = Math.min((currentXPProgress / levelXPRequired) * 100, 100);
  return (
    <div className="p-4 md:p-8 space-y-8 pb-24 relative max-w-5xl mx-auto min-h-screen">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {inviteToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-bold shadow-2xl transition-all whitespace-nowrap ${
              toastType === 'success' ? 'bg-skd-success shadow-skd-success/30' :
              toastType === 'error' ? 'bg-skd-danger shadow-skd-danger/30' : 'bg-skd-accent text-[#0F0E17] shadow-skd-accent/30'
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
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1924] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <h3 className="font-bold text-lg">Edit Profil & Karakter</h3>
                <button onClick={() => setIsEditProfileOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                
                {/* Username Input */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-3">NAMA PEJUANG CPNS</h4>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan nama..."
                    maxLength={15}
                    className="w-full bg-[#1A1924] border border-white/10 rounded-xl p-3 text-sm font-bold outline-none focus:border-skd-accent transition-colors text-white"
                  />
                </div>
                {/* Target Kedinasan */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-3">TARGET KEDINASAN</h4>
                  <div className="relative">
                    <select 
                      value={selectedAvatar.id} 
                      onChange={(e) => {
                        const target = AVATAR_OPTIONS.find(o => o.id === e.target.value);
                        if (target) setSelectedAvatar(target);
                      }}
                      className="w-full bg-[#1A1924] border border-white/10 rounded-xl p-3 text-sm font-bold appearance-none outline-none focus:border-skd-accent transition-colors"
                    >
                      {AVATAR_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Avatar / Seragam Karakter */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-3">PILIH SERAGAM KARAKTER</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {AVATAR_OPTIONS.map(opt => {
                      const isUnlocked = opt.isFree || profile?.unlocked_avatars?.includes(opt.id);
                      return (
                        <div 
                          key={opt.id}
                          onClick={() => {
                            if (isUnlocked) {
                              setSelectedAvatar(opt);
                            } else {
                              showToast(`Kostum "${opt.name}" terkunci! Beli di Toko.`, 'error');
                            }
                          }}
                          className={`cursor-pointer rounded-2xl border-2 transition-all p-2 flex flex-col items-center gap-2 relative ${
                            selectedAvatar.id === opt.id 
                              ? 'border-skd-accent bg-skd-accent/10' 
                              : isUnlocked ? 'border-white/5 hover:border-white/20' : 'border-white/5 opacity-50 hover:bg-red-500/5'
                          }`}
                        >
                          <div className="relative w-16 h-16 rounded-full overflow-hidden">
                            <img src={avatarPdh} alt={opt.name} className={`w-full h-full object-cover ${opt.filter}`} />
                            {!isUnlocked && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Lock size={16} className="text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-bold text-center leading-tight">{opt.name.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Badge pinning */}
                <div>
                  <h4 className="text-sm font-bold text-gray-400 mb-3">PIN LENCANA (MAKS. 3)</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {ALL_BADGES.filter(b => b.unlocked).map(badge => {
                      const isPinned = pinnedBadges.includes(badge.id);
                      return (
                        <div 
                          key={badge.id}
                          onClick={() => togglePinBadge(badge.id)}
                          className={`cursor-pointer w-full aspect-square rounded-2xl border-2 flex items-center justify-center text-2xl transition-all relative
                            ${isPinned ? 'border-skd-accent bg-skd-accent/10' : 'border-white/5 hover:border-white/20'}
                          `}
                        >
                          {badge.icon}
                          {isPinned && <CheckCircle2 size={14} className="absolute -top-2 -right-2 text-skd-accent bg-[#1A1924] rounded-full" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-white/10">
                <button 
                  onClick={handleSaveProfile} 
                  className="w-full bg-skd-accent text-[#0F0E17] font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors shadow-lg shadow-skd-accent/10"
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
          className="relative bg-gradient-to-br from-skd-card to-[#15141F] border border-skd-border rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden group shadow-lg hover:shadow-xl transition-all"
        >
          {/* Neon background decorations */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-skd-accent/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
          {/* Avatar Picture with Equipped Dress */}
          <div className="relative group/avatar">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-skd-premium to-skd-accent rounded-full blur opacity-25 group-hover/avatar:opacity-40 transition-opacity" />
            <img 
              src={avatarPdh} 
              alt="Avatar" 
              className={`w-48 h-48 rounded-full border-[6px] border-[#1A1924] shadow-2xl relative z-10 object-cover ${selectedAvatar.filter}`}
            />
            <div className="absolute top-4 left-4 bg-skd-premium text-[#0F0E17] font-space font-black text-xs px-3 py-1 rounded-full border border-yellow-300 shadow-md relative z-20">
              {selectedAvatar.name.split(' ')[0]}
            </div>
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute bottom-4 right-0 md:bottom-6 md:-right-2 bg-skd-accent text-[#0F0E17] p-2.5 rounded-full shadow-[0_0_15px_rgba(245,166,35,0.4)] hover:shadow-[0_0_25px_rgba(245,166,35,0.8)] transition-all z-30 group-hover:scale-110"
            >
              <SquarePen size={20} />
            </button>
          </div>
          {/* User Details */}
          <div className="flex-1 text-center md:text-left w-full">
            <div className="inline-flex items-center px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-bold mb-4 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
              Pejuang SKD CPNS
            </div>
            <h2 className="text-4xl font-black mb-1 tracking-tight text-white flex flex-wrap items-center gap-2">
              {profile ? profile.username : 'CIHUYYYY'}
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
                <span className="text-[10px] text-gray-500 italic">Selesaikan 50+ soal akurasi &gt;= 80% untuk gelar</span>
              )}
            </div>
            <p className="text-gray-400 mb-3 font-space">
              @{profile ? profile.username.toLowerCase().replace(/\s/g, '') : 'cihuyyyy'}
            </p>
            
            {/* Rank Badge */}
            <div className="mb-4">
              <RankBadge score={profile ? profile.score : 1250} size="md" />
            </div>
            {/* Follower Stats */}
            <div className="flex items-center gap-6 mb-6 justify-center md:justify-start">
              <div 
                className="text-center cursor-pointer group"
                onClick={() => { setFollowModalTab('mengikuti'); setIsFollowModalOpen(true); }}
              >
                <span className="block text-2xl font-black font-space group-hover:text-skd-accent group-hover:scale-105 transition-all text-white">24</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">Mengikuti</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div 
                className="text-center cursor-pointer group"
                onClick={() => { setFollowModalTab('pengikut'); setIsFollowModalOpen(true); }}
              >
                <span className="block text-2xl font-black font-space group-hover:text-skd-accent group-hover:scale-105 transition-all text-white">18</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">Pengikut</span>
              </div>
            </div>
            {/* Level Experience Bar */}
            <div className="space-y-2 max-w-md">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-skd-accent">Level {profile ? profile.level : 14}</span>
                <span className="text-gray-400 font-space">
                  {currentXPProgress.toLocaleString()} / {levelXPRequired.toLocaleString()} XP
                </span>
              </div>
              <div className="h-4 w-full bg-[#1A1924] rounded-full overflow-hidden border border-white/5 shadow-inner">
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
                <Trophy size={24} className="text-skd-accent" />
                Rank Musim Ini
              </h3>
              <RankCard score={profile ? profile.score : 1250} />
            </motion.section>
            
            {/* Career Statistics */}
            <motion.section variants={itemVariants}>
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Zap size={24} className="text-skd-accent" />
                Statistik Karir
              </h3>
              <div className="grid grid-cols-2 gap-5">
                {MOCK_STATS.map((stat, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 backdrop-blur-sm hover:bg-white/10 transition-colors group shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                        <stat.icon size={20} />
                      </div>
                      <span className="text-xs text-gray-400 font-bold tracking-wide">{stat.label}</span>
                    </div>
                    <div className="text-3xl font-black font-space tracking-tight text-white">{stat.value}</div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Analisis Radar Chart & Rekomendasi Belajar */}
            <motion.section variants={itemVariants} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F5A623]/5 rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                📊 Analisis Kemampuan & Rekomendasi AI
              </h3>
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* SVG Radar Chart */}
                <div className="w-full max-w-[240px] flex justify-center shrink-0">
                  <svg width="240" height="220" className="overflow-visible">
                    {/* Concentric grid lines (triangles) */}
                    <polygon points={`${cx + rMax * Math.cos(angles[0])},${cy + rMax * Math.sin(angles[0])} ${cx + rMax * Math.cos(angles[1])},${cy + rMax * Math.sin(angles[1])} ${cx + rMax * Math.cos(angles[2])},${cy + rMax * Math.sin(angles[2])}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    <polygon points={`${cx + rMax * 0.75 * Math.cos(angles[0])},${cy + rMax * 0.75 * Math.sin(angles[0])} ${cx + rMax * 0.75 * Math.cos(angles[1])},${cy + rMax * 0.75 * Math.sin(angles[1])} ${cx + rMax * 0.75 * Math.cos(angles[2])},${cy + rMax * 0.75 * Math.sin(angles[2])}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    <polygon points={`${cx + rMax * 0.5 * Math.cos(angles[0])},${cy + rMax * 0.5 * Math.sin(angles[0])} ${cx + rMax * 0.5 * Math.cos(angles[1])},${cy + rMax * 0.5 * Math.sin(angles[1])} ${cx + rMax * 0.5 * Math.cos(angles[2])},${cy + rMax * 0.5 * Math.sin(angles[2])}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    <polygon points={`${cx + rMax * 0.25 * Math.cos(angles[0])},${cy + rMax * 0.25 * Math.sin(angles[0])} ${cx + rMax * 0.25 * Math.cos(angles[1])},${cy + rMax * 0.25 * Math.sin(angles[1])} ${cx + rMax * 0.25 * Math.cos(angles[2])},${cy + rMax * 0.25 * Math.sin(angles[2])}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    
                    {/* Axis lines */}
                    <line x1={cx} y1={cy} x2={cx + rMax * Math.cos(angles[0])} y2={cy + rMax * Math.sin(angles[0])} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <line x1={cx} y1={cy} x2={cx + rMax * Math.cos(angles[1])} y2={cy + rMax * Math.sin(angles[1])} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <line x1={cx} y1={cy} x2={cx + rMax * Math.cos(angles[2])} y2={cy + rMax * Math.sin(angles[2])} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    
                    {/* User accuracy polygon */}
                    <polygon points={userPoints} fill="rgba(139,92,246,0.3)" stroke="#8B5CF6" strokeWidth="2" strokeLinejoin="round" />
                    
                    {/* Dots on vertices */}
                    <circle cx={cx + rMax * (twkAcc / 100) * Math.cos(angles[0])} cy={cy + rMax * (twkAcc / 100) * Math.sin(angles[0])} r="4" fill="#8B5CF6" />
                    <circle cx={cx + rMax * (tiuAcc / 100) * Math.cos(angles[1])} cy={cy + rMax * (tiuAcc / 100) * Math.sin(angles[1])} r="4" fill="#8B5CF6" />
                    <circle cx={cx + rMax * (tkpAcc / 100) * Math.cos(angles[2])} cy={cy + rMax * (tkpAcc / 100) * Math.sin(angles[2])} r="4" fill="#8B5CF6" />
                    
                    {/* Vertex Labels */}
                    <text x={cx} y={cy - rMax - 12} textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold">TWK ({twkAcc.toFixed(0)}%)</text>
                    <text x={cx - rMax - 14} y={cy + rMax * 0.5 + 14} textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold">TIU ({tiuAcc.toFixed(0)}%)</text>
                    <text x={cx + rMax + 14} y={cy + rMax * 0.5 + 14} textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold">TKP ({tkpAcc.toFixed(0)}%)</text>
                  </svg>
                </div>
                
                {/* Recommendation Texts */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="bg-[#1A1924] border border-white/5 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-black tracking-wider text-[#F5A623] uppercase">Status Kesiapan CAT CPNS BKN</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                        <span className="block text-[10px] text-gray-400 font-bold">TWK (Min 65)</span>
                        <span className={`text-xs font-black font-space ${twkAcc >= 65 ? 'text-skd-success' : 'text-skd-danger'}`}>
                          {twkAcc >= 65 ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                        <span className="block text-[10px] text-gray-400 font-bold">TIU (Min 80)</span>
                        <span className={`text-xs font-black font-space ${tiuAcc >= 80 ? 'text-skd-success' : 'text-skd-danger'}`}>
                          {tiuAcc >= 80 ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                        <span className="block text-[10px] text-gray-400 font-bold">TKP (Min 72)</span>
                        <span className={`text-xs font-black font-space ${tkpAcc >= 72 ? 'text-skd-success' : 'text-skd-danger'}`}>
                          {tkpAcc >= 72 ? 'LULUS' : 'GAGAL'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-gray-300 leading-relaxed font-medium">
                    <p className="flex items-start gap-2">
                      <span className="text-[#F5A623]">🤖</span>
                      <span>{rekomendasiAI}</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Lencana Kehormatan */}
            <motion.section variants={itemVariants}>
              <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Medal size={24} className="text-skd-accent" />
                Lencana Kehormatan
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ALL_BADGES.map((badge) => (
                  <div 
                    key={badge.id} 
                    className="bg-white/5 border border-white/10 rounded-[1.5rem] p-4 flex flex-col items-center text-center backdrop-blur-sm hover:bg-white/10 transition-all duration-300 shadow-sm"
                  >
                    {badge.unlocked ? (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:scale-110 transition-all duration-300 mb-3">
                        {badge.icon}
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl bg-white/5 border-2 border-white/10 text-white opacity-40 grayscale relative mb-3">
                        <span className="blur-[0.5px]">{badge.icon}</span>
                        <div className="absolute -top-1 -right-1 bg-black/80 border border-white/10 p-0.5 rounded-full text-white/60">
                          <Lock size={10} />
                        </div>
                      </div>
                    )}
                    
                    <h4 className="font-bold text-white text-xs mb-1 font-space">{badge.name}</h4>
                    <p className="text-gray-400 text-[9px] leading-snug max-w-[130px]">{badge.desc}</p>
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
            
            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 backdrop-blur-sm shadow-sm flex flex-col flex-1 max-h-[500px]">
              
              {/* Add Friend Form */}
              <form onSubmit={handleAddFriend} className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <UserPlus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="Username..." 
                    className="w-full bg-[#1A1924] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-skd-accent/50 transition-colors text-white"
                  />
                </div>
                <button type="submit" className="bg-skd-accent text-[#0F0E17] px-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors text-xs">
                  Tambah
                </button>
              </form>
              {/* Friends List Container */}
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {friends.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-8">Belum ada rival terdaftar.</p>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full bg-[#1A1924]" />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1A1924] ${friend.online ? 'bg-skd-success' : 'bg-gray-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs truncate text-white">{friend.name}</h4>
                          <p className="text-[10px] font-space text-gray-400 truncate">{friend.username}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-opacity ${
                        inviteStatus === 'inviting' && targetId === String(friend.id)
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        <button 
                          disabled={inviteStatus === 'inviting'}
                          onClick={() => sendInvite(String(friend.id), friend.name)}
                          className={`px-3 py-1.5 font-black rounded-lg text-[10px] transition-colors ${
                            inviteStatus === 'inviting' && targetId === String(friend.id)
                              ? 'bg-yellow-500 text-[#0F0E17] animate-pulse'
                              : 'bg-skd-accent hover:bg-yellow-400 text-[#0F0E17] disabled:opacity-50 disabled:cursor-not-allowed'
                          }`}
                        >
                          {inviteStatus === 'inviting' && targetId === String(friend.id) ? 'Menunggu...' : 'Duel'}
                        </button>
                        {inviteStatus === 'inviting' && targetId === String(friend.id) && (
                          <button 
                            onClick={() => cancelInvite()}
                            className="px-3 py-1.5 font-black rounded-lg text-[10px] bg-red-500 hover:bg-red-600 text-white transition-colors"
                          >
                            Batal
                          </button>
                        )}
                        <button 
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="p-1.5 bg-skd-danger/10 hover:bg-skd-danger/20 text-skd-danger rounded-lg transition-colors"
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
    </div>
  );
}