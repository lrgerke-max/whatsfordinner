import { generateMealPlan } from '../../engines/mealPlanningEngine';
import { MealPlan } from '../../types/mealPlan';
import { MealPlanningInput, MealPlanningProvider } from '../types';

/**
 * Mock MealPlanningProvider. The "intelligence" here is a deterministic,
 * fully-tested scoring engine (see src/engines/mealPlanningEngine.ts) rather
 * than an LLM call — a real provider could swap in an LLM-based planner
 * behind this same interface, but a transparent scoring model is arguably
 * the *better* long-term choice for something as trust-sensitive as "what
 * will my family eat this week."
 */
export class MockMealPlanningProvider implements MealPlanningProvider {
  async generateMealPlan(input: MealPlanningInput): Promise<MealPlan> {
    await delay(300);
    return generateMealPlan({
      household: input.household,
      inventory: input.inventory,
      recipeLibrary: input.recipeLibrary,
      pastMeals: input.pastMeals,
      mealRatings: input.mealRatings,
      weekStartDate: input.weekStartDate,
      numberOfDinners: input.numberOfDinners,
      scoringWeights: input.scoringWeights,
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
