export type MealStatus = 'planned' | 'cooked' | 'skipped';

export type RatingValue = 'loved' | 'good' | 'fine' | 'never-again';

export interface MealRating {
  id: string;
  mealId: string;
  recipeId: string;
  rating: RatingValue;
  ratedAt: string;
}

export interface Meal {
  id: string;
  date: string; // ISO date, e.g. 2026-08-24
  recipeId: string;
  status: MealStatus;
  /** ingredient count already owned vs required, computed at generation time */
  inventoryMatchCount: number;
  totalIngredientCount: number;
  estimatedAdditionalCostUsd: number;
  rating?: RatingValue;
}

export interface MealScoreBreakdown {
  inventoryUtilization: number;
  familyPreference: number;
  foodWastePrevention: number;
  cookingTime: number;
  nutrition: number;
  cuisineVariety: number;
  costEfficiency: number;
  total: number;
}

export interface MealScoringWeights {
  inventoryUtilization: number;
  familyPreference: number;
  foodWastePrevention: number;
  cookingTime: number;
  nutrition: number;
  cuisineVariety: number;
  costEfficiency: number;
}

export const DEFAULT_SCORING_WEIGHTS: MealScoringWeights = {
  inventoryUtilization: 0.3,
  familyPreference: 0.2,
  foodWastePrevention: 0.15,
  cookingTime: 0.15,
  nutrition: 0.1,
  cuisineVariety: 0.05,
  costEfficiency: 0.05,
};

export interface MealPlan {
  id: string;
  weekStartDate: string; // ISO date, Monday
  meals: Meal[];
  generatedAt: string;
}
