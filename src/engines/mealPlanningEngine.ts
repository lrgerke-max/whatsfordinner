import { generateId } from '../utils/id';
import { addDays, nowIso } from '../utils/date';
import { Household, CookingTimePreference } from '../types/household';
import { InventoryItem } from '../types/inventory';
import { Recipe } from '../types/recipe';
import { Meal, MealPlan, MealScoreBreakdown, MealScoringWeights, DEFAULT_SCORING_WEIGHTS, RatingValue } from '../types/mealPlan';
import { estimateCoverage, findInventoryMatch } from './inventoryMatch';
import { dislikeCollisionScore, isRecipeSafeForHousehold } from './dietaryRules';

const COVERAGE_HAVE_THRESHOLD = 0.4;
const ESTIMATED_COST_PER_MISSING_INGREDIENT = 2.75;

const TIME_BUCKET_MINUTES: Record<CookingTimePreference, [number, number]> = {
  'under-20': [0, 20],
  '20-30': [20, 30],
  '30-45': [30, 45],
  '45-60': [45, 60],
  'no-preference': [0, 999],
};

export interface RecipeInventoryMatch {
  requiredCount: number;
  matchedCount: number;
  missingIngredientNames: string[];
}

export function matchRecipeToInventory(recipe: Recipe, inventory: InventoryItem[]): RecipeInventoryMatch {
  const required = recipe.ingredients.filter((i) => !i.optional);
  let matchedCount = 0;
  const missing: string[] = [];

  for (const ingredient of required) {
    const item = findInventoryMatch(ingredient.name, inventory);
    const coverage = estimateCoverage(item, ingredient.quantity, ingredient.unit);
    if (coverage >= COVERAGE_HAVE_THRESHOLD) {
      matchedCount += 1;
    } else {
      missing.push(ingredient.name);
    }
  }

  return { requiredCount: required.length, matchedCount, missingIngredientNames: missing };
}

export interface IngredientAvailability {
  ingredient: Recipe['ingredients'][number];
  have: boolean;
}

/** Per-ingredient have/need breakdown, used by the recipe screen's checklist. */
export function getIngredientAvailability(recipe: Recipe, inventory: InventoryItem[]): IngredientAvailability[] {
  return recipe.ingredients.map((ingredient) => {
    const item = findInventoryMatch(ingredient.name, inventory);
    const coverage = estimateCoverage(item, ingredient.quantity, ingredient.unit);
    return { ingredient, have: coverage >= COVERAGE_HAVE_THRESHOLD };
  });
}

function scoreInventoryUtilization(match: RecipeInventoryMatch): number {
  if (match.requiredCount === 0) return 0.5;
  return match.matchedCount / match.requiredCount;
}

function scoreFamilyPreference(recipe: Recipe, household: Household): number {
  const dislike = dislikeCollisionScore(recipe, household);
  const cuisineFavorFraction =
    household.members.filter((m) => m.foodPreference.favoriteCuisines.includes(recipe.cuisine)).length /
    Math.max(household.members.length, 1);
  const base = 0.4 + cuisineFavorFraction * 0.6;
  return Math.max(0, base - dislike);
}

function scoreFoodWastePrevention(recipe: Recipe, inventory: InventoryItem[]): number {
  const useSoonItems = inventory.filter((i) => i.freshness === 'use-soon');
  if (useSoonItems.length === 0) return 0.3;
  let hits = 0;
  for (const item of useSoonItems) {
    const usesIt = recipe.ingredients.some((ing) => findInventoryMatch(ing.name, [item]) !== undefined);
    if (usesIt) hits += 1;
  }
  return Math.min(1, 0.3 + (hits / useSoonItems.length) * 0.9);
}

function scoreCookingTime(recipe: Recipe, household: Household): number {
  const [min, max] = TIME_BUCKET_MINUTES[household.cookingTimePreference];
  if (recipe.cookTimeMinutes >= min && recipe.cookTimeMinutes <= max) return 1;
  const distance = recipe.cookTimeMinutes < min ? min - recipe.cookTimeMinutes : recipe.cookTimeMinutes - max;
  return Math.max(0, 1 - distance / 30);
}

function scoreNutrition(recipe: Recipe, household: Household): number {
  const activeMembers = household.members.filter((m) => m.activityLevel === 'high').length;
  const targetProtein = 26 + activeMembers * 4;
  const ratio = recipe.proteinGrams / targetProtein;
  return Math.max(0, 1 - Math.abs(1 - ratio) * 0.8);
}

function scoreCuisineVariety(recipe: Recipe, recentCuisines: string[]): number {
  const recentCount = recentCuisines.filter((c) => c === recipe.cuisine).length;
  if (recentCount === 0) return 1;
  return Math.max(0, 1 - recentCount * 0.45);
}

function scoreCostEfficiency(match: RecipeInventoryMatch, recipe: Recipe): number {
  const missingRatio = match.requiredCount === 0 ? 0 : match.missingIngredientNames.length / match.requiredCount;
  const pantryBonus = recipe.tags.includes('pantry') || recipe.tags.includes('use-it-up') ? 0.15 : 0;
  return Math.max(0, Math.min(1, 1 - missingRatio + pantryBonus));
}

export interface ScoringContext {
  household: Household;
  inventory: InventoryItem[];
  recentCuisines: string[];
  weights: MealScoringWeights;
  ratingBoost?: number; // -1..1 from learned preferences
}

