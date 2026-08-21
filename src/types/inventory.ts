export type StorageLocation =
  | 'refrigerator'
  | 'freezer'
  | 'pantry'
  | 'cabinet'
  | 'countertop'
  | 'other';

export type InventoryCategory =
  | 'produce'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grains'
  | 'canned'
  | 'condiments'
  | 'spices'
  | 'baking'
  | 'beverages'
  | 'frozen'
  | 'snacks'
  | 'other';

// Deliberately qualitative — the app should never fabricate false precision.
export type QuantityLevel =
  | 'full'
  | 'mostly-full'
  | 'half'
  | 'some'
  | 'nearly-empty'
  | 'unknown';

export interface ApproxQuantity {
  /** e.g. 1, 1.5 */
  value: number;
  /** e.g. 'lb', 'oz', 'item', 'gallon', 'container' */
  unit: string;
  /** true when the AI is estimating a range rather than a confident reading */
  isApproximate: boolean;
}

export type FreshnessStatus = 'fresh' | 'use-soon' | 'likely-expired' | 'unknown';

export type InventorySource = 'scan' | 'manual';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  location: StorageLocation;
  quantityLevel: QuantityLevel;
  approxQuantity?: ApproxQuantity;
  /** 0-1, internal — surfaced to the user only when low */
  confidence: number;
  freshness: FreshnessStatus;
  /** user-entered date, when known — never inferred by AI */
  expirationDate?: string;
  isNew: boolean;
  needsReview: boolean;
  source: InventorySource;
  notes?: string;
  addedAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface RemovedInventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  location: StorageLocation;
  removedAt: string;
}
