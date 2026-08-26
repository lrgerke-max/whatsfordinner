import { InventoryItem } from '../../types/inventory';
import { DetectedItem, KitchenAnalysis } from '../../types/scan';
import { findInventoryMatch } from '../../engines/inventoryMatch';
import { generateId } from '../../utils/id';

/**
 * Scripted "week two" kitchen tour used by the in-app demo. It's written
 * against the seed household's inventory by *name*, so it still behaves
 * sensibly if the seed data changes: matched items update in place, and
 * anything the demo script mentions that isn't currently in inventory shows
 * up as a newly discovered item.
 */
function detected(
  partial: Omit<DetectedItem, 'id' | 'matchedInventoryItemId'>,
  previousInventory: InventoryItem[]
): DetectedItem {
  const match = findInventoryMatch(partial.name, previousInventory);
  return { ...partial, id: generateId('detected'), matchedInventoryItemId: match?.id };
}

export function buildDemoAnalysis(previousInventory: InventoryItem[]): KitchenAnalysis {
  const detectedItems: DetectedItem[] = [
    detected(
      { name: 'Chicken breast', category: 'meat', location: 'refrigerator', quantityLevel: 'some', approxQuantity: { value: 1, unit: 'lb', isApproximate: true }, confidence: 0.91, freshness: 'fresh' },
      previousInventory
    ),
    detected(
      { name: 'Milk', category: 'dairy', location: 'refrigerator', quantityLevel: 'nearly-empty', approxQuantity: { value: 0.1, unit: 'gallon', isApproximate: true }, confidence: 0.95, freshness: 'use-soon' },
      previousInventory
    ),
    detected(
      { name: 'Parmesan cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'some', confidence: 0.81, freshness: 'fresh' },
      previousInventory
    ),
    detected(
      { name: 'Ground beef', category: 'meat', location: 'refrigerator', quantityLevel: 'unknown', confidence: 0.42, freshness: 'unknown' },
      previousInventory
    ),
    detected(
      { name: 'Bananas', category: 'produce', location: 'countertop', quantityLevel: 'some', approxQuantity: { value: 2, unit: 'each', isApproximate: false }, confidence: 0.93, freshness: 'use-soon' },
      previousInventory
    ),
    detected(
      { name: 'Heavy cream', category: 'dairy', location: 'refrigerator', quantityLevel: 'half', confidence: 0.86, freshness: 'use-soon' },
      previousInventory
    ),
    detected(
      { name: 'Eggs', category: 'dairy', location: 'refrigerator', quantityLevel: 'mostly-full', approxQuantity: { value: 10, unit: 'each', isApproximate: false }, confidence: 0.9, freshness: 'fresh' },
      previousInventory
    ),
    detected(
      { name: 'Fresh basil', category: 'produce', location: 'refrigerator', quantityLevel: 'some', confidence: 0.77, freshness: 'use-soon' },
      previousInventory
    ),
    detected(
      { name: 'Greek yogurt', category: 'dairy', location: 'refrigerator', quantityLevel: 'full', approxQuantity: { value: 32, unit: 'oz', isApproximate: false }, confidence: 0.88, freshness: 'fresh' },
      previousInventory
    ),
    detected(
      { name: 'Frozen shrimp', category: 'seafood', location: 'freezer', quantityLevel: 'some', confidence: 0.7, freshness: 'fresh' },
      previousInventory
    ),
    detected(
      { name: 'Tortilla chips', category: 'snacks', location: 'pantry', quantityLevel: 'mostly-full', confidence: 0.85, freshness: 'fresh' },
      previousInventory
    ),
    detected(
      { name: 'Black beans', category: 'canned', location: 'pantry', quantityLevel: 'full', approxQuantity: { value: 3, unit: 'each', isApproximate: false }, confidence: 0.89, freshness: 'fresh' },
      previousInventory
    ),
  ];

  const removedNames = ['Spinach', 'Mushrooms'];
  const likelyRemovedItemIds = removedNames
    .map((name) => findInventoryMatch(name, previousInventory)?.id)
    .filter((id): id is string => Boolean(id));

  return {
    detectedItems,
    likelyRemovedItemIds,
    areasObserved: ['refrigerator', 'freezer', 'pantry', 'cabinets', 'countertops'],
    summary: 'Walked through the refrigerator, freezer, pantry, cabinets, and countertops.',
  };
}

export const GENERIC_ITEM_POOL: Omit<DetectedItem, 'id' | 'matchedInventoryItemId'>[] = [
  { name: 'Chicken breast', category: 'meat', location: 'refrigerator', quantityLevel: 'mostly-full', confidence: 0.72, freshness: 'fresh' },
  { name: 'Ground beef', category: 'meat', location: 'refrigerator', quantityLevel: 'half', confidence: 0.65, freshness: 'fresh' },
  { name: 'Eggs', category: 'dairy', location: 'refrigerator', quantityLevel: 'mostly-full', confidence: 0.8, freshness: 'fresh' },
  { name: 'Milk', category: 'dairy', location: 'refrigerator', quantityLevel: 'half', confidence: 0.78, freshness: 'fresh' },
  { name: 'Butter', category: 'dairy', location: 'refrigerator', quantityLevel: 'full', confidence: 0.7, freshness: 'fresh' },
  { name: 'Cheddar cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'some', confidence: 0.61, freshness: 'fresh' },
  { name: 'Carrots', category: 'produce', location: 'refrigerator', quantityLevel: 'mostly-full', confidence: 0.74, freshness: 'fresh' },
  { name: 'Onion', category: 'produce', location: 'pantry', quantityLevel: 'some', confidence: 0.69, freshness: 'fresh' },
  { name: 'Garlic', category: 'produce', location: 'pantry', quantityLevel: 'mostly-full', confidence: 0.66, freshness: 'fresh' },
  { name: 'Bananas', category: 'produce', location: 'countertop', quantityLevel: 'some', confidence: 0.85, freshness: 'use-soon' },
  { name: 'Rice', category: 'grains', location: 'pantry', quantityLevel: 'full', confidence: 0.82, freshness: 'fresh' },
  { name: 'Pasta', category: 'grains', location: 'pantry', quantityLevel: 'mostly-full', confidence: 0.79, freshness: 'fresh' },
  { name: 'Crushed tomatoes', category: 'canned', location: 'pantry', quantityLevel: 'full', confidence: 0.75, freshness: 'fresh' },
  { name: 'Olive oil', category: 'condiments', location: 'cabinet', quantityLevel: 'half', confidence: 0.6, freshness: 'fresh' },
  { name: 'Soy sauce', category: 'condiments', location: 'cabinet', quantityLevel: 'mostly-full', confidence: 0.58, freshness: 'fresh' },
  { name: 'Frozen peas', category: 'frozen', location: 'freezer', quantityLevel: 'half', confidence: 0.55, freshness: 'unknown' },
  { name: 'Tortillas', category: 'grains', location: 'pantry', quantityLevel: 'some', confidence: 0.63, freshness: 'use-soon' },
  { name: 'Bell pepper', category: 'produce', location: 'refrigerator', quantityLevel: 'some', confidence: 0.68, freshness: 'use-soon' },
  { name: 'Yogurt', category: 'dairy', location: 'refrigerator', quantityLevel: 'unknown', confidence: 0.4, freshness: 'unknown' },
  { name: 'Sour cream', category: 'dairy', location: 'refrigerator', quantityLevel: 'unknown', confidence: 0.38, freshness: 'unknown' },
  // Packaged goods — the "label read" pass. These represent items identified
  // by their packaging when the camera lingers, so longer tours find more.
  { name: 'Pasta sauce jar', category: 'canned', location: 'pantry', quantityLevel: 'full', confidence: 0.72, freshness: 'fresh' },
  { name: 'Peanut butter', category: 'condiments', location: 'pantry', quantityLevel: 'half', confidence: 0.7, freshness: 'fresh' },
  { name: 'String cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'mostly-full', confidence: 0.66, freshness: 'use-soon' },
  { name: 'Hummus tub', category: 'condiments', location: 'refrigerator', quantityLevel: 'some', confidence: 0.55, freshness: 'use-soon' },
  { name: 'Salsa jar', category: 'condiments', location: 'refrigerator', quantityLevel: 'mostly-full', confidence: 0.68, freshness: 'fresh' },
  { name: 'Orange juice carton', category: 'beverages', location: 'refrigerator', quantityLevel: 'half', confidence: 0.74, freshness: 'use-soon' },
  { name: 'Bagel pack', category: 'grains', location: 'pantry', quantityLevel: 'some', confidence: 0.61, freshness: 'use-soon' },
  { name: 'Frozen pizza', category: 'frozen', location: 'freezer', quantityLevel: 'full', confidence: 0.77, freshness: 'fresh' },
  { name: 'Leftover soup container', category: 'other', location: 'refrigerator', quantityLevel: 'unknown', confidence: 0.35, freshness: 'use-soon' },
  { name: 'Mayonnaise', category: 'condiments', location: 'refrigerator', quantityLevel: 'half', confidence: 0.64, freshness: 'fresh' },
  { name: 'Salad mix bag', category: 'produce', location: 'refrigerator', quantityLevel: 'some', confidence: 0.52, freshness: 'use-soon' },
  { name: 'Strawberries', category: 'produce', location: 'refrigerator', quantityLevel: 'some', confidence: 0.71, freshness: 'use-soon' },
  { name: 'Bacon pack', category: 'meat', location: 'refrigerator', quantityLevel: 'full', confidence: 0.69, freshness: 'fresh' },
  { name: 'Shredded cheese bag', category: 'dairy', location: 'refrigerator', quantityLevel: 'mostly-full', confidence: 0.73, freshness: 'fresh' },
  { name: 'Cream cheese', category: 'dairy', location: 'refrigerator', quantityLevel: 'some', confidence: 0.67, freshness: 'fresh' },
  { name: 'Cereal box', category: 'grains', location: 'pantry', quantityLevel: 'half', confidence: 0.7, freshness: 'fresh' },
  { name: 'Granola bars', category: 'snacks', location: 'pantry', quantityLevel: 'mostly-full', confidence: 0.65, freshness: 'fresh' },
  { name: 'Canned tuna', category: 'canned', location: 'pantry', quantityLevel: 'full', confidence: 0.72, freshness: 'fresh' },
  { name: 'Coffee grounds', category: 'beverages', location: 'cabinet', quantityLevel: 'some', confidence: 0.6, freshness: 'fresh' },
];
