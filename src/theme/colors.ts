// Kitchen Memory design tokens — "Midnight Market" identity.
// Dark, editorial, confident: near-black green-tinted charcoal panels,
// a single vivid spring-green accent, heavy type, generous space.
// Inspired by modern dark editorial layouts (split panels, circle motifs,
// oversized headlines) — explicitly not a warm-pastel "assistant" look.

export const palette = {
  // Greens — the identity
  green300: '#8CF5BE',
  green400: '#57F29B',
  green500: '#30E084',
  green600: '#1FC46B',
  green700: '#12A057',
  green900: '#0E3B24',

  // Charcoals — surfaces
  ink950: '#080B09',
  ink900: '#0C100E',
  ink850: '#121714',
  ink800: '#151B17',
  ink700: '#1A211C',
  ink600: '#232D26',
  ink500: '#33413A',

  // Neutrals — text on dark
  mist100: '#F2F7F3',
  mist300: '#C6D2CA',
  mist500: '#A3B2A9',
  mist700: '#6E7F75',
  mist900: '#46554C',

  // Signals
  amber400: '#FFC24B',
  amber200: '#FFD98A',
  red400: '#FF6B6B',
  red200: '#FFA3A3',
  sky400: '#4CC3FF',
  sky200: '#9ADFFF',
  magenta400: '#FF6BC1',
  magenta200: '#FFA8DC',

  white: '#FFFFFF',
  black: '#000000',
};

/**
 * The primary theme. Despite the legacy name, this is what most of the app
 * renders in — a dark editorial surface set with the green accent.
 */
export const lightColors = {
  bg: palette.ink900,
  bgElevated: palette.ink850,
  bgSubtle: palette.ink700,
  card: palette.ink800,
  cardAlt: palette.ink850,
  border: palette.ink600,
  borderStrong: palette.ink500,

  textPrimary: palette.mist100,
  textSecondary: palette.mist500,
  textTertiary: palette.mist700,
  textInverse: palette.ink950,

  accent: palette.green500,
  // Deep enough for AA text when paired with dark labels on green fills.
  accentDeep: palette.green600,
  accentStrong: palette.green400,
  accentSoft: 'rgba(48, 224, 132, 0.13)',

  success: palette.green500,
  successStrong: palette.green300,
  successSoft: 'rgba(48, 224, 132, 0.14)',
  warning: palette.amber400,
  warningStrong: palette.amber200,
  warningSoft: 'rgba(255, 194, 75, 0.14)',
  danger: palette.red400,
  dangerStrong: palette.red200,
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  info: palette.sky400,
  infoStrong: palette.sky200,
  infoSoft: 'rgba(76, 195, 255, 0.14)',
  plum: palette.magenta400,
  plumSoft: 'rgba(255, 107, 193, 0.14)',

  tabInactive: palette.mist700,
  overlay: 'rgba(4, 8, 6, 0.66)',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

/** A depth variant for OS dark-mode — same identity, one step darker. */
export const darkColors = {
  ...lightColors,
  bg: palette.ink950,
  bgElevated: palette.ink900,
  bgSubtle: palette.ink600,
  card: palette.ink850,
  cardAlt: palette.ink900,
  border: palette.ink600,
  borderStrong: palette.ink500,
};

/**
 * True light palette — paper ink. Used by the printable shopping list, which
 * must stay black-on-white regardless of the app's dark identity.
 */
export const printColors = {
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgSubtle: '#F0F4F1',
  card: '#FFFFFF',
  cardAlt: '#FFFFFF',
  border: '#D8E2DA',
  borderStrong: '#AEBFB4',

  textPrimary: '#101511',
  textSecondary: '#42514A',
  textTertiary: '#6E7F75',
  textInverse: '#FFFFFF',

  accent: '#12A057',
  accentDeep: '#0E7A45',
  accentStrong: '#0E7A45',
  accentSoft: '#E4F7EC',

  success: '#1E9E5C',
  successStrong: '#136B3F',
  successSoft: '#E4F7EC',
  warning: '#B97D0F',
  warningStrong: '#7A5409',
  warningSoft: '#FCF1D8',
  danger: '#C93A3A',
  dangerStrong: '#8F2323',
  dangerSoft: '#FBE4E4',
  info: '#2B7FB0',
  infoStrong: '#1B5A80',
  infoSoft: '#E3F2FB',
  plum: '#B84E92',
  plumSoft: '#F9E5F1',

  tabInactive: '#6E7F75',
  overlay: 'rgba(16, 21, 17, 0.55)',
  shadow: 'rgba(16, 21, 17, 0.18)',
};

/** The default brand theme — exported under the name useTheme expects. */
export const brandColors = lightColors;

/** OS dark-mode variant: same identity, one step deeper. */
export const deepColors = darkColors;

export type ColorScheme = typeof lightColors;

/** Gradient pairs for hero moments (circle motifs, scan banner). */
export const gradients = {
  accent: ['#30E084', '#12A057'] as const,
  accentSoft: ['#57F29B', '#1FC46B'] as const,
};

export const cuisineEmoji: Record<string, string> = {
  American: '🇺🇸',
  Italian: '🇮🇹',
  Brazilian: '🇧🇷',
  Mexican: '🇲🇽',
  Asian: '🥢',
  Chinese: '🇨🇳',
  Japanese: '🇯🇵',
  Thai: '🇹🇭',
  Mediterranean: '🫒',
  Indian: '🇮🇳',
  French: '🇫🇷',
  Greek: '🇬🇷',
  Korean: '🇰🇷',
  MiddleEastern: '🧆',
};
