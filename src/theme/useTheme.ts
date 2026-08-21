import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from './colors';
import { fontSize, fontWeight, radius, shadow, spacing } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, spacing, radius, fontSize, fontWeight, shadow, scheme: scheme ?? 'light' };
}

export type Theme = ReturnType<typeof useTheme>;
