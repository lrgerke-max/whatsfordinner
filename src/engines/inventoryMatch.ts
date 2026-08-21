import { InventoryItem, QuantityLevel } from '../types/inventory';

export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\bs\b$/, '');
}

/**
 * Rough fraction of a "typical" package remaining, used only to reason about
 * whether we probably have "enough" for a recipe — never shown to the user
 * as a fake precise number.
 */
export const QUANTITY_LEVEL_FRACTION: Record<QuantityLevel, number> = {
  full: 1,
  'mostly-full': 0.75,
  half: 0.5,
  some: 0.3,
  'nearly-empty': 0.1,
  unknown: 0.4,
};

export function findInventoryMatch(
  ingredientName: string,
  inventory: InventoryItem[]
): InventoryItem | undefined {
  const target = normalizeIngredientName(ingredientName);
  if (!target) return undefined;

  const exact = inventory.find((item) => normalizeIngredientName(item.name) === target);
  if (exact) return exact;

  const targetWords = new Set(target.split(' '));
  let best: InventoryItem | undefined;
  let bestScore = 0;
  for (const item of inventory) {
    const itemNormalized = normalizeIngredientName(item.name);
    if (!itemNormalized) continue;
    const containsMatch = itemNormalized.includes(target) || target.includes(itemNormalized);
    const itemWords = itemNormalized.split(' ');
    const sharedWords = itemWords.filter((w) => targetWords.has(w)).length;
    const score = containsMatch ? Math.max(itemNormalized.length, target.length) : sharedWords;
    if (score > bestScore && (containsMatch || sharedWords >= Math.min(2, itemWords.length))) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

/**
 * Estimate whether owned quantity likely covers what a recipe needs.
 * Returns a 0-1 "coverage" score — 1 means we're confident we have enough,
 * 0 means we almost certainly need to buy it.
 */
export function estimateCoverage(item: InventoryItem | undefined, neededQuantity: number, neededUnit: string): number {
  if (!item) return 0;

  if (item.approxQuantity && sameUnitFamily(item.approxQuantity.unit, neededUnit)) {
    const ratio = item.approxQuantity.value / Math.max(neededQuantity, 0.01);
    return Math.max(0, Math.min(1, ratio));
  }

  // No numeric estimate available — fall back to qualitative level.
  return QUANTITY_LEVEL_FRACTION[item.quantityLevel];
}

function sameUnitFamily(a: string, b: string): boolean {
  const weight = new Set(['lb', 'oz', 'g', 'kg']);
  const volume = new Set(['cup', 'tbsp', 'tsp', 'gallon', 'quart', 'ml', 'l']);
  const count = new Set(['each', 'item', 'clove', 'head', 'bunch', 'slice', 'leaf', 'container']);
  const family = (u: string) => (weight.has(u) ? 'weight' : volume.has(u) ? 'volume' : count.has(u) ? 'count' : u);
  return family(a) === family(b);
}
