import { generateId } from '../utils/id';
import { addDays, nowIso, startOfWeek } from '../utils/date';
import { hashString } from '../utils/hash';

/** Local-calendar Monday for "this week" (engine-internal fallback). */
function startOfWeekIso(): string {
  return startOfWeek(new Date());
}
import { Household, CookingTimePreference } from '../types/household';
import { InventoryItem } from '../types/inventory';
import { Recipe } from '../types/recipe';
import { Meal, MealPlan, MealScoreBreakdown, MealScoringWeights, DEFAULT_SCORING_WEIGHTS, RatingValue } from '../types/mealPlan';
import { SpecialRequest } from '../types/specialRequests';
import { estimateCoverage, findInventoryMatch, createInventoryMatcher, InventoryMatcher } from './inventoryMatch';
import { dislikeCollisionScore, createSafetyChecker } from './dietaryRules';

const COVERAGE_HAVE_THRESHOLD = 0.4;
export const ESTIMATED_COST_PER_MISSING_INGREDIENT = 2.75;
const REQUEST_PREFERENCE_BOOST = 0.15;

const REQUEST_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'have',
  'has',
  'want',
  'wants',
  'can',
  'could',
  'would',
  'will',
  'please',
  'night',
  'dinner',
  'tonight',
  'some',
  'just',
  'really',
  'again',
  'week',
  'food',
  'meal',
  'make',
  'made',
  'her',
  'his',
  'their',
  'its',
  'our',
  'your',
]);

function tokenizeRequestText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !REQUEST_STOPWORDS.has(token));
}

