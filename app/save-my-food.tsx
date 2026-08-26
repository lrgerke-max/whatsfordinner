import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { RECIPE_LIBRARY } from '../src/data/recipes';
import { recipeProvider } from '../src/ai';
import { matchRecipeToInventory } from '../src/engines/mealPlanningEngine';
import { Card } from '../src/components/Card';
import { Badge } from '../src/components/Badge';
import { RecipeImage } from '../src/components/RecipeImage';
import { Body, BodyStrong, Caption, Title } from '../src/components/Typography';
import { EmptyState } from '../src/components/EmptyState';
import { Recipe } from '../src/types/recipe';

export default function SaveMyFoodScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const inventory = useKitchenMemoryStore((s) => s.inventory);

  const useSoonItems = inventory.filter((i) => i.freshness === 'use-soon');
  const [suggestions, setSuggestions] = useState<Recipe[] | null>(null);

  useEffect(() => {
    if (useSoonItems.length === 0) {
      setSuggestions([]);
      return;
    }
    const names = useSoonItems.map((i) => i.name);
    (async () => {
      // Sequential, not parallel: scoring is deterministic, so each call must
      // exclude the previous picks or all three return the same top recipe.
      const picked: Recipe[] = [];
      for (let i = 0; i < 3; i += 1) {
        const recipe = await recipeProvider.generateRecipe({
          household,
          inventory,
          recipeLibrary: RECIPE_LIBRARY,
          focusIngredientNames: names,
          excludeRecipeIds: picked.map((r) => r.id),
        });
        if (picked.some((r) => r.id === recipe.id)) break;
        picked.push(recipe);
      }
      setSuggestions(picked);
    })().catch(() => setSuggestions([])); // never leave the screen loading forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 20 }}>Save My Food</Title>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {useSoonItems.length === 0 ? (
          <EmptyState emoji="✨" title="Nothing urgent" message="Nothing in your kitchen needs to be used up right now." />
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Caption>USE THIS FIRST</Caption>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {useSoonItems.map((item) => (
                  <Badge key={item.id} label={item.name} tone="warning" />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Caption>DINNER IDEAS</Caption>
              {suggestions === null ? (
                <Body color={colors.textSecondary}>Finding dinners you'll actually want to eat…</Body>
              ) : (
                suggestions.map((recipe) => {
                  const match = matchRecipeToInventory(recipe, inventory);
                  return (
                    <Card key={recipe.id} onPress={() => router.push(`/recipe/${recipe.id}`)} style={{ flexDirection: 'row', gap: spacing.md }}>
                      <RecipeImage emoji={recipe.imageEmoji} cuisine={recipe.cuisine} size={64} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <BodyStrong>{recipe.name}</BodyStrong>
                        <Caption>{recipe.cuisine} · {recipe.cookTimeMinutes} min</Caption>
                        <Caption color={colors.success}>
                          Uses {match.matchedCount} of {match.requiredCount} things you have
                        </Caption>
                      </View>
                    </Card>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
