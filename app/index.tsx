import { Redirect } from 'expo-router';
import { useKitchenMemoryStore } from '../src/state/store';

export default function Index() {
  const onboardingCompleted = useKitchenMemoryStore((s) => s.household.onboardingCompleted);
  if (!onboardingCompleted) return <Redirect href="/onboarding/welcome" />;
  return <Redirect href="/(tabs)/home" />;
}
