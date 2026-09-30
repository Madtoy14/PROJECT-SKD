import { HardHat, Wrench, Settings } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-info/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-md w-full bg-surface/80 backdrop-blur-xl border border-border rounded-[32px] p-8 shadow-2xl text-center">
        <div className="flex justify-center mb-6 relative">
          <div className="w-24 h-24 bg-warning/20 rounded-full flex items-center justify-center relative z-10">
            <HardHat size={48} className="text-warning drop-shadow-lg" />
          </div>
          <div className="absolute -top-2 -right-2 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center animate-[spin_4s_linear_infinite]">
            <Settings size={24} className="text-primary" />
          </div>
          <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-info/20 rounded-full flex items-center justify-center animate-[bounce_2s_ease-in-out_infinite]">
            <Wrench size={20} className="text-info" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-fg mb-3 tracking-tight">
          Sedang Perbaikan
        </h1>
        
        <div className="w-16 h-1.5 bg-gradient-to-r from-primary to-warning rounded-full mx-auto mb-6" />
        
        <p className="text-fg-muted font-medium mb-8 leading-relaxed">
          Kami sedang melakukan pemeliharaan server dan peningkatan fitur untuk memberikan pengalaman belajar terbaik bagi Anda. 
          <br /><br />
          Tunggu sebentar, kami akan segera kembali!
        </p>

        <div className="p-4 bg-surface-subtle border border-border rounded-xl">
          <p className="text-xs font-bold text-fg-muted uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center justify-center gap-2 text-warning font-bold">
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            Maintenance in progress
          </div>
        </div>
      </div>
    </div>
  );
}
