import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authBg from '../assets/auth_bg.png';
import { supabase } from '../lib/supabase';

// Mode 'reset-password' dipertahankan untuk handle link email reset password
type AuthMode = 'google' | 'reset-password';

export default function Auth() {
  const [mode, setMode]                         = useState<AuthMode>('google');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [loading, setLoading]                   = useState(false);
  const [showNewPwd, setShowNewPwd]             = useState(false);
  const [showConfirmPwd, setShowConfirmPwd]     = useState(false);
  const [errorMsg, setErrorMsg]                 = useState('');
  const [successMsg, setSuccessMsg]             = useState('');

  const navigate = useNavigate();

  // Deteksi token recovery dari URL hash (dikirim Supabase lewat email reset)
  // Format: /auth#access_token=...&type=recovery
  useEffect(() => {
    if (!supabase) return;

    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setMode('reset-password');
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('reset-password');
          setErrorMsg('');
          setSuccessMsg('');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Google OAuth ──
  // App.tsx (ProtectedRoute → checkOnboarding) yang membedakan:
  //   - Akun baru (tidak ada profil)  → redirect ke /onboarding
  //   - Akun lama (profil lengkap)    → redirect ke / (halaman utama)
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
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      // Loading tetap true — browser akan redirect ke Google
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal terhubung ke Google. Coba lagi.');
      setLoading(false);
    }
  };

  // ── Simpan password baru (dari link reset email) ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMsg('Password berhasil diubah! Silakan masuk ulang dengan Google.');
      setNewPassword('');
      setConfirmPassword('');
      // Kembali ke halaman utama setelah 2.5 detik
      setTimeout(() => {
        setMode('google');
        setSuccessMsg('');
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah password. Coba minta link baru.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0E17] text-white flex flex-col lg:flex-row font-syne overflow-hidden">

      {/* ── Sisi Kiri: Visual/Branding ── */}
      <div className="relative w-full lg:w-1/2 min-h-[28vh] lg:min-h-screen flex flex-col justify-end p-8 lg:p-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${authBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E17] via-[#0F0E17]/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-[#0F0E17]/40 lg:to-[#0F0E17]" />
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}
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

      {/* ── Sisi Kanan: Panel Auth ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-20 -mt-8 lg:mt-0">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">

          {/* Glow dekoratif */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-skd-accent/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10">
            <AnimatePresence mode="wait">

              {/* ── Mode Google (default) ── */}
              {mode === 'google' && (
                <motion.div
                  key="google"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-skd-accent to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-skd-accent/20">
                      <span className="text-2xl">⚔️</span>
                    </div>
                    <h2 className="text-2xl font-black mb-1.5">Masuk ke Arena</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Gunakan akun Google kamu untuk masuk atau mendaftar.
                    </p>
                  </div>

                  {/* Pesan error */}
                  <AnimatePresence>
                    {errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl"
                      >
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tombol Google */}
                  <motion.button
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.97 }}
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-gray-800 font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin text-gray-500" />
                        <span className="text-gray-600">Menghubungkan...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span>Lanjutkan dengan Google</span>
                      </>
                    )}
                  </motion.button>

                  {/* Info pembeda akun baru vs lama */}
                  <div className="mt-6 space-y-2.5">
                    <div className="flex items-start gap-2.5 text-xs text-gray-500">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-skd-success" />
                      <span>Akun yang <span className="text-gray-300 font-medium">sudah terdaftar</span> akan langsung masuk ke halaman utama.</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-gray-500">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-skd-accent" />
                      <span>Akun <span className="text-gray-300 font-medium">baru</span> akan diarahkan ke halaman pengaturan profil.</span>
                    </div>
                  </div>

                  {/* Catatan privasi */}
                  <p className="text-center text-[11px] text-gray-600 mt-6 leading-relaxed">
                    Dengan masuk, kamu menyetujui penggunaan data untuk keperluan aplikasi SKDQuest.
                  </p>
                </motion.div>
              )}

              {/* ── Mode Reset Password (dari link email) ── */}
              {mode === 'reset-password' && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Lock size={22} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black mb-1.5">Buat Password Baru</h2>
                    <p className="text-gray-400 text-sm">Masukkan password baru untuk akunmu.</p>
                  </div>

                  {/* Pesan error / sukses */}
                  <AnimatePresence>
                    {errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl"
                      >
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </motion.div>
                    )}
                    {successMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 flex items-start gap-2.5 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-xl"
                      >
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        <span>{successMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {/* Password Baru */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">PASSWORD BARU</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                          <Lock size={16} />
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
                          {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Password */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5 ml-1">KONFIRMASI PASSWORD</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-skd-accent transition-colors">
                          <Lock size={16} />
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
                          {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {confirmPassword && (
                        <p className={`text-[10px] mt-1 ml-1 ${confirmPassword === newPassword ? 'text-green-400' : 'text-red-400'}`}>
                          {confirmPassword === newPassword ? '✓ Password cocok' : '✗ Password tidak cocok'}
                        </p>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.97 }}
                      type="submit"
                      disabled={loading || (confirmPassword.length > 0 && confirmPassword !== newPassword)}
                      className="w-full bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group"
                    >
                      {loading ? (
                        <><Loader2 size={17} className="animate-spin" /> Menyimpan...</>
                      ) : (
                        <>Simpan Password Baru <ChevronRight size={17} className="group-hover:translate-x-1 transition-transform" /></>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
