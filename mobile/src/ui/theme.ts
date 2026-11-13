/**
 * Design tokens of the Clutch app. Inspired by Spotify's mobile app: a dark but not black
 * ground, rounded tiles, pill buttons, bold sentence-case type and a colour wash at the top of
 * each screen. The brand gradient (purple to blue) stays the signature: main buttons, the key
 * number of a screen, the active tab.
 */

import type { TextStyle } from 'react-native';

export const colors = {
  /** The page. Dark, with a violet tint, lighter than a pure black ground. */
  background: '#18151F',
  /** Cards and tiles. */
  surface: '#232030',
  /** Raised or selected: a pressed row, the active segment. */
  selected: '#2E2A3C',
  line: '#322D41',
  lineStrong: '#4A4459',
  text: '#FFFFFF',
  muted: '#B8B2C7',
  /** Outlines of free seats, secondary buttons, links. */
  accent: '#B5A4FF',
  /** Filled block: a seat in use, a taken slot in a strip. */
  used: '#3B3549',
  hatch: '#554E66',
  grid: '#232030',
  road: '#2E2A3C',
  faint: '#8E88A0',
  danger: '#FF8F8F',
  onGradient: '#100C18',
} as const;

export const gradient = {
  colors: ['#8C52FF', '#4C6FFF', '#3B9BFF'] as const,
  locations: [0, 0.6, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
  /** Same gradient as CSS, for react-native-web text clipping. */
  css: 'linear-gradient(135deg, #8C52FF 0%, #4C6FFF 60%, #3B9BFF 100%)',
  /** The wash at the top of a screen: the brand colour fading into the page. */
  wash: ['#4A3B94', '#2C2860', '#18151F'] as const,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Screen side padding. */
export const GUTTER = 20;

/** Corners: tiles and cards are rounded, buttons and chips are pills. */
export const radius = { tile: 8, card: 14, sheet: 24, pill: 999 };

/** Font names as registered by `useFonts` in the root layout. */
export const fonts = {
  display: 'HankenGrotesk_800ExtraBold',
  displayBold: 'HankenGrotesk_700Bold',
  mono: 'HankenGrotesk_400Regular',
  monoMedium: 'HankenGrotesk_600SemiBold',
  sans: 'HankenGrotesk_400Regular',
  sansSemi: 'HankenGrotesk_600SemiBold',
  sansBold: 'HankenGrotesk_700Bold',
} as const;

const display = (size: number): TextStyle => ({
  fontFamily: fonts.display,
  fontSize: size,
  lineHeight: Math.ceil(size * 1.2),
  letterSpacing: size >= 40 ? -1 : -0.4,
  color: colors.text,
  includeFontPadding: false,
});

/** The type scale. `T` renders one of these by name. */
export const type = {
  /** The one huge number of a screen. */
  hero: display(88),
  /** Time left, balance. */
  num: display(64),
  /** Screen titles. */
  title: display(32),
  /** Club names, counts. */
  head: display(24),
  wordmark: { ...display(22), fontFamily: fonts.displayBold, letterSpacing: -0.2 } as TextStyle,
  zone: { ...display(18), fontFamily: fonts.displayBold } as TextStyle,
  /** Small labels above content. */
  eyebrow: {
    fontFamily: fonts.sansSemi,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  } as TextStyle,
  /** Row sub-lines. */
  meta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  } as TextStyle,
  mono12: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  } as TextStyle,
  mono14: {
    fontFamily: fonts.sansSemi,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  } as TextStyle,
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  } as TextStyle,
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
  } as TextStyle,
};

export type TypeName = keyof typeof type;
