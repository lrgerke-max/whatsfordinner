import { ApproxQuantity, FreshnessStatus, InventoryCategory, QuantityLevel, StorageLocation } from './inventory';

export type ScanStatus =
  | 'idle'
  | 'recording'
  | 'reviewing-recording'
  | 'processing'
  | 'reviewing-results'
  | 'completed'
  | 'failed';

export type ScanArea = 'refrigerator' | 'freezer' | 'pantry' | 'cabinets' | 'countertops';

export const SCAN_AREAS: { key: ScanArea; label: string }[] = [
  { key: 'refrigerator', label: 'Refrigerator' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'cabinets', label: 'Cabinets' },
  { key: 'countertops', label: 'Countertops' },
];

/** Raw output from a VisionProvider before it's merged into inventory. */
export interface DetectedItem {
  id: string;
  name: string;
  category: InventoryCategory;
  location: StorageLocation;
  quantityLevel: QuantityLevel;
  approxQuantity?: ApproxQuantity;
  confidence: number;
  freshness: FreshnessStatus;
  /** matched existing inventory item id, if this looks like a re-scan of something we know */
  matchedInventoryItemId?: string;
}

export interface KitchenAnalysis {
  detectedItems: DetectedItem[];
  /** items from the previous scan that no longer appear to be present */
  likelyRemovedItemIds: string[];
  areasObserved: ScanArea[];
  summary: string;
}

export interface KitchenScan {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: ScanStatus;
  videoUri?: string;
  isDemoVideo: boolean;
  areasCovered: ScanArea[];
  analysis?: KitchenAnalysis;
  newItemCount: number;
  updatedItemCount: number;
  removedItemCount: number;
}

export const PROCESSING_STEPS = [
  'Watching your kitchen',
  'Identifying ingredients',
  'Estimating quantities',
  "Comparing with last week's inventory",
  'Checking expiration risk',
  'Updating your kitchen memory',
] as const;
