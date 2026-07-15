import twkQuestions from './twk.json';
import tiuQuestions from './tiu.json';
import tkpQuestions from './tkp.json';

export interface Question {
  id: string;
  kategori: 'TWK' | 'TIU' | 'TKP';
  sub: string;
  tanya: string;
  opsi: string[];
  kunci: number;
  pembahasan: string;
  xp: number;
  coin: number;
}

export const TWK: Question[] = twkQuestions as Question[];
export const TIU: Question[] = tiuQuestions as Question[];
export const TKP: Question[] = tkpQuestions as Question[];

/** All questions combined, TWK → TIU → TKP order */
export const ALL_QUESTIONS: Question[] = [...TWK, ...TIU, ...TKP];

/** Lookup by category string */
export const QUESTIONS_BY_CATEGORY: Record<string, Question[]> = {
  TWK,
  TIU,
  TKP,
};

/** Get a random subset of n questions from a given category */
export function getRandomQuestions(kategori: 'TWK' | 'TIU' | 'TKP' | 'ALL', count?: number): Question[] {
  const pool = kategori === 'ALL' ? ALL_QUESTIONS : QUESTIONS_BY_CATEGORY[kategori] ?? [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return count ? shuffled.slice(0, count) : shuffled;
}
