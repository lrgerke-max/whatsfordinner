// Kitchen Memory design tokens.
// Warm, calm, premium — inspired by Apple Health x modern food apps.
// Avoid saturated "AI" purples/blues; lean into cream, terracotta, sage, char.

export const palette = {
  cream50: '#FFFDFA',
  cream100: '#FBF7F2',
  cream200: '#F3ECE2',
  cream300: '#E8DECE',
  tan400: '#D8C7AE',

  char900: '#211D19',
  char800: '#322C26',
  char700: '#463E35',
  char600: '#5C5147',
  char500: '#786C5F',
  char400: '#9A8E80',
  char300: '#BBB0A2',

  terracotta600: '#C1552C',
  terracotta500: '#D66B3E',
  terracotta400: '#E58A5F',
  terracotta100: '#FBE4D6',

  sage600: '#5C7A5E',
  sage500: '#74936F',
  sage400: '#93AE8C',
  sage100: '#E4EDE0',

  gold500: '#D9A441',
  gold100: '#F8E9C9',

  berry500: '#A24B5E',
  berry100: '#F3DEE2',

  sky500: '#4C7A93',
  sky100: '#DCEAF0',

  red500: '#C24339',
  red100: '#F7DEDA',

  white: '#FFFFFF',
  black: '#000000',
};

export const lightColors = {
  bg: palette.cream100,
  bgElevated: palette.white,
  bgSubtle: palette.cream200,
  card: palette.white,
  cardAlt: palette.cream50,
  border: palette.cream300,
  borderStrong: palette.tan400,

  textPrimary: palette.char900,
  textSecondary: palette.char600,
  textTertiary: palette.char400,
  textInverse: palette.cream50,

  accent: palette.terracotta500,
  accentStrong: palette.terracotta600,
  accentSoft: palette.terracotta100,

  success: palette.sage600,
  successSoft: palette.sage100,
  warning: palette.gold500,
  warningSoft: palette.gold100,
  danger: palette.red500,
  dangerSoft: palette.red100,
  info: palette.sky500,
  infoSoft: palette.sky100,
  plum: palette.berry500,
  plumSoft: palette.berry100,

  tabInactive: palette.char400,
  overlay: 'rgba(33, 29, 25, 0.55)',
  shadow: 'rgba(50, 40, 28, 0.16)',
};

export const darkColors = {
  bg: '#17140F',
  bgElevated: '#221E19',
  bgSubtle: '#2A241D',
  card: '#241F19',
  cardAlt: '#2A2419',
  border: '#382F26',
  borderStrong: '#4A3F32',

  textPrimary: '#F7F1E8',
  textSecondary: '#C9BCA9',
  textTertiary: '#8F8271',
  textInverse: palette.char900,

  accent: palette.terracotta400,
  accentStrong: palette.terracotta500,
  accentSoft: '#4A2E20',

  success: palette.sage400,
  successSoft: '#2C3A28',
  warning: palette.gold500,
  warningSoft: '#3D3117',
  danger: '#E27065',
  dangerSoft: '#402320',
  info: '#7FB0C7',
  infoSoft: '#22333B',
  plum: '#C97E8E',
  plumSoft: '#3B252A',

  tabInactive: '#7E7261',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

export type ColorScheme = typeof lightColors;

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
