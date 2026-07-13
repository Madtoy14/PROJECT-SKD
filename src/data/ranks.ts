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
    color: 'from-zinc-100 to-zinc-200',
    textColor: 'text-zinc-700',
    borderColor: 'border-zinc-300',
    glowColor: 'shadow-zinc-200',
    emoji: '⚔️',
    description: 'Pejuang pemula yang baru memulai perjalanan.'
  },
  {
    id: 'elite',
    name: 'Elite',
    minScore: 300,
    color: 'from-green-100 to-green-200',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    glowColor: 'shadow-green-200',
    emoji: '🛡️',
    description: 'Sudah menguasai dasar-dasar SKD dengan baik.'
  },
  {
    id: 'master',
    name: 'Master',
    minScore: 800,
    color: 'from-blue-100 to-blue-200',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    glowColor: 'shadow-blue-200',
    emoji: '🔷',
    description: 'Konsisten dan bisa diandalkan dalam setiap ujian.'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    minScore: 1800,
    color: 'from-purple-100 to-purple-200',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    glowColor: 'shadow-purple-200',
    emoji: '💎',
    description: 'Kemampuan yang hampir sempurna di atas rata-rata.'
  },
  {
    id: 'epic',
    name: 'Epic',
    minScore: 3500,
    color: 'from-orange-100 to-orange-200',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    glowColor: 'shadow-orange-200',
    emoji: '🔥',
    description: 'Level berbahaya — kompetitor yang patut diwaspadai.'
  },
  {
    id: 'legend',
    name: 'Legend',
    minScore: 6000,
    color: 'from-red-100 to-red-200',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    glowColor: 'shadow-red-200',
    emoji: '🏆',
    description: 'Termasuk segelintir peserta terbaik di seluruh platform.'
  },
  {
    id: 'mythic',
    name: 'Mythic',
    minScore: 10000,
    color: 'from-yellow-100 to-orange-100',
    textColor: 'text-premium',
    borderColor: 'border-premium/50',
    glowColor: 'shadow-yellow-200',
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

