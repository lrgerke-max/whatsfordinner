import { Household } from '../types/household';
import { InventoryItem } from '../types/inventory';
import { KitchenAnalysis, ScanArea } from '../types/scan';
import { Recipe } from '../types/recipe';
import { Meal, MealPlan, MealScoringWeights, RatingValue } from '../types/mealPlan';

/**
 * AI provider abstractions.
 *
 * Kitchen Memory never hard-codes itself to a single AI vendor. Every screen
 * talks to these interfaces, not to OpenAI/Anthropic/Gemini directly. Today
 * they're backed by deterministic Mock* implementations so the whole product
 * works with zero API keys. A "Real*" adapter can implement the same
 * interface later (see src/ai/providers/real/README.md) and be swapped in
 * via src/ai/index.ts without touching a single screen.
 */

export interface VideoInput {
  uri: string;
  durationSeconds: number;
  isDemoVideo: boolean;
}

export interface VisionProvider {
  /**
   * Analyze a kitchen-tour video and return what could plausibly be
   * identified. Implementations must prefer "unknown" over a confident
   * guess — false precision is worse than an honest gap.
   */
  analyzeKitchenVideo(
    video: VideoInput,
    previousInventory: InventoryItem[]
  ): Promise<KitchenAnalysis>;
}

export interface MealPlanningInput {
  household: Household;
  inventory: InventoryItem[];
  recipeLibrary: Recipe[];
  pastMeals: Meal[];
  mealRatings: Record<string, RatingValue>; // recipeId -> most recent rating
  weekStartDate: string;
  numberOfDinners: number;
  scoringWeights?: MealScoringWeights;
}

export interface MealPlanningProvider {
  generateMealPlan(input: MealPlanningInput): Promise<MealPlan>;
}

export interface RecipeSwapInput {
  currentRecipeId: string;
  household: Household;
  inventory: InventoryItem[];
  recipeLibrary: Recipe[];
  excludeRecipeIds: string[];
  count?: number;
}

export interface RecipeInput {
  household: Household;
  inventory: InventoryItem[];
  recipeLibrary: Recipe[];
  focusIngredientNames?: string[];
  cuisine?: string;
}

export interface RecipeProvider {
  generateRecipe(input: RecipeInput): Promise<Recipe>;
  suggestAlternatives(input: RecipeSwapInput): Promise<Recipe[]>;
}

export const SCAN_AREA_LABELS: Record<ScanArea, string> = {
  refrigerator: 'Refrigerator',
  freezer: 'Freezer',
  pantry: 'Pantry',
  cabinets: 'Cabinets',
  countertops: 'Countertops',
};
