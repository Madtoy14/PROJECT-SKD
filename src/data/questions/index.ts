import twkData from './twk.json';
import tiuData from './tiu.json';
import tkpData from './tkp.json';

// ── Canonical runtime contract ───────────────────────────────────────────────
// Mirrors exactly the shape produced by fetchQuestionsFromSupabase in supabase.ts
export interface QuestionOption {
  id: string;   // "A" | "B" | "C" | "D" | "E"
  text: string;
  score: number;
}

export interface Question {
  id: string;
  category: 'TWK' | 'TIU' | 'TKP';
  sub: string;
  text: string;
  options: QuestionOption[];
  correct: string;   // option id, e.g. "A"
  explanation: string;
  xp_reward: number;
  coin_reward: number;
  /** Difficulty level from DB: 'mudah' | 'sedang' | 'sulit' */
  difficulty?: string;
}

// ── Exports ──────────────────────────────────────────────────────────────────
export const TWK: Question[] = twkData as Question[];
export const TIU: Question[] = tiuData as Question[];
export const TKP: Question[] = tkpData as Question[];

export const ALL_QUESTIONS: Question[] = [...TWK, ...TIU, ...TKP];

export const QUESTIONS_BY_CATEGORY: Record<string, Question[]> = { TWK, TIU, TKP };

// ── Fisher-Yates shuffle (unbiased, non-mutating) ────────────────────────────
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getRandomQuestions(
  kategori: 'TWK' | 'TIU' | 'TKP' | 'ALL',
  count?: number
): Question[] {
  const pool = kategori === 'ALL' ? ALL_QUESTIONS : (QUESTIONS_BY_CATEGORY[kategori] ?? []);
  const shuffled = fisherYates(pool);
  return count ? shuffled.slice(0, count) : shuffled;
}

// ── Integrity validator ───────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateQuestions(questions: Question[]): ValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  questions.forEach((q, idx) => {
    const ref = `[${idx}] id=${q.id}`;

    // Unique ID across all questions
    if (seenIds.has(q.id)) {
      errors.push(`${ref}: duplicate id`);
    }
    seenIds.add(q.id);

    // Required string fields
    for (const field of ['id', 'text', 'correct', 'explanation'] as const) {
      if (!q[field] || typeof q[field] !== 'string') {
        errors.push(`${ref}: missing or invalid field '${field}'`);
      }
    }

    // Category
    if (!['TWK', 'TIU', 'TKP'].includes(q.category)) {
      errors.push(`${ref}: invalid category '${q.category}'`);
    }

    // Exactly 5 options
    if (!Array.isArray(q.options) || q.options.length !== 5) {
      errors.push(`${ref}: must have exactly 5 options (found ${q.options?.length ?? 0})`);
    } else {
      q.options.forEach((opt, oi) => {
        if (!opt.id || !opt.text) {
          errors.push(`${ref} option[${oi}]: missing id or text`);
        }
        if (typeof opt.score !== 'number') {
          errors.push(`${ref} option[${oi}]: score must be a number`);
        }
        if (q.category === 'TKP' && (opt.score < 1 || opt.score > 5)) {
          errors.push(`${ref} option[${oi}]: TKP score must be 1-5 (got ${opt.score})`);
        }
      });

      // correct must match an option id
      const optionIds = q.options.map(o => o.id);
      if (!optionIds.includes(q.correct)) {
        errors.push(`${ref}: correct='${q.correct}' does not match any option id`);
      }
    }

    // Rewards
    if (typeof q.xp_reward !== 'number' || q.xp_reward < 0) {
      errors.push(`${ref}: xp_reward must be a non-negative number`);
    }
    if (typeof q.coin_reward !== 'number' || q.coin_reward < 0) {
      errors.push(`${ref}: coin_reward must be a non-negative number`);
    }
  });

  return { valid: errors.length === 0, errors };
}
