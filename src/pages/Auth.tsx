import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, FileText, BarChart2, Target, Crown, Quote } from 'lucide-react';
import { supabase } from '../lib/supabase';

function mapAuthError(err: { message?: string; status?: number } | null): string {
  const msg = (err?.message || '').toLowerCase();
  if (!msg) return 'Gagal terhubung. Coba lagi.';

  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar.';
  }
  return err?.message || 'Gagal terhubung. Coba lagi.';
}

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Logo from Supabase 'Logo' bucket
  const logoUrl = supabase?.storage.from('Logo').getPublicUrl('Logo.png').data.publicUrl || '';
  // Background from Supabase 'background' bucket
  const bgUrl = supabase?.storage.from('background').getPublicUrl('background.png').data.publicUrl || '';

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
    } catch (err: unknown) {
      setErrorMsg(mapAuthError(err as { message?: string }));
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex font-syne overflow-hidden bg-[#1a1a2e]">
      {/* ── Full Screen Background ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      {/* Dark overlay to ensure text contrast on the left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent pointer-events-none" />

      {/* Top Right Floating Widget */}
      <div className="absolute top-6 right-6 z-30 hidden lg:flex items-center gap-3 bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-2.5 rounded-full shadow-lg">
        <span className="text-xl">👑</span>
        <div className="text-xs font-medium leading-tight">
          Platform latihan SKD/CAT<br />untuk masa depan yang lebih baik
        </div>
      </div>

      <div className="relative z-10 w-full flex flex-col lg:flex-row">
        
        {/* ── Sisi Kiri: Konten & Fitur ── */}
        <div className="w-full lg:w-3/5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 lg:pr-24">
          {/* Logo & Header Kiri */}
          <div className="flex items-center gap-4 mb-12 lg:mb-0">
            <img src={logoUrl} alt="Logo" className="w-14 h-14 object-contain drop-shadow-md" />
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">SKD<span className="text-blue-500">Quest</span></h1>
              <p className="text-white/80 text-xs font-medium mt-0.5">Latihan Hari Ini, Langkah Lebih Dekat<br/>Menuju Abdi Negara</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-2xl mt-8 lg:mt-0">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-6 tracking-tighter text-white leading-[1.1] drop-shadow-lg">
              Taklukan<br />
              Rintangannya<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-sm">
                Raih Mimpimu.
              </span>
            </h1>
            
            <p className="text-sm sm:text-base lg:text-lg text-white/90 font-medium leading-relaxed max-w-xl mb-10 drop-shadow">
              Latihan soal SKD/CAT dengan ribuan soal berkualitas, pembahasan lengkap, dan fitur yang dirancang khusus untuk perjalananmu menjadi ASN.
            </p>

            {/* Fitur Icons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-12">
              <div className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/80 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center shadow-lg">
                  <FileText className="text-white" size={24} />
                </div>
                <span className="text-white text-xs font-bold leading-tight">Ribuan Soal<br/>Terupdate</span>
              </div>
              <div className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/80 backdrop-blur-sm border border-indigo-400/30 flex items-center justify-center shadow-lg">
                  <BarChart2 className="text-white" size={24} />
                </div>
                <span className="text-white text-xs font-bold leading-tight">Pembahasan<br/>Lengkap</span>
              </div>
              <div className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/80 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center shadow-lg">
                  <Target className="text-white" size={24} />
                </div>
                <span className="text-white text-xs font-bold leading-tight">Simulasi<br/>CAT Realistis</span>
              </div>
              <div className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-700/80 backdrop-blur-sm border border-blue-400/30 flex items-center justify-center shadow-lg">
                  <Crown className="text-white" size={24} />
                </div>
                <span className="text-white text-xs font-bold leading-tight">Sistem Koin<br/>yang Fleksibel</span>
              </div>
            </div>
          </div>

          {/* Quote Section */}
          <div className="mt-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 max-w-xl flex gap-4 items-start shadow-xl">
            <Quote className="text-white/40 shrink-0 rotate-180" size={32} />
            <div>
              <p className="text-white/90 text-sm italic font-medium leading-relaxed mb-2">
                "Persiapan hari ini adalah investasi untuk masa depan yang kamu impikan."
              </p>
              <p className="text-white/60 text-xs font-bold">— SKDQuest</p>
            </div>
          </div>
        </div>

        {/* ── Sisi Kanan: Panel Auth ── */}
        <div className="w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-12 relative z-20">
          <div className="w-full max-w-md bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            
            {/* Dekorasi halus di dalam card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-tr-full opacity-50 pointer-events-none" />

            <div className="relative z-10">
              {/* Header Card */}
              <div className="text-center mb-8">
                <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-md" />
                <h2 className="text-2xl sm:text-3xl font-black mb-2 text-gray-900 tracking-tight">
                  Masuk ke <span className="text-blue-600">SKDQuest</span>
                </h2>
                <p className="text-blue-600 font-bold text-sm mb-1">
                  Selamat datang kembali! ✨
                </p>
                <p className="text-gray-500 font-medium text-xs leading-relaxed px-4">
                  Lanjutkan perjalananmu menuju ASN dengan masuk ke akunmu.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 font-medium text-sm px-4 py-3 rounded-xl">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-6 flex items-start gap-2.5 bg-green-50 border border-green-200 text-green-600 font-medium text-sm px-4 py-3 rounded-xl">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white border-2 border-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl shadow-sm hover:border-gray-200 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin text-blue-500" />
                      <span>Menghubungkan...</span>
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

                <div className="flex items-center gap-3 text-[11px] text-gray-400 uppercase tracking-wider font-bold">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span>Satu Akses Untuk Semua Fitur</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-2">
                  <div className="flex items-start gap-2.5 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-green-500" />
                    <span>
                      Akun <span className="font-bold text-gray-900">sudah terdaftar</span> akan langsung diarahkan ke halaman utama.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-blue-500" />
                    <span>
                      Akun <span className="font-bold text-gray-900">baru</span> akan diarahkan ke halaman pengaturan profil.
                    </span>
                  </div>
                </div>

                <p className="text-center text-xs text-gray-900 font-medium mt-6">
                  Belum punya akun? <button onClick={handleGoogleLogin} className="text-blue-600 font-bold hover:underline">Daftar sekarang</button>
                </p>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
