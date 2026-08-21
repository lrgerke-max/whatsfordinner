# Data model

All types live in `src/types/` and are re-exported from `src/types/index.ts`. This
document explains the relationships and the reasoning behind the trickier fields —
read the source for exact shapes.

## The core relationship

```
Household  ──preferences/allergies/dislikes──▶  MealPlanningEngine
InventoryItem[] ──what we already own──────────▶  MealPlanningEngine
Recipe[] (seed library) ───────────────────────▶  MealPlanningEngine
                                                        │
                                                        ▼
                                                    MealPlan (7 Meals)
                                                        │
                                          MealPlan + Recipe[] + Inventory
                                                        ▼
                                                GroceryListEngine
                                                        │
                                                        ▼
                                                  GroceryList (only what's missing)
```

Everything in the product traces back to this: **the grocery list is the
difference between what the family wants to eat and what they already own.**

## Household (`src/types/household.ts`)

- `Household` — one per install (this MVP is single-household, single-device;
  see "Not built" below for the multi-household extension point). Holds
  `members[]`, `dinnerTime`, `cookingEffort`, `cookingTimePreference`, and
  `shopping` preferences.
- `HouseholdMember` — `role` (`adult`/`teen`/`kid`), optional `age` and
  `activityLevel` (used to scale protein targets for active teens), and a
  `foodPreference`.
- `FoodPreference` — `favoriteCuisines`, `dislikedFoods` (soft signal — scored
  down, not hard-excluded), `allergies` (hard exclusion — see
  `engines/dietaryRules.ts`), `dietaryRestrictions` (hard exclusion, shared
  meal is filtered for the whole household), `spiceTolerance`.
- `ShoppingPreference` — `preferredStores[]`, `budgetPreference`,
  `weeklyBudgetUsd`, `brandLoyalty`.

## Inventory (`src/types/inventory.ts`)

- `InventoryItem` — the atomic unit of "what's in the kitchen." Deliberately
  **qualitative by default**: `quantityLevel` is one of
  `full | mostly-full | half | some | nearly-empty | unknown`.
  `approxQuantity` is only populated when the source (scan or manual entry)
  actually supports a numeric estimate, and always carries `isApproximate`.
  `confidence` (0–1) is internal — the UI only surfaces it when it's low
  enough to warrant a "we aren't sure about this one" prompt
  (`needsReview`, threshold in `engines/inventoryMerge.ts`).
- `freshness` — `fresh | use-soon | likely-expired | unknown`. There's no
  `expirationDate` unless the user explicitly enters one; the app never
  infers a specific date from a scan.
- `source` — `'scan' | 'manual'`. Manually added items are always full
  confidence and never need review (see `app/inventory-item.tsx`).

## Scanning (`src/types/scan.ts`)

- `KitchenScan` — one record per completed scan (video metadata + resulting
  `KitchenAnalysis` + counts). History is kept (`store.scans`, capped at 20)
  so "last scanned N days ago" and future scan-history UI have something to
  read.
- `DetectedItem` — raw output from a `VisionProvider` call, *before* it's
  merged into inventory. Carries an optional `matchedInventoryItemId` when
  the (mock, or eventually real) vision step is confident this detection is
  the same physical item as something already tracked.
- `KitchenAnalysis` — `detectedItems[]` + `likelyRemovedItemIds[]` (items the
  scan is fairly confident are gone) + `areasObserved[]` + a one-line
  `summary`.

See `engines/inventoryMerge.ts` for how a `KitchenAnalysis` becomes an
updated `InventoryItem[]` — matched items update in place, new ones are
added, flagged-removed ones drop out, and anything the scan didn't mention
is left untouched (a two-minute tour rarely sees every shelf, and silence
isn't evidence of absence).

## Recipes & meal plans (`src/types/recipe.ts`, `src/types/mealPlan.ts`)

- `Recipe` — static seed content (`src/data/recipes.ts`, ~20 recipes across
  Italian/Brazilian/Mexican/American/Asian/Mediterranean). `ingredients[]`
  are `RecipeIngredient` with `quantity`/`unit`/optional `optional` flag.
- `Meal` — one planned dinner: a `date`, a `recipeId`, `status`
  (`planned`/`cooked`/`skipped`), the `inventoryMatchCount` /
  `totalIngredientCount` computed at generation time, an
  `estimatedAdditionalCostUsd`, and an optional `rating`.
- `MealPlan` — a week of `Meal[]` keyed by `weekStartDate` (always the
  current Monday — `utils/date.ts#startOfWeek`).
- `MealScoreBreakdown` / `MealScoringWeights` — the transparent scoring
  model (see `docs/ai-architecture.md` and `engines/mealPlanningEngine.ts`).
  Weights are a plain object, trivially tunable.

## Grocery (`src/types/grocery.ts`)

- `GroceryItem` — `department` (for section grouping), `reason` (a short
  "used in X, Y" string), `usedInRecipeIds[]` (for the "why am I buying
  this?" explanation, built on demand in
  `engines/groceryListEngine.ts#explainGroceryItem`), `checked`,
  `isCustom`, `alreadyHave`, and a mocked `estimatedPriceUsd` (see
  `docs/grocery-provider-architecture.md`).
- `GroceryList` — items for one `mealPlanId` / `weekStartDate`.

## Learning signals

There's no separate "preference model" type — learning is intentionally
lightweight and reads directly off data already being collected:
`mealRatings: Record<recipeId, RatingValue>` (in the main store) feeds a
`ratingBoost` into `scoreRecipe`, and a `never-again` rating hard-excludes a
recipe from future plans. `computeLearningInsight` (in `src/state/store.ts`)
looks for a repeated pattern (≥2 "loved" ratings sharing a cuisine + quick
cook time) and surfaces a one-line prompt on Home, gated by
`acknowledgedInsightKeys` so it only asks once.

## Persistence

Everything above (except the in-progress scan recording state) lives in one
Zustand store (`src/state/store.ts`) persisted to `AsyncStorage` via
`zustand/middleware`'s `persist`. The in-progress scan flow
(`src/state/scanFlowStore.ts` — recording status, local video URI, step
index) is intentionally a separate, non-persisted store: it's transient UI
state, not part of the household's durable memory.

## Not built (intentional extension points)

- **Multi-household / shared accounts.** `Household` is a singleton per
  install today. Making it `Household[]` + an active-household id, and
  swapping AsyncStorage for a synced backend (Supabase/Firebase — see the
  README's Architecture section), is additive and doesn't require touching
  the engines.
- **Server-persisted inventory / multi-device sync.** Same shape, different
  storage backend.