export function scoreRecipe(recipe: Recipe, ctx: ScoringContext): MealScoreBreakdown {
  const match = matchRecipeToInventory(recipe, ctx.inventory);
  const inventoryUtilization = scoreInventoryUtilization(match);
  const familyPreference = Math.max(0, Math.min(1, scoreFamilyPreference(recipe, ctx.household) + (ctx.ratingBoost ?? 0)));
  const foodWastePrevention = scoreFoodWastePrevention(recipe, ctx.inventory);
  const cookingTime = scoreCookingTime(recipe, ctx.household);
  const nutrition = scoreNutrition(recipe, ctx.household);
  const cuisineVariety = scoreCuisineVariety(recipe, ctx.recentCuisines);
  const costEfficiency = scoreCostEfficiency(match, recipe);

  const w = ctx.weights;
  const total =
    inventoryUtilization * w.inventoryUtilization +
    familyPreference * w.familyPreference +
    foodWastePrevention * w.foodWastePrevention +
    cookingTime * w.cookingTime +
    nutrition * w.nutrition +
    cuisineVariety * w.cuisineVariety +
    costEfficiency * w.costEfficiency;

  return {
    inventoryUtilization,
    familyPreference,
    foodWastePrevention,
    cookingTime,
    nutrition,
    cuisineVariety,
    costEfficiency,
    total,
  };
}

export interface GenerateMealPlanOptions {
  household: Household;
  inventory: InventoryItem[];
  recipeLibrary: Recipe[];
  pastMeals: Meal[];
  mealRatings?: Record<string, RatingValue>;
  weekStartDate: string;
  numberOfDinners?: number;
  scoringWeights?: MealScoringWeights;
  excludeRecipeIds?: string[];
}

function ratingBoostFor(recipeId: string, mealRatings: Record<string, RatingValue> | undefined): number {
  const rating = mealRatings?.[recipeId];
  if (!rating) return 0;
  if (rating === 'loved') return 0.25;
  if (rating === 'good') return 0.1;
  if (rating === 'never-again') return -0.9;
  return 0;
}

export function generateMealPlan(options: GenerateMealPlanOptions): MealPlan {
  const {
    household,
    inventory,
    recipeLibrary,
    pastMeals,
    mealRatings,
    weekStartDate,
    numberOfDinners = 7,
    scoringWeights = DEFAULT_SCORING_WEIGHTS,
    excludeRecipeIds = [],
  } = options;

  const recentRecipeIds = new Set([...pastMeals.slice(-10).map((m) => m.recipeId), ...excludeRecipeIds]);
  const eligible = recipeLibrary.filter(
    (r) => isRecipeSafeForHousehold(r, household) && (mealRatings?.[r.id] !== 'never-again')
  );

  const recentCuisines: string[] = pastMeals
    .slice(-4)
    .map((m) => recipeLibrary.find((r) => r.id === m.recipeId)?.cuisine)
    .filter((c): c is string => Boolean(c));

  const chosenThisWeek: Recipe[] = [];
  const meals: Meal[] = [];

  for (let day = 0; day < numberOfDinners; day += 1) {
    const usedIdsThisWeek = new Set(chosenThisWeek.map((r) => r.id));
    let candidates = eligible.filter((r) => !usedIdsThisWeek.has(r.id) && !recentRecipeIds.has(r.id));
    if (candidates.length === 0) candidates = eligible.filter((r) => !usedIdsThisWeek.has(r.id));
    if (candidates.length === 0) candidates = eligible;

    let best: Recipe | undefined;
    let bestScore = -Infinity;
    let bestMatch: RecipeInventoryMatch | undefined;

    for (const recipe of candidates) {
      const ctx: ScoringContext = {
        household,
        inventory,
        recentCuisines: [...recentCuisines, ...chosenThisWeek.map((r) => r.cuisine)],
        weights: scoringWeights,
        ratingBoost: ratingBoostFor(recipe.id, mealRatings),
      };
      const score = scoreRecipe(recipe, ctx);
      if (score.total > bestScore) {
        bestScore = score.total;
        best = recipe;
        bestMatch = matchRecipeToInventory(recipe, inventory);
      }
    }

    if (!best || !bestMatch) continue;
    chosenThisWeek.push(best);

    meals.push({
      id: generateId('meal'),
      date: addDays(weekStartDate, day),
      recipeId: best.id,
      status: 'planned',
      inventoryMatchCount: bestMatch.matchedCount,
      totalIngredientCount: bestMatch.requiredCount,
      estimatedAdditionalCostUsd: Math.round(bestMatch.missingIngredientNames.length * ESTIMATED_COST_PER_MISSING_INGREDIENT * 100) / 100,
    });
  }

  return {
    id: generateId('plan'),
    weekStartDate,
    meals,
    generatedAt: nowIso(),
  };
}

export function generateSwapAlternatives(
  currentRecipeId: string,
  options: Omit<GenerateMealPlanOptions, 'weekStartDate' | 'numberOfDinners'> & { count?: number }
): Recipe[] {
  const { household, inventory, recipeLibrary, pastMeals, mealRatings, excludeRecipeIds = [], count = 3 } = options;

  const exclude = new Set([currentRecipeId, ...excludeRecipeIds]);
  const eligible = recipeLibrary.filter((r) => !exclude.has(r.id) && isRecipeSafeForHousehold(r, household));

  const recentCuisines = pastMeals.slice(-4).map((m) => recipeLibrary.find((r) => r.id === m.recipeId)?.cuisine).filter((c): c is string => Boolean(c));

  const scored = eligible.map((recipe) => ({
    recipe,
    score: scoreRecipe(recipe, {
      household,
      inventory,
      recentCuisines,
      weights: DEFAULT_SCORING_WEIGHTS,
      ratingBoost: ratingBoostFor(recipe.id, mealRatings),
    }).total,
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.recipe);
}
