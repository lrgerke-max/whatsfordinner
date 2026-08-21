import { generateId } from '../src/utils/id';
import { nowIso } from '../src/utils/date';
import { Household, HouseholdMember } from '../src/types/household';
import { InventoryItem } from '../src/types/inventory';
import { Recipe } from '../src/types/recipe';

export function buildMember(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return {
    id: generateId('member'),
    name: 'Test Member',
    role: 'adult',
    foodPreference: {
      favoriteCuisines: [],
      dislikedFoods: [],
      allergies: [],
      dietaryRestrictions: [],
      spiceTolerance: 'medium',
    },
    ...overrides,
  };
}

export function buildHousehold(overrides: Partial<Household> = {}, members: HouseholdMember[] = [buildMember()]): Household {
  const now = nowIso();
  return {
    id: generateId('household'),
    name: 'Test Household',
    dinnerTime: '18:30',
    cookingEffort: 'easy-weeknight',
    cookingTimePreference: '30-45',
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
    shopping: { preferredStores: [], budgetPreference: 'moderate', brandLoyalty: 'no-preference' },
    members,
    ...overrides,
  };
}

export function buildInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  const now = nowIso();
  return {
    id: generateId('item'),
    name: 'Test Item',
    category: 'other',
    location: 'pantry',
    quantityLevel: 'mostly-full',
    confidence: 0.9,
    freshness: 'fresh',
    isNew: false,
    needsReview: false,
    source: 'scan',
    addedAt: now,
    updatedAt: now,
    lastSeenAt: now,
    ...overrides,
  };
}

let recipeCounter = 0;
export function buildRecipe(overrides: Partial<Recipe> = {}): Recipe {
  recipeCounter += 1;
  return {
    id: `recipe_test_${recipeCounter}`,
    name: `Test Recipe ${recipeCounter}`,
    cuisine: 'American',
    description: 'A test recipe.',
    imageEmoji: '🍽️',
    cookTimeMinutes: 30,
    difficulty: 'easy',
    servings: 4,
    proteinGrams: 25,
    tags: [],
    ingredients: [
      { id: `ing_test_${recipeCounter}_1`, name: 'chicken breast', quantity: 1, unit: 'lb' },
      { id: `ing_test_${recipeCounter}_2`, name: 'rice', quantity: 1, unit: 'cup' },
    ],
    instructions: ['Cook it.'],
    ...overrides,
  };
}
