import { InventoryItem, QuantityLevel } from '../types/inventory';

// Normalization runs constantly during planning (every ingredient × every
// scoring pass). The function is pure, so a module-level memo is safe and
// turns repeated regex work into map lookups.
const normalizeMemo = new Map<string, string>();

export function normalizeIngredientName(name: string): string {
  const memoized = normalizeMemo.get(name);
  if (memoized !== undefined) return memoized;

  const normalized = name
    .toLowerCase()
    .trim()
    // Punctuation runs become separators ("greek-yogurt" ≡ "greek yogurt")
    // instead of being deleted into concatenated mush.
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let result = normalized;
  if (normalized) {
    const words = normalized.split(' ').map((word) => {
      // Plural-insensitive: "tortillas" → "tortilla", "tomatoes" → "tomato",
      // while "molasses"/"swiss"/"is" stay untouched.
      if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
      // "ves"/"ses" endings ("chives", "olives", "molasses") are words that
      // already end in "e" before the plural "s" (or aren't plural at all),
      // not the add-"es" pattern ("tomato" -> "tomatoes") — fall through to
      // the plain -s stripping below instead of chopping the "e" off too.
      if (word.endsWith('es') && !word.endsWith('ses') && !word.endsWith('ves') && word.length > 3) {
        return word.slice(0, -2);
      }
      if (
        word.endsWith('s') &&
        !word.endsWith('ss') &&
        !word.endsWith('us') &&
        !word.endsWith('is') &&
        !word.endsWith('ses') &&
        word.length > 3
      ) {
        return word.slice(0, -1);
      }
      return word;
    });
    result = words.join(' ');
  }
  if (normalizeMemo.size > 5000) normalizeMemo.clear();
  normalizeMemo.set(name, result);
  return result;
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

/**
 * A findInventoryMatch bound to one inventory snapshot, memoized per
 * ingredient name. Planning scores thousands of recipes against the same
 * inventory — without this, every pass redoes the same fuzzy matching.
 */
export type InventoryMatcher = (ingredientName: string) => InventoryItem | undefined;

export function createInventoryMatcher(inventory: InventoryItem[]): InventoryMatcher {
  const memo = new Map<string, InventoryItem | undefined>();
  return (ingredientName: string) => {
    if (!memo.has(ingredientName)) {
      memo.set(ingredientName, findInventoryMatch(ingredientName, inventory));
    }
    return memo.get(ingredientName);
  };
}

export function findInventoryMatch(
  ingredientName: string,
  inventory: InventoryItem[]
): InventoryItem | undefined {
  const normalized = normalizeIngredientName(ingredientName);
  // Names with no letters/digits (emoji-only, symbols) still need stable
  // identity — fall back to the raw string so repeated scans dedupe.
  const target = normalized || ingredientName.toLowerCase().trim();
  if (!target) return undefined;

  const exact = inventory.find((item) => (normalizeIngredientName(item.name) || item.name.toLowerCase().trim()) === target);
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
