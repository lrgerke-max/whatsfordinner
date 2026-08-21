import { mergeScanIntoInventory } from '../src/engines/inventoryMerge';
import { buildInventoryItem } from '../testUtils/fixtures';
import { KitchenAnalysis } from '../src/types/scan';

function analysis(overrides: Partial<KitchenAnalysis> = {}): KitchenAnalysis {
  return {
    detectedItems: [],
    likelyRemovedItemIds: [],
    areasObserved: ['refrigerator'],
    summary: 'test scan',
    ...overrides,
  };
}

describe('mergeScanIntoInventory', () => {
  it('updates a matched item in place rather than duplicating it', () => {
    const existing = buildInventoryItem({ name: 'Chicken breast', quantityLevel: 'mostly-full', approxQuantity: { value: 3, unit: 'lb', isApproximate: true } });
    const result = mergeScanIntoInventory(
      [existing],
      analysis({
        detectedItems: [
          {
            id: 'd1',
            name: 'Chicken breast',
            category: 'meat',
            location: 'refrigerator',
            quantityLevel: 'some',
            approxQuantity: { value: 1, unit: 'lb', isApproximate: true },
            confidence: 0.9,
            freshness: 'fresh',
            matchedInventoryItemId: existing.id,
          },
        ],
      })
    );

    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0].id).toBe(existing.id);
    expect(result.inventory[0].quantityLevel).toBe('some');
    expect(result.inventory[0].approxQuantity?.value).toBe(1);
    expect(result.updatedItems).toHaveLength(1);
    expect(result.newItems).toHaveLength(0);
  });

  it('adds a genuinely new item that was not previously known', () => {
    const result = mergeScanIntoInventory(
      [],
      analysis({
        detectedItems: [
          { id: 'd1', name: 'Fresh basil', category: 'produce', location: 'refrigerator', quantityLevel: 'some', confidence: 0.8, freshness: 'use-soon' },
        ],
      })
    );

    expect(result.newItems).toHaveLength(1);
    expect(result.newItems[0].isNew).toBe(true);
    expect(result.inventory).toHaveLength(1);
  });

  it('removes an item flagged as likely gone', () => {
    const existing = buildInventoryItem({ name: 'Spinach' });
    const result = mergeScanIntoInventory([existing], analysis({ likelyRemovedItemIds: [existing.id] }));

    expect(result.inventory.find((i) => i.id === existing.id)).toBeUndefined();
    expect(result.removedItems).toHaveLength(1);
    expect(result.removedItems[0].name).toBe('Spinach');
  });

  it('leaves items untouched when the scan does not mention them', () => {
    const untouched = buildInventoryItem({ name: 'Olive oil' });
    const result = mergeScanIntoInventory([untouched], analysis());

    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0]).toEqual(untouched);
  });

  it('marks a low-confidence detection as needing review', () => {
    const result = mergeScanIntoInventory(
      [],
      analysis({
        detectedItems: [
          { id: 'd1', name: 'Ground beef', category: 'meat', location: 'refrigerator', quantityLevel: 'unknown', confidence: 0.3, freshness: 'unknown' },
        ],
      })
    );
    expect(result.newItems[0].needsReview).toBe(true);
  });
});
