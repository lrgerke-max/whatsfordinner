export type MemberRole = 'adult' | 'teen' | 'kid';

export type ActivityLevel = 'low' | 'moderate' | 'high';

export type SpiceTolerance = 'mild' | 'medium' | 'hot' | 'very-hot';

export type CookingEffort =
  | 'almost-no-effort'
  | 'easy-weeknight'
  | 'enjoy-cooking'
  | 'variety';

export type CookingTimePreference = 'under-20' | '20-30' | '30-45' | '45-60' | 'no-preference';

export type BrandLoyalty = 'cheapest' | 'best-value' | 'preferred-brands' | 'no-preference';

export type BudgetPreference = 'tight' | 'moderate' | 'flexible';

export interface FoodPreference {
  favoriteCuisines: string[];
  dislikedFoods: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  spiceTolerance: SpiceTolerance;
}

export interface HouseholdMember {
  id: string;
  name: string;
  role: MemberRole;
  age?: number;
  originCuisine?: string;
  activityLevel?: ActivityLevel;
  foodPreference: FoodPreference;
}

export interface ShoppingPreference {
  preferredStores: string[];
  budgetPreference: BudgetPreference;
  weeklyBudgetUsd?: number;
  brandLoyalty: BrandLoyalty;
}

export interface Household {
  id: string;
  name: string;
  members: HouseholdMember[];
  dinnerTime: string; // "HH:mm" 24h
  cookingEffort: CookingEffort;
  cookingTimePreference: CookingTimePreference;
  shopping: ShoppingPreference;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CUISINE_OPTIONS = [
  'American',
  'Italian',
  'Brazilian',
  'Mexican',
  'Asian',
  'Chinese',
  'Japanese',
  'Korean',
  'Thai',
  'Mediterranean',
  'Indian',
  'French',
  'Greek',
  'MiddleEastern',
] as const;

export const DIETARY_RESTRICTION_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Nut-free',
  'Low-carb',
  'Pescatarian',
  'Kosher',
  'Halal',
] as const;

export const COMMON_ALLERGY_OPTIONS = [
  'Peanuts',
  'Tree nuts',
  'Shellfish',
  'Fish',
  'Eggs',
  'Dairy',
  'Soy',
  'Wheat',
  'Sesame',
] as const;
