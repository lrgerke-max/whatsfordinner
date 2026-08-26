import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../../src/state/store';
import { findRecipeById, RECIPE_LIBRARY } from '../../../src/data/recipes';
import { recipeProvider } from '../../../src/ai';
import { matchRecipeToInventory } from '../../../src/engines/mealPlanningEngine';
import { cuisineEmoji } from '../../../src/theme/colors';
import { Card } from '../../../src/components/Card';
import { RecipeImage } from '../../../src/components/RecipeImage';
import { Body, BodyStrong, Caption, Title } from '../../../src/components/Typography';
import { EmptyState } from '../../../src/components/EmptyState';
import { Recipe } from '../../../src/types/recipe';

export default function SwapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const planSeed = useKitchenMemoryStore((s) => s.planSeed);
  const mealRatings = useKitchenMemoryStore((s) => s.mealRatings);
  const swapMealTo = useKitchenMemoryStore((s) => s.swapMealTo);

  const meal = mealPlan?.meals.find((m) => m.id === id);
  const currentRecipe = meal ? findRecipeById(meal.recipeId) : undefined;

  const [alternatives, setAlternatives] = useState<Recipe[] | null>(null);

  useEffect(() => {
    if (!meal || !currentRecipe) return;
    const excludeIds = (mealPlan?.meals ?? []).map((m) => m.recipeId);
    recipeProvider
      .suggestAlternatives({
        currentRecipeId: currentRecipe.id,
        household,
        inventory,
        recipeLibrary: RECIPE_LIBRARY,
        excludeRecipeIds: excludeIds,
        count: 4,
        seed: planSeed,
        mealRatings,
      })
      .then(setAlternatives)
      .catch(() => setAlternatives([])); // never leave the screen loading forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meal?.id]);

  if (!meal || !currentRecipe) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, padding: spacing.lg }}>
        <EmptyState
          emoji="🍽️"
          title="This meal isn't on your plan anymore"
          message="The plan may have been refreshed. Pick another night to swap, or rebuild the week."
          actionLabel="Back to my week"
          onAction={() => router.replace('/(tabs)/plan')}
        />
      </View>
    );
  }

  const handlePick = (recipeId: string) => {
    swapMealTo(meal.id, recipeId);
    router.replace(`/recipe/${meal.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 20 }}>Swap Dinner</Title>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 4 }}>
          <Caption>CURRENTLY</Caption>
          <BodyStrong>{cuisineEmoji[currentRecipe.cuisine] ?? '🍽️'} {currentRecipe.name}</BodyStrong>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Caption>ALTERNATIVES</Caption>
          {alternatives === null ? (
            <Body color={colors.textSecondary}>Finding dinners you'll actually want to eat…</Body>
          ) : (
            alternatives.map((recipe) => {
              const match = matchRecipeToInventory(recipe, inventory);
              return (
                <Card key={recipe.id} onPress={() => handlePick(recipe.id)} style={{ flexDirection: 'row', gap: spacing.md }}>
                  <RecipeImage emoji={recipe.imageEmoji} cuisine={recipe.cuisine} size={64} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <BodyStrong>{recipe.name}</BodyStrong>
                    <Caption>{cuisineEmoji[recipe.cuisine] ?? '🍽️'} {recipe.cuisine} · {recipe.cookTimeMinutes} min</Caption>
                    <Caption color={colors.success}>
                      Uses {match.matchedCount} of {match.requiredCount} things you have
                    </Caption>
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
