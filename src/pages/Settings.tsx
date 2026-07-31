import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eye, EyeOff, KeyRound, LogOut, Mail, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

const MIN_PASSWORD = 8;

export default function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [providers, setProviders] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUser = useCallback(async (showSpinner = true) => {
    if (!supabase) {
      setLoadingUser(false);
      return;
    }
    if (showSpinner) setLoadingUser(true);
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }
      setEmail(user.email || '');
      const ids = (user.identities || []).map((i) => i.provider);
      const appProviders = (user.app_metadata?.providers as string[]) || [];
      const allProviders = [...new Set([...ids, ...appProviders])];
      setProviders(allProviders);
      setHasPassword(allProviders.includes('email'));
    } catch (err) {
      console.error('Gagal mengambil data user:', err);
    } finally {
      if (showSpinner) setLoadingUser(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadUser(true);
  }, [loadUser]);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || !confirm) {
      setError('Isi password dan konfirmasi.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password minimal ${MIN_PASSWORD} karakter.`);
      return;
    }
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (!supabase) {
      setError('Supabase tidak terkonfigurasi.');
      return;
    }
    setBusy(true);
    try {
      // 1. Cek sesi aktif terlebih dahulu
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error('Sesi Anda telah berakhir. Silakan login ulang terlebih dahulu.');
      }

      // 2. Wrap updateUser dengan Timeout Guard (10 detik) untuk mencegah gantung
      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Koneksi ke Supabase timeout. Coba klik simpan sekali lagi.')), 10000)
      );

      const res = (await Promise.race([updatePromise, timeoutPromise])) as { error?: any };
      if (res?.error) throw res.error;

      setPassword('');
      setConfirm('');
      const wasPasswordSet = hasPassword;
      setHasPassword(true);
      setSuccess(wasPasswordSet ? 'Password berhasil diubah.' : 'Password siap. Bisa login email lain kali.');
      // Refresh user info silently in background without causing full-screen spinner
      void loadUser(false);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '';
      if (msg.toLowerCase().includes('same password') || msg.toLowerCase().includes('should be different')) {
        setError('Password baru tidak boleh sama dengan password lama.');
      } else if (msg.toLowerCase().includes('password') && (msg.toLowerCase().includes('least') || msg.toLowerCase().includes('short') || msg.toLowerCase().includes('weak'))) {
        setError(`Password minimal ${MIN_PASSWORD} karakter.`);
      } else {
        setError(msg || 'Gagal menyimpan password.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      try {
        const keys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith('onboarding_')) keys.push(k);
        }
        keys.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      if (supabase) await supabase.auth.signOut();
    } finally {
      window.location.href = '/auth';
    }
  };

  const hasGoogle = providers.includes('google');

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-10">
      <div className="sticky top-12 md:top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-subtle text-fg"
            aria-label="Kembali"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-base font-black text-fg">Pengaturan</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        <section className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-fg">Keamanan</h2>
              <p className="text-[11px] text-fg-muted font-medium">Password & metode masuk</p>
            </div>
          </div>

          {loadingUser ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle border border-border">
                  <Mail size={16} className="text-fg-muted mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">Email</p>
                    <p className="text-sm font-bold text-fg break-all">{email || '—'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hasGoogle && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      Google
                    </span>
                  )}
                  {hasPassword ? (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-success/10 text-success border border-success/20">
                      Email + password
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-warning/10 text-warning border border-warning/20">
                      Belum set password
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound size={14} className="text-primary" />
                  <h3 className="text-xs font-black text-fg uppercase tracking-wide">
                    {hasPassword ? 'Ubah password' : 'Buat password'}
                  </h3>
                </div>
                <p className="text-[11px] text-fg-muted leading-relaxed">
                  {hasPassword
                    ? 'Password baru untuk login email. Session tetap aktif.'
                    : 'Login lewat Google? Set password di sini supaya bisa masuk email juga.'}
                </p>

                <div>
                  <label htmlFor="settings-password" className="block text-xs font-bold text-fg-muted mb-1.5 ml-0.5">
                    Password baru
                  </label>
                  <div className="relative">
                    <input
                      id="settings-password"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-surface-subtle border border-border rounded-xl px-3 py-3 pr-11 text-sm text-fg outline-none focus:border-primary/50"
                      placeholder={`Minimal ${MIN_PASSWORD} karakter`}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-fg-muted"
                      aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-confirm" className="block text-xs font-bold text-fg-muted mb-1.5 ml-0.5">
                    Konfirmasi password
                  </label>
                  <div className="relative">
                    <input
                      id="settings-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-surface-subtle border border-border rounded-xl px-3 py-3 pr-11 text-sm text-fg outline-none focus:border-primary/50"
                      placeholder="Ulangi password"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-fg-muted"
                      aria-label={showConfirm ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-bold text-danger bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-xs font-bold text-success bg-success/10 border border-success/20 rounded-xl px-3 py-2">
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-primary text-primary-fg font-black text-sm hover:opacity-90 disabled:opacity-60 transition-all active:scale-[0.99]"
                >
                  {busy ? 'Menyimpan...' : hasPassword ? 'Simpan password baru' : 'Buat password'}
                </button>
              </form>
            </>
          )}
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border border-danger/30 text-danger font-black text-sm bg-danger/5 hover:bg-danger/10 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </div>
  );
}
