import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';

export default function RecipeLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, presentation: 'card' }} />;
}
