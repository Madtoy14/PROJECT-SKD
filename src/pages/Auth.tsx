import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Mail, User, Lock, ChevronRight, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import authBg from '../assets/auth_bg.png';
import { useAudio } from '../context/AudioContext';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset-password';

// P3.1: variants di luar komponen agar tidak dibuat ulang setiap render
const getFormVariants = (mode: AuthMode): Variants => ({
  hidden: { opacity: 0, x: mode === 'login' ? -20 : 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:   { opacity: 0, x: mode === 'login' ? 20 : -20, transition: { duration: 0.25, ease: 'easeIn' } }
});

export default function Auth() {
  const [mode, setMode]               = useState<AuthMode>('login');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [newPassword, setNewPassword] = useState('');  // untuk reset-password
  const [confirmPassword, setConfirmPassword] = useState(''); // konfirmasi password baru
  const [username, setUsername]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPwd, setShowPwd]         = useState(false);
  const [showNewPwd, setShowNewPwd]   = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loginAttemptFailed, setLoginAttemptFailed] = useState(false); // hint daftar akun

  // P1.1: state inline menggantikan alert()
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate    = useNavigate();
  const location    = useLocation();
  const { playBGM } = useAudio();

  // Deteksi token recovery dari URL hash saat halaman dimuat
  // Supabase mengirim: /auth#access_token=...&type=recovery
  useEffect(() => {
    if (!supabase) return;

    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      // Ada token recovery — tampilkan form password baru
      setMode('reset-password');
      // Bersihkan hash dari URL agar tidak kelihatan di address bar
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    // Handle Supabase auth state untuk token recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('reset-password');
          setErrorMsg('');
          setSuccessMsg('');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // P3.1: memoize variants agar referensi stabil
  const formVariants = useMemo(() => getFormVariants(mode), [mode]);

  // P2.3: clear form + pesan saat switch mode
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowPwd(false);
    setShowNewPwd(false);
    setShowConfirmPwd(false);
    setLoginAttemptFailed(false);
  };

  // P2.2: validasi client-side sebelum hit API
  const validate = (): string | null => {
    if (!email.includes('@')) return 'Format email tidak valid.';
    if (mode === 'register') {
      if (username.trim().length < 3)  return 'Username minimal 3 karakter.';
      if (/\s/.test(username))         return 'Username tidak boleh mengandung spasi.';
      if (/[^a-zA-Z0-9_]/.test(username)) return 'Username hanya boleh huruf, angka, dan underscore.';
      if (password.length < 6)         return 'Password minimal 6 karakter.';
    }
    if (mode === 'login' && password.length === 0) return 'Password wajib diisi.';
    return null;
  };

  // P1.4: Google login — loading hanya di-reset saat error (redirect otomatis jika sukses)
  const handleGoogleLogin = async () => {
    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Arahkan ke root setelah OAuth callback; App.tsx akan handle onboarding check
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      // Jika sukses: browser redirect ke Google, loading tetap true sampai redirect
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login dengan Google.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // P2.2: validasi dulu sebelum loading
    const validErr = validate();
    if (validErr) { setErrorMsg(validErr); return; }

    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi. Pastikan file .env sudah terbaca.');
      return;
    }

    setLoading(true);

    try {
      // ── RESET PASSWORD (dari link email) ──────────────────────
      if (mode === 'reset-password') {
        if (newPassword.length < 6) {
          setErrorMsg('Password baru minimal 6 karakter.');
          return;
        }
        if (newPassword !== confirmPassword) {
          setErrorMsg('Konfirmasi password tidak cocok.');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setSuccessMsg('Password berhasil diubah! Kamu akan diarahkan ke halaman login.');
        setTimeout(() => switchMode('login'), 2500);
        return;
      }

      // ── LUPA PASSWORD ──────────────────────────────────────────
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // P2.4: redirectTo yang eksplisit agar token dikirim ke halaman yang benar
          redirectTo: `${window.location.origin}/auth`
        });
        if (error) throw error;
        // P1.1: pesan sukses inline, bukan alert()
        setSuccessMsg(`Tautan pemulihan sandi telah dikirim ke ${email}. Cek inbox (dan folder spam) kamu.`);
        return; // jangan switch mode otomatis, biarkan user baca pesan
      }

      // ── DAFTAR ─────────────────────────────────────────────────
      if (mode === 'register') {
        // P1.2: cek username unik sebelum signup
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username.trim())
          .maybeSingle();

        if (existing) {
          setErrorMsg('Username sudah dipakai pemain lain. Pilih nama lain.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } }
        });
        if (error) throw error;

        // P1.2: handle dua skenario — email confirmation ON vs OFF
        if (data?.session) {
          // Konfirmasi email TIDAK aktif — user langsung login
          if (data.user) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              username: username.trim()
            });
          }
          playBGM();
          navigate('/onboarding', { replace: true });
        } else {
          // Konfirmasi email AKTIF — user harus verifikasi dulu
          setSuccessMsg(
            `Akun berhasil dibuat! Cek email ${email} untuk verifikasi sebelum login.`
          );
          // Jangan navigate — tunggu user klik link di email
        }
        return;
      }

      // ── LOGIN ───────────────────────────────────────────────────
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        playBGM();

        // P3.2: cek onboarding langsung ke DB, tidak pakai localStorage
        if (data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profile?.nickname) {
            navigate('/', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
        }
      }

    } catch (err: any) {
      // P1.1: tampilkan error inline
      const msg: string = err.message || 'Terjadi kesalahan. Coba lagi.';
      // Terjemahkan pesan error Supabase ke bahasa Indonesia
      if (msg.includes('Invalid login credentials'))  setErrorMsg('Email atau password salah.');
      else if (msg.includes('Email not confirmed'))   setErrorMsg('Email belum diverifikasi. Cek inbox kamu.');
      else if (msg.includes('User already registered')) setErrorMsg('Email ini sudah terdaftar. Silakan login.');
      else if (msg.includes('Password should be'))    setErrorMsg('Password minimal 6 karakter.');
      else setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col lg:flex-row font-syne overflow-hidden">

      {/* ── Sisi Kiri: Visual/Branding ── */}
      <div className="relative w-full lg:w-1/2 min-h-[25vh] lg:min-h-screen flex flex-col justify-end p-8 lg:p-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${authBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E17] via-[#0F0E17]/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#0F0E17]/40 lg:to-[#0F0E17]" />
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
        />
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

      {/* ── Sisi Kanan: Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-20 -mt-8 lg:mt-0">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">

          {/* Glow dekoratif */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-skd-accent/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10">

            {/* Tombol kembali di mode forgot atau reset-password */}
            {(mode === 'forgot' || mode === 'reset-password') && (
              <button
                onClick={() => switchMode('login')}
                className="absolute -top-4 -left-4 p-2 text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <ArrowLeft size={15} /> Kembali
              </button>
            )}

            {/* Judul */}
            <div className={`mb-6 text-center ${(mode === 'forgot' || mode === 'reset-password') ? 'mt-6' : ''}`}>
              <h2 className="text-3xl font-bold mb-2">
                {mode === 'login'          ? 'Selamat Datang'
                : mode === 'register'     ? 'Mulai Perjalanan'
                : mode === 'reset-password' ? 'Buat Password Baru'
                :                           'Pulihkan Akses'}
              </h2>
              <p className="text-gray-400 text-sm">
                {mode === 'login'            ? 'Siapkan strategimu dan masuk ke arena.'
                : mode === 'register'        ? 'Daftarkan karaktermu dan capai target kedinasan.'
                : mode === 'reset-password'  ? 'Masukkan password baru untuk akunmu.'
                :                             'Masukkan email untuk menerima tautan pemulihan.'}
              </p>
            </div>

            {/* P1.1: Pesan error inline */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-4 flex items-start gap-2.5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl"
                >
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Field Username — hanya di register */}
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">USERNAME</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                        <User size={17} />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="Pilih nama karakter (min. 3 karakter)"
                        maxLength={20}
                        className="w-full bg-[#1A1927] text-white rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.15)] font-mono text-sm"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-1">Huruf, angka, dan underscore. Tidak bisa diubah setelah daftar.</p>
                  </div>
                )}

                {/* Field Email — tidak di mode reset-password */}
                {mode !== 'reset-password' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">EMAIL</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                        <Mail size={17} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Masukkan email"
                        autoComplete="email"
                        className="w-full bg-[#1A1927] text-white rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.15)] font-mono text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Field Password — hanya di mode login dan register */}
                {(mode === 'login' || mode === 'register') && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">PASSWORD</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                        <Lock size={17} />
                      </div>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? 'Min. 6 karakter' : 'Masukkan password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        className="w-full bg-[#1A1927] text-white rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.15)] font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(p => !p)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Field Password Baru — hanya di mode reset-password */}
                {mode === 'reset-password' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">PASSWORD BARU</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                          <Lock size={17} />
                        </div>
                        <input
                          type={showNewPwd ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min. 6 karakter"
                          autoComplete="new-password"
                          className="w-full bg-[#1A1927] text-white rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border border-transparent focus:border-skd-accent/50 focus:shadow-[0_0_15px_rgba(245,166,35,0.15)] font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPwd(p => !p)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                          tabIndex={-1}
                        >
                          {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">KONFIRMASI PASSWORD BARU</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                          <Lock size={17} />
                        </div>
                        <input
                          type={showConfirmPwd ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                          autoComplete="new-password"
                          className={`w-full bg-[#1A1927] text-white rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border font-mono text-sm ${
                            confirmPassword && confirmPassword !== newPassword
                              ? 'border-red-500/50'
                              : confirmPassword && confirmPassword === newPassword
                                ? 'border-green-500/50'
                                : 'border-transparent focus:border-skd-accent/50'
                          } focus:shadow-[0_0_15px_rgba(245,166,35,0.15)]`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPwd(p => !p)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* Indikator kecocokan password */}
                      {confirmPassword && (
                        <p className={`text-[10px] mt-1 ml-1 ${confirmPassword === newPassword ? 'text-green-400' : 'text-red-400'}`}>
                          {confirmPassword === newPassword ? '✓ Password cocok' : '✗ Password tidak cocok'}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Link lupa password */}
                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-skd-accent hover:text-yellow-400 transition-colors font-medium"
                    >
                      Lupa Password?
                    </button>
                  </div>
                )}

                {/* Divider ATAU — hanya di mode login dan register */}
                {(mode === 'login' || mode === 'register') && (
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-white/10" />
                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase tracking-wider">ATAU</span>
                    <div className="flex-grow border-t border-white/10" />
                  </div>
                )}

                {/* Tombol Google — hanya di mode login dan register */}
                {(mode === 'login' || mode === 'register') && (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-gray-800 font-bold py-3.5 rounded-xl shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin text-gray-500" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    {loading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
                  </button>
                )}

                {/* Tombol submit utama */}
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  type="submit"
                  disabled={loading || (mode === 'reset-password' && confirmPassword !== newPassword && confirmPassword.length > 0)}
                  className="w-full mt-2 bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                  ) : (
                    <>
                      {mode === 'login'           ? 'Masuk dengan Email'
                      : mode === 'register'       ? 'Daftar dengan Email'
                      : mode === 'reset-password' ? 'Simpan Password Baru'
                      :                             'Kirim Tautan Reset'}
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* Switch mode login ↔ register — tidak tampil di forgot dan reset-password */}
            {(mode === 'login' || mode === 'register') && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
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
