import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  Swords, Medal, Target, Zap, Trophy, X, Edit3, 
  LogOut, UserPlus, Trash2, CheckCircle2, SquarePen, Lock
} from 'lucide-react';
import avatarPdh from '../assets/avatar_pdh.png';

const MOCK_STATS = [
  { label: 'Total Soal Dijawab', value: '1,452', icon: Target, color: 'text-blue-400' },
  { label: 'Win-Rate PvP', value: '78%', icon: Swords, color: 'text-red-400' },
  { label: 'Akurasi Rata-rata', value: '92%', icon: Zap, color: 'text-yellow-400' },
  { label: 'Rekor Liga Tertinggi', value: 'Diamond I', icon: Trophy, color: 'text-purple-400' },
];

const ALL_BADGES = [
  { id: 1, name: 'Pawang TWK', icon: '🏛️', unlocked: true, desc: 'Menjawab 500 soal TWK dengan benar tanpa ragu.' },
  { id: 2, name: 'Veteran Silogisme', icon: '🧠', unlocked: true, desc: 'Meraih akurasi 100% di 10 match PvP berturut-turut.' },
  { id: 3, name: 'Speed Runner', icon: '⚡', unlocked: true, desc: 'Selesai kuis di bawah 5 menit dengan skor sempurna.' },
  { id: 4, name: 'Master TIU', icon: '📊', unlocked: false, desc: 'Menjawab 1000 soal TIU dengan benar.' },
  { id: 5, name: 'Legendary TKP', icon: '🤝', unlocked: false, desc: 'Meraih skor sempurna di 5 simulasi TKP.' },
  { id: 6, name: 'Dewa Analogi', icon: '🔗', unlocked: false, desc: 'Memenangkan 50 match PvP kategori TIU.' },
];

