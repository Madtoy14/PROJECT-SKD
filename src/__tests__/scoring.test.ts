import { describe, it, expect } from 'vitest';

// ── Scoring logic (salinan dari server-side RPC untuk test) ──
function computeScore(
  questions: { category: string; correct: string; options: { id: string; score: number }[] }[],
  answers: Record<string, string>,
) {
  let total = 0;
  let twk = 0, tiu = 0, tkp = 0;
  let twkCount = 0, tiuCount = 0, tkpCount = 0;

  questions.forEach((q, idx) => {
    const userAnswer = answers[String(idx)];
    if (!userAnswer) return;

    const option = q.options.find(o => o.id === userAnswer);
    const score = option?.score ?? 0;

    total += score;
    if (q.category === 'TWK') { twk += score; twkCount++; }
    else if (q.category === 'TIU') { tiu += score; tiuCount++; }
    else if (q.category === 'TKP') { tkp += score; tkpCount++; }
  });

  const maxScore = (twkCount + tiuCount) * 5 + tkpCount * 50;
  const accuracy = maxScore > 0 ? Math.round((total / maxScore) * 1000) / 10 : 0;

  return { total, twk, tiu, tkp, accuracy };
}

function computePassing(score: number, count: number, category: 'TWK' | 'TIU' | 'TKP'): boolean {
  if (count === 0) return true;
  if (category === 'TWK') return score >= (count < 30 ? Math.ceil(count * 0.433 * 5) : 65);
  if (category === 'TIU') return score >= (count < 35 ? Math.ceil(count * 0.457 * 5) : 80);
  return score >= (count < 45 ? Math.ceil(count * 0.293 * 5) : 166);
}

function computeCoins(score: number): number {
  return Math.min(score * 2, 500);
}

function computeXp(score: number): number {
  return Math.min(score, 100);
}

// ── Sample questions ──
const twkQuestions = [
  { category: 'TWK', correct: 'B', options: [{ id: 'A', score: 0 }, { id: 'B', score: 5 }, { id: 'C', score: 0 }, { id: 'D', score: 0 }, { id: 'E', score: 0 }] },
  { category: 'TWK', correct: 'A', options: [{ id: 'A', score: 5 }, { id: 'B', score: 0 }, { id: 'C', score: 0 }, { id: 'D', score: 0 }, { id: 'E', score: 0 }] },
  { category: 'TWK', correct: 'D', options: [{ id: 'A', score: 0 }, { id: 'B', score: 0 }, { id: 'C', score: 0 }, { id: 'D', score: 5 }, { id: 'E', score: 0 }] },
];

const tiuQuestions = [
  { category: 'TIU', correct: 'C', options: [{ id: 'A', score: 0 }, { id: 'B', score: 0 }, { id: 'C', score: 5 }, { id: 'D', score: 0 }, { id: 'E', score: 0 }] },
];

const tkpQuestions = [
  { category: 'TKP', correct: 'E', options: [{ id: 'A', score: 10 }, { id: 'B', score: 20 }, { id: 'C', score: 30 }, { id: 'D', score: 40 }, { id: 'E', score: 50 }] },
];

// ── Tests ──
describe('Scoring logic', () => {
  it('calculates perfect score for all TWK correct', () => {
    const result = computeScore(twkQuestions, { '0': 'B', '1': 'A', '2': 'D' });
    expect(result.total).toBe(15);
    expect(result.twk).toBe(15);
    expect(result.tiu).toBe(0);
    expect(result.tkp).toBe(0);
  });

  it('calculates mixed categories', () => {
    const all = [...twkQuestions, ...tiuQuestions, ...tkpQuestions];
    const result = computeScore(all, { '0': 'B', '1': 'A', '2': 'D', '3': 'C', '4': 'E' });
    expect(result.total).toBe(70); // 15 TWK + 5 TIU + 50 TKP
    expect(result.twk).toBe(15);
    expect(result.tiu).toBe(5);
    expect(result.tkp).toBe(50);
  });

  it('returns zero for wrong answers', () => {
    const result = computeScore(twkQuestions, { '0': 'A', '1': 'C', '2': 'E' });
    expect(result.total).toBe(0);
  });

  it('handles partial answers', () => {
    const result = computeScore(twkQuestions, { '0': 'B', '2': 'D' });
    expect(result.total).toBe(10);
  });

  it('accuracy is 100% for perfect score', () => {
    const result = computeScore(twkQuestions, { '0': 'B', '1': 'A', '2': 'D' });
    expect(result.accuracy).toBe(100);
  });
});

describe('Passing grade logic', () => {
  it('TWK passes with score >= threshold', () => {
    expect(computePassing(65, 30, 'TWK')).toBe(true);
    expect(computePassing(64, 30, 'TWK')).toBe(false);
  });

  it('TIU passes with score >= 80 for 35 questions', () => {
    expect(computePassing(80, 35, 'TIU')).toBe(true);
    expect(computePassing(79, 35, 'TIU')).toBe(false);
  });

  it('TKP passes with score >= 166 for 45 questions', () => {
    expect(computePassing(166, 45, 'TKP')).toBe(true);
    expect(computePassing(165, 45, 'TKP')).toBe(false);
  });

  it('returns true when count is 0', () => {
    expect(computePassing(0, 0, 'TIU')).toBe(true);
  });
});

describe('Reward logic', () => {
  it('coins capped at 500', () => {
    expect(computeCoins(250)).toBe(500);
    expect(computeCoins(300)).toBe(500);
  });

  it('coins scale with score', () => {
    expect(computeCoins(50)).toBe(100);
    expect(computeCoins(100)).toBe(200);
  });

  it('XP capped at 100', () => {
    expect(computeXp(150)).toBe(100);
    expect(computeXp(50)).toBe(50);
  });

  it('zero score yields zero rewards', () => {
    expect(computeCoins(0)).toBe(0);
    expect(computeXp(0)).toBe(0);
  });
});
