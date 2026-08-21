import { generateId } from '../utils/id';
import { nowIso } from '../utils/date';
import { Household } from '../types/household';

export function buildSeedHousehold(): Household {
  const now = nowIso();
  return {
    id: generateId('household'),
    name: 'The Gerke Family',
    dinnerTime: '20:30',
    cookingEffort: 'easy-weeknight',
    cookingTimePreference: '30-45',
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
    shopping: {
      preferredStores: ['Walmart', "Trader Joe's"],
      budgetPreference: 'moderate',
      weeklyBudgetUsd: 175,
      brandLoyalty: 'cheapest',
    },
    members: [
      {
        id: generateId('member'),
        name: 'Lauren',
        role: 'adult',
        age: 44,
        foodPreference: {
          favoriteCuisines: ['Italian', 'Mediterranean', 'American'],
          dislikedFoods: [],
          allergies: [],
          dietaryRestrictions: [],
          spiceTolerance: 'medium',
        },
      },
      {
        id: generateId('member'),
        name: 'Marcus',
        role: 'adult',
        age: 46,
        foodPreference: {
          favoriteCuisines: ['Mexican', 'American', 'Brazilian'],
          dislikedFoods: ['seafood'],
          allergies: [],
          dietaryRestrictions: [],
          spiceTolerance: 'hot',
        },
      },
      {
        id: generateId('member'),
        name: 'Sofia',
        role: 'teen',
        age: 16,
        originCuisine: 'Brazilian',
        activityLevel: 'high',
        foodPreference: {
          favoriteCuisines: ['Brazilian', 'Italian', 'American'],
          dislikedFoods: [],
          allergies: [],
          dietaryRestrictions: [],
          spiceTolerance: 'medium',
        },
      },
      {
        id: generateId('member'),
        name: 'Giulia',
        role: 'teen',
        age: 15,
        originCuisine: 'Italian',
        activityLevel: 'high',
        foodPreference: {
          favoriteCuisines: ['Italian', 'Mediterranean'],
          dislikedFoods: [],
          allergies: [],
          dietaryRestrictions: [],
          spiceTolerance: 'mild',
        },
      },
    ],
  };
}

export function buildBlankHousehold(): Household {
  const now = nowIso();
  return {
    id: generateId('household'),
    name: 'My Household',
    dinnerTime: '18:30',
    cookingEffort: 'easy-weeknight',
    cookingTimePreference: '30-45',
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
    shopping: {
      preferredStores: [],
      budgetPreference: 'moderate',
      brandLoyalty: 'no-preference',
    },
    members: [
      {
        id: generateId('member'),
        name: 'You',
        role: 'adult',
        foodPreference: {
          favoriteCuisines: [],
          dislikedFoods: [],
          allergies: [],
          dietaryRestrictions: [],
          spiceTolerance: 'medium',
        },
      },
    ],
  };
}
