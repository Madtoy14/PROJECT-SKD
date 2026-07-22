import type { Soal } from './soal_tryout';
import { MODE_COSTS, PREMIUM_PACKAGE_COSTS } from '../lib/coins';

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
 * Katalog tryout.
 * - unlockCost: beli 1x di toko / lewat purchased_packages (permanen)
 * - attemptCost: biaya tiap mulai tryout (default 1000 koin)
 * Harga unlock harus selaras Shop + purchase_item SQL.
 */
export const AVAILABLE_PACKAGES: TryOutPackage[] = [
  {
    id: 'paket_tryout_standar',
    title: 'Try Out Standar BKN',
    description: 'Simulasi 110 soal format CAT BKN. Selalu terbuka. Tiap mulai = 1.000 koin (attempt), bukan unlock sekali seumur hidup.',
    totalQuestions: 110,
    unlockCost: 0, // selalu bisa dimainkan (bayar attempt)
    attemptCost: MODE_COSTS.tryout_coins, // 1000
    cost: 0,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_akbar_1',
    title: 'Try Out Akbar CPNS #1',
    description: 'Unlock permanen 1× (pembahasan). Tiap mulai tetap bayar 1.500 koin / attempt.',
    totalQuestions: 110,
    unlockCost: PREMIUM_PACKAGE_COSTS.paket_tryout_akbar, // 1000
    attemptCost: MODE_COSTS.tryout_akbar_coins, // 1500
    cost: PREMIUM_PACKAGE_COSTS.paket_tryout_akbar,
    isDevelopment: false,
  },
  {
    id: 'paket_tryout_akbar_2',
    title: 'Try Out Akbar CPNS #2',
    description: 'Pembahasan lengkap Try Out Akbar CAT serentak peringkat nasional 2.',
    totalQuestions: 110,
    unlockCost: PREMIUM_PACKAGE_COSTS.paket_tryout_akbar,
    attemptCost: MODE_COSTS.tryout_akbar_coins,
    cost: PREMIUM_PACKAGE_COSTS.paket_tryout_akbar,
    isDevelopment: true,
  },
  {
    id: 'paket_premium_tkp_1',
    title: 'Paket Soal Rahasia TKP 1',
    description: 'Pembahasan 100 soal TKP HOTS. Unlock permanen.',
    totalQuestions: 100,
    unlockCost: PREMIUM_PACKAGE_COSTS.paket_topik,
    attemptCost: 0,
    cost: PREMIUM_PACKAGE_COSTS.paket_topik,
    isDevelopment: true,
  },
  {
    id: 'paket_premium_tiu_1',
    title: 'Trik TIU Numerik 1',
    description: 'Pembahasan trik TIU numerik. Unlock permanen.',
    totalQuestions: 100,
    unlockCost: PREMIUM_PACKAGE_COSTS.paket_topik,
    attemptCost: 0,
    cost: PREMIUM_PACKAGE_COSTS.paket_topik,
    isDevelopment: true,
  },
  {
    id: 'paket_premium_twk_1',
    title: 'Hafalan UUD TWK 1',
    description: 'Pembahasan TWK mendalam. Unlock permanen.',
    totalQuestions: 100,
    unlockCost: PREMIUM_PACKAGE_COSTS.paket_topik,
    attemptCost: 0,
    cost: PREMIUM_PACKAGE_COSTS.paket_topik,
    isDevelopment: true,
  },
  {
    id: 'paket_spesialis_bumn',
    title: 'Simulasi Khusus BUMN',
    description: 'Materi TKD & Core Values Akhlak. Unlock permanen.',
    totalQuestions: 100,
    unlockCost: PREMIUM_PACKAGE_COSTS.paket_spesialis,
    attemptCost: 0,
    cost: PREMIUM_PACKAGE_COSTS.paket_spesialis,
    isDevelopment: true,
  },
];
