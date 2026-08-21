import React, { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { findRecipeById } from '../../src/data/recipes';
import { cuisineEmoji } from '../../src/theme/colors';
import { shortDateLabel, weekdayLabel } from '../../src/utils/date';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { RecipeImage } from '../../src/components/RecipeImage';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';

export default function PlanScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const ensureMealPlan = useKitchenMemoryStore((s) => s.ensureMealPlan);
  const regenerateMealPlan = useKitchenMemoryStore((s) => s.regenerateMealPlan);

  useEffect(() => {
    ensureMealPlan();
  }, [ensureMealPlan]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title>Your Week</Title>
        <Pressable
          onPress={regenerateMealPlan}
          accessibilityRole="button"
          accessibilityLabel="Regenerate meal plan"
          hitSlop={12}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="refresh" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!mealPlan || mealPlan.meals.length === 0 ? (
        <EmptyState emoji="🗓️" title="No meals planned yet" message="We'll build your week around what's already in your kitchen." actionLabel="Plan my week" onAction={ensureMealPlan} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
          {mealPlan.meals.map((meal) => {
            const recipe = findRecipeById(meal.recipeId);
            if (!recipe) return null;
            const isToday = meal.date === today;
            return (
              <Card key={meal.id} elevated={isToday} style={isToday ? { borderColor: colors.accent } : undefined}>
                <Pressable
                  onPress={() => router.push(`/recipe/${meal.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View recipe for ${recipe.name}`}
                  style={{ flexDirection: 'row', gap: spacing.md }}
                >
                  <RecipeImage emoji={recipe.imageEmoji} cuisine={recipe.cuisine} size={72} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Caption style={{ fontWeight: '700' }}>{weekdayLabel(meal.date)}</Caption>
                      <Caption>· {shortDateLabel(meal.date)}</Caption>
                      {isToday ? <Badge label="Tonight" tone="accent" /> : null}
                    </View>
                    <BodyStrong style={{ fontSize: 18 }}>{cuisineEmoji[recipe.cuisine] ?? '🍽️'} {recipe.name}</BodyStrong>
                    <Body color={colors.textSecondary} style={{ fontSize: 14 }}>
                      {recipe.cookTimeMinutes} min · {recipe.difficulty} · {recipe.proteinGrams}g protein
                    </Body>
                    <Body color={colors.textSecondary} style={{ fontSize: 14 }}>
                      {meal.totalIngredientCount > 0
                        ? `Uses ${meal.inventoryMatchCount} of ${meal.totalIngredientCount} ingredients you already have`
                        : 'Ready to cook'}
                      {meal.estimatedAdditionalCostUsd > 0 ? ` · ~$${meal.estimatedAdditionalCostUsd.toFixed(2)} more` : ' · Nothing extra to buy'}
                    </Body>
                  </View>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Pressable
                    onPress={() => router.push(`/recipe/${meal.id}/swap`)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Swap ${recipe.name}`}
                  >
                    <Ionicons name="shuffle" size={16} color={colors.accentStrong} />
                    <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>Swap</Caption>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
