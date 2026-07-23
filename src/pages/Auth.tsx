import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';

import authBg from '../assets/auth_bg.webp';
import { supabase } from '../lib/supabase';

// login/signup/forgot = manual email; reset-password = link recovery email
// Google OAuth tetap primary di mode login/signup
// App.tsx (ProtectedRoute / onAuthStateChange) handle redirect + onboarding — jangan double-navigate di sini
type AuthMode = 'login' | 'signup' | 'forgot' | 'reset-password';

const MIN_PASSWORD = 8;

function mapAuthError(err: { message?: string; status?: number } | null, context: AuthMode): string {
  const msg = (err?.message || '').toLowerCase();
  if (!msg) return 'Gagal terhubung. Coba lagi.';

  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return 'Email atau password salah.';
  }
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'Cek email untuk verifikasi, lalu masuk lagi.';
  }
  if (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists') ||
    (context === 'signup' && msg.includes('already'))
  ) {
    return 'Email sudah dipakai. Masuk atau lanjutkan dengan Google.';
  }
  if (msg.includes('password') && (msg.includes('least') || msg.includes('short') || msg.includes('weak'))) {
    return `Password minimal ${MIN_PASSWORD} karakter.`;
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar.';
  }
  // Jangan bocorkan detail internal Supabase
  return err?.message || 'Gagal terhubung. Coba lagi.';
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    // email tetap biar user tidak ketik ulang
  };

  // Deteksi token recovery dari URL hash (Supabase reset email)
  // Format: /auth#access_token=...&type=recovery
  useEffect(() => {
    if (!supabase) return;

    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setMode('reset-password');
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset-password');
        setErrorMsg('');
        setSuccessMsg('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Google OAuth (primary) ──
  const handleGoogleLogin = async () => {
    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      // Loading tetap true — browser redirect ke Google
    } catch (err: unknown) {
      setErrorMsg(mapAuthError(err as { message?: string }, mode));
      setLoading(false);
    }
  };

  // ── Login email ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Isi email dan password.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // App.tsx onAuthStateChange → / atau /onboarding
    } catch (err: unknown) {
      setErrorMsg(mapAuthError(err as { message?: string }, 'login'));
      setLoading(false);
    }
  };

  // ── Signup email ──
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Isi email dan password.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setErrorMsg(`Password minimal ${MIN_PASSWORD} karakter.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;

      // Supabase kadang return user tanpa session jika confirm email ON
      // identities kosong = email sudah terdaftar (anti-enumeration soft)
      const identities = data.user?.identities;
      if (data.user && Array.isArray(identities) && identities.length === 0) {
        setErrorMsg('Email sudah dipakai. Masuk atau lanjutkan dengan Google.');
        setLoading(false);
        return;
      }

      if (data.session) {
        // Confirm email OFF / auto session — App.tsx handle redirect
        return;
      }

      setSuccessMsg('Cek email untuk verifikasi, lalu masuk.');
      setPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch (err: unknown) {
      setErrorMsg(mapAuthError(err as { message?: string }, 'signup'));
      setLoading(false);
    }
  };

  // ── Forgot password ──
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!email.trim()) {
      setErrorMsg('Isi email dulu.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Supabase belum terkonfigurasi.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      // Selalu pesan sukses generik (jangan bocorkan email terdaftar/tidak)
      setSuccessMsg('Link reset dikirim. Cek inbox / spam.');
    } catch (err: unknown) {
      setErrorMsg(mapAuthError(err as { message?: string }, 'forgot'));
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password (dari link email) ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < MIN_PASSWORD) {
      setErrorMsg(`Password baru minimal ${MIN_PASSWORD} karakter.`);
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
      setSuccessMsg('Password berhasil diubah. Silakan masuk.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        switchMode('login');
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(mapAuthError(err as { message?: string }, 'reset-password'));
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'signup'
      ? 'Buat Akun Pejuang'
      : mode === 'forgot'
        ? 'Lupa Password'
        : mode === 'reset-password'
          ? 'Buat Password Baru'
          : 'Masuk ke Arena';

  const subtitle =
    mode === 'signup'
      ? 'Daftar dengan email atau Google, lalu lengkapi profil.'
      : mode === 'forgot'
        ? 'Kami kirim link reset ke emailmu.'
        : mode === 'reset-password'
          ? 'Masukkan password baru untuk akunmu.'
          : 'Google lebih cepat — atau masuk dengan email.';

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col lg:flex-row font-syne overflow-hidden">
      {/* ── Sisi Kiri: Visual/Branding ── */}
      <div className="relative w-full lg:w-1/2 min-h-[38vh] sm:min-h-[46vh] lg:min-h-screen flex flex-col justify-end p-6 pb-12 sm:p-10 lg:p-16 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[center_top] lg:bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${authBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-bg/40 lg:to-bg" />
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(15, 23, 42, 0.1) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-lg">
          <div className="animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black mb-1.5 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-skd-accent to-yellow-500 drop-shadow-sm">
              SKDQuest
            </h1>
            <p className="text-sm sm:text-lg lg:text-2xl font-medium text-fg-muted font-mono leading-tight">
              Taklukan Rintangannya
              <br className="hidden sm:inline" /> Raih Mimpimu.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sisi Kanan: Panel Auth ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-20 -mt-8 lg:mt-0">
        <div className="w-full max-w-sm bg-surface-subtle border border-border rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ${
                  mode === 'reset-password' || mode === 'forgot'
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                    : 'bg-gradient-to-br from-skd-accent to-yellow-500 shadow-sm/20'
                }`}
              >
                {mode === 'reset-password' || mode === 'forgot' ? (
                  <Lock size={22} className="text-fg" />
                ) : (
                  <span className="text-2xl">⚔️</span>
                )}
              </div>
              <h2 className="text-2xl font-black mb-1.5">{title}</h2>
              <p className="text-fg-muted text-sm leading-relaxed">{subtitle}</p>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2.5 bg-danger/10 border border-danger/30 text-red-400 text-sm px-4 py-3 rounded-xl animate-[fadeInUp_0.2s_ease-out_both]">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 flex items-start gap-2.5 bg-success/10 border border-success/30 text-green-400 text-sm px-4 py-3 rounded-xl animate-[fadeInUp_0.2s_ease-out_both]">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ── Login / Signup: Google primary + form ── */}
            {(mode === 'login' || mode === 'signup') && (
              <div key={mode} className="animate-[fadeInUp_0.3s_ease-out_both] space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white text-gray-800 font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin text-fg-muted" />
                      <span className="text-gray-600">Menghubungkan...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>Lanjutkan dengan Google</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 text-[11px] text-fg-muted uppercase tracking-wider">
                  <div className="flex-1 h-px bg-border" />
                  <span>atau</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-3">
                  <div>
                    <label htmlFor="auth-email" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">
                      EMAIL
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                        <Mail size={16} />
                      </div>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        autoComplete="email"
                        className="w-full bg-surface text-fg rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.15)] font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">
                      PASSWORD
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                        <Lock size={16} />
                      </div>
                      <input
                        id="auth-password"
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? `Min. ${MIN_PASSWORD} karakter` : 'Password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        className="w-full bg-surface text-fg rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.15)] font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-fg-muted hover:text-fg transition-colors"
                        tabIndex={-1}
                        aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div>
                      <label htmlFor="auth-confirm" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">
                        KONFIRMASI PASSWORD
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                          <Lock size={16} />
                        </div>
                        <input
                          id="auth-confirm"
                          type={showConfirmPwd ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          autoComplete="new-password"
                          className={`w-full bg-surface text-fg rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border font-mono text-sm ${
                            confirmPassword && confirmPassword !== password
                              ? 'border-danger/50'
                              : confirmPassword && confirmPassword === password
                                ? 'border-success/50'
                                : 'border-transparent focus:border-primary/50'
                          } focus:shadow-[0_0_15px_rgba(37,99,235,0.15)]`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPwd((p) => !p)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-fg-muted hover:text-fg transition-colors"
                          tabIndex={-1}
                          aria-label={showConfirmPwd ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
                        >
                          {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {confirmPassword && (
                        <p
                          className={`text-[10px] mt-1 ml-1 ${
                            confirmPassword === password ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {confirmPassword === password ? '✓ Password cocok' : '✗ Password tidak cocok'}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (mode === 'signup' && confirmPassword.length > 0 && confirmPassword !== password)
                    }
                    className="w-full bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={17} className="animate-spin" /> Memproses...
                      </>
                    ) : (
                      <>
                        {mode === 'login' ? 'Masuk' : 'Daftar'}
                        <ChevronRight size={17} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-1 space-y-2 text-center text-sm">
                  {mode === 'login' && (
                    <>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="block w-full text-primary hover:underline text-xs font-medium"
                      >
                        Lupa password?
                      </button>
                      <p className="text-fg-muted text-xs">
                        Belum punya akun?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('signup')}
                          className="text-fg font-bold hover:text-primary"
                        >
                          Daftar
                        </button>
                      </p>
                    </>
                  )}
                  {mode === 'signup' && (
                    <p className="text-fg-muted text-xs">
                      Sudah punya akun?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-fg font-bold hover:text-primary"
                      >
                        Masuk
                      </button>
                    </p>
                  )}
                </div>

                <div className="mt-2 space-y-2">
                  <div className="flex items-start gap-2.5 text-xs text-fg-muted">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-success" />
                    <span>
                      Akun <span className="text-fg-secondary font-medium">sudah terdaftar</span> langsung ke
                      halaman utama.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-fg-muted">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-primary" />
                    <span>
                      Akun <span className="text-fg-secondary font-medium">baru</span> diarahkan ke pengaturan
                      profil.
                    </span>
                  </div>
                </div>

                <p className="text-center text-[11px] text-gray-600 leading-relaxed">
                  Dengan masuk, kamu menyetujui penggunaan data untuk keperluan aplikasi SKDQuest.
                </p>
              </div>
            )}

            {/* ── Forgot ── */}
            {mode === 'forgot' && (
              <div key="forgot" className="animate-[fadeInUp_0.3s_ease-out_both]">
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label htmlFor="forgot-email" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">
                      EMAIL
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                        <Mail size={16} />
                      </div>
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        autoComplete="email"
                        className="w-full bg-surface text-fg rounded-xl pl-11 pr-4 py-3.5 outline-none transition-all border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.15)] font-mono text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={17} className="animate-spin" /> Mengirim...
                      </>
                    ) : (
                      'Kirim link reset'
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mt-4 w-full text-center text-xs text-fg-muted hover:text-primary font-medium"
                >
                  Kembali ke Masuk
                </button>
              </div>
            )}

            {/* ── Reset password (recovery link) ── */}
            {mode === 'reset-password' && (
              <div key="reset" className="animate-[fadeInUp_0.3s_ease-out_both]">
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-bold text-fg-muted mb-1.5 ml-1">
                      PASSWORD BARU
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                        <Lock size={16} />
                      </div>
                      <input
                        id="new-password"
                        type={showNewPwd ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={`Min. ${MIN_PASSWORD} karakter`}
                        autoComplete="new-password"
                        className="w-full bg-surface text-fg rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border border-transparent focus:border-primary/50 focus:shadow-[0_0_15px_rgba(37,99,235,0.15)] font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-fg-muted hover:text-fg transition-colors"
                        tabIndex={-1}
                        aria-label={showNewPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-bold text-fg-muted mb-1.5 ml-1"
                    >
                      KONFIRMASI PASSWORD
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-fg-muted group-focus-within:text-primary transition-colors">
                        <Lock size={16} />
                      </div>
                      <input
                        id="confirm-password"
                        type={showConfirmPwd ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        autoComplete="new-password"
                        className={`w-full bg-surface text-fg rounded-xl pl-11 pr-12 py-3.5 outline-none transition-all border font-mono text-sm ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-danger/50'
                            : confirmPassword && confirmPassword === newPassword
                              ? 'border-success/50'
                              : 'border-transparent focus:border-primary/50'
                        } focus:shadow-[0_0_15px_rgba(37,99,235,0.15)]`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((p) => !p)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-fg-muted hover:text-fg transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirmPwd ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                      >
                        {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <p
                        className={`text-[10px] mt-1 ml-1 ${
                          confirmPassword === newPassword ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {confirmPassword === newPassword ? '✓ Password cocok' : '✗ Password tidak cocok'}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (confirmPassword.length > 0 && confirmPassword !== newPassword)}
                    className="w-full bg-gradient-to-r from-skd-accent to-yellow-500 text-[#0F0E17] font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,166,35,0.3)] hover:shadow-[0_0_30px_rgba(245,166,35,0.5)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={17} className="animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        Simpan Password Baru{' '}
                        <ChevronRight size={17} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