/** Plural-insensitive token form so "taco" meets "tacos" without a stemmer. */
function normalizeToken(token: string): string {
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

interface RecipeTokenSets {
  primary: Set<string>;
  secondary: Set<string>;
}

function recipeTokenSets(recipe: Recipe): RecipeTokenSets {
  const primary = new Set<string>();
  const secondary = new Set<string>();
  for (const part of [recipe.name, recipe.cuisine]) {
    for (const token of tokenizeRequestText(part)) primary.add(normalizeToken(token));
  }
  for (const tag of recipe.tags) {
    for (const token of tokenizeRequestText(tag)) secondary.add(normalizeToken(token));
  }
  return { primary, secondary };
}

// Recipe libraries are immutable at runtime, so token sets are computed once
// per library array (not once per request match) — planning retokenizes on
// every regeneration otherwise.
const tokenSetsCache = new WeakMap<Recipe[], Array<{ id: string; tokens: RecipeTokenSets }>>();

function recipeTokenSetsForLibrary(recipeLibrary: Recipe[]): Array<{ id: string; tokens: RecipeTokenSets }> {
  const cached = tokenSetsCache.get(recipeLibrary);
  if (cached) return cached;
  const built = recipeLibrary.map((recipe) => ({ id: recipe.id, tokens: recipeTokenSets(recipe) }));
  tokenSetsCache.set(recipeLibrary, built);
  return built;
}

/**
 * Case-insensitive token overlap between request text and recipe name/cuisine/tags.
 * Name/cuisine hits outweigh tag hits; ties keep the earliest recipe in the library.
 */
export function matchRequestsToRecipes(requests: SpecialRequest[], recipeLibrary: Recipe[]): Map<string, string> {
  const matches = new Map<string, string>();
  if (requests.length === 0) return matches;
  const tokenSets = recipeTokenSetsForLibrary(recipeLibrary);
  for (const request of requests) {
    const tokens = tokenizeRequestText(request.text).map(normalizeToken);
    let bestId: string | undefined;
    let bestScore = 0;
    for (const entry of tokenSets) {
      let score = 0;
      for (const token of tokens) {
        if (entry.tokens.primary.has(token)) score += 2;
        else if (entry.tokens.secondary.has(token)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.id;
      }
    }
    if (bestId) matches.set(request.id, bestId);
  }
  return matches;
}

/**
 * Recomputes request statuses against a freshly generated plan: matched requests
 * whose recipe landed in the plan become 'planned', planned ones whose recipe
 * fell out revert to 'open', done ones are untouched.
 */
export function reconcileRequests(plan: MealPlan, requests: SpecialRequest[], recipeLibrary: Recipe[]): SpecialRequest[] {
  const matches = matchRequestsToRecipes(
    requests.filter((r) => r.status !== 'done'),
    recipeLibrary
  );
  return requests.map((request) => {
    if (request.status === 'done') return request;
    const matchedRecipeId = request.matchedRecipeId ?? matches.get(request.id);
    if (!matchedRecipeId) {
      return { ...request, status: 'open' as const, matchedMealDate: undefined, matchedRecipeId: undefined };
    }
    // Two requests can match the same recipe; prefer the meal on this
    // request's own preferred night so both aren't reported against whichever
    // date happened to win that recipe.
    const meal =
      (request.preferredDate &&
        plan.meals.find((m) => m.recipeId === matchedRecipeId && m.date === request.preferredDate && m.status !== 'skipped')) ||
      plan.meals.find((m) => m.recipeId === matchedRecipeId && m.status !== 'skipped');
    if (!meal) {
      return { ...request, status: 'open' as const, matchedMealDate: undefined, matchedRecipeId: undefined };
    }
    return { ...request, status: 'planned' as const, matchedRecipeId, matchedMealDate: meal.date };
  });
}

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

export function matchRecipeToInventory(recipe: Recipe, inventory: InventoryItem[], matcher: InventoryMatcher = (name) => findInventoryMatch(name, inventory)): RecipeInventoryMatch {
  const required = recipe.ingredients.filter((i) => !i.optional);
  let matchedCount = 0;
  const missing: string[] = [];

  for (const ingredient of required) {
    const item = matcher(ingredient.name);
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

function scoreFoodWastePrevention(recipe: Recipe, useSoonCount: number, useSoonHitsForRecipe: number): number {
  if (useSoonCount === 0) return 0.3;
  return Math.min(1, 0.3 + (useSoonHitsForRecipe / useSoonCount) * 0.9);
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
  requestBoost?: number; // preference bump for recipes tied to an open request
  matcher?: InventoryMatcher; // memoized inventory lookup for bulk scoring
  useSoonCount?: number; // |inventory.freshness === 'use-soon'|, precomputed
  useSoonHits?: Map<string, number>; // recipeId -> use-soon items it uses
}

export function scoreRecipe(recipe: Recipe, ctx: ScoringContext): MealScoreBreakdown {
  const match = matchRecipeToInventory(recipe, ctx.inventory, ctx.matcher);
  const inventoryUtilization = scoreInventoryUtilization(match);
  const familyPreference = Math.max(
    0,
    Math.min(1, scoreFamilyPreference(recipe, ctx.household) + (ctx.ratingBoost ?? 0) + (ctx.requestBoost ?? 0))
  );
  const useSoonCount = ctx.useSoonCount ?? ctx.inventory.filter((i) => i.freshness === 'use-soon').length;
  const foodWastePrevention = scoreFoodWastePrevention(
    recipe,
    useSoonCount,
    ctx.useSoonHits?.get(recipe.id) ?? 0
  );
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
  specialRequests?: SpecialRequest[];
  /**
   * Meals already cooked this week (a same-week regeneration keeps them
   * as-is). Kept verbatim in the output and treated as already "chosen" —
   * nothing, including a dated request, can be forced onto their date.
   */
  lockedMeals?: Meal[];
  /**
   * Varies the plan without changing any input: a deterministic per-recipe
   * jitter derived from (seed, recipeId) reorders near-tied candidates, so
   * "give me different options" produces a genuinely different — but still
   * reproducible — week. Omitted/0 keeps the classic best-score behavior.
   */
  seed?: number;
}

const SEED_JITTER = 0.15;

/** Deterministic 0..SEED_JITTER score bump unique to (seed, recipeId). */
function seedJitterFor(recipeId: string, seed: number | undefined): number {
  if (!seed) return 0;
  return ((hashString(`${seed}::${recipeId}`) % 1000) / 1000) * SEED_JITTER;
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
    specialRequests = [],
    lockedMeals = [],
    seed,
  } = options;

  const lockedByDate = new Map(lockedMeals.map((m) => [m.date, m]));

  const matcher = createInventoryMatcher(inventory);
  const safetyCheck = createSafetyChecker(household);
  const explicitExcludeIds = new Set(excludeRecipeIds);
  const recentRecipeIds = new Set([...pastMeals.slice(-10).map((m) => m.recipeId), ...excludeRecipeIds]);
  const eligible = recipeLibrary.filter(
    (r) => safetyCheck(r) && (mealRatings?.[r.id] !== 'never-again')
  );
  // Fulfilled requests carry no forward-looking claim on a night — only open
  // ones should force a recipe into a new plan or earn the preference boost.
  const openRequests = specialRequests.filter((r) => r.status !== 'done');

  // A garbage weekStartDate would silently produce "NaN-NaN-NaN" meal dates;
  // fall back to a sane Monday instead of rendering nonsense.
  const safeWeekStart = /^\d{4}-\d{2}-\d{2}$/.test(weekStartDate ?? '') ? weekStartDate : startOfWeekIso();

  const recentCuisines: string[] = pastMeals
    .slice(-4)
    .map((m) => recipeLibrary.find((r) => r.id === m.recipeId)?.cuisine)
    .filter((c): c is string => Boolean(c));

  const requestMatches = matchRequestsToRecipes(openRequests, recipeLibrary);
  const requestedRecipeIds = new Set(requestMatches.values());

  // date -> recipeId for requests that asked for a specific night. Built
  // BEFORE the undated forced list so dated recipes are not stolen by the
  // day-0 cursor and dropped from their preferred night later.
  const forcedByDate = new Map<string, string>();
  // Two open requests can independently match the same recipe (e.g. two
  // people each ask for "tacos" on different nights) — only the first date
  // may claim it, so the second falls through to normal scoring instead of
  // silently losing its night at meal-build time and misreporting its date.
  const claimedRecipeIds = new Set<string>();
  for (const request of openRequests) {
    if (!request.preferredDate) continue;
    // Dates outside the planned week (a past "Taco Tuesday" after a week
    // rollover) can never claim a night — route them through the undated
    // forced list instead of letting the request silently weaken to a boost.
    const inPlanWeek = request.preferredDate >= safeWeekStart && request.preferredDate <= addDays(safeWeekStart, numberOfDinners - 1);
    if (!inPlanWeek) continue;
    // Already cooked — nothing can still claim that night.
    if (lockedByDate.has(request.preferredDate)) continue;
    const recipeId = requestMatches.get(request.id);
    if (!recipeId || forcedByDate.has(request.preferredDate)) continue;
    if (!eligible.some((r) => r.id === recipeId)) continue;
    // A recipe the caller explicitly asked to exclude (e.g. a "shuffle this
    // night" reshuffle) outranks a stale request match — let it fall back to
    // normal scoring (and stay unfulfilled) rather than force it right back.
    if (explicitExcludeIds.has(recipeId)) continue;
    if (claimedRecipeIds.has(recipeId)) continue;
    forcedByDate.set(request.preferredDate, recipeId);
    claimedRecipeIds.add(recipeId);
  }

  // Requests force their recipe into the plan, bypassing cuisine-repetition
  // and recency penalties; allergen/dietary safety still applies via `eligible`.
  // Dated requests are handled by forcedByDate, never by this cursor.
  const datedIds = new Set(forcedByDate.values());
  const forcedRecipeIds: string[] = [];
  for (const recipeId of requestMatches.values()) {
    if (!datedIds.has(recipeId) && !forcedRecipeIds.includes(recipeId)) forcedRecipeIds.push(recipeId);
  }
  const forceableRecipeIds = forcedRecipeIds.filter(
    (id) => eligible.some((r) => r.id === id) && !explicitExcludeIds.has(id)
  );
  let forcedCursor = 0;

  const chosenThisWeek: Recipe[] = [];
  const meals: Meal[] = [];

  // Food-waste scoring needs "which recipes use my use-soon items" — computed
  // once per plan here instead of per candidate per day inside the scorer.
  const useSoonItems = inventory.filter((i) => i.freshness === 'use-soon');
  const useSoonHits = new Map<string, number>();
  for (const recipe of eligible) {
    let hits = 0;
    for (const item of useSoonItems) {
      if (recipe.ingredients.some((ing) => findInventoryMatch(ing.name, [item]) !== undefined)) hits += 1;
    }
    if (hits > 0) useSoonHits.set(recipe.id, hits);
  }

  const buildMealFor = (recipe: Recipe, date: string): Meal => {
    const match = matchRecipeToInventory(recipe, inventory, matcher);
    return {
      id: generateId('meal'),
      date,
      recipeId: recipe.id,
      status: 'planned',
      inventoryMatchCount: match.matchedCount,
      totalIngredientCount: match.requiredCount,
      estimatedAdditionalCostUsd:
        Math.round(match.missingIngredientNames.length * ESTIMATED_COST_PER_MISSING_INGREDIENT * 100) / 100,
    };
  };

  for (let day = 0; day < numberOfDinners; day += 1) {
    const thisDate = addDays(safeWeekStart, day);

    // Already cooked this week — keep it exactly as-is and count its recipe
    // as used so other nights don't get scored against a stale duplicate.
    const lockedMeal = lockedByDate.get(thisDate);
    if (lockedMeal) {
      const lockedRecipe = recipeLibrary.find((r) => r.id === lockedMeal.recipeId);
      if (lockedRecipe) chosenThisWeek.push(lockedRecipe);
      meals.push(lockedMeal);
      continue;
    }

    // Dated requests claim their night first (one per date).
    const datedRecipeId = forcedByDate.get(thisDate);
    if (datedRecipeId) {
      const usedIdsSoFar = new Set(chosenThisWeek.map((r) => r.id));
      if (!usedIdsSoFar.has(datedRecipeId)) {
        const datedRecipe = eligible.find((r) => r.id === datedRecipeId);
        if (datedRecipe) {
          chosenThisWeek.push(datedRecipe);
          meals.push(buildMealFor(datedRecipe, thisDate));
          continue;
        }
      }
    }

    if (forcedCursor < forceableRecipeIds.length) {
      const forcedRecipe = eligible.find((r) => r.id === forceableRecipeIds[forcedCursor]);
      if (forcedRecipe && !chosenThisWeek.some((r) => r.id === forcedRecipe.id)) {
        forcedCursor += 1;
        chosenThisWeek.push(forcedRecipe);
        meals.push(buildMealFor(forcedRecipe, thisDate));
        continue;
      }
      if (forcedRecipe) {
        // Already placed on its preferred night — skip to next request.
        forcedCursor += 1;
      }
    }

    // Recipes reserved for a LATER dated request must not be picked by
    // general scoring today — otherwise the reservation on its own night
    // finds the recipe already used and silently evaporates.
    const reservedForLater = new Set(
      [...forcedByDate.entries()].filter(([date]) => date > thisDate).map(([, recipeId]) => recipeId)
    );

    const usedIdsThisWeek = new Set(chosenThisWeek.map((r) => r.id));
    let candidates = eligible.filter((r) => !usedIdsThisWeek.has(r.id) && !recentRecipeIds.has(r.id) && !reservedForLater.has(r.id));
    if (candidates.length === 0) candidates = eligible.filter((r) => !usedIdsThisWeek.has(r.id) && !reservedForLater.has(r.id));
    // Last-resort pool (tiny libraries): suppress the request boost so one
    // requested dish can't monopolize every remaining night of the week.
    // Dated reservations still hold even here — repeats beat broken promises.
    const isLastResortPool = candidates.length === 0;
    if (isLastResortPool) candidates = eligible.filter((r) => !reservedForLater.has(r.id));

    let best: Recipe | undefined;
    let bestScore = -Infinity;
    const dayRecentCuisines = [...recentCuisines, ...chosenThisWeek.map((r) => r.cuisine)];

    for (const recipe of candidates) {
      const ctx: ScoringContext = {
        household,
        inventory,
        recentCuisines: dayRecentCuisines,
        weights: scoringWeights,
        ratingBoost: ratingBoostFor(recipe.id, mealRatings),
        requestBoost: !isLastResortPool && requestedRecipeIds.has(recipe.id) ? REQUEST_PREFERENCE_BOOST : 0,
        matcher,
        useSoonCount: useSoonItems.length,
        useSoonHits,
      };
      const score = scoreRecipe(recipe, ctx).total + seedJitterFor(recipe.id, seed);
      if (score > bestScore) {
        bestScore = score;
        best = recipe;
      }
    }

    if (!best) continue;
    chosenThisWeek.push(best);
    meals.push(buildMealFor(best, addDays(safeWeekStart, day)));
  }

  return {
    id: generateId('plan'),
    weekStartDate: safeWeekStart,
    meals,
    generatedAt: nowIso(),
  };
}

export function generateSwapAlternatives(
  currentRecipeId: string,
  options: Omit<GenerateMealPlanOptions, 'weekStartDate' | 'numberOfDinners'> & { count?: number }
): Recipe[] {
  const { household, inventory, recipeLibrary, pastMeals, mealRatings, excludeRecipeIds = [], count = 3, seed } = options;

  const matcher = createInventoryMatcher(inventory);
  const safetyCheck = createSafetyChecker(household);
  const exclude = new Set([currentRecipeId, ...excludeRecipeIds]);
  // Same contract as plan generation: "never again" means never again, on the
  // swap screen too — not merely a heavy ranking penalty.
  const eligible = recipeLibrary.filter(
    (r) => !exclude.has(r.id) && safetyCheck(r) && mealRatings?.[r.id] !== 'never-again'
  );

  const recentCuisines = pastMeals.slice(-4).map((m) => recipeLibrary.find((r) => r.id === m.recipeId)?.cuisine).filter((c): c is string => Boolean(c));

  const useSoonItems = inventory.filter((i) => i.freshness === 'use-soon');
  const useSoonHits = new Map<string, number>();
  for (const recipe of eligible) {
    let hits = 0;
    for (const item of useSoonItems) {
      if (recipe.ingredients.some((ing) => findInventoryMatch(ing.name, [item]) !== undefined)) hits += 1;
    }
    if (hits > 0) useSoonHits.set(recipe.id, hits);
  }

  const scored = eligible.map((recipe) => ({
    recipe,
    score: scoreRecipe(recipe, {
      household,
      inventory,
      recentCuisines,
      weights: DEFAULT_SCORING_WEIGHTS,
      ratingBoost: ratingBoostFor(recipe.id, mealRatings),
      matcher,
      useSoonCount: useSoonItems.length,
      useSoonHits,
    }).total + seedJitterFor(recipe.id, seed),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.recipe);
}
