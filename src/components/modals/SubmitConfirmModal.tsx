import { Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function SubmitConfirmModal({ isOpen, onClose, onConfirm }: SubmitConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="bg-bg border border-border rounded-3xl p-6 md:p-8 max-w-sm w-full relative z-10 shadow-2xl">
        <div className="w-16 h-16 bg-success/10 text-success rounded-2xl flex items-center justify-center mb-6 mx-auto border border-success/20">
          <Check size={32} />
        </div>
        <h2 className="text-xl font-black text-center text-fg mb-3">Kumpulkan Ujian?</h2>
        <p className="text-sm text-center text-fg-muted mb-8 leading-relaxed">
          Apakah Anda yakin ingin menyelesaikan kuis ini? Pastikan Anda sudah mengecek kembali seluruh jawaban Anda.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-locked-subtle hover:bg-locked-subtle text-fg rounded-xl"
          >
            Batal
          </Button>
          <Button
            variant="success"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl shadow-lg shadow-success/20 transition-all active:scale-95"
          >
            Ya, Kumpulkan
          </Button>
        </div>
      </div>
    </div>
  );
}
