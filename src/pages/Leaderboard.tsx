import { Trophy, Medal, Star } from 'lucide-react';

const LEADERBOARD_DATA = [
  { rank: 1, name: 'Budi Santoso', xp: 12450, isMe: false },
  { rank: 2, name: 'Siti Rahma', xp: 11200, isMe: false },
  { rank: 3, name: 'Agus Wijaya', xp: 10850, isMe: false },
  { rank: 4, name: 'Rina Melati', xp: 9500, isMe: false },
  { rank: 5, name: 'Dewi Lestari', xp: 8900, isMe: false },
  { rank: 14, name: 'UserCPNS2026', xp: 4200, isMe: true }, // Current User
];

export default function Leaderboard() {
  const getRankStyle = (rank: number) => {
    switch(rank) {
      case 1: return { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/50', icon: Trophy };
      case 2: return { bg: 'bg-gray-400/20', text: 'text-gray-600 dark:text-gray-300', border: 'border-gray-400/50', icon: Medal };
      case 3: return { bg: 'bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/50', icon: Medal };
      default: return { bg: 'bg-skd-muted/10', text: 'text-skd-muted', border: 'border-skd-border', icon: null };
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-4xl mx-auto pb-24">
      <header className="pt-2 md:pt-4 flex items-center justify-between border-b border-skd-border pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-skd-text">Liga Nasional</h1>
        <div className="bg-skd-card px-4 py-2 rounded-full border border-skd-border flex items-center gap-2 shadow-sm">
          <Star size={18} className="text-skd-premium fill-skd-premium" />
          <span className="font-space font-bold text-sm md:text-base text-skd-text">Musim 4</span>
        </div>
      </header>

      <div className="bg-gradient-to-br from-skd-card to-skd-bg p-5 md:p-8 rounded-[2rem] border border-skd-border shadow-lg md:shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-skd-premium/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="space-y-3 md:space-y-4 relative z-10">
          {LEADERBOARD_DATA.map((user, index) => {
            const style = getRankStyle(user.rank);
            const Icon = style.icon;
            
            return (
              <div key={user.rank}>
                {/* Show dots if there's a gap in ranks */}
                {index > 0 && user.rank - LEADERBOARD_DATA[index - 1].rank > 1 && (
                  <div className="flex justify-center py-3 text-skd-muted">
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-skd-muted/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-skd-muted/50" />
                      <div className="w-1.5 h-1.5 rounded-full bg-skd-muted/50" />
                    </div>
                  </div>
                )}
                
                <div 
                  className={`flex items-center gap-4 md:gap-6 p-4 md:p-5 rounded-2xl border transition-all shadow-sm
                    ${user.isMe ? 'bg-skd-premium/10 border-skd-premium/50 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : `bg-skd-card ${style.border}`}`}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-space font-bold text-lg md:text-xl shrink-0 ${style.bg} ${style.text}`}>
                    {user.rank <= 3 && Icon ? <Icon size={24} className="fill-current" /> : user.rank}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold md:text-lg truncate ${user.isMe ? 'text-skd-premium' : 'text-skd-text'}`}>
                      {user.name} 
                      {user.isMe && (
                        <span className="inline-block align-middle text-[10px] md:text-xs bg-skd-premium text-white px-2 py-0.5 rounded-full ml-2 font-medium">
                          You
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="text-right font-space font-bold text-base md:text-lg text-skd-text shrink-0">
                    {user.xp.toLocaleString()} <span className="text-[10px] md:text-xs text-skd-muted font-syne ml-1">XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
