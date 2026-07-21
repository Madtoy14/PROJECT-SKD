import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useDuelMatchmaking } from '../context/DuelContext';

const TIMEOUT_SECONDS = 30;

export default function IncomingDuelRequest() {
  const { incomingRequest, acceptInvite, rejectInvite } = useDuelMatchmaking();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(TIMEOUT_SECONDS);

  // Reset dan jalankan countdown setiap kali ada request baru
  useEffect(() => {
    if (!incomingRequest) {
      setCountdown(TIMEOUT_SECONDS);
      return;
    }

    setCountdown(TIMEOUT_SECONDS);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          rejectInvite(); // auto-tolak jika timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingRequest?.id]); // re-run hanya jika request ID berubah

  const handleAccept = () => {
    const roomId = 'R_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    acceptInvite(roomId);
    navigate('/quiz', {
      state: {
        mode: 'pvp1v1',
        opponent: incomingRequest?.senderName,
        roomId,
        isHost: false
      }
    });
  };

  const handleReject = () => {
    rejectInvite();
  };

  // Persentase countdown untuk progress ring
  const progressPct = (countdown / TIMEOUT_SECONDS) * 100;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPct / 100);
  const isUrgent = countdown <= 10;

  if (!incomingRequest) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-surface shadow-sm w-full max-w-sm rounded-[2rem] border-2 border-premium shadow-[0_0_50px_rgba(139,92,246,0.4)] overflow-hidden relative animate-[scale-in_0.3s_ease-out]">
        {/* Glow accents */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-premium/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-warning/15 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 relative z-10 flex flex-col items-center text-center">

          {/* Avatar + countdown ring */}
          <div className="relative mb-4">
            {/* SVG countdown ring */}
            <svg width="72" height="72" className="absolute inset-0 -rotate-90">
              {/* Track */}
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="4"
              />
              {/* Progress */}
              <circle
                cx="36" cy="36" r={radius}
                fill="none"
                stroke={isUrgent ? '#ef4444' : 'var(--color-premium)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            {/* Avatar */}
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-premium to-warning p-[3px] shadow-lg shadow-premium/30">
              <img
                src={incomingRequest.avatar}
                alt={incomingRequest.senderName}
                className="w-full h-full rounded-full bg-surface shadow-sm object-cover"
              />
            </div>
            {/* Countdown badge */}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-surface ${isUrgent ? 'bg-red-500 text-white' : 'bg-premium text-white'}`}>
              {countdown}
            </div>
          </div>

          {/* Teks tantangan */}
          <h2 className="text-lg font-black text-fg mb-1 leading-tight">
            <span className="text-warning">{incomingRequest.senderName}</span>
            <br />
            menantangmu PvP Battle!
          </h2>
          <p className="text-xs text-fg-muted mb-1 font-medium">Buktikan siapa yang terbaik sekarang juga.</p>

          {/* Countdown bar */}
          <div className="w-full bg-surface-muted rounded-full h-1.5 mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${isUrgent ? 'bg-red-500' : 'bg-premium'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Tombol aksi */}
          <div className="flex w-full gap-3">
            <button
              onClick={handleReject}
              className="flex-1 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold hover:bg-red-500 hover:text-white transition-colors text-sm active:scale-95"
            >
              Tolak
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-premium to-purple-500 text-white font-bold shadow-[0_0_20px_rgba(139,92,246,0.35)] flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
            >
              <Swords size={16} /> Terima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
