import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore, computeLearningInsight } from '../../src/state/store';
import { findRecipeById } from '../../src/data/recipes';
import { cuisineEmoji } from '../../src/theme/colors';
import { formatRelativeScanTime, toIsoDate, weekdayLabel } from '../../src/utils/date';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { RecipeImage } from '../../src/components/RecipeImage';
import { Body, BodyStrong, Caption, Display } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';
import { confirmAction } from '../../src/utils/confirm';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../src/theme/colors';

export default function HomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const scans = useKitchenMemoryStore((s) => s.scans);
  const ensureMealPlan = useKitchenMemoryStore((s) => s.ensureMealPlan);
  // Select primitives only — deriving an object inside the selector would
  // create a new snapshot every store change and re-render Home each time.
  const mealRatings = useKitchenMemoryStore((s) => s.mealRatings);
  const acknowledgedInsightKeys = useKitchenMemoryStore((s) => s.acknowledgedInsightKeys);
  const dismissInsight = useKitchenMemoryStore((s) => s.dismissInsight);
  const specialRequests = useKitchenMemoryStore((s) => s.specialRequests);
  const completeSpecialRequest = useKitchenMemoryStore((s) => s.completeSpecialRequest);
  const removeSpecialRequest = useKitchenMemoryStore((s) => s.removeSpecialRequest);
  const regenerateMealPlan = useKitchenMemoryStore((s) => s.regenerateMealPlan);

  const handleShuffleWeek = () => {
    confirmAction(
      'Shuffle the week?',
      'Every uncooked night gets re-planned with fresh options based on your kitchen. Cooked meals and ratings stay put.',
      'Shuffle',
      () => regenerateMealPlan({ reshuffle: true }),
      false
    );
  };

  useEffect(() => {
    ensureMealPlan();
  }, [ensureMealPlan]);

  // Tabs stay mounted — re-check on focus so the week rolls over live.
  useFocusEffect(
    useCallback(() => {
      ensureMealPlan();
    }, [ensureMealPlan])
  );

  const insight = useMemo(
    () => computeLearningInsight({ mealRatings, acknowledgedInsightKeys }),
    [mealRatings, acknowledgedInsightKeys]
  );

  const today = toIsoDate(new Date());
  const todayMeal = mealPlan?.meals.find((m) => m.date === today);
  // If today has no planned meal (e.g., viewing before the week starts), fall
  // back to the next upcoming one but say "Next up" instead of "Tonight".
  const nextUpcomingMeal = !todayMeal ? mealPlan?.meals.find((m) => m.date >= today) : undefined;
  const shownMeal = todayMeal ?? nextUpcomingMeal;
  const tonightCaption = todayMeal ? 'TONIGHT' : 'NEXT UP';
  const todayRecipe = shownMeal ? findRecipeById(shownMeal.recipeId) : undefined;

  const visibleRequests = useMemo(() => specialRequests.filter((r) => r.status !== 'done'), [specialRequests]);

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
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2, paddingRight: spacing.sm }}>
          <Caption color={colors.accentStrong} style={{ letterSpacing: 2, fontSize: 12 }}>{household.name.toUpperCase()}</Caption>
          <Display>What's for{'\n'}dinner?</Display>
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
                <Pressable
                  onPress={() => dismissInsight(insight.key)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss suggestion"
                >
                  <Caption color={colors.accentStrong}>Got it</Caption>
                </Pressable>
              </View>
            </View>
          </View>
        </Card>
      ) : null}

      <View>
        <Caption color={colors.accentStrong} style={{ marginBottom: spacing.xs, letterSpacing: 2, fontSize: 12 }}>{tonightCaption}</Caption>
        {shownMeal && todayRecipe ? (
          <Card elevated style={{ gap: spacing.md }}>
            <Pressable
              onPress={() => router.push(`/recipe/${shownMeal.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View recipe for ${todayRecipe.name}`}
              style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}
            >
              {/* Signature circle motif: the meal sits in a green gradient disc. */}
              <View style={{ width: 108, height: 108, borderRadius: 54, overflow: 'hidden' }}>
                <LinearGradient colors={[...gradients.accent]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Body style={{ fontSize: 52 }}>{todayRecipe.imageEmoji}</Body>
                </LinearGradient>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Caption color={colors.accentStrong} style={{ fontWeight: '600', letterSpacing: 1.5, fontSize: 12 }}>
                  {cuisineEmoji[todayRecipe.cuisine] ?? '🍽️'} {todayRecipe.cuisine.toUpperCase()}
                </Caption>
                <Display style={{ fontSize: 30 }}>{todayRecipe.name}</Display>
                <Body color={colors.textSecondary}>
                  {todayRecipe.cookTimeMinutes} min · {todayRecipe.proteinGrams}g protein
                  {shownMeal.totalIngredientCount > 0 ? ` · Uses ${shownMeal.inventoryMatchCount} things you already have` : ''}
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
                <Button label="View Recipe" onPress={() => router.push(`/recipe/${shownMeal.id}`)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Change Dinner"
                  variant="secondary"
                  onPress={() => router.push(`/recipe/${shownMeal.id}/swap`)}
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
        <Caption style={{ marginBottom: spacing.xs, letterSpacing: 1.5, fontSize: 12 }}>SPECIAL REQUESTS</Caption>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {visibleRequests.length === 0 ? (
            <View style={{ padding: spacing.md, paddingBottom: 0 }}>
              <Body color={colors.textSecondary}>Anything anyone's craving this week? Add it and we'll work it into the plan.</Body>
            </View>
          ) : null}
          {visibleRequests.map((request, idx) => (
              <View
                key={request.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <BodyStrong color={colors.accentStrong}>{request.memberName.charAt(0).toUpperCase()}</BodyStrong>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Body numberOfLines={2}>{request.text}</Body>
                  {request.status === 'planned' && request.matchedMealDate ? (
                    <Badge label={`Planned for ${weekdayLabel(request.matchedMealDate)}`} tone="success" />
                  ) : (
                    <Badge label="Still hoping" tone="warning" />
                  )}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mark request from ${request.memberName} as done`}
                  onPress={() => completeSpecialRequest(request.id)}
                  hitSlop={8}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove request from ${request.memberName}`}
                  onPress={() => removeSpecialRequest(request.id)}
                  hitSlop={8}
                  style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close-circle-outline" size={22} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a special request"
              onPress={() => router.push('/add-request')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                padding: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.accentStrong} />
              <Caption color={colors.accentStrong}>Add request</Caption>
            </Pressable>
        </Card>
      </View>

      <View>
        <Caption style={{ marginBottom: spacing.xs, letterSpacing: 1.5, fontSize: 12 }}>YOUR KITCHEN</Caption>
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
            style={{ backgroundColor: colors.accentDeep, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.pill }}
          >
            <Caption color={colors.textInverse}>Scan Kitchen</Caption>
          </Pressable>
        </Card>
      </View>

      {upcomingMeals.length > 0 ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Caption style={{ letterSpacing: 1.5, fontSize: 12 }}>THIS WEEK</Caption>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Pressable
                onPress={handleShuffleWeek}
                hitSlop={13}
                accessibilityRole="button"
                accessibilityLabel="Shuffle the week for fresh meal options"
                accessibilityHint="Rebuilds every uncooked night based on what's in your kitchen"
              >
                <Ionicons name="refresh" size={18} color={colors.accentStrong} />
              </Pressable>
              <Pressable onPress={() => router.push('/(tabs)/plan')} hitSlop={8} accessibilityRole="button" accessibilityLabel="See the full week plan">
                <Caption color={colors.accentStrong}>See all</Caption>
              </Pressable>
            </View>
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
          <Caption style={{ marginBottom: spacing.xs, letterSpacing: 1.5, fontSize: 12 }}>USE THESE SOON</Caption>
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
