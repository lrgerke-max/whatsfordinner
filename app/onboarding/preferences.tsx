import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { useOnboardingStore } from '../../src/state/onboardingStore';
import { useTheme } from '../../src/theme/useTheme';
import { CUISINE_OPTIONS, COMMON_ALLERGY_OPTIONS, DIETARY_RESTRICTION_OPTIONS } from '../../src/types/household';
import { SPICE_TOLERANCE_OPTIONS } from '../../src/data/options';
import { cuisineEmoji } from '../../src/theme/colors';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChipGroup } from '../../src/components/ChipGroup';
import { TagInput } from '../../src/components/TagInput';
import { Caption, Display } from '../../src/components/Typography';
import { SpiceTolerance } from '../../src/types/household';

export default function OnboardingPreferencesScreen() {
  const { spacing, colors, radius } = useTheme();
  const draft = useOnboardingStore((s) => s.draft);
  const updateMemberFoodPreference = useOnboardingStore((s) => s.updateMemberFoodPreference);
  const [activeId, setActiveId] = useState(draft.members[0]?.id);

  const active = draft.members.find((m) => m.id === activeId) ?? draft.members[0];

  const toggle = (list: string[], value: string, onChange: (v: string[]) => void) => {
    onChange(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  if (!active) return null;

  return (
    <OnboardingScaffold step={1} totalSteps={4} ctaLabel="Continue" onNext={() => router.push('/onboarding/cooking')}>
      <Display style={{ fontSize: 30 }}>What does everyone like to eat?</Display>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {draft.members.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setActiveId(m.id)}
            style={{
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: active.id === m.id ? colors.accent : colors.bgSubtle,
            }}
          >
            <Caption color={active.id === m.id ? colors.textInverse : colors.textSecondary}>
              {m.name}
            </Caption>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.xs }}>
          <Caption>FAVORITE CUISINES</Caption>
          <ChipGroup
            options={CUISINE_OPTIONS.map((c) => ({ key: c, label: c, emoji: cuisineEmoji[c] }))}
            selected={active.foodPreference.favoriteCuisines}
            onToggle={(k) => toggle(active.foodPreference.favoriteCuisines, k, (v) => updateMemberFoodPreference(active.id, { favoriteCuisines: v }))}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>DISLIKED FOODS</Caption>
          <TagInput
            values={active.foodPreference.dislikedFoods}
            onChange={(v) => updateMemberFoodPreference(active.id, { dislikedFoods: v })}
            placeholder="e.g. seafood, mushrooms"
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>ALLERGIES</Caption>
          <ChipGroup
            options={COMMON_ALLERGY_OPTIONS.map((a) => ({ key: a, label: a }))}
            selected={active.foodPreference.allergies}
            onToggle={(k) => toggle(active.foodPreference.allergies, k, (v) => updateMemberFoodPreference(active.id, { allergies: v }))}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>DIETARY RESTRICTIONS</Caption>
          <ChipGroup
            options={DIETARY_RESTRICTION_OPTIONS.map((d) => ({ key: d, label: d }))}
            selected={active.foodPreference.dietaryRestrictions}
            onToggle={(k) => toggle(active.foodPreference.dietaryRestrictions, k, (v) => updateMemberFoodPreference(active.id, { dietaryRestrictions: v }))}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>SPICE TOLERANCE</Caption>
          <ChipGroup
            options={SPICE_TOLERANCE_OPTIONS}
            selected={[active.foodPreference.spiceTolerance]}
            onToggle={(k) => updateMemberFoodPreference(active.id, { spiceTolerance: k as SpiceTolerance })}
          />
        </View>
      </View>
    </OnboardingScaffold>
  );
}
