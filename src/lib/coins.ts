// Canonical economy — single source of truth (FE display)
// Server catalogs in purchase_item/sell_item MUST stay in sync.
// 1 koin = Rp10

export const COIN_RATE = {
  base: 10, // 1 koin = Rp10
} as const;

/** Top-up packages for Mayar later (server must re-validate by package_id) */
export const PACKAGES = [
  { id: 'pkg_500',   coins: 500,   price: 5000,  label: 'Koin Pemula',  bonus_pct: 0  },
  { id: 'pkg_1300',  coins: 1300,  price: 10000, label: 'Koin Hemat',   bonus_pct: 8  }, // base 1000 + bonus visual
  { id: 'pkg_4000',  coins: 4000,  price: 25000, label: 'Koin Favorit', bonus_pct: 20 },
  { id: 'pkg_10000', coins: 10000, price: 50000, label: 'Koin Sultan',  bonus_pct: 25 },
] as const;

export type PackageId = typeof PACKAGES[number]['id'];

export const idrToCoins = (idr: number): number => Math.floor(idr / COIN_RATE.base);
export const coinsToIdr = (coins: number): number => coins * COIN_RATE.base;

/** Mode entry costs (display; server should enforce later) */
export const MODE_COSTS = {
  latihan_energy: 2,
  survival_energy: 3,
  pvp_energy: 3,
  tryout_coins: 1000, // Rp10.000
  tryout_akbar_coins: 1500, // Rp15.000
} as const;

/** Shop power-up prices (display; purchase_item SQL is authority) */
export const POWERUP_COSTS = {
  item_hint: 40,
  item_5050: 60,
  item_waktu_beku: 70,
  item_skor_ganda: 90,
  item_terawangan: 100,
  item_shield: 120,
  item_streak_protector: 120,
  item_energy_refill: 80,
  item_kesempatan_kedua: 160,
  item_tinta_hitam: 100,
  item_lompatan_kilat: 180,
} as const;

/** Premium content unlock (permanent) */
export const PREMIUM_PACKAGE_COSTS = {
  paket_topik: 700,
  paket_topik_lanjutan: 900,
  paket_tryout_akbar: 1000,
  paket_spesialis: 1500,
} as const;

export const SELL_BACK_RATE = 0.45; // 45% of buy price
