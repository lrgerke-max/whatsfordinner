import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useOnboardingStore } from '../../src/state/onboardingStore';
import { useKitchenMemoryStore } from '../../src/state/store';
import { useTheme } from '../../src/theme/useTheme';
import { BRAND_LOYALTY_OPTIONS, BUDGET_PREFERENCE_OPTIONS, COMMON_GROCERY_STORES } from '../../src/data/options';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { ChipGroup } from '../../src/components/ChipGroup';
import { Chip } from '../../src/components/Chip';
import { TextField } from '../../src/components/TextField';
import { Body, Caption, Display } from '../../src/components/Typography';
import { BrandLoyalty, BudgetPreference } from '../../src/types/household';

export default function OnboardingShoppingScreen() {
  const { spacing } = useTheme();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const completeOnboarding = useKitchenMemoryStore((s) => s.completeOnboarding);
  const [customStore, setCustomStore] = useState('');

  const toggleStore = (store: string) => {
    const stores = draft.shopping.preferredStores;
    update({ shopping: { ...draft.shopping, preferredStores: stores.includes(store) ? stores.filter((s) => s !== store) : [...stores, store] } });
  };

  const addCustomStore = () => {
    const trimmed = customStore.trim();
    if (!trimmed || draft.shopping.preferredStores.includes(trimmed)) return;
    update({ shopping: { ...draft.shopping, preferredStores: [...draft.shopping.preferredStores, trimmed] } });
    setCustomStore('');
  };

  const allStores = Array.from(new Set([...COMMON_GROCERY_STORES, ...draft.shopping.preferredStores]));

  const handleFinish = () => {
    completeOnboarding(draft);
    router.replace('/(tabs)/home');
  };

  return (
    <OnboardingScaffold step={3} totalSteps={4} ctaLabel="Start Using Kitchen Memory" onNext={handleFinish}>
      <Display style={{ fontSize: 30 }}>How do you like to shop?</Display>

      <View style={{ gap: spacing.sm }}>
        <Body>Preferred grocery store(s)</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {allStores.map((store) => (
            <Chip key={store} label={store} selected={draft.shopping.preferredStores.includes(store)} onPress={() => toggleStore(store)} />
          ))}
        </View>
        <TextField placeholder="Add another store" value={customStore} onChangeText={setCustomStore} onSubmitEditing={addCustomStore} returnKeyType="done" />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Body>Budget preference</Body>
        <ChipGroup
          options={BUDGET_PREFERENCE_OPTIONS}
          selected={[draft.shopping.budgetPreference]}
          onToggle={(k) => update({ shopping: { ...draft.shopping, budgetPreference: k as BudgetPreference } })}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Body>Brand loyalty</Body>
        <ChipGroup
          options={BRAND_LOYALTY_OPTIONS}
          selected={[draft.shopping.brandLoyalty]}
          onToggle={(k) => update({ shopping: { ...draft.shopping, brandLoyalty: k as BrandLoyalty } })}
        />
      </View>
    </OnboardingScaffold>
  );
}
