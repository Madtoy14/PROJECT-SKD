// Rank system inspired by Mobile Legends — simplified (no sub-ranks)
// Rank is determined by total accumulated score within the current season month

export interface RankTier {
  id: string;
  name: string;
  minScore: number;      // minimum season score to be in this tier
  color: string;         // gradient / color classes
  textColor: string;
  borderColor: string;
  glowColor: string;     // tailwind shadow/glow
  emoji: string;
  description: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    minScore: 0,
    color: 'from-zinc-500 to-zinc-600',
    textColor: 'text-zinc-300',
    borderColor: 'border-zinc-500/40',
    glowColor: 'shadow-zinc-500/20',
    emoji: '⚔️',
    description: 'Pejuang pemula yang baru memulai perjalanan.'
  },
  {
    id: 'elite',
    name: 'Elite',
    minScore: 300,
    color: 'from-green-600 to-emerald-500',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/40',
    glowColor: 'shadow-emerald-500/20',
    emoji: '🛡️',
    description: 'Sudah menguasai dasar-dasar SKD dengan baik.'
  },
  {
    id: 'master',
    name: 'Master',
    minScore: 800,
    color: 'from-blue-600 to-cyan-500',
    textColor: 'text-cyan-300',
    borderColor: 'border-cyan-500/40',
    glowColor: 'shadow-cyan-500/20',
    emoji: '🔷',
    description: 'Konsisten dan bisa diandalkan dalam setiap ujian.'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    minScore: 1800,
    color: 'from-violet-600 to-purple-500',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-500/40',
    glowColor: 'shadow-purple-500/30',
    emoji: '💎',
    description: 'Kemampuan yang hampir sempurna di atas rata-rata.'
  },
  {
    id: 'epic',
    name: 'Epic',
    minScore: 3500,
    color: 'from-orange-500 to-amber-400',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400/50',
    glowColor: 'shadow-amber-400/30',
    emoji: '🔥',
    description: 'Level berbahaya — kompetitor yang patut diwaspadai.'
  },
  {
    id: 'legend',
    name: 'Legend',
    minScore: 6000,
    color: 'from-red-500 to-rose-400',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-400/50',
    glowColor: 'shadow-rose-400/40',
    emoji: '🏆',
    description: 'Termasuk segelintir peserta terbaik di seluruh platform.'
  },
  {
    id: 'mythic',
    name: 'Mythic',
    minScore: 10000,
    color: 'from-skd-premium via-yellow-400 to-orange-400',
    textColor: 'text-yellow-300',
    borderColor: 'border-yellow-400/60',
    glowColor: 'shadow-yellow-400/50',
    emoji: '👑',
    description: 'Calon abdi negara terbaik. Hampir tidak ada yang mencapai level ini.'
  },
];

// Get the rank tier for a given score
export function getRankForScore(score: number): RankTier {
  let rank = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (score >= tier.minScore) rank = tier;
    else break;
  }
  return rank;
}

// Get progress to next rank (0–100%)
export function getRankProgress(score: number): { progress: number; nextRank: RankTier | null; pointsNeeded: number } {
  const currentIndex = RANK_TIERS.findIndex(t => t.id === getRankForScore(score).id);
  const nextRank = RANK_TIERS[currentIndex + 1] ?? null;
  if (!nextRank) return { progress: 100, nextRank: null, pointsNeeded: 0 };

  const current = RANK_TIERS[currentIndex];
  const range = nextRank.minScore - current.minScore;
  const earned = score - current.minScore;
  const progress = Math.min(Math.floor((earned / range) * 100), 100);
  const pointsNeeded = nextRank.minScore - score;
  return { progress, nextRank, pointsNeeded };
}

// Season info: month/year string
export function getCurrentSeason(): string {
  const now = new Date();
  return now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}

// Season dates: start of month, end of month, days remaining
export function getSeasonDates(): { start: string; end: string; daysLeft: number; resetDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0); // last day of current month
  const nextMonthStart = new Date(year, month + 1, 1);

  const daysLeft = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const fmt = (d: Date) => d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    start: fmt(startOfMonth),
    end: fmt(endOfMonth),
    daysLeft: Math.max(daysLeft, 0),
    resetDate: fmt(nextMonthStart),
  };
}

