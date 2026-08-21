import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { DINNER_TIME_OPTIONS } from '../src/data/options';
import { Title, Caption } from '../src/components/Typography';
import { TextField } from '../src/components/TextField';
import { ChipGroup } from '../src/components/ChipGroup';
import { Button } from '../src/components/Button';

export default function EditHouseholdScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const updateHouseholdFields = useKitchenMemoryStore((s) => s.updateHouseholdFields);

  const [name, setName] = useState(household.name);
  const [dinnerTime, setDinnerTime] = useState(household.dinnerTime);

  const handleSave = () => {
    updateHouseholdFields({ name: name.trim() || household.name, dinnerTime });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Household</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <TextField label="Household name" value={name} onChangeText={setName} />
        <View style={{ gap: spacing.xs }}>
          <Caption>TYPICAL DINNER TIME</Caption>
          <ChipGroup options={DINNER_TIME_OPTIONS} selected={[dinnerTime]} onToggle={setDinnerTime} />
        </View>
        <Button label="Save Changes" onPress={handleSave} />
      </ScrollView>
    </View>
  );
}
