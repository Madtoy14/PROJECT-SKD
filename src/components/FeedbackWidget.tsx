import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, X, ChevronDown, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const FAQS = [
  { q: 'Bagaimana cara mendapatkan koin?', a: 'Selesaikan kuis, klaim quest harian/mingguan, streak harian, daily claim, dan spin wheel.' },
  { q: 'Kenapa energi saya berkurang?', a: 'Energi dipotong saat memulai mode Survival atau Tryout. Pulih 1 energi setiap 5 menit.' },
  { q: 'Bagaimana cara klaim hadiah quest?', a: 'Buka halaman Quest, selesaikan progress, lalu tekan tombol Klaim.' },
  { q: 'Apakah progress tersimpan saat refresh?', a: 'Ya, sesi kuis dipulihkan otomatis. Jika gagal, hubungi kami lewat form ini.' },
  { q: 'Bagaimana cara mengubah password?', a: 'Buka Settings → Ubah Password. Untuk akun Google, set password dulu agar bisa login pakai email.' },
  { q: 'Bagaimana cara top-up koin?', a: 'Pilih paket di halaman top-up, kirim bukti pembayaran, tunggu approval admin.' },
  { q: 'Bagaimana cara melaporkan soal yang salah?', a: 'Gunakan form ini, pilih kategori "Soal Bermasalah", sertakan soal dan jawaban yang benar.' },
];

const CATEGORIES = [
  'Bug / Error',
  'Soal Bermasalah',
  'Saran Fitur',
  'Kritik Tampilan',
  'Masalah Akun',
  'Top-up / Pembayaran',
  'Lainnya',
];

const FEEDBACK_EF_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') + '/functions/v1/send-feedback';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      supabase?.auth.getSession().then(({ data }) => setUser(data?.session?.user ?? null));
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(FEEDBACK_EF_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data?.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          category: category || 'Lainnya',
          message: message.trim(),
          user_id: user?.id,
          email: user?.email,
          page_path: window.location.pathname,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Gagal mengirim');
      }
      setSent(true);
      setMessage('');
      setCategory('');
      setTimeout(() => setSent(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim. Coba lagi nanti.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-primary hover:bg-primary-hover text-primary-fg rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="Bantuan & Feedback"
      >
        {isOpen ? <X size={24} /> : <MessageCircleQuestion size={24} />}
      </button>

      {/* Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-[60] w-[92vw] max-w-sm bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[70vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-primary/5 shrink-0">
              <h2 className="text-base font-black text-fg">Bantuan & Feedback</h2>
              <p className="text-xs text-fg-muted mt-0.5">Punya pertanyaan atau masukan?</p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* FAQ Accordion */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2">FAQ</h3>
                {FAQS.map((faq, i) => (
                  <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-bold text-fg hover:bg-surface-subtle transition-colors"
                    >
                      <span className="flex-1">{faq.q}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-fg-muted transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-3 text-sm text-fg-secondary leading-relaxed"
                        >
                          {faq.a}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Form */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider">Kirim Masukan</h3>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-primary transition-colors"
                >
                  <option value="">Pilih kategori (opsional)</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tulis pesan, saran, atau kritik..."
                  rows={4}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-primary transition-colors resize-none"
                />
                {error && (
                  <div className="flex items-center gap-2 text-xs text-danger">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-disabled-bg disabled:text-disabled-fg text-primary-fg text-sm font-bold rounded-xl px-5 py-3 transition-all"
                >
                  {sending ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : sent ? (
                    <><CheckCircle2 size={18} /> Terkirim!</>
                  ) : (
                    <><Send size={16} /> Kirim Masukan</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}