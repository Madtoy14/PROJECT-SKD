import type { Soal } from './soal_tryout';
import { MODE_COSTS } from '../lib/coins';

export interface TryOutPackage {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  /** Biaya beli 1× (permanen). 0 = gratis. */
  unlockCost: number;
  /** Selalu 0 di model B (sekali beli = bebas attempt). */
  attemptCost: number;
  /** true = Segera Hadir */
  isDevelopment: boolean;
  questions?: Soal[];
  /** @deprecated mirror unlockCost */
  cost: number;
}

/**
 * Model B: sekali purchase (unlockCost) = akses permanen, attempt gratis.
 * Soal statis di DB: paket_tryout_N (30 TWK + 35 TIU + 45 TKP).
 * Live: 1–2. 3–6 review.
 */
const unlock = MODE_COSTS.tryout_coins; // 1000

export const AVAILABLE_PACKAGES: TryOutPackage[] = [
  {
    id: 'paket_tryout_1',
    title: 'Paket Soal Tryout 1',
    description:
      '110 soal format BKN (30 TWK + 35 TIU + 45 TKP). Beli 1× → main kapan saja tanpa biaya attempt.',
    totalQuestions: 110,
    unlockCost: unlock,
    attemptCost: 0,
    cost: unlock,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_2',
    title: 'Paket Soal Tryout 2',
    description:
      '110 soal format BKN (30 TWK + 35 TIU + 45 TKP). Beli 1× → main kapan saja tanpa biaya attempt.',
    totalQuestions: 110,
    unlockCost: unlock,
    attemptCost: 0,
    cost: unlock,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_3',
    title: 'Paket Soal Tryout 3',
    description: '110 soal tetap. Sedang direview kualitas sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: unlock,
    attemptCost: 0,
    cost: unlock,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_4',
    title: 'Paket Soal Tryout 4',
    description: '110 soal tetap. Sedang direview kualitas sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: unlock,
    attemptCost: 0,
    cost: unlock,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_5',
    title: 'Paket Soal Tryout 5',
    description: '110 soal tetap. Sedang direview kualitas sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: unlock,
    attemptCost: 0,
    cost: unlock,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_6',
    title: 'Paket Soal Tryout 6',
    description: '110 soal tetap. Sedang direview kualitas sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: unlock,
    attemptCost: 0,
    cost: unlock,
    isDevelopment: true,
  },
];
