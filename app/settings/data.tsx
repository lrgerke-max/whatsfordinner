import React from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { confirmAction } from '../../src/utils/confirm';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Body, BodyStrong, Title } from '../../src/components/Typography';

export default function DataScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const groceryList = useKitchenMemoryStore((s) => s.groceryList);
  const resetAllData = useKitchenMemoryStore((s) => s.resetAllData);

  const handleExport = async () => {
    const payload = JSON.stringify({ household, inventory, mealPlan, groceryList, exportedAt: new Date().toISOString() }, null, 2);
    try {
      await Share.share({ message: payload, title: 'Kitchen Memory data export' });
    } catch {
      // user cancelled — nothing to do
    }
  };

  const handleDelete = () => {
    confirmAction(
      'Delete all household data?',
      'This removes your household, kitchen memory, meal plans, and grocery lists from this device. This cannot be undone.',
      'Delete Everything',
      () => {
        resetAllData();
        router.replace('/onboarding/welcome');
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Data Export & Delete</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={{ gap: spacing.sm }}>
          <BodyStrong>Export your data</BodyStrong>
          <Body color={colors.textSecondary}>Get a copy of your household profile, kitchen memory, meal plan, and grocery list as JSON.</Body>
          <Button label="Export Data" variant="secondary" onPress={handleExport} />
        </Card>
        <Card style={{ gap: spacing.sm, borderColor: colors.dangerSoft }}>
          <BodyStrong color={colors.danger}>Delete everything</BodyStrong>
          <Body color={colors.textSecondary}>Permanently remove your household, kitchen memory, and meal history from this device.</Body>
          <Button label="Delete All Data" variant="danger" onPress={handleDelete} />
        </Card>
      </ScrollView>
    </View>
  );
}
