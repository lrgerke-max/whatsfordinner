import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { findRecipeById } from '../../src/data/recipes';
import { cuisineEmoji } from '../../src/theme/colors';
import { shortDateLabel, toIsoDate, weekdayLabel } from '../../src/utils/date';
import { SpecialRequest } from '../../src/types/specialRequests';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { RecipeImage } from '../../src/components/RecipeImage';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';
import { confirmAction } from '../../src/utils/confirm';

export default function PlanScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const ensureMealPlan = useKitchenMemoryStore((s) => s.ensureMealPlan);
  const regenerateMealPlan = useKitchenMemoryStore((s) => s.regenerateMealPlan);
  const specialRequests = useKitchenMemoryStore((s) => s.specialRequests);

  useEffect(() => {
    ensureMealPlan();
  }, [ensureMealPlan]);

  // Tabs stay mounted after the first visit — re-check on focus so a window
  // left open across Sunday→Monday picks up the new week instead of serving
  // a stale plan. Cheap no-op when the plan is current.
  useFocusEffect(
    useCallback(() => {
      ensureMealPlan();
    }, [ensureMealPlan])
  );

  const today = toIsoDate(new Date());
  const requestsByMealKey = useMemo(() => {
    const byMealKey = new Map<string, SpecialRequest[]>();
    for (const request of specialRequests) {
      if (request.status !== 'planned' || !request.matchedMealDate || !request.matchedRecipeId) continue;
      const key = `${request.matchedMealDate}|${request.matchedRecipeId}`;
      byMealKey.set(key, [...(byMealKey.get(key) ?? []), request]);
    }
    return byMealKey;
  }, [specialRequests]);

  // Regenerating throws away manual swaps and re-plans from scratch — make
  // that a deliberate choice, not a one-tap accident.
  const handleRegenerate = () => {
    confirmAction(
      'Shuffle the week?',
      'Every uncooked night gets re-planned with fresh options based on your kitchen. Cooked meals and ratings stay put.',
      'Shuffle',
      () => regenerateMealPlan({ reshuffle: true }),
      false
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title>Your Week</Title>
        <Pressable
          onPress={handleRegenerate}
          accessibilityRole="button"
          accessibilityLabel="Shuffle meal plan for fresh options"
          accessibilityHint="Rebuilds every uncooked night of the week using what's in your kitchen"
          hitSlop={12}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="refresh" size={20} color={colors.accentStrong} />
        </Pressable>
      </View>

      {!mealPlan || mealPlan.meals.length === 0 ? (
        <EmptyState emoji="🗓️" title="No meals planned yet" message="We'll build your week around what's already in your kitchen." actionLabel="Plan my week" onAction={ensureMealPlan} />
      ) : (
        <ScrollView style={{ flex: 1 }} accessibilityLiveRegion="polite" contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
          {mealPlan.meals.map((meal) => {
            const recipe = findRecipeById(meal.recipeId);
            if (!recipe) return null;
            const isToday = meal.date === today;
            const fulfillingRequests = requestsByMealKey.get(`${meal.date}|${meal.recipeId}`) ?? [];
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
                      <Caption>{weekdayLabel(meal.date)}</Caption>
                      <Caption>· {shortDateLabel(meal.date)}</Caption>
                      {isToday ? <Badge label="Tonight" tone="accent" /> : null}
                    </View>
                    <BodyStrong style={{ fontSize: 18 }}>{cuisineEmoji[recipe.cuisine] ?? '🍽️'} {recipe.name}</BodyStrong>
                    {fulfillingRequests.length > 0 ? (
                      <View
                        style={{
                          backgroundColor: colors.successSoft,
                          borderRadius: radius.pill,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: 3,
                          alignSelf: 'flex-start',
                        }}
                      >
                        <Caption color={colors.successStrong}>
                          requested by {fulfillingRequests.map((r) => r.memberName.split(' ')[0]).join(' & ')}
                        </Caption>
                      </View>
                    ) : null}
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
                    <Caption color={colors.accentStrong}>Swap</Caption>
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
