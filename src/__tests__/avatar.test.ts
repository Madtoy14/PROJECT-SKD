import { describe, it, expect } from 'vitest';
import { getAvatarUrl, buildAvailableCharacters, CHARACTER_ID_MAP } from '../lib/avatar';

describe('Avatar resolution utility', () => {
  const characters = buildAvailableCharacters([
    { id: 'ipdn_male', name: 'Pria - IPDN', gender: 'male', image_url: 'https://example.com/old1.png', is_free: true },
    { id: 'perhubungan_male', name: 'Pria - Kemenhub', gender: 'male', image_url: 'https://example.com/old2.png', is_free: true },
    { id: 'stan_male', name: 'Pria - PKN STAN', gender: 'male', image_url: 'https://example.com/old3.png', is_free: true },
    { id: 'stis_male', name: 'Pria - STIS', gender: 'male', image_url: 'https://example.com/old4.png', is_free: true },
    { id: 'stmkg_male', name: 'Pria - STMKG', gender: 'male', image_url: 'https://example.com/old5.png', is_free: true },
  ]);

  it('builds 10 characters mapped to storage avatar URLs 1-10', () => {
    expect(characters).toHaveLength(10);
    expect(characters[0].name).toBe('Avatar 1');
    expect(characters[0].image_url).toContain('1.png');
    expect(characters[3].name).toBe('Avatar 4');
    expect(characters[3].id).toBe('stis_male');
    expect(characters[3].image_url).toContain('4.png');
  });

  it('resolves avatar correctly for character id stis_male', () => {
    const url = getAvatarUrl('stis_male', characters);
    expect(url).toContain('4.png');
  });

  it('resolves avatar correctly by numeric string id', () => {
    const url = getAvatarUrl('4', characters);
    expect(url).toContain('4.png');
  });

  it('resolves avatar correctly by name "Avatar 4"', () => {
    const url = getAvatarUrl('Avatar 4', characters);
    expect(url).toContain('4.png');
  });

  it('falls back to Avatar 1 for empty or unknown avatar', () => {
    const urlEmpty = getAvatarUrl('', characters);
    expect(urlEmpty).toContain('1.png');

    const urlUnknown = getAvatarUrl('non_existent_avatar', characters);
    expect(urlUnknown).toContain('1.png');
  });

  it('resolves correctly even when characters array is not yet loaded', () => {
    const url = getAvatarUrl('stis_male', []);
    expect(url).toContain('4.png');
  });

  it('handles known character mappings correctly in CHARACTER_ID_MAP', () => {
    expect(CHARACTER_ID_MAP['ipdn_male']).toBe(1);
    expect(CHARACTER_ID_MAP['stis_male']).toBe(4);
    expect(CHARACTER_ID_MAP['stmkg_female']).toBe(10);
  });
});
