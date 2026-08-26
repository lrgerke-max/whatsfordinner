import { GroceryItem } from '../src/types/grocery';
import { compareStores, quoteStore } from '../src/engines/storeDealEngine';
import { buildRoute } from '../src/engines/storeRouteEngine';
import { STORE_PROFILES } from '../src/data/stores';

let itemCounter = 0;
function buildGroceryItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
  itemCounter += 1;
  return {
    id: `grocery_test_${itemCounter}`,
    name: `Test Item ${itemCounter}`,
    quantity: 1,
    unit: 'each',
    department: 'produce',
    reason: 'Test reason',
    usedInRecipeIds: [],
    checked: false,
    isCustom: false,
    alreadyHave: false,
    ...overrides,
  };
}

const walmart = STORE_PROFILES.find((p) => p.id === 'walmart')!;
const aldi = STORE_PROFILES.find((p) => p.id === 'aldi')!;
const meijer = STORE_PROFILES.find((p) => p.id === 'meijer')!;

describe('quoteStore', () => {
  it('is deterministic — the same basket produces an identical quote twice', () => {
    const items = [
      buildGroceryItem({ name: 'Bananas', department: 'produce', quantity: 2 }),
      buildGroceryItem({ name: 'Chicken breast', department: 'meat' }),
      buildGroceryItem({ name: 'Whole milk', department: 'dairy', quantity: 2 }),
    ];

    const first = quoteStore(items, walmart);
    const second = quoteStore(items, walmart);

    expect(second).toEqual(first);
    expect(first.lines.map((l) => l.priceUsd)).not.toContain(null);
  });

  it('estimates Aldi cheaper than Walmart for the same basket', () => {
    const items = [
      buildGroceryItem({ name: 'Bananas', department: 'produce', quantity: 2 }),
      buildGroceryItem({ name: 'Chicken breast', department: 'meat' }),
      buildGroceryItem({ name: 'Whole milk', department: 'dairy' }),
      buildGroceryItem({ name: 'Spaghetti', department: 'grains' }),
      buildGroceryItem({ name: 'Frozen peas', department: 'frozen' }),
      buildGroceryItem({ name: 'Tortilla chips', department: 'snacks' }),
    ];

    const aldiQuote = quoteStore(items, aldi);
    const walmartQuote = quoteStore(items, walmart);

    expect(aldiQuote.subtotalUsd).toBeLessThan(walmartQuote.subtotalUsd);
  });

  it('flags seafood at Aldi as unavailable with a substitution note', () => {
    const items = [buildGroceryItem({ name: 'Salmon fillet', department: 'seafood' }), buildGroceryItem({ name: 'Apples', department: 'produce' })];

    const aldiQuote = quoteStore(items, aldi);
    const salmon = aldiQuote.lines.find((l) => l.name === 'Salmon fillet')!;

    expect(salmon.available).toBe(false);
    expect(salmon.priceUsd).toBeNull();
    expect(salmon.substitution).toBeDefined();
    expect(aldiQuote.unavailableCount).toBe(1);

    const apples = aldiQuote.lines.find((l) => l.name === 'Apples')!;
    expect(apples.available).toBe(true);
    expect(apples.priceUsd).not.toBeNull();
  });
});

describe('buildRoute', () => {
  it('respects walkSequence order and picks frozen after dairy at every store', () => {
    const items = [
      buildGroceryItem({ name: 'Frozen pizza', department: 'frozen' }),
      buildGroceryItem({ name: 'Chicken breast', department: 'meat' }),
      buildGroceryItem({ name: 'Whole milk', department: 'dairy' }),
      buildGroceryItem({ name: 'Spinach', department: 'produce' }),
      buildGroceryItem({ name: 'Bread', department: 'grains' }),
      buildGroceryItem({ name: 'Crackers', department: 'snacks' }),
    ];

    for (const profile of STORE_PROFILES) {
      const route = buildRoute(items, profile);

      expect(route.length).toBeGreaterThan(0);
      route.forEach((stop, index) => expect(stop.order).toBe(index + 1));

      // Every placeable item appears exactly once.
      const placedNames = route.flatMap((s) => s.items.map((i) => i.name));
      expect([...placedNames].sort()).toEqual([...items.map((i) => i.name)].sort());

      // Produce is walked before dairy, and dairy before frozen (cold chain).
      const stopIndexFor = (department: string) =>
        route.findIndex((s) => s.items.some((i) => i.department === department));
      const produceIdx = stopIndexFor('produce');
      const dairyIdx = stopIndexFor('dairy');
      const frozenIdx = stopIndexFor('frozen');

      expect(produceIdx).toBeGreaterThanOrEqual(0);
      expect(dairyIdx).toBeGreaterThan(produceIdx);
      expect(frozenIdx).toBeGreaterThan(dairyIdx);
    }
  });

  it('yields an empty route for an empty basket', () => {
    for (const profile of STORE_PROFILES) {
      expect(buildRoute([], profile)).toEqual([]);
    }
  });
});

describe('compareStores', () => {
  it('picks Aldi as best and Walmart as worst on a full-basket fixture', () => {
    const items = [
      buildGroceryItem({ name: 'Bananas', department: 'produce', quantity: 3 }),
      buildGroceryItem({ name: 'Ground beef', department: 'meat', quantity: 2 }),
      buildGroceryItem({ name: 'Shredded cheese', department: 'dairy' }),
      buildGroceryItem({ name: 'Rice', department: 'grains' }),
      buildGroceryItem({ name: 'Canned tomatoes', department: 'canned' }),
      buildGroceryItem({ name: 'Orange juice', department: 'beverages' }),
      buildGroceryItem({ name: 'Ice cream', department: 'frozen' }),
    ];

    const comparison = compareStores(items, [walmart, aldi, meijer]);

    expect(comparison.best).toBe('aldi');
    expect(comparison.worst).toBe('walmart');
    expect(comparison.maxSavingUsd).toBeGreaterThan(0);

    // Sorted cheapest-first, and savings math lines up with the subtotals.
    const subtotals = comparison.quotes.map((q) => q.subtotalUsd);
    expect(subtotals).toEqual([...subtotals].sort((a, b) => a - b));
    expect(comparison.maxSavingUsd).toBeCloseTo(subtotals[subtotals.length - 1] - subtotals[0], 2);
    expect(comparison.quotes[0].savingsVsWorstUsd).toBeCloseTo(comparison.maxSavingUsd, 2);
    expect(comparison.quotes[comparison.quotes.length - 1].savingsVsWorstUsd).toBe(0);
  });
});
