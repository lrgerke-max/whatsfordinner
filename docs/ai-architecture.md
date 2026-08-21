# AI provider architecture

Kitchen Memory never hard-codes itself to a single AI vendor, and it never
pretends to know more than it does. This doc explains the abstraction, what
the mock implementations actually do, and exactly how to wire in a real
model later.

## The interfaces (`src/ai/types.ts`)

```ts
interface VisionProvider {
  analyzeKitchenVideo(video: VideoInput, previousInventory: InventoryItem[]): Promise<KitchenAnalysis>;
}

interface MealPlanningProvider {
  generateMealPlan(input: MealPlanningInput): Promise<MealPlan>;
}

interface RecipeProvider {
  generateRecipe(input: RecipeInput): Promise<Recipe>;
  suggestAlternatives(input: RecipeSwapInput): Promise<Recipe[]>;
}
```

No screen, no store, imports a concrete provider. Everything goes through
`src/ai/index.ts`, which is the **only** file that constructs providers:

```ts
export const visionProvider = new MockVisionProvider();
export const mealPlanningProvider = new MockMealPlanningProvider();
export const recipeProvider = new MockRecipeProvider();
export const kitchenScanProcessor = new KitchenScanProcessor(visionProvider);
```

Swap those three constructions for `Real*Provider` implementations and the
rest of the app doesn't change.

## What the mocks actually do (and don't fake)

### `MockVisionProvider` (`src/ai/providers/mockVisionProvider.ts`)

- **Demo video** (`video.isDemoVideo === true`, used by "Use Demo Video" in
  the scan flow): returns a hand-scripted but *dynamically matched*
  "week two" scan (`src/ai/mockData/demoScan.ts`) — it looks up each
  scripted detection against whatever inventory is currently in the store by
  name, so it behaves sensibly even if you edit the seed data. This is what
  makes the zero-config demo flow (see the README) reliable.
- **Any other video** (a real recording or an uploaded file): since there's
  no real computer vision here, `simulateGenericScan` produces a plausible
  but clearly synthetic result — a seeded random subset of a common-staples
  pool (`GENERIC_ITEM_POOL`), confidence jittered, longer videos "seeing"
  more items. It is seeded by the video's URI + duration so the same input
  produces stable output, and it's the same function whether you record on
  camera or pick a file — the recording pipeline is complete, only the
  "vision" step is mocked.
- **Honesty rules baked into both paths**: quantities stay qualitative
  unless the mock explicitly attaches an `approxQuantity`, confidence is
  capped, and a handful of previously-known items are marked "likely
  removed" only probabilistically and in small numbers — never overclaiming
  what a short video could actually support.

### `MockMealPlanningProvider` (`src/ai/providers/mockMealPlanningProvider.ts`)

This one is barely a "mock" — it's a thin async wrapper around
`engines/mealPlanningEngine.ts`, a fully deterministic, unit-tested scoring
algorithm (see below). That's a deliberate choice, not a placeholder: for
something as trust-sensitive as "what will my family eat this week," a
transparent, debuggable scoring model is arguably the *right* long-term
answer, not just a stand-in for an LLM. A real provider could still swap in
an LLM-based planner behind the same interface if you want one.

### `MockRecipeProvider` (`src/ai/providers/mockRecipeProvider.ts`)

Selects and ranks from the seed recipe library (`src/data/recipes.ts`)
rather than synthesizing new recipes — `generateRecipe` for "build a meal
from these [about-to-expire ingredients]" (Save My Food), `suggestAlternatives`
for the swap flow. A real provider could generate genuinely novel recipes
here; the engine's dietary-safety filtering (`engines/dietaryRules.ts`)
should stay in code either way, not left to prompt-following.

## The meal-planning scoring model (`src/engines/mealPlanningEngine.ts`)

Every candidate recipe gets a 0–1 score per component, combined with
configurable weights (`DEFAULT_SCORING_WEIGHTS` in `src/types/mealPlan.ts`):

| Component | Default weight | What it measures |
|---|---|---|
| `inventoryUtilization` | 30% | fraction of required ingredients already owned (coverage ≥ 40%) |
| `familyPreference` | 20% | cuisine matches favorites, penalized for disliked-ingredient collisions |
| `foodWastePrevention` | 15% | recipe uses ingredients currently `use-soon` |
| `cookingTime` | 15% | fits the household's stated time bucket |
| `nutrition` | 10% | protein target scaled up for active teens |
| `cuisineVariety` | 5% | penalized if the cuisine appeared in the last few meals |
| `costEfficiency` | 5% | fewer ingredients to buy, bonus for pantry/use-it-up tags |

Two things happen **before** scoring, not as part of it:

1. **Hard safety filter** (`engines/dietaryRules.ts#isRecipeSafeForHousehold`):
   any recipe containing an allergen any member has, or violating a strict
   dietary restriction (vegetarian/vegan/gluten-free/dairy-free/pescatarian)
   any member has, is disqualified outright — not down-ranked. A shared
   family dinner has to be safe for everyone at the table.
2. **Never-again exclusion**: a recipe rated `never-again` is dropped from
   candidates for future plans.

`generateMealPlan` then greedily picks the highest-scoring eligible recipe
per day, tracking what's already chosen this week (and recent weeks, via
`pastMeals`) to avoid repeats and keep cuisine variety climbing across the
plan. See `__tests__/mealPlanningEngine.test.ts` for the behavioral
guarantees this is tested against.

## Wiring in a real model

See `src/ai/providers/real/README.md` — short version:

1. Implement the interfaces server-side (never call a model API directly
   from the mobile client — see the Security section of the root README).
2. For vision: sample frames from the video, don't upload raw video to a
   chat-style call; ask for structured JSON matching `KitchenAnalysis`
   (schema-constrained output strongly preferred over freeform parsing).
3. Keep the same honesty constraints the mock enforces — prefer `"unknown"`
   over invented precision, and drive `needsReview` off a real confidence
   threshold.
4. Point `src/ai/index.ts` at the new classes. Nothing else changes.
