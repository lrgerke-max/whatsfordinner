import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { BRAND_LOYALTY_OPTIONS, BUDGET_PREFERENCE_OPTIONS, COMMON_GROCERY_STORES } from '../src/data/options';
import { BrandLoyalty, BudgetPreference } from '../src/types/household';
import { Title, Caption, Body } from '../src/components/Typography';
import { ChipGroup } from '../src/components/ChipGroup';
import { Chip } from '../src/components/Chip';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';

export default function EditShoppingScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const updateShopping = useKitchenMemoryStore((s) => s.updateShopping);

  const [stores, setStores] = useState<string[]>(household.shopping.preferredStores);
  const [customStore, setCustomStore] = useState('');
  const [budget, setBudget] = useState<BudgetPreference>(household.shopping.budgetPreference);
  const [weeklyBudget, setWeeklyBudget] = useState(household.shopping.weeklyBudgetUsd ? String(household.shopping.weeklyBudgetUsd) : '');
  const [brandLoyalty, setBrandLoyalty] = useState<BrandLoyalty>(household.shopping.brandLoyalty);

  const toggleStore = (store: string) => {
    setStores((prev) => (prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]));
  };

  const addCustomStore = () => {
    const trimmed = customStore.trim();
    if (!trimmed || stores.includes(trimmed)) return;
    setStores((prev) => [...prev, trimmed]);
    setCustomStore('');
  };

  const handleSave = () => {
    updateShopping({
      preferredStores: stores,
      budgetPreference: budget,
      weeklyBudgetUsd: weeklyBudget ? Number(weeklyBudget) : undefined,
      brandLoyalty,
    });
    router.back();
  };

  const allStoreOptions = Array.from(new Set([...COMMON_GROCERY_STORES, ...stores]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Shopping</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Body>Preferred grocery stores</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {allStoreOptions.map((store) => (
              <Chip key={store} label={store} selected={stores.includes(store)} onPress={() => toggleStore(store)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField placeholder="Add another store" value={customStore} onChangeText={setCustomStore} onSubmitEditing={addCustomStore} returnKeyType="done" />
            </View>
            <Button label="Add" variant="secondary" fullWidth={false} size="sm" onPress={addCustomStore} />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Body>Budget preference</Body>
          <ChipGroup options={BUDGET_PREFERENCE_OPTIONS} selected={[budget]} onToggle={(k) => setBudget(k as BudgetPreference)} />
        </View>

        <TextField label="Weekly grocery budget (optional)" value={weeklyBudget} onChangeText={setWeeklyBudget} keyboardType="numeric" placeholder="e.g. 175" />

        <View style={{ gap: spacing.sm }}>
          <Body>Brand loyalty</Body>
          <ChipGroup options={BRAND_LOYALTY_OPTIONS} selected={[brandLoyalty]} onToggle={(k) => setBrandLoyalty(k as BrandLoyalty)} />
        </View>

        <Button label="Save Changes" onPress={handleSave} />
      </ScrollView>
    </View>
  );
}
