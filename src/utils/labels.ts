import { FreshnessStatus, InventoryCategory, QuantityLevel, StorageLocation } from '../types/inventory';
import { CookingEffort, CookingTimePreference } from '../types/household';
import { RatingValue } from '../types/mealPlan';

export const QUANTITY_LEVEL_LABEL: Record<QuantityLevel, string> = {
  full: 'Full',
  'mostly-full': 'Mostly full',
  half: 'About half',
  some: 'Some left',
  'nearly-empty': 'Nearly empty',
  unknown: 'Amount unclear',
};

export const FRESHNESS_LABEL: Record<FreshnessStatus, string> = {
  fresh: 'Fresh',
  'use-soon': 'Use soon',
  'likely-expired': 'Likely expired',
  unknown: 'Unknown',
};

export const LOCATION_LABEL: Record<StorageLocation, string> = {
  refrigerator: 'Refrigerator',
  freezer: 'Freezer',
  pantry: 'Pantry',
  cabinet: 'Cabinet',
  countertop: 'Countertop',
  other: 'Other',
};

export const LOCATION_EMOJI: Record<StorageLocation, string> = {
  refrigerator: '🧊',
  freezer: '❄️',
  pantry: '🥫',
  cabinet: '🗄️',
  countertop: '🍽️',
  other: '📦',
};

export const COOKING_EFFORT_LABEL: Record<CookingEffort, string> = {
  'almost-no-effort': 'Almost no effort',
  'easy-weeknight': 'Easy weeknight',
  'enjoy-cooking': 'I enjoy cooking',
  variety: 'Give me variety',
};

export const COOKING_TIME_LABEL: Record<CookingTimePreference, string> = {
  'under-20': 'Under 20 minutes',
  '20-30': '20–30 minutes',
  '30-45': '30–45 minutes',
  '45-60': '45–60 minutes',
  'no-preference': "Doesn't matter",
};

export const RATING_EMOJI: Record<RatingValue, string> = {
  loved: '😍',
  good: '🙂',
  fine: '😐',
  'never-again': '👎',
};

export const RATING_LABEL: Record<RatingValue, string> = {
  loved: 'Loved it',
  good: 'Good',
  fine: 'Fine',
  'never-again': 'Never again',
};

export function describeQuantity(quantityLevel: QuantityLevel, approxQuantity?: { value: number; unit: string; isApproximate: boolean }): string {
  if (approxQuantity) {
    const prefix = approxQuantity.isApproximate ? '~' : '';
    return `${prefix}${formatNumber(approxQuantity.value)} ${approxQuantity.unit}`;
  }
  return QUANTITY_LEVEL_LABEL[quantityLevel];
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatIngredientQuantity(quantity: number, unit: string): string {
  return `${formatNumber(quantity)} ${unit}`;
}

export const DEPARTMENT_LABEL: Record<InventoryCategory, string> = {
  produce: 'Produce',
  meat: 'Meat',
  seafood: 'Seafood',
  dairy: 'Dairy',
  grains: 'Grains & Bread',
  canned: 'Canned & Jarred',
  condiments: 'Condiments',
  spices: 'Spices',
  baking: 'Baking',
  beverages: 'Beverages',
  frozen: 'Frozen',
  snacks: 'Snacks',
  other: 'Other',
};

export const DEPARTMENT_EMOJI: Record<InventoryCategory, string> = {
  produce: '🥬',
  meat: '🥩',
  seafood: '🦐',
  dairy: '🧀',
  grains: '🍞',
  canned: '🥫',
  condiments: '🍯',
  spices: '🧂',
  baking: '🧁',
  beverages: '🥤',
  frozen: '🧊',
  snacks: '🍿',
  other: '🛒',
};
