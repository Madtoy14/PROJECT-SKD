import { supabase } from './supabase';
import type { Character } from './supabase';

export const CHARACTER_ID_MAP: Record<string, number> = {
  ipdn_male: 1,
  perhubungan_male: 2,
  stan_male: 3,
  stis_male: 4,
  stmkg_male: 5,
  ipdn_female: 6,
  perhubungan_female: 7,
  stan_female: 8,
  stis_female: 9,
  stmkg_female: 10,
  // School abbreviations fallback
  ipdn: 1,
  perhubungan: 2,
  kemenhub: 2,
  stan: 3,
  stis: 4,
  stmkg: 5,
};

/**
 * Returns the public URL for an avatar image (1.png - 10.png) in the 'avatars' storage bucket.
 */
export const getStorageAvatarUrl = (num: number | string): string => {
  if (!supabase) return '';
  return supabase.storage.from('avatars').getPublicUrl(`${num}.png`).data.publicUrl || '';
};

/**
 * Generates the standardized 10 animal avatars mapped from characters table or defaults.
 */
export const buildAvailableCharacters = (rawChars: Character[] = []): Character[] => {
  return Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    const existingChar = rawChars[i];
    return {
      id: existingChar ? existingChar.id : String(num),
      name: `Avatar ${num}`,
      gender: existingChar?.gender ?? (num <= 5 ? 'male' : 'female'),
      image_url: getStorageAvatarUrl(num),
      is_free: existingChar ? existingChar.is_free : num === 1,
    };
  });
};

/**
 * Resolves an avatar URL consistently across Home/Dashboard, Profile, and Modals.
 * Matches by character ID (e.g. 'stis_male'), number (e.g. '4'), or name (e.g. 'Avatar 4').
 * Falls back to Avatar 1 (1.png) or the provided fallback URL.
 */
export const getAvatarUrl = (
  avatarId?: string | null,
  chars?: Character[],
  fallbackUrl?: string
): string => {
  if (!avatarId) {
    return getStorageAvatarUrl(1) || fallbackUrl || '';
  }

  const clean = String(avatarId).trim().toLowerCase();

  // 1. Direct match in provided characters list
  if (chars && chars.length > 0) {
    const matched = chars.find(
      (c, idx) =>
        c.id.toLowerCase() === clean ||
        c.name.toLowerCase() === clean ||
        String(idx + 1) === clean
    );
    if (matched?.image_url) return matched.image_url;
  }

  // 2. Direct map in CHARACTER_ID_MAP (e.g. 'stis_male' -> 4)
  if (CHARACTER_ID_MAP[clean]) {
    return getStorageAvatarUrl(CHARACTER_ID_MAP[clean]);
  }

  // 3. Numeric string '1' to '10' or 'avatar 1' to 'avatar 10'
  const parsedNum = parseInt(clean.replace(/^avatar\s*/i, ''), 10);
  if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 10) {
    return getStorageAvatarUrl(parsedNum);
  }

  // 4. If chars available, fallback to chars[0]
  if (chars && chars.length > 0 && chars[0]?.image_url) {
    return chars[0].image_url;
  }

  // 5. Default to Avatar 1
  const defaultUrl = getStorageAvatarUrl(1);
  return defaultUrl || fallbackUrl || '';
};
