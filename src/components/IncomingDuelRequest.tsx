import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { useDuelMatchmaking } from '../context/DuelContext';

export default function IncomingDuelRequest() {
  const { incomingRequest, acceptInvite, rejectInvite } = useDuelMatchmaking();
  const navigate = useNavigate();

  const handleAccept = () => {
    const roomId = 'R_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    acceptInvite(roomId);
    navigate('/quiz', { state: { mode: 'pvp1v1', opponent: incomingRequest?.senderName, roomId: roomId, isHost: false } });
  };

  const handleReject = () => {
    rejectInvite();
  };

  return (
    <AnimatePresence>
      {incomingRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-[#1A1924] w-full max-w-sm rounded-[2rem] border-2 border-[#8B5CF6] shadow-[0_0_40px_rgba(139,92,246,0.5)] overflow-hidden relative"
          >
            {/* Glowing accents */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#8B5CF6]/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#F5A623]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="p-6 relative z-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#F5A623] p-1 mb-4 shadow-lg shadow-[#8B5CF6]/30">
                <img 
                  src={incomingRequest.avatar} 
                  alt={incomingRequest.senderName} 
                  className="w-full h-full rounded-full bg-[#1A1924] object-cover"
                />
              </div>

              <h2 className="text-xl font-black text-white mb-2 leading-tight">
                ðŸ”¥ <span className="text-[#F5A623]">{incomingRequest.senderName}</span> menantangmu PvP Battle!
              </h2>
              <p className="text-sm text-gray-400 mb-6 font-medium">Buktikan siapa yang terbaik sekarang juga.</p>

              <div className="flex w-full gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReject}
                  className="flex-1 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold hover:bg-red-500 hover:text-white transition-colors"
                >
                  Tolak
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAccept}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-purple-500 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2"
                >
                  <Swords size={18} /> Terima
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}