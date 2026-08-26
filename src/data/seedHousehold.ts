import { generateId } from '../utils/id';
import { addDays, nowIso, startOfWeek } from '../utils/date';
import { Household } from '../types/household';
import { SpecialRequest } from '../types/specialRequests';

export const SEED_MEMBER_IDS = {
  lauren: 'member_seed_lauren',
  marcus: 'member_seed_marcus',
  sofia: 'member_seed_sofia',
  giulia: 'member_seed_giulia',
} as const;

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
        id: SEED_MEMBER_IDS.lauren,
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
        id: SEED_MEMBER_IDS.marcus,
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
        id: SEED_MEMBER_IDS.sofia,
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
        id: SEED_MEMBER_IDS.giulia,
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

/** Demo cravings for the seed household — one that matches the recipe library, one left open. */
export const SEED_SPECIAL_REQUESTS: SpecialRequest[] = [
  {
    id: generateId('request'),
    memberId: SEED_MEMBER_IDS.sofia,
    memberName: 'Sofia',
    text: 'Taco Tuesday please!!',
    createdAt: nowIso(),
    status: 'open',
    // She did say Tuesday. The planner pins tacos to this week's Tuesday.
    preferredDate: addDays(startOfWeek(), 1),
  },
  {
    id: generateId('request'),
    memberId: SEED_MEMBER_IDS.giulia,
    memberName: 'Giulia',
    text: "Maya wants her friend's mom's birria",
    createdAt: nowIso(),
    status: 'open',
  },
];
