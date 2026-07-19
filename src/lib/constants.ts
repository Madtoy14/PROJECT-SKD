export const DICEBEAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg';

export const dicebearUrl = (seed: string) =>
  `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
