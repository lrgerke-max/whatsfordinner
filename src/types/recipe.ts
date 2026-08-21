export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
  /** e.g. "for the sauce" */
  group?: string;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  imageEmoji: string;
  cookTimeMinutes: number;
  difficulty: Difficulty;
  servings: number;
  proteinGrams: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
}
