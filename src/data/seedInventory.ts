import { generateId } from '../utils/id';
import { isoDaysAgo } from '../utils/date';
import { ApproxQuantity, FreshnessStatus, InventoryCategory, InventoryItem, QuantityLevel, StorageLocation } from '../types/inventory';

const SCAN_AGE_DAYS = 5;

interface SeedSpec {
  name: string;
  category: InventoryCategory;
  location: StorageLocation;
  quantityLevel: QuantityLevel;
  approxQuantity?: ApproxQuantity;
  freshness: FreshnessStatus;
  confidence: number;
  addedDaysAgo?: number;
}

function amount(value: number, unit: string, isApproximate = true): ApproxQuantity {
  return { value, unit, isApproximate };
}

const SPECS: SeedSpec[] = [
  // Refrigerator
  { name: 'Chicken breast', category: 'meat', location: 'refrigerator', quantityLevel: 'mostly-full', approxQuantity: amount(3, 'lb'), freshness: 'fresh', confidence: 0.94 },
  { name: 'Ground beef', category: 'meat', location: 'refrigerator', quantityLevel: 'mostly-full', approxQuantity: amount(1.5, 'lb'), freshness: 'fresh', confidence: 0.9 },
  { name: 'Milk', category: 'dairy', location: 'refrigerator', quantityLevel: 'full', approxQuantity: amount(1, 'gallon'), freshness: 'fresh', confidence: 0.96 },
  { name: 'Eggs', category: 'dairy', location: 'refrigerator', quantityLevel: 'full', approxQuantity: amount(12, 'each'), freshness: 'fresh', confidence: 0.95 },
  { name: 'Butter', category: 'dairy', location: 'refrigerator', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.88 },
  { name: 'Parmesan cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'full', freshness: 'fresh', confidence: 0.81 },
  { name: 'Mozzarella cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'half', approxQuantity: amount(4, 'oz'), freshness: 'fresh', confidence: 0.79 },
  { name: 'Cheddar cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'half', freshness: 'fresh', confidence: 0.77 },
  { name: 'Heavy cream', category: 'dairy', location: 'refrigerator', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.86 },
  { name: 'Sour cream', category: 'dairy', location: 'refrigerator', quantityLevel: 'half', freshness: 'fresh', confidence: 0.72 },
  { name: 'Spinach', category: 'produce', location: 'refrigerator', quantityLevel: 'mostly-full', approxQuantity: amount(5, 'oz'), freshness: 'use-soon', confidence: 0.85 },
  { name: 'Mushrooms', category: 'produce', location: 'refrigerator', quantityLevel: 'mostly-full', approxQuantity: amount(8, 'oz'), freshness: 'use-soon', confidence: 0.82 },
  { name: 'Bell pepper', category: 'produce', location: 'refrigerator', quantityLevel: 'some', approxQuantity: amount(2, 'each'), freshness: 'fresh', confidence: 0.83 },
  { name: 'Carrots', category: 'produce', location: 'refrigerator', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.87 },
  { name: 'Cucumber', category: 'produce', location: 'refrigerator', quantityLevel: 'some', approxQuantity: amount(1, 'each'), freshness: 'fresh', confidence: 0.8 },
  { name: 'Tomatoes', category: 'produce', location: 'refrigerator', quantityLevel: 'some', approxQuantity: amount(3, 'each'), freshness: 'fresh', confidence: 0.84 },
  { name: 'Lemon', category: 'produce', location: 'refrigerator', quantityLevel: 'some', approxQuantity: amount(3, 'each'), freshness: 'fresh', confidence: 0.9 },
  { name: 'Lime', category: 'produce', location: 'refrigerator', quantityLevel: 'some', approxQuantity: amount(2, 'each'), freshness: 'fresh', confidence: 0.88 },

  // Freezer
  { name: 'Frozen peas', category: 'frozen', location: 'freezer', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.75 },
  { name: 'Chicken thighs', category: 'meat', location: 'freezer', quantityLevel: 'full', approxQuantity: amount(2, 'lb'), freshness: 'fresh', confidence: 0.89 },
  { name: 'Ground turkey', category: 'meat', location: 'freezer', quantityLevel: 'full', approxQuantity: amount(1, 'lb'), freshness: 'fresh', confidence: 0.8 },
  { name: 'Frozen berries', category: 'frozen', location: 'freezer', quantityLevel: 'half', freshness: 'fresh', confidence: 0.7 },

  // Pantry
  { name: 'Rice', category: 'grains', location: 'pantry', quantityLevel: 'full', approxQuantity: amount(5, 'lb'), freshness: 'fresh', confidence: 0.92 },
  { name: 'Pasta', category: 'grains', location: 'pantry', quantityLevel: 'mostly-full', approxQuantity: amount(3, 'each'), freshness: 'fresh', confidence: 0.91 },
  { name: 'Black beans', category: 'canned', location: 'pantry', quantityLevel: 'mostly-full', approxQuantity: amount(3, 'each'), freshness: 'fresh', confidence: 0.9 },
  { name: 'Chickpeas', category: 'canned', location: 'pantry', quantityLevel: 'some', approxQuantity: amount(1, 'each'), freshness: 'fresh', confidence: 0.85 },
  { name: 'Crushed tomatoes', category: 'canned', location: 'pantry', quantityLevel: 'mostly-full', approxQuantity: amount(4, 'each'), freshness: 'fresh', confidence: 0.89 },
  { name: 'Tortillas', category: 'grains', location: 'pantry', quantityLevel: 'half', freshness: 'use-soon', confidence: 0.76 },
  { name: 'Bread', category: 'grains', location: 'pantry', quantityLevel: 'half', freshness: 'use-soon', confidence: 0.78 },
  { name: 'Breadcrumbs', category: 'baking', location: 'pantry', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.7 },
  { name: 'Flour', category: 'baking', location: 'pantry', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.88 },
  { name: 'Sugar', category: 'baking', location: 'pantry', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.85 },
  { name: 'Baking powder', category: 'baking', location: 'pantry', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.68 },
  { name: 'Cornstarch', category: 'baking', location: 'pantry', quantityLevel: 'half', freshness: 'fresh', confidence: 0.6 },
  { name: 'Peanut butter', category: 'condiments', location: 'pantry', quantityLevel: 'half', freshness: 'fresh', confidence: 0.82 },
  { name: 'Honey', category: 'condiments', location: 'pantry', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.79 },
  { name: 'Salsa', category: 'condiments', location: 'pantry', quantityLevel: 'half', freshness: 'fresh', confidence: 0.73 },

  // Cabinets
  { name: 'Olive oil', category: 'condiments', location: 'cabinet', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.9 },
  { name: 'Soy sauce', category: 'condiments', location: 'cabinet', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.87 },
  { name: 'Ketchup', category: 'condiments', location: 'cabinet', quantityLevel: 'half', freshness: 'fresh', confidence: 0.8 },
  { name: 'Cumin', category: 'spices', location: 'cabinet', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.65 },
  { name: 'Oregano', category: 'spices', location: 'cabinet', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.63 },
  { name: 'Red pepper flakes', category: 'spices', location: 'cabinet', quantityLevel: 'half', freshness: 'fresh', confidence: 0.6 },
  { name: 'Garlic', category: 'produce', location: 'cabinet', quantityLevel: 'mostly-full', freshness: 'fresh', confidence: 0.86 },
  { name: 'Onion', category: 'produce', location: 'cabinet', quantityLevel: 'mostly-full', approxQuantity: amount(4, 'each'), freshness: 'fresh', confidence: 0.88 },
  { name: 'Potatoes', category: 'produce', location: 'cabinet', quantityLevel: 'mostly-full', approxQuantity: amount(5, 'each'), freshness: 'fresh', confidence: 0.85 },

  // Countertop
  { name: 'Bananas', category: 'produce', location: 'countertop', quantityLevel: 'mostly-full', approxQuantity: amount(6, 'each'), freshness: 'use-soon', confidence: 0.93 },
  { name: 'Avocado', category: 'produce', location: 'countertop', quantityLevel: 'some', approxQuantity: amount(2, 'each'), freshness: 'use-soon', confidence: 0.82 },
  { name: 'Tortilla chips', category: 'snacks', location: 'pantry', quantityLevel: 'half', freshness: 'fresh', confidence: 0.74 },
];

export function buildSeedInventory(): InventoryItem[] {
  return SPECS.map((spec, index) => {
    const lastSeenAt = isoDaysAgo(SCAN_AGE_DAYS);
    // Deterministic spread — no Math.random, so repeated demo resets produce
    // identical, rehearsed state.
    const addedAt = isoDaysAgo(spec.addedDaysAgo ?? SCAN_AGE_DAYS + (index % 20));
    const item: InventoryItem = {
      id: generateId('item'),
      name: spec.name,
      category: spec.category,
      location: spec.location,
      quantityLevel: spec.quantityLevel,
      approxQuantity: spec.approxQuantity,
      confidence: spec.confidence,
      freshness: spec.freshness,
      isNew: false,
      needsReview: spec.confidence < 0.6,
      source: 'scan',
      addedAt,
      updatedAt: lastSeenAt,
      lastSeenAt,
    };
    return item;
  });
}

export const SEED_LAST_SCAN_DAYS_AGO = SCAN_AGE_DAYS;
