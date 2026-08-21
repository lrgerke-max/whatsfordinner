import { estimateCoverage, findInventoryMatch, normalizeIngredientName } from '../src/engines/inventoryMatch';
import { buildInventoryItem } from '../testUtils/fixtures';

describe('normalizeIngredientName', () => {
  it('lowercases, trims, and strips punctuation', () => {
    expect(normalizeIngredientName('  Chicken Breast! ')).toBe('chicken breast');
  });
});

describe('findInventoryMatch', () => {
  it('finds an exact match regardless of case', () => {
    const inventory = [buildInventoryItem({ name: 'Chicken Breast' })];
    expect(findInventoryMatch('chicken breast', inventory)?.name).toBe('Chicken Breast');
  });

  it('finds a fuzzy match when the recipe ingredient is more specific', () => {
    const inventory = [buildInventoryItem({ name: 'Cheddar cheese' })];
    expect(findInventoryMatch('cheddar', inventory)?.name).toBe('Cheddar cheese');
  });

  it('returns undefined when nothing matches', () => {
    const inventory = [buildInventoryItem({ name: 'Rice' })];
    expect(findInventoryMatch('ground beef', inventory)).toBeUndefined();
  });
});

describe('estimateCoverage', () => {
  it('returns 1+ when owned amount exceeds what is needed', () => {
    const item = buildInventoryItem({ approxQuantity: { value: 3, unit: 'lb', isApproximate: true } });
    expect(estimateCoverage(item, 1.5, 'lb')).toBeGreaterThanOrEqual(1);
  });

  it('returns a low ratio when owned amount is well short of what is needed', () => {
    const item = buildInventoryItem({ approxQuantity: { value: 0.25, unit: 'lb', isApproximate: true } });
    expect(estimateCoverage(item, 1.5, 'lb')).toBeLessThan(0.3);
  });

  it('falls back to the qualitative quantity level when there is no numeric estimate', () => {
    const nearlyEmpty = buildInventoryItem({ quantityLevel: 'nearly-empty', approxQuantity: undefined });
    const full = buildInventoryItem({ quantityLevel: 'full', approxQuantity: undefined });
    expect(estimateCoverage(nearlyEmpty, 1, 'cup')).toBeLessThan(estimateCoverage(full, 1, 'cup'));
  });

  it('returns 0 for a missing item', () => {
    expect(estimateCoverage(undefined, 1, 'lb')).toBe(0);
  });
});
