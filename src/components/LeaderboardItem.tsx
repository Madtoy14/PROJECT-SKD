import React from 'react';
import { motion } from 'framer-motion';
import { getRankForScore } from '../data/ranks';

interface LeaderboardItemProps {
  player: {
    id: string;
    rank: number;
    name: string;
    xp: number;
    isMe?: boolean;
  };
  index: number;
  onClick: () => void;
  variants: any;
}

const LeaderboardItem = React.memo(function LeaderboardItem({ 
  player, 
  index, 
  onClick,
  variants 
}: LeaderboardItemProps) {
  const tier = getRankForScore(player.xp);
  const medal = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : null;

  return (
    <motion.div
      variants={variants}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors cursor-pointer
        ${player.isMe
          ? `bg-gradient-to-r ${tier.color}/10 ${tier.borderColor} shadow-md`
          : 'bg-surface border-border hover:bg-surface-subtle'}`}
    >
      {/* Position */}
      <div className={`w-7 text-center font-black text-base shrink-0
        ${index === 0 ? 'text-coin' : index === 1 ? 'text-fg-muted' : index === 2 ? 'text-amber-600' : 'text-fg-muted'}`}>
        {medal ?? `#${player.rank}`}
      </div>

      {/* Rank icon */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
        {tier.emoji}
      </div>

      {/* Name + rank */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${player.isMe ? tier.textColor : 'text-fg'}`}>
          {player.name}{player.isMe && ' 👤'}
        </p>
        <p className={`text-[10px] font-bold ${tier.textColor}`}>{tier.name}</p>
      </div>

      {/* XP */}
      <div className="text-right shrink-0">
        <p className="text-sm font-black font-space text-fg">{player.xp.toLocaleString()}</p>
        <p className="text-[9px] text-fg-muted">XP</p>
      </div>
    </motion.div>
  );
});

export default LeaderboardItem;
