import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useOnboardingStore } from '../../src/state/onboardingStore';
import { useTheme } from '../../src/theme/useTheme';
import { COOKING_EFFORT_OPTIONS, COOKING_TIME_OPTIONS } from '../../src/data/options';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChipGroup } from '../../src/components/ChipGroup';
import { Body, Caption, Display } from '../../src/components/Typography';
import { CookingEffort, CookingTimePreference } from '../../src/types/household';

export default function OnboardingCookingScreen() {
  const { spacing } = useTheme();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingScaffold step={2} totalSteps={4} ctaLabel="Continue" onNext={() => router.push('/onboarding/shopping')}>
      <Display style={{ fontSize: 30 }}>How do you like to cook?</Display>

      <View style={{ gap: spacing.sm }}>
        <Body>How much effort do you want most nights?</Body>
        <ChipGroup
          options={COOKING_EFFORT_OPTIONS}
          selected={[draft.cookingEffort]}
          onToggle={(k) => update({ cookingEffort: k as CookingEffort })}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Body>Typical cooking time</Body>
        <ChipGroup
          options={COOKING_TIME_OPTIONS}
          selected={[draft.cookingTimePreference]}
          onToggle={(k) => update({ cookingTimePreference: k as CookingTimePreference })}
        />
      </View>
    </OnboardingScaffold>
  );
}
