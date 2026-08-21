import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../src/theme/useTheme';
import { useOnboardingStore } from '../../src/state/onboardingStore';
import { useKitchenMemoryStore } from '../../src/state/store';
import { Body, Caption, Display } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';

export default function WelcomeScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const resetDraft = useOnboardingStore((s) => s.reset);
  const loadDemoData = useKitchenMemoryStore((s) => s.loadDemoData);

  const handleGetStarted = () => {
    resetDraft();
    router.push('/onboarding/household');
  };

  const handleUseDemo = () => {
    loadDemoData();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#F3ECE2', '#FBF7F2']} style={{ height: '48%', alignItems: 'center', justifyContent: 'center' }}>
        <Body style={{ fontSize: 96 }}>🧠🍲</Body>
      </LinearGradient>

      <View style={{ flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: insets.bottom + spacing.lg, justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.sm }}>
          <Display style={{ fontSize: 36 }}>Meet your kitchen's memory.</Display>
          <Body color={colors.textSecondary} style={{ fontSize: 18 }}>
            Show us what's in your kitchen once a week. We'll remember it, plan your meals, and tell you exactly what you
            need to buy.
          </Body>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button label="Get Started" onPress={handleGetStarted} size="lg" />
          <Pressable onPress={handleUseDemo} style={{ alignItems: 'center', paddingVertical: spacing.sm }} hitSlop={8}>
            <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>✨ Explore with a demo household</Caption>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
