import { generateId } from '../utils/id';
import { nowIso } from '../utils/date';
import { InventoryItem, RemovedInventoryItem } from '../types/inventory';
import { DetectedItem, KitchenAnalysis } from '../types/scan';
import { findInventoryMatch } from './inventoryMatch';

export interface MergeResult {
  inventory: InventoryItem[];
  newItems: InventoryItem[];
  updatedItems: InventoryItem[];
  removedItems: RemovedInventoryItem[];
}

const NEEDS_REVIEW_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Kitchen Memory treats each scan as a delta against what it already knows,
 * rather than starting the inventory over from zero. Matched items are
 * updated in place; genuinely new items are added; items the AI is fairly
 * sure have disappeared are removed. Anything not observed this scan (a
 * kitchen tour rarely captures every shelf) is left untouched — silence is
 * not evidence of absence.
 */
export function mergeScanIntoInventory(previousInventory: InventoryItem[], analysis: KitchenAnalysis): MergeResult {
  const now = nowIso();
  const inventory = [...previousInventory];
  const newItems: InventoryItem[] = [];
  const updatedItems: InventoryItem[] = [];

  for (const detected of analysis.detectedItems) {
    const matchIndex = detected.matchedInventoryItemId
      ? inventory.findIndex((i) => i.id === detected.matchedInventoryItemId)
      : inventory.findIndex((i) => i.id === findInventoryMatch(detected.name, inventory)?.id);

    if (matchIndex >= 0) {
      const existing = inventory[matchIndex];
      const updated: InventoryItem = {
        ...existing,
        quantityLevel: detected.quantityLevel,
        approxQuantity: detected.approxQuantity,
        confidence: detected.confidence,
        freshness: detected.freshness,
        location: detected.location,
        isNew: false,
        needsReview: detected.confidence < NEEDS_REVIEW_CONFIDENCE_THRESHOLD,
        updatedAt: now,
        lastSeenAt: now,
      };
      inventory[matchIndex] = updated;
      updatedItems.push(updated);
    } else {
      const created: InventoryItem = {
        id: generateId('item'),
        name: detected.name,
        category: detected.category,
        location: detected.location,
        quantityLevel: detected.quantityLevel,
        approxQuantity: detected.approxQuantity,
        confidence: detected.confidence,
        freshness: detected.freshness,
        isNew: true,
        needsReview: detected.confidence < NEEDS_REVIEW_CONFIDENCE_THRESHOLD,
        source: 'scan',
        addedAt: now,
        updatedAt: now,
        lastSeenAt: now,
      };
      inventory.push(created);
      newItems.push(created);
    }
  }

  const removedItems: RemovedInventoryItem[] = [];
  const survivingInventory = inventory.filter((item) => {
    if (analysis.likelyRemovedItemIds.includes(item.id)) {
      removedItems.push({
        id: item.id,
        name: item.name,
        category: item.category,
        location: item.location,
        removedAt: now,
      });
      return false;
    }
    return true;
  });

  return { inventory: survivingInventory, newItems, updatedItems, removedItems };
}

export function findDetectedMatch(detected: DetectedItem, inventory: InventoryItem[]): InventoryItem | undefined {
  if (detected.matchedInventoryItemId) {
    return inventory.find((i) => i.id === detected.matchedInventoryItemId);
  }
  return findInventoryMatch(detected.name, inventory);
}
