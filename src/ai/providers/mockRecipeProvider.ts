import { generateSwapAlternatives, scoreRecipe } from '../../engines/mealPlanningEngine';
import { isRecipeSafeForHousehold } from '../../engines/dietaryRules';
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
    const eligible = input.recipeLibrary.filter(
      (r) => isRecipeSafeForHousehold(r, input.household) && (!input.cuisine || r.cuisine === input.cuisine)
    );
    const pool = eligible.length > 0 ? eligible : input.recipeLibrary;

    const focus = input.focusIngredientNames ?? [];
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
      excludeRecipeIds: input.excludeRecipeIds,
      count: input.count,
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
