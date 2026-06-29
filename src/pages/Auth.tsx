import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Mail, User, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authBg from '../assets/auth_bg.png';
import { useAudio } from '../context/AudioContext';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { playBGM } = useAudio();

  const handleGoogleLogin = async () => {
    try {
      if (!supabase) throw new Error('Supabase belum terkonfigurasi.');
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal login dengan Google');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase belum terkonfigurasi. Pastikan file .env sudah terbaca oleh server Vite.');
      }

      if (mode === 'forgot') {
        const { error } = await supabase!.auth.resetPasswordForEmail(email);
        if (error) throw error;
        alert('Tautan pemulihan sandi telah dikirim ke email Anda!');
        setMode('login');
        return;
      }

      if (mode === 'register') {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: { username }
          }
        });
        
        if (error) throw error;
        
        // Buat profil awal jika user terbuat (jika confirm email mati, user ada)
        if (data?.user) {
          await supabase!.from('profiles').insert({
            id: data.user.id,
            username: username
          });
        }
        
        playBGM();
        localStorage.setItem('isProfileComplete', 'false');
        navigate('/onboarding');
        return;
      }

      if (mode === 'login') {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        playBGM();
        
        // Cek apakah user sudah melengkapi onboarding
        if (data?.user) {
          const { data: profile } = await supabase!.from('profiles').select('nickname').eq('id', data.user.id).single();
          if (profile && profile.nickname) {
            localStorage.setItem('isProfileComplete', 'true');
            navigate('/');
          } else {
            localStorage.setItem('isProfileComplete', 'false');
            navigate('/onboarding');
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, x: mode === 'login' ? -20 : 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      x: mode === 'login' ? 20 : -20,
      transition: { duration: 0.3, ease: "easeIn" }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col lg:flex-row font-syne overflow-hidden">
      {/* Left Side: Visual/Branding (Hidden or minimized on mobile, prominent on desktop) */}
      <div className="relative w-full lg:w-1/2 min-h-[30vh] lg:min-h-screen flex flex-col justify-end p-8 lg:p-16 overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${authBg})` }}
        />
        {/* Gradients to blend with the dark theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E17] via-[#0F0E17]/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#0F0E17]/40 lg:to-[#0F0E17]" />

        {/* Grid and Particle effects */}
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl lg:text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-skd-accent to-yellow-500">
              SKDQuest
            </h1>
            <p className="text-xl lg:text-2xl font-medium text-gray-300 font-mono">
              Taklukan Rintangannya<br />Raih Mimpimu.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-20 -mt-10 lg:mt-0">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">

          {/* Subtle glow behind the form */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-skd-accent/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10">
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="absolute -top-4 -left-4 p-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft size={16} /> Kembali
              </button>
            )}

            <div className={`mb-8 text-center ${mode === 'forgot' ? 'mt-6' : ''}`}>
              <h2 className="text-3xl font-bold mb-2">
                {mode === 'login' ? 'Selamat Datang' : mode === 'register' ? 'Mulai Perjalanan' : 'Pulihkan Akses'}
              </h2>
              <p className="text-gray-400 text-sm">
                {mode === 'login'
                  ? 'Siapkan strategimu dan masuk ke arena.'
                  : mode === 'register'
                    ? 'Daftarkan karaktermu dan capai target kedinasan.'
                    : 'Masukkan email karaktermu untuk menerima tautan pemulihan.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">USERNAME</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Pilih nama karakter"
                        className="w-full bg-[#1A1927] text-white rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all duration-300 border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.2)] font-mono text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">EMAIL</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Masukkan email"
                      className="w-full bg-[#1A1927] text-white rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all duration-300 border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.2)] font-mono text-sm"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">PASSWORD</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan kata sandi rahasia"
                        className="w-full bg-[#1A1927] text-white rounded-xl pl-12 pr-4 py-3.5 outline-none transition-all duration-300 border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.2)] font-mono text-sm"
                      />
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-skd-accent hover:text-yellow-400 transition-colors font-medium"
                    >
                      Lupa Password?
                    </button>
                  </div>
                )}

                {mode !== 'forgot' && (
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase tracking-wider">ATAU</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>
                )}

                {mode !== 'forgot' && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-gray-800 font-bold py-3.5 rounded-xl shadow-md hover:bg-gray-100 disabled:opacity-50 transition-all flex justify-center items-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Lanjutkan dengan Google
                  </button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
                >
                  {loading ? 'Memproses...' : mode === 'login' ? 'Masuk dengan Email' : mode === 'register' ? 'Daftar dengan Email' : 'Kirim Tautan Reset'}
                  {!loading && <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {mode !== 'forgot' && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {mode === 'login' ? (
                    <>Belum punya akun? <span className="text-skd-accent font-bold">Daftar di sini</span></>
                  ) : (
                    <>Sudah punya karakter? <span className="text-skd-accent font-bold">Masuk</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
