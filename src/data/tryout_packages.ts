import type { Soal } from './soal_tryout';
import { MODE_COSTS } from '../lib/coins';

export interface TryOutPackage {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  /** 0 = free/unlocked by default; >0 = butuh purchased_packages */
  unlockCost: number;
  /** Biaya tiap attempt (koin). 0 jika free weekly / free package */
  attemptCost: number;
  /** true = tampil "Segera Hadir", tidak bisa mulai */
  isDevelopment: boolean;
  questions?: Soal[];
  /** @deprecated gunakan unlockCost */
  cost: number;
}

/**
 * Paket tryout statis (soal_tryout.paket_id).
 * Format: 30 TWK + 35 TIU + 45 TKP = 110, by created_at.
 *
 * Live: hanya paket 1 (QA). Paket 2–6 disembunyikan start (AI/batch jelek).
 * Model A: unlock 0, attempt 1000 koin / run.
 */
export const AVAILABLE_PACKAGES: TryOutPackage[] = [
  {
    id: 'paket_tryout_1',
    title: 'Paket Soal Tryout 1',
    description:
      'Simulasi 110 soal format BKN (30 TWK + 35 TIU + 45 TKP). Soal tetap tiap attempt. Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_2',
    title: 'Paket Soal Tryout 2',
    description: '110 soal tetap. Sedang direview kualitas soal sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_3',
    title: 'Paket Soal Tryout 3',
    description: '110 soal tetap. Sedang direview kualitas soal sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_4',
    title: 'Paket Soal Tryout 4',
    description: '110 soal tetap. Sedang direview kualitas soal sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_5',
    title: 'Paket Soal Tryout 5',
    description: '110 soal tetap. Sedang direview kualitas soal sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: true,
  },
  {
    id: 'paket_tryout_6',
    title: 'Paket Soal Tryout 6',
    description: '110 soal tetap. Sedang direview kualitas soal sebelum dibuka.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: true,
  },
];
