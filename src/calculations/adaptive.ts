/**
 * Adaptive Difficulty Engine — Client-side ELO-lite
 * 
 * Tracks user skill rating per kategori (TWK/TIU/TKP) in localStorage.
 * Adjusts question difficulty based on cumulative performance.
 * 
 * Algorithm:
 *   Correct → rating +50 (show harder questions)
 *   Wrong   → rating -30 (show easier questions)
 *   Initial rating: 1000 (mid-range)
 * 
 * Difficulty mapping:
 *   mudah  → ratingTarget: 800
 *   sedang → ratingTarget: 1000
 *   sulit  → ratingTarget: 1200
 */

const STORAGE_KEY = 'skdquest_adaptive_ratings';

export interface AdaptiveRatings {
  TWK: number;
  TIU: number;
  TKP: number;
}

const DEFAULT_RATINGS: AdaptiveRatings = { TWK: 1000, TIU: 1000, TKP: 1000 };

/** Load ratings from localStorage */
export function loadRatings(): AdaptiveRatings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RATINGS };
    const parsed = JSON.parse(raw);
    return {
      TWK: parsed.TWK ?? DEFAULT_RATINGS.TWK,
      TIU: parsed.TIU ?? DEFAULT_RATINGS.TIU,
      TKP: parsed.TKP ?? DEFAULT_RATINGS.TKP,
    };
  } catch {
    return { ...DEFAULT_RATINGS };
  }
}

/** Save ratings to localStorage */
export function saveRatings(ratings: AdaptiveRatings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
  } catch {
    // silently fail — localStorage might be full or disabled
  }
}

/**
 * Update rating after answering a question.
 * @param category - 'TWK', 'TIU', or 'TKP'
 * @param correct - whether the answer was correct
 * @param kFactor - how much rating changes (default: 50 on correct, 30 on wrong)
 */
export function updateRating(
  category: 'TWK' | 'TIU' | 'TKP',
  correct: boolean,
  kFactor: { correct: number; wrong: number } = { correct: 50, wrong: 30 }
): AdaptiveRatings {
  const ratings = loadRatings();
  const delta = correct ? kFactor.correct : -kFactor.wrong;
  ratings[category] = Math.max(400, Math.min(1600, ratings[category] + delta));
  saveRatings(ratings);
  return ratings;
}

/**
 * Difficulty score mapping — used for sorting questions by proximity to user rating.
 * Lower = closer to user's skill level.
 */
const DIFFICULTY_RATING: Record<string, number> = {
  mudah: 800,
  sedang: 1000,
  sulit: 1200,
};

/**
 * Sort questions by adaptive difficulty — closest to user's rating first.
 * Used client-side after fetching from DB.
 * @param questions - array of questions with optional `difficulty` field
 * @param category - which category's rating to use
 */
export function sortByAdaptiveDifficulty(
  questions: { difficulty?: string }[],
  category: 'TWK' | 'TIU' | 'TKP'
): typeof questions {
  const ratings = loadRatings();
  const userRating = ratings[category];

  return [...questions].sort((a, b) => {
    const aDiff = DIFFICULTY_RATING[a.difficulty || 'sedang'] ?? 1000;
    const bDiff = DIFFICULTY_RATING[b.difficulty || 'sedang'] ?? 1000;
    return Math.abs(aDiff - userRating) - Math.abs(bDiff - userRating);
  });
}

/**
 * Get a human-readable label for current user rating in a category.
 */
export function getRatingLabel(category: 'TWK' | 'TIU' | 'TKP'): string {
  const ratings = loadRatings();
  const r = ratings[category];
  if (r >= 1300) return '🏆 Mahir';
  if (r >= 1100) return '⭐ Menengah Atas';
  if (r >= 900) return '📘 Menengah';
  if (r >= 700) return '📗 Pemula';
  return '🌱 Baru Mulai';
}

/**
 * Get difficulty color for UI badge.
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'mudah': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'sulit': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
}