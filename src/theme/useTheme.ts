import { useColorScheme } from 'react-native';
import { brandColors, deepColors } from './colors';
import { font, fontSize, fontWeight, radius, shadow, spacing } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  // One identity, two depths: the app is dark-editorial in both schemes.
  const colors = scheme === 'dark' ? deepColors : brandColors;
  return { colors, font, spacing, radius, fontSize, fontWeight, shadow, scheme: scheme ?? 'light' };
}

export type Theme = ReturnType<typeof useTheme>;
