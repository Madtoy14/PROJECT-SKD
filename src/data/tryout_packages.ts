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
  isDevelopment: boolean;
  questions?: Soal[];
  /** @deprecated gunakan unlockCost; tetap ada biar UI lama tidak pecah */
  cost: number;
}

/**
 * Paket tryout statis di DB (soal_tryout.paket_id).
 * Isi soal di-assign by created_at: TWK 30 + TIU 35 + TKP 45 = 110.
 * ID harus match kolom paket_id setelah reassign-tryout-packages-v2.sql
 *
 * Model A: unlockCost 0 (selalu bisa mulai), attemptCost per run.
 */
export const AVAILABLE_PACKAGES: TryOutPackage[] = [
  {
    id: 'paket_tryout_1',
    title: 'Paket Soal Tryout 1',
    description: '110 soal tetap (30 TWK + 35 TIU + 45 TKP), urut by timestamp masuk. Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_2',
    title: 'Paket Soal Tryout 2',
    description: '110 soal tetap (30 TWK + 35 TIU + 45 TKP). Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_3',
    title: 'Paket Soal Tryout 3',
    description: '110 soal tetap (30 TWK + 35 TIU + 45 TKP). Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_4',
    title: 'Paket Soal Tryout 4',
    description: '110 soal tetap (30 TWK + 35 TIU + 45 TKP). Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_5',
    title: 'Paket Soal Tryout 5',
    description: '110 soal tetap (30 TWK + 35 TIU + 45 TKP). Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_6',
    title: 'Paket Soal Tryout 6',
    description: '110 soal tetap (30 TWK + 35 TIU + 45 TKP). Entry 1.000 koin / attempt.',
    totalQuestions: 110,
    unlockCost: 0,
    attemptCost: MODE_COSTS.tryout_coins,
    cost: 0,
    isDevelopment: false,
  },
];
