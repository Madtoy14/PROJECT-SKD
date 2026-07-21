import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isEnergyDeducted: boolean;
}

export function ExitConfirmModal({ isOpen, onClose, onConfirm, isEnergyDeducted }: ExitConfirmModalProps) {
  const modalRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
        data-backdrop
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
        className="bg-bg border border-border rounded-3xl p-6 md:p-8 max-w-sm w-full relative z-10 shadow-2xl outline-none"
        tabIndex={-1}
      >
        <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mb-6 mx-auto border border-danger/20">
          <X size={32} aria-hidden="true" />
        </div>
        <h2 id="exit-modal-title" className="text-xl font-black text-center text-fg mb-3">Yakin Ingin Keluar?</h2>
        <p className="text-sm text-center text-fg-muted mb-8 leading-relaxed">
          {!isEnergyDeducted
            ? "Kuis belum selesai. Jika Anda keluar sekarang, biaya permainan (energi/koin) Anda tidak akan terpotong."
            : "Kuis belum selesai. Anda sudah menjawab soal sehingga biaya permainan sudah terpotong. Progress tidak akan tersimpan!"}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-locked-subtle hover:bg-locked-subtle text-fg rounded-xl"
            autoFocus
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
          >
            Ya, Keluar
          </Button>
        </div>
      </div>
    </div>
  );
}
