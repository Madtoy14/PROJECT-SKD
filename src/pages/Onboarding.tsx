import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Target, PenTool, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import avatarPdh from '../assets/avatar_pdh.webp';
import { supabase } from '../lib/supabase';

const SCHOOLS = [
  { id: 'stmkg', name: 'STMKG', color: 'text-blue-400', glow: 'bg-blue-500/20' },
  { id: 'stan', name: 'PKN STAN', color: 'text-coin', glow: 'bg-coin-subtle' },
  { id: 'ipdn', name: 'IPDN', color: 'text-red-400', glow: 'bg-danger-subtle' },
  { id: 'poltekim', name: 'Poltekimipas', color: 'text-purple-400', glow: 'bg-purple-500/20' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [targetSchool, setTargetSchool] = useState(SCHOOLS[0].id);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cek ke Supabase langsung — tidak pakai localStorage
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase!
        .from('profiles')
        .select('nickname, target_kedinasan')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          // Sudah onboarding jika nickname DAN target_kedinasan sudah terisi
          if (profile?.nickname && profile?.target_kedinasan) {
            navigate('/');
          }
        });
    });
  }, [navigate]);

  const activeSchool = SCHOOLS.find(s => s.id === targetSchool) || SCHOOLS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) throw new Error('Sesi tidak ditemukan');

      const usernameFallback = user.user_metadata?.name ||
                               user.email?.split('@')[0] ||
                               'User' + Math.floor(Math.random() * 1000);

      const { error } = await supabase!.from('profiles').upsert({
        id: user.id,
        username: usernameFallback,
        nickname: displayName.trim(),
        target_kedinasan: targetSchool,
        bio: bio.trim()
      });

      if (error) throw error;

      // Wajib: cache + event agar App.tsx needsOnboarding=false (cegah loop / ↔ /onboarding)
      try {
        sessionStorage.setItem(`onboarding_${user.id}`, 'false');
      } catch { /* ignore */ }
      window.dispatchEvent(
        new CustomEvent('skd:onboarding-done', { detail: { userId: user.id } })
      );

      setShowToast(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error(err);
      // Tampilkan error sebagai toast daripada alert()
      setShowToast(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col lg:flex-row font-syne overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-success-subtle border border-success/50 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="font-bold text-green-100">Karakter berhasil dibuat! Memasuki arena...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Spotlight */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none transition-colors duration-700 ${activeSchool.glow}`} />

      {/* Left Column: Avatar Preview */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full lg:w-1/2 min-h-[40vh] lg:min-h-screen flex flex-col items-center justify-center p-8 relative z-10"
      >
        <div className="relative group">
          <motion.div
            key={targetSchool}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 blur-3xl rounded-full transition-colors duration-500 ${activeSchool.glow}`}
          />
          <img
            src={avatarPdh}
            alt="Character Preview"
            className="w-64 h-64 md:w-96 md:h-96 rounded-full border-4 border-surface object-cover shadow-2xl relative z-10"
          />
          <motion.div
            key={`${targetSchool}-badge`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border px-6 py-2 rounded-full shadow-xl z-20 whitespace-nowrap"
          >
            <span className={`text-sm font-bold ${activeSchool.color}`}>
              {activeSchool.name.split(' ')[0]}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Column: Setup Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-10"
      >
        <div className="w-full max-w-md bg-surface-subtle border border-border rounded-3xl p-8 backdrop-blur-xl shadow-2xl">

          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Persiapan Memasuki Arena</h2>
            <p className="text-fg-muted text-sm">
              Lengkapi identitas karaktermu sebelum menantang simulasi SKD.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="onboarding-nickname" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">NICKNAME (DISPLAY NAME)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="onboarding-nickname"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Misal: Akmil stmkg cihuy"
                  className="w-full bg-surface text-fg rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all duration-300 border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.2)] font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="onboarding-school" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">TARGET SEKOLAH KEDINASAN</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                  <Target size={18} />
                </div>
                <select
                  id="onboarding-school"
                  value={targetSchool}
                  onChange={(e) => setTargetSchool(e.target.value)}
                  className="w-full bg-surface text-fg rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all duration-300 border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.2)] font-mono text-sm appearance-none cursor-pointer"
                >
                  {SCHOOLS.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-fg-muted">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="onboarding-bio" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">MOTIVASI / BIO SINGKAT</label>
              <div className="relative group">
                <div className="absolute top-4 left-0 pl-4 pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                  <PenTool size={18} />
                </div>
                <textarea
                  id="onboarding-bio"
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Alasan kamu ingin masuk sekolah kedinasan ini"
                  rows={3}
                  className="w-full bg-surface text-fg rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all duration-300 border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.2)] font-mono text-sm resize-none"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-4 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
            >
              {loading ? 'Menyimpan Karakter...' : 'Simpan & Masuk Arena'}
              {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