const INITIAL_FRIENDS = [
  { id: 1, name: 'Budi Santoso', username: '@budi.s', online: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi' },
  { id: 2, name: 'Siti Rahma', username: '@siti_r', online: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti' },
  { id: 3, name: 'Andi Wijaya', username: '@andi.wijaya', online: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andi' },
];

const AVATAR_OPTIONS = [
  { id: 'stmkg', name: 'STMKG (Klimatologi)', filter: 'hue-rotate-0' },
  { id: 'ipdn', name: 'IPDN (Pemerintahan)', filter: 'hue-rotate-30' },
  { id: 'stan', name: 'STAN (Keuangan)', filter: 'hue-rotate-[160deg]' },
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
  
  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'mengikuti' | 'pengikut'>('mengikuti');
  
  // Profile Data State
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [pinnedBadges, setPinnedBadges] = useState<number[]>([1, 2, 3]);
  const [friends, setFriends] = useState(INITIAL_FRIENDS);
  const [newFriendName, setNewFriendName] = useState('');

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    const newFriend = {
      id: Date.now(),
      name: newFriendName,
      username: `@${newFriendName.toLowerCase().replace(/\\s/g, '')}`,
      online: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newFriendName}`
    };
    setFriends([newFriend, ...friends]);
    setNewFriendName('');
  };

  const handleRemoveFriend = (id: number) => {
    setFriends(friends.filter(f => f.id !== id));
  };

  const togglePinBadge = (id: number) => {
    if (pinnedBadges.includes(id)) {
      setPinnedBadges(pinnedBadges.filter(b => b !== id));
    } else if (pinnedBadges.length < 3) {
      setPinnedBadges([...pinnedBadges, id]);
    }
  };

  const displayedBadges = ALL_BADGES.filter(b => pinnedBadges.includes(b.id));

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white p-4 md:p-8 pb-24 md:pb-8 font-syne relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-skd-accent/10 blur-[120px] rounded-full pointer-events-none" />


      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                
                <h4 className="text-sm font-bold text-gray-400 mb-3">TARGET KEDINASAN</h4>
                <div className="relative mb-6">
                  <select 
                    value={selectedAvatar.id} 
                    onChange={(e) => setSelectedAvatar(AVATAR_OPTIONS.find(o => o.id === e.target.value) || AVATAR_OPTIONS[0])}
                    className="w-full bg-[#1A1924] border border-white/10 rounded-xl p-3 text-sm font-bold appearance-none outline-none focus:border-skd-accent transition-colors"
                  >
                    {AVATAR_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>

                <h4 className="text-sm font-bold text-gray-400 mb-3">PILIH SERAGAM KARAKTER</h4>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {AVATAR_OPTIONS.map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => setSelectedAvatar(opt)}
                      className={`cursor-pointer rounded-2xl border-2 transition-all p-2 flex flex-col items-center gap-2 ${selectedAvatar.id === opt.id ? 'border-skd-accent bg-skd-accent/10' : 'border-white/5 hover:border-white/20'}`}
                    >
                      <img src={avatarPdh} alt={opt.name} className={`w-16 h-16 rounded-full object-cover ${opt.filter}`} />
                      <span className="text-[10px] font-bold text-center leading-tight">{opt.name}</span>
                    </div>
                  ))}
                </div>

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
              <div className="p-4 border-t border-white/10">
                <button onClick={() => setIsEditProfileOpen(false)} className="w-full bg-skd-accent text-[#0F0E17] font-bold py-3 rounded-xl hover:bg-yellow-400 transition-colors">
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge Collection Modal */}
      <AnimatePresence>
        {isBadgeModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1924] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <h3 className="font-bold text-xl flex items-center gap-2"><Medal className="text-skd-accent" /> Koleksi Lencana</h3>
                <button onClick={() => setIsBadgeModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {ALL_BADGES.map(badge => (
                  <div key={badge.id} className={`flex gap-4 p-4 rounded-2xl border ${badge.unlocked ? 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent' : 'border-white/5 bg-white/5 grayscale opacity-50'}`}>
                    <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2 relative
                      ${badge.unlocked ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)] bg-yellow-500/20' : 'border-white/10 bg-[#1A1924]'}
                    `}>
                      {badge.icon}
                      {!badge.unlocked && <Lock size={14} className="absolute -bottom-1 -right-1 text-gray-400 bg-[#1A1924] rounded-full p-0.5" />}
                    </div>
                    <div className="flex flex-col justify-center">
                      <h4 className="font-bold text-lg leading-tight mb-1">{badge.name}</h4>
                      <p className="text-xs text-gray-400 font-medium">{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow / Follower Modal */}
      <AnimatePresence>
        {isFollowModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1A1924] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-white/10">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setFollowModalTab('mengikuti')}
                    className={`font-bold transition-colors ${followModalTab === 'mengikuti' ? 'text-skd-accent' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Mengikuti (24)
                  </button>
                  <button 
                    onClick={() => setFollowModalTab('pengikut')}
                    className={`font-bold transition-colors ${followModalTab === 'pengikut' ? 'text-skd-accent' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Pengikut (18)
                  </button>
                </div>
                <button onClick={() => setIsFollowModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="relative shrink-0">
                      <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full bg-[#1A1924]" />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1A1924] ${friend.online ? 'bg-green-500' : 'bg-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate">{friend.name}</p>
                      <p className="text-xs font-space text-gray-400 truncate">{friend.username}</p>
                    </div>
                    <div>
                      {followModalTab === 'mengikuti' ? (
                        <button className="px-4 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-colors text-xs font-bold border border-white/10 hover:border-red-500/30">
                          Batal Ikuti
                        </button>
                      ) : (
                        <button className="px-4 py-1.5 rounded-lg bg-skd-accent/10 text-skd-accent hover:bg-skd-accent hover:text-[#0F0E17] transition-colors text-xs font-bold border border-skd-accent/30">
                          Ikuti Balik
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header Section */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-skd-accent to-yellow-500">
            Karakter
          </h1>
          <button 
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-sm font-bold text-sm"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </header>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          
          {/* Identity & Avatar Section */}
          <motion.section variants={itemVariants} className="relative rounded-[2rem] overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/10 p-8 flex flex-col md:flex-row items-center gap-10 shadow-lg backdrop-blur-sm">
            <div className="relative shrink-0 group">
              <div className="absolute inset-0 bg-skd-accent/20 blur-3xl rounded-full group-hover:bg-skd-accent/40 transition-colors duration-500" />
              <img 
                src={avatarPdh} 
                alt="Avatar" 
                className={`w-48 h-48 rounded-full border-[6px] border-[#1A1924] shadow-2xl relative z-10 object-cover ${selectedAvatar.filter}`}
              />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-blue-400 text-white text-xs font-bold px-5 py-2 rounded-full border border-blue-300/50 shadow-[0_0_15px_rgba(59,130,246,0.6)] whitespace-nowrap z-20">
                Target: {selectedAvatar.name.split(' ')[0]}
              </div>
              <button 
                onClick={() => setIsEditProfileOpen(true)}
                className="absolute bottom-4 right-0 md:bottom-6 md:-right-2 bg-skd-accent text-[#0F0E17] p-2.5 rounded-full shadow-[0_0_15px_rgba(245,166,35,0.4)] hover:shadow-[0_0_25px_rgba(245,166,35,0.8)] transition-all z-30 group-hover:scale-110"
              >
                <SquarePen size={20} />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left w-full">
              <div className="inline-flex items-center px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-bold mb-4 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                Pejuang SKD
              </div>
              <h2 className="text-4xl font-black mb-2 tracking-tight">Raden Saori</h2>
              <p className="text-gray-400 mb-6 font-space">@raden.saori</p>

              <div className="flex items-center gap-6 mb-6 justify-center md:justify-start">
                <div 
                  className="text-center cursor-pointer group"
                  onClick={() => { setFollowModalTab('mengikuti'); setIsFollowModalOpen(true); }}
                >
                  <span className="block text-2xl font-black font-space group-hover:text-skd-accent group-hover:scale-105 transition-all">24</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">Mengikuti</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div 
                  className="text-center cursor-pointer group"
                  onClick={() => { setFollowModalTab('pengikut'); setIsFollowModalOpen(true); }}
                >
                  <span className="block text-2xl font-black font-space group-hover:text-skd-accent group-hover:scale-105 transition-all">18</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">Pengikut</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-skd-accent">Level 42</span>
                  <span className="text-gray-400 font-space">12,450 / 15,000 XP</span>
                </div>
                <div className="h-4 w-full bg-[#1A1924] rounded-full overflow-hidden border border-white/5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: '83%' }} transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-skd-accent to-yellow-400 relative"
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Stats & Pinned Badges */}
            <div className="md:col-span-2 space-y-8">
              
              {/* Statistics Grid */}
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
                      <div className="text-3xl font-black font-space tracking-tight">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Pinned Badges */}
              <motion.section variants={itemVariants}>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Medal size={24} className="text-skd-accent" />
                    Lencana Kehormatan
                  </h3>
                  <button onClick={() => setIsBadgeModalOpen(true)} className="text-xs font-bold text-skd-accent hover:text-yellow-400 transition-colors">
                    Lihat Semua
                  </button>
                </div>
                
                <div 
                  onClick={() => setIsBadgeModalOpen(true)}
                  className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 backdrop-blur-sm flex justify-around cursor-pointer hover:bg-white/10 transition-colors shadow-sm"
                >
                  {displayedBadges.length === 0 ? (
                    <p className="text-gray-500 text-sm font-medium py-4">Belum ada lencana yang dipin.</p>
                  ) : (
                    displayedBadges.map((badge) => (
                      <div key={badge.id} className="group relative flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.25)] group-hover:scale-110 transition-all duration-300">
                          {badge.icon}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-40 text-center">
                          <div className="bg-[#1A1924] border border-white/10 p-2.5 rounded-xl shadow-xl">
                            <p className="font-bold text-white mb-1 text-sm">{badge.name}</p>
                            <p className="text-gray-400 text-[10px] leading-tight">{badge.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            </div>

            {/* Right Column: Friends & Rivals */}
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
                      className="w-full bg-[#1A1924] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-skd-accent/50 transition-colors"
                    />
                  </div>
                  <button type="submit" className="bg-skd-accent text-[#0F0E17] px-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors text-xs">
                    Tambah
                  </button>
                </form>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                  <AnimatePresence>
                    {friends.map((friend) => (
                      <motion.div 
                        key={friend.id}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <div className="relative shrink-0">
                          <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full bg-[#1A1924]" />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1A1924] ${friend.online ? 'bg-green-500' : 'bg-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{friend.name}</p>
                          <p className="text-[10px] font-space text-gray-400 truncate">{friend.username}</p>
                        </div>
                        <div className="flex gap-1">
                          {friend.online && (
                            <button title="Tantang" className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20">
                              <Swords size={14} />
                            </button>
                          )}
                          <button 
                            title="Hapus Teman"
                            onClick={() => handleRemoveFriend(friend.id)}
                            className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all border border-transparent opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {friends.length === 0 && (
                      <p className="text-center text-sm text-gray-500 py-4">Belum ada rival yang ditambahkan.</p>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </motion.section>
          </div>
        </motion.div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
