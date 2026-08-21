import { MockVisionProvider } from './providers/mockVisionProvider';
import { MockMealPlanningProvider } from './providers/mockMealPlanningProvider';
import { MockRecipeProvider } from './providers/mockRecipeProvider';
import { KitchenScanProcessor } from './kitchenScanProcessor';

export * from './types';
export { PROCESSING_STEPS } from './kitchenScanProcessor';

/**
 * Single place the rest of the app asks for AI capabilities. Today this
 * always resolves to the mock providers so the product works with zero API
 * keys. To connect a real model:
 *
 *   1. Implement VisionProvider / MealPlanningProvider / RecipeProvider in
 *      src/ai/providers/real/ (a server-side proxy, not a direct client
 *      call — see providers/real/README.md for why).
 *   2. Set EXPO_PUBLIC_AI_PROVIDER=real and fill in .env per .env.example.
 *   3. Swap the constructions below.
 *
 * No screen or store imports a concrete provider directly — only this file.
 */
export const visionProvider = new MockVisionProvider();
export const mealPlanningProvider = new MockMealPlanningProvider();
export const recipeProvider = new MockRecipeProvider();
export const kitchenScanProcessor = new KitchenScanProcessor(visionProvider);
