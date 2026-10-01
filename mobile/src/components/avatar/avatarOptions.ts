export type HairStyle = 'fade' | 'afro' | 'braids' | 'locs' | 'cornrows' | 'headwrap';
export type Outfit = 'tee' | 'hoodie' | 'ankara' | 'agbada';

export type AvatarConfig = {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  outfit: Outfit;
  c1: string; // main outfit colour (headwrap band)
  c2: string; // accent colour (ankara dots, agbada panel, gele)
};

export const skinTones = ['#F1C8A4', '#D9A07A', '#B5784F', '#8D5A3B', '#6B4226', '#4A2C1A'];

export const hairStyles: { id: HairStyle; label: string }[] = [
  { id: 'fade', label: 'Fade' },
  { id: 'afro', label: 'Afro' },
  { id: 'braids', label: 'Braids' },
  { id: 'locs', label: 'Locs' },
  { id: 'cornrows', label: 'Cornrows' },
  { id: 'headwrap', label: 'Gele' },
];

export const hairColors = ['#1B1110', '#3A2420', '#6B3A22', '#A0522D', '#C9A25A'];

export const outfits: { id: Outfit; label: string; c1: string; c2: string }[] = [
  { id: 'tee', label: 'Tee', c1: '#FF7A66', c2: '#E9B44C' },
  { id: 'hoodie', label: 'Hoodie', c1: '#7A2A52', c2: '#5A1838' },
  { id: 'ankara', label: 'Ankara', c1: '#FF7A66', c2: '#E9B44C' },
  { id: 'agbada', label: 'Agbada', c1: '#F2E4CF', c2: '#C9A25A' },
];

export const outfitColors = ['#FF7A66', '#5A1838', '#E9B44C', '#7A2A52', '#F2E4CF', '#2A0B1C', '#FFB3A6'];

export const defaultAvatar: AvatarConfig = {
  skin: '#8D5A3B',
  hair: 'braids',
  hairColor: '#1B1110',
  outfit: 'ankara',
  c1: '#FF7A66',
  c2: '#E9B44C',
};

/** Fill in any missing fields (avatar_config is stored as free-form JSON). */
export function normalizeAvatar(raw: unknown): AvatarConfig {
  const a = (raw && typeof raw === 'object' ? raw : {}) as Partial<AvatarConfig>;
  return {
    skin: typeof a.skin === 'string' ? a.skin : defaultAvatar.skin,
    hair: hairStyles.some((h) => h.id === a.hair) ? (a.hair as HairStyle) : defaultAvatar.hair,
    hairColor: typeof a.hairColor === 'string' ? a.hairColor : defaultAvatar.hairColor,
    outfit: outfits.some((o) => o.id === a.outfit) ? (a.outfit as Outfit) : defaultAvatar.outfit,
    c1: typeof a.c1 === 'string' ? a.c1 : defaultAvatar.c1,
    c2: typeof a.c2 === 'string' ? a.c2 : defaultAvatar.c2,
  };
}
