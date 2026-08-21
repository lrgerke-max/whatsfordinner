import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { COOKING_EFFORT_OPTIONS, COOKING_TIME_OPTIONS } from '../src/data/options';
import { CookingEffort, CookingTimePreference } from '../src/types/household';
import { Title, Caption, Body } from '../src/components/Typography';
import { ChipGroup } from '../src/components/ChipGroup';
import { Button } from '../src/components/Button';

export default function EditCookingScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const updateHouseholdFields = useKitchenMemoryStore((s) => s.updateHouseholdFields);

  const [effort, setEffort] = useState<CookingEffort>(household.cookingEffort);
  const [time, setTime] = useState<CookingTimePreference>(household.cookingTimePreference);

  const handleSave = () => {
    updateHouseholdFields({ cookingEffort: effort, cookingTimePreference: time });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Cooking</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Body>How much effort do you want most nights?</Body>
          <ChipGroup options={COOKING_EFFORT_OPTIONS} selected={[effort]} onToggle={(k) => setEffort(k as CookingEffort)} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Body>Typical cooking time</Body>
          <ChipGroup options={COOKING_TIME_OPTIONS} selected={[time]} onToggle={(k) => setTime(k as CookingTimePreference)} />
        </View>
        <Button label="Save Changes" onPress={handleSave} />
      </ScrollView>
    </View>
  );
}
