import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { useTheme } from '../../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../../src/state/store';
import { findRecipeById, RECIPE_LIBRARY } from '../../../src/data/recipes';
import { getIngredientAvailability } from '../../../src/engines/mealPlanningEngine';
import { cuisineEmoji } from '../../../src/theme/colors';
import { RATING_EMOJI, RATING_LABEL, formatIngredientQuantity } from '../../../src/utils/labels';
import { toIsoDate } from '../../../src/utils/date';
import { RecipeImage } from '../../../src/components/RecipeImage';
import { Card } from '../../../src/components/Card';
import { Body, BodyStrong, Caption, Title } from '../../../src/components/Typography';
import { Button } from '../../../src/components/Button';
import { EmptyState } from '../../../src/components/EmptyState';
import { RatingValue } from '../../../src/types/mealPlan';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const rateMeal = useKitchenMemoryStore((s) => s.rateMeal);
  const swapMealTo = useKitchenMemoryStore((s) => s.swapMealTo);

  const [keepAwake, setKeepAwake] = useState(false);
  // Servings scaler: cooks rarely match a recipe's default batch size.
  // (recipe is resolved below; the fallback here is replaced once it exists.)
  const [servings, setServings] = useState<number | null>(null);

  React.useEffect(() => {
    if (keepAwake) {
      activateKeepAwakeAsync('recipe-screen').catch(() => {});
    } else {
      deactivateKeepAwake('recipe-screen').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('recipe-screen').catch(() => {});
    };
  }, [keepAwake]);

  const meal = mealPlan?.meals.find((m) => m.id === id);
  const recipe = meal ? findRecipeById(meal.recipeId) : RECIPE_LIBRARY.find((r) => r.id === id);

  const availability = useMemo(() => (recipe ? getIngredientAvailability(recipe, inventory) : []), [recipe, inventory]);
  const activeServings = servings ?? recipe?.servings ?? 4;

  const today = toIsoDate(new Date());
  const todayMeal = mealPlan?.meals.find((m) => m.date === today);

  if (!recipe) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState emoji="🔎" title="Recipe not found" message="This recipe may have been swapped out." actionLabel="Back to Plan" onAction={() => router.replace('/(tabs)/plan')} />
      </View>
    );
  }

  const missingCount = availability.filter((a) => !a.have && !a.ingredient.optional).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setKeepAwake((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={keepAwake ? 'Screen will stay awake, tap to allow sleep' : 'Keep screen awake while cooking'}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name={keepAwake ? 'sunny' : 'sunny-outline'} size={20} color={keepAwake ? colors.accent : colors.textSecondary} />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <RecipeImage emoji={recipe.imageEmoji} cuisine={recipe.cuisine} size={120} radius={radius.xl} />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <Caption>{cuisineEmoji[recipe.cuisine] ?? '🍽️'} {recipe.cuisine}</Caption>
          <Title style={{ fontSize: 30 }}>{recipe.name}</Title>
          <Body color={colors.textSecondary}>{recipe.description}</Body>

          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
            <Stat icon="time-outline" label={`${recipe.cookTimeMinutes} min`} />
            <Stat icon="flame-outline" label={`${recipe.proteinGrams}g protein`} />
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}
            accessibilityRole="adjustable"
            accessibilityLabel={`Servings, currently ${activeServings}`}
          >
            <Caption>SERVES</Caption>
            <Pressable
              onPress={() => setServings(Math.max(1, activeServings - 1))}
              accessibilityRole="button"
              accessibilityLabel="Fewer servings"
              hitSlop={8}
              disabled={activeServings <= 1}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center', opacity: activeServings <= 1 ? 0.4 : 1 }}
            >
              <Ionicons name="remove" size={20} color={colors.textPrimary} />
            </Pressable>
            <BodyStrong style={{ fontSize: 20, minWidth: 28, textAlign: 'center' }}>{activeServings}</BodyStrong>
            <Pressable
              onPress={() => setServings(Math.min(24, activeServings + 1))}
              accessibilityRole="button"
              accessibilityLabel="More servings"
              hitSlop={8}
              disabled={activeServings >= 24}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center', opacity: activeServings >= 24 ? 0.4 : 1 }}
            >
              <Ionicons name="add" size={20} color={colors.textPrimary} />
            </Pressable>
            {servings !== null && servings !== recipe.servings ? (
              <Pressable onPress={() => setServings(null)} accessibilityRole="button" accessibilityLabel="Reset to original servings" hitSlop={8}>
                <Caption color={colors.accentStrong}>Reset</Caption>
              </Pressable>
            ) : null}
          </View>

          {meal ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button label="Swap This Meal" variant="secondary" size="sm" onPress={() => router.push(`/recipe/${meal.id}/swap`)} />
              </View>
            </View>
          ) : todayMeal ? (
            <Button
              label="Cook This Tonight Instead"
              variant="secondary"
              size="sm"
              onPress={() => {
                swapMealTo(todayMeal.id, recipe.id);
                router.replace(`/recipe/${todayMeal.id}`);
              }}
            />
          ) : null}
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm }}>
          <Title style={{ fontSize: 20 }}>Ingredients</Title>
          {missingCount > 0 ? (
            <Caption color={colors.warning}>
              You'll need to buy {missingCount} thing{missingCount === 1 ? '' : 's'}
            </Caption>
          ) : (
            <Caption color={colors.success}>You have everything for this one</Caption>
          )}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {availability.map(({ ingredient, have }, idx) => (
              <View
                key={ingredient.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <Ionicons
                  name={have ? 'checkmark-circle' : ingredient.optional ? 'ellipse-outline' : 'alert-circle'}
                  size={20}
                  color={have ? colors.success : ingredient.optional ? colors.textTertiary : colors.warning}
                />
                <View style={{ flex: 1 }}>
                  <BodyStrong>{ingredient.name}{ingredient.optional ? ' (optional)' : ''}</BodyStrong>
                  <Caption>
                    {formatIngredientQuantity(
                      Math.round(ingredient.quantity * (activeServings / recipe.servings) * 100) / 100,
                      ingredient.unit
                    )}
                    {servings !== null && servings !== recipe.servings
                      ? ` · was ${formatIngredientQuantity(ingredient.quantity, ingredient.unit)}`
                      : ''}
                  </Caption>
                </View>
                <Caption color={have ? colors.success : colors.warning}>
                  {have ? 'Have it' : 'Need to buy'}
                </Caption>
              </View>
            ))}
          </Card>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md }}>
          <Title style={{ fontSize: 20 }}>Instructions</Title>
          {recipe.instructions.map((step, idx) => (
            <Card key={idx} style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <BodyStrong color={colors.accentStrong}>{idx + 1}</BodyStrong>
              </View>
              <Body style={{ flex: 1, fontSize: 17 }}>{step}</Body>
            </Card>
          ))}
        </View>

        {meal ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
            <RatingRow currentRating={meal.rating} onRate={(rating) => rateMeal(meal.id, rating)} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Caption>{label}</Caption>
    </View>
  );
}

function RatingRow({ currentRating, onRate }: { currentRating?: RatingValue; onRate: (r: RatingValue) => void }) {
  const { colors, spacing, radius } = useTheme();
  const ratings: RatingValue[] = ['loved', 'good', 'fine', 'never-again'];
  return (
    <Card style={{ gap: spacing.sm }}>
      <BodyStrong>How was it?</BodyStrong>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {ratings.map((r) => (
          <Pressable
            key={r}
            onPress={() => onRate(r)}
            accessibilityRole="button"
            accessibilityLabel={RATING_LABEL[r]}
            style={{
              alignItems: 'center',
              gap: 4,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: currentRating === r ? colors.accentSoft : 'transparent',
            }}
          >
            <Body style={{ fontSize: 26 }}>{RATING_EMOJI[r]}</Body>
            <Caption>{RATING_LABEL[r]}</Caption>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
