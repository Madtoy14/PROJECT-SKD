import { useState } from 'react';
import { X, Coins, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PACKAGES = [
  { id: 'pkg_50', coins: 50, price: 5000, label: 'Koin Pemula', discount: 0 },
  { id: 'pkg_200', coins: 200, price: 18000, label: 'Koin Favorit', discount: 10 },
  { id: 'pkg_500', coins: 500, price: 40000, label: 'Koin Sultan', discount: 20 },
];

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedPkg) return;
    setLoading(true);
    setError(null);

    const pkg = PACKAGES.find((p) => p.id === selectedPkg);
    if (!pkg) return;

    try {
      // Create request via RPC
      const { data, error: rpcError } = await supabase!.rpc('request_topup', {
        amount_val: pkg.coins,
        method_val: 'whatsapp'
      });

      if (rpcError) throw rpcError;

      const transactionId = data; // the UUID returned by RPC
      setSuccessId(transactionId);

      // Open WhatsApp automatically
      const waNumber = '6281234567890'; // Ganti dengan nomor Admin
      const text = `Halo Admin, saya ingin top-up koin aplikasi SKD.\n\n*ID Transaksi:* ${transactionId}\n*Paket:* ${pkg.coins} Koin\n*Total Tagihan:* Rp${pkg.price.toLocaleString('id-ID')}\n\nMohon instruksi pembayarannya.`;
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to request top-up:', err);
      setError(err.message || 'Gagal membuat permintaan top-up. Pastikan Anda sudah login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-syne">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-coin-subtle flex items-center justify-center">
              <Coins size={20} className="text-coin fill-yellow-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-fg leading-none">Top Up Koin</h3>
              <p className="text-xs text-fg-muted mt-1">Pilih paket koin Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-subtle text-fg-muted hover:bg-border hover:text-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {successId ? (
            <div className="flex flex-col items-center justify-center text-center py-6 gap-4">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center text-success mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-xl font-bold text-fg">Permintaan Berhasil!</h4>
              <p className="text-sm text-fg-muted mb-4 max-w-xs">
                ID Transaksi Anda: <br/>
                <span className="font-space font-bold text-fg select-all block mt-1 bg-surface-subtle px-2 py-1 rounded-lg border border-border">
                  {successId}
                </span>
              </p>
              <p className="text-xs text-fg-muted mb-4 max-w-xs">
                Lanjutkan percakapan di WhatsApp untuk menyelesaikan pembayaran. Koin akan ditambahkan oleh admin.
              </p>
              <Button onClick={onClose} className="w-full bg-surface-subtle text-fg hover:bg-border">
                Tutup
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl flex gap-2 text-danger text-sm items-start">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-3">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPkg === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg.id)}
                      className={`relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-md scale-[1.02]' 
                          : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-subtle'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-coin/10 flex items-center justify-center shrink-0">
                          <Coins size={24} className="text-coin fill-yellow-500 drop-shadow-sm" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-fg text-lg">{pkg.coins} Koin</span>
                            {pkg.discount > 0 && (
                              <span className="px-2 py-0.5 bg-danger text-white text-[10px] font-black uppercase rounded-md tracking-wider">
                                Hemat {pkg.discount}%
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-fg-muted">{pkg.label}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-space font-bold text-primary text-lg">
                          Rp{pkg.price.toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-2 border-surface">
                          <CheckCircle2 size={14} className="fill-primary text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!successId && (
          <div className="p-5 border-t border-border bg-surface-subtle">
            <Button
              disabled={!selectedPkg || loading}
              onClick={handleConfirm}
              className="w-full bg-success hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <MessageCircle size={20} className="fill-white/20" />
                  Konfirmasi via WhatsApp
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-fg-muted mt-3">
              Anda akan dialihkan ke WhatsApp untuk instruksi pembayaran. Transaksi diproses secara manual oleh Admin (1-5 menit).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
