import { generateSwapAlternatives, scoreRecipe } from '../../engines/mealPlanningEngine';
import { isRecipeSafeForHousehold } from '../../engines/dietaryRules';
import { createInventoryMatcher } from '../../engines/inventoryMatch';
import { DEFAULT_SCORING_WEIGHTS } from '../../types/mealPlan';
import { Recipe } from '../../types/recipe';
import { RecipeInput, RecipeProvider, RecipeSwapInput } from '../types';

/**
 * Mock RecipeProvider. "Generation" here means selecting and ranking from
 * the curated recipe library rather than synthesizing a brand-new recipe —
 * a real provider (LLM-backed) could generate genuinely novel recipes
 * behind this same interface without any screen changing.
 */
export class MockRecipeProvider implements RecipeProvider {
  async generateRecipe(input: RecipeInput): Promise<Recipe> {
    await delay(250);
    const excludeIds = new Set(input.excludeRecipeIds ?? []);
    const withoutExcluded = input.recipeLibrary.filter((r) => !excludeIds.has(r.id));
    const eligible = withoutExcluded.filter(
      (r) =>
        isRecipeSafeForHousehold(r, input.household) &&
        (!input.cuisine || r.cuisine === input.cuisine) &&
        input.mealRatings?.[r.id] !== 'never-again'
    );
    const pool = eligible.length > 0 ? eligible : withoutExcluded.length > 0 ? withoutExcluded : input.recipeLibrary;

    const focus = input.focusIngredientNames ?? [];
    // Memoized inventory matching — scoring the full library re-checks the
    // same ingredients thousands of times otherwise.
    const matcher = createInventoryMatcher(input.inventory);
    const scored = pool.map((recipe) => {
      const focusScore =
        focus.length > 0
          ? recipe.ingredients.filter((ing) => focus.some((f) => ing.name.toLowerCase().includes(f.toLowerCase()))).length /
            focus.length
          : 0;
      const base = scoreRecipe(recipe, {
        household: input.household,
        inventory: input.inventory,
        recentCuisines: [],
        weights: DEFAULT_SCORING_WEIGHTS,
        matcher,
      }).total;
      return { recipe, score: base + focusScore * 0.5 };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.recipe ?? pool[0];
  }

  async suggestAlternatives(input: RecipeSwapInput): Promise<Recipe[]> {
    await delay(250);
    return generateSwapAlternatives(input.currentRecipeId, {
      household: input.household,
      inventory: input.inventory,
      recipeLibrary: input.recipeLibrary,
      pastMeals: [],
      mealRatings: input.mealRatings,
      excludeRecipeIds: input.excludeRecipeIds,
      count: input.count,
      seed: input.seed,
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
