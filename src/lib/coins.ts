// SH-04: Canonical coin rate — single source of truth
// ponytail: payment gateway integration akan pakai COIN_RATE.packages untuk verify amount

export const COIN_RATE = {
  base: 100, // 1 koin = Rp100
} as const;

export const PACKAGES = [
  { id: 'pkg_50',   coins: 50,   price: 5000,   label: 'Koin Pemula',  bonus_pct: 0  },
  { id: 'pkg_200',  coins: 200,  price: 18000,  label: 'Koin Favorit', bonus_pct: 10 },
  { id: 'pkg_500',  coins: 500,  price: 40000,  label: 'Koin Sultan',  bonus_pct: 20 },
  { id: 'pkg_1500', coins: 1500, price: 110000, label: 'Koin Mega',    bonus_pct: 27 },
] as const;

export type PackageId = typeof PACKAGES[number]['id'];

export const idrToCoins = (idr: number): number => Math.floor(idr / COIN_RATE.base);
export const coinsToIdr = (coins: number): number => coins * COIN_RATE.base;
