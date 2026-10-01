// Design tokens from the Twofold design ("Direction 1a · Velvet").
// Light and dark palettes mirror TwofoldScreen.dc.html; brand colours are shared.

export const brand = {
  cream: '#FBF3EC',
  wine: '#5A1838',
  wineDeep: '#2A0B1C', // ink in light mode, wine background in dark mode
  plum: '#7A2A52',
  coral: '#FF7A66',
  coralDeep: '#E8604C',
  coralSoft: '#FFB3A6',
  blush: '#FFD9CF',
  gold: '#E9B44C',
  goldLight: '#F6D27A',
  goldDeep: '#C8902C',
  rose: '#F2D9DF', // body text on wine
  night: '#14060E',
  whatsapp: '#25A35A',
  online: '#7DDC9C',
} as const;

export type Palette = {
  bg: string;
  sf: string; // surface
  sf2: string; // secondary surface
  ink: string;
  ink2: string;
  mu: string; // muted
  ln: string; // hairline
  co: string; // coral accent
  pb: string; // primary button
  pbInk: string;
  meBub: string;
  meInk: string;
  themBub: string;
  themInk: string;
  room: string;
  floor: string;
  roomItem: string;
  qBg: string; // dark feature card (daily question, rank)
  tab: string;
  sheet: string;
  softBg: string;
  softInk: string;
  hero: string; // wine-filled screens: welcome, linked, paywall
  scrim: string;
};

export const light: Palette = {
  bg: '#FBF3EC',
  sf: '#FFFFFF',
  sf2: '#F4E6DC',
  ink: '#2A0B1C',
  ink2: '#5B4450',
  mu: '#7D5D6B',
  ln: '#EADCD2',
  co: '#E8604C',
  pb: '#5A1838',
  pbInk: '#FBF3EC',
  meBub: '#5A1838',
  meInk: '#FBF3EC',
  themBub: '#FFFFFF',
  themInk: '#2A0B1C',
  room: '#5A1838',
  floor: '#4A1230',
  roomItem: '#7A2A52',
  qBg: '#2A0B1C',
  tab: '#FFFFFF',
  sheet: '#FBF3EC',
  softBg: '#FFE3DC',
  softInk: '#9C3A2C',
  hero: '#5A1838',
  scrim: 'rgba(20,6,14,0.45)',
};

export const dark: Palette = {
  bg: '#160810',
  sf: '#24101A',
  sf2: '#341A27',
  ink: '#FBF3EC',
  ink2: '#E0CCD5',
  mu: '#B497A5',
  ln: '#3A2030',
  co: '#FF7A66',
  pb: '#FF7A66',
  pbInk: '#2A0B1C',
  meBub: '#FF7A66',
  meInk: '#2A0B1C',
  themBub: '#2C1420',
  themInk: '#FBF3EC',
  room: '#3A1028',
  floor: '#2A0A1C',
  roomItem: '#5A1838',
  qBg: '#3A1028',
  tab: '#2C1420',
  sheet: '#24101A',
  softBg: '#4A1E2A',
  softInk: '#FFB3A6',
  hero: '#2A0B1C',
  scrim: 'rgba(20,6,14,0.45)',
};

export const radius = {
  pill: 999,
  card: 32,
  tile: 22,
  field: 20,
  bubble: 22,
} as const;

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  displayBold: 'Fredoka_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
} as const;
