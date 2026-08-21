import React, { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore, computeLearningInsight } from '../../src/state/store';
import { findRecipeById } from '../../src/data/recipes';
import { cuisineEmoji } from '../../src/theme/colors';
import { formatRelativeScanTime, weekdayLabel } from '../../src/utils/date';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { RecipeImage } from '../../src/components/RecipeImage';
import { Body, BodyStrong, Caption, Display, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const scans = useKitchenMemoryStore((s) => s.scans);
  const ensureMealPlan = useKitchenMemoryStore((s) => s.ensureMealPlan);
  const insight = useKitchenMemoryStore((s) => computeLearningInsight(s));
  const dismissInsight = useKitchenMemoryStore((s) => s.dismissInsight);

  useEffect(() => {
    ensureMealPlan();
  }, [ensureMealPlan]);

  const today = todayIso();
  const todayMeal = mealPlan?.meals.find((m) => m.date === today) ?? mealPlan?.meals[0];
  const todayRecipe = todayMeal ? findRecipeById(todayMeal.recipeId) : undefined;

  const lastScanAt = useMemo(() => {
    if (scans[0]?.completedAt) return scans[0].completedAt;
    const timestamps = inventory.map((i) => i.lastSeenAt).sort();
    return timestamps[timestamps.length - 1];
  }, [scans, inventory]);

  const useSoonItems = useMemo(() => inventory.filter((i) => i.freshness === 'use-soon').slice(0, 6), [inventory]);

  const upcomingMeals = useMemo(
    () => (mealPlan?.meals ?? []).filter((m) => m.date >= today).slice(0, 6),
    [mealPlan, today]
  );

  const matchPercent = todayMeal && todayMeal.totalIngredientCount > 0
    ? Math.round((todayMeal.inventoryMatchCount / todayMeal.totalIngredientCount) * 100)
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxxl, paddingHorizontal: spacing.lg, gap: spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Caption>{household.name}</Caption>
          <Title>What's for dinner?</Title>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          hitSlop={12}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {insight ? (
        <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentSoft }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Body style={{ fontSize: 22 }}>💡</Body>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <BodyStrong color={colors.accentStrong}>{insight.message}</BodyStrong>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable onPress={() => dismissInsight(insight.key)} hitSlop={8}>
                  <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>Sounds good</Caption>
                </Pressable>
                <Pressable onPress={() => dismissInsight(insight.key)} hitSlop={8}>
                  <Caption color={colors.textSecondary}>No thanks</Caption>
                </Pressable>
              </View>
            </View>
          </View>
        </Card>
      ) : null}

      <View>
        <Caption style={{ marginBottom: spacing.xs }}>TONIGHT</Caption>
        {todayMeal && todayRecipe ? (
          <Card elevated style={{ gap: spacing.md }}>
            <Pressable
              onPress={() => router.push(`/recipe/${todayMeal.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View recipe for ${todayRecipe.name}`}
              style={{ flexDirection: 'row', gap: spacing.md }}
            >
              <RecipeImage emoji={todayRecipe.imageEmoji} cuisine={todayRecipe.cuisine} size={84} />
              <View style={{ flex: 1, gap: 4 }}>
                <Caption>{cuisineEmoji[todayRecipe.cuisine] ?? '🍽️'} {todayRecipe.cuisine}</Caption>
                <Title style={{ fontSize: 22 }}>{todayRecipe.name}</Title>
                <Body color={colors.textSecondary}>
                  {todayRecipe.cookTimeMinutes} min · {todayRecipe.proteinGrams}g protein
                  {todayMeal.totalIngredientCount > 0 ? ` · Uses ${todayMeal.inventoryMatchCount} things you already have` : ''}
                </Body>
              </View>
            </Pressable>
            {matchPercent !== null ? (
              <View style={{ backgroundColor: colors.bgSubtle, borderRadius: radius.md, padding: spacing.sm }}>
                <BodyStrong>You already have {matchPercent}% of this meal</BodyStrong>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button label="View Recipe" onPress={() => router.push(`/recipe/${todayMeal.id}`)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Change Dinner"
                  variant="secondary"
                  onPress={() => router.push(`/recipe/${todayMeal.id}/swap`)}
                />
              </View>
            </View>
          </Card>
        ) : (
          <Card>
            <EmptyState emoji="🍽️" title="No plan yet" message="Generate this week's meals to see tonight's dinner." actionLabel="Plan my week" onAction={ensureMealPlan} />
          </Card>
        )}
      </View>

      <View>
        <Caption style={{ marginBottom: spacing.xs }}>YOUR KITCHEN</Caption>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Pressable
            onPress={() => router.push('/(tabs)/kitchen')}
            accessibilityRole="button"
            accessibilityLabel={`${inventory.length} items tracked, ${formatRelativeScanTime(lastScanAt)}`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="file-tray-full" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <BodyStrong>{inventory.length} items tracked</BodyStrong>
              <Caption>{formatRelativeScanTime(lastScanAt)}</Caption>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan Kitchen"
            onPress={() => router.push('/scan')}
            style={{ backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill }}
          >
            <Caption color={colors.textInverse} style={{ fontWeight: '700' }}>Scan Kitchen</Caption>
          </Pressable>
        </Card>
      </View>

      {upcomingMeals.length > 0 ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Caption>THIS WEEK</Caption>
            <Pressable onPress={() => router.push('/(tabs)/plan')} hitSlop={8}>
              <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>See all</Caption>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {upcomingMeals.map((meal) => {
              const recipe = findRecipeById(meal.recipeId);
              if (!recipe) return null;
              return (
                <Card key={meal.id} onPress={() => router.push(`/recipe/${meal.id}`)} style={{ width: 148, gap: spacing.xs }}>
                  <RecipeImage emoji={recipe.imageEmoji} cuisine={recipe.cuisine} size={56} />
                  <Caption>{weekdayLabel(meal.date)}</Caption>
                  <BodyStrong numberOfLines={2}>{recipe.name}</BodyStrong>
                  <Caption>{recipe.cookTimeMinutes} min</Caption>
                </Card>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {useSoonItems.length > 0 ? (
        <View>
          <Caption style={{ marginBottom: spacing.xs }}>USE THESE SOON</Caption>
          <Card style={{ gap: spacing.md }}>
            <Body color={colors.textSecondary}>These ingredients are worth using this week.</Body>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {useSoonItems.map((item) => (
                <Badge key={item.id} label={item.name} tone="warning" />
              ))}
            </View>
            <Button label="Build a meal from these" variant="secondary" onPress={() => router.push('/save-my-food')} />
          </Card>
        </View>
      ) : null}
    </ScrollView>
  );
}
