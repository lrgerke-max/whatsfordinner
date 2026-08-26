import { GroceryDepartment, GroceryItem } from './grocery';

/**
 * Store deals & smart-route data model.
 *
 * IMPORTANT: nothing here represents live or scraped retailer data. Prices
 * produced from these profiles are deterministic OFFLINE estimates based on
 * typical local prices, behind a provider-shaped interface so a real retail
 * API integration can replace the estimator later (see
 * docs/grocery-provider-architecture.md).
 */

export type StoreId = 'walmart' | 'aldi' | 'meijer';

/** One ordered stop in a store's walking sequence. */
export interface StoreAisleStop {
  aisleLabel: string;
  departments: GroceryDepartment[];
  note?: string;
}

export interface StoreProfile {
  id: StoreId;
  name: string;
  emoji: string;
  tagline: string;
  /** Flat multiplier applied to every estimated price; 1.0 = baseline market pricing. */
  pricingMultiplier: number;
  /** Per-department adjustment layered on top of pricingMultiplier (e.g. Meijer's strong produce). */
  departmentMultipliers: Partial<Record<GroceryDepartment, number>>;
  /**
   * Departments this store typically does not carry, with the substitution
   * copy shown for affected items. null = full assortment.
   */
  availability: { departments: GroceryDepartment[]; note: string } | null;
  /** Ordered walking order. Produce early, dairy late, frozen last — how real stores manage cold chain. */
  walkSequence: StoreAisleStop[];
  /** Base minutes spent per stop before per-item picking time. */
  estMinutesPerStop: number;
}

export interface StoreQuoteLineItem {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  priceUsd: number | null;
  available: boolean;
  substitution?: string;
}

export interface StoreQuote {
  storeId: StoreId;
  lines: StoreQuoteLineItem[];
  subtotalUsd: number;
  unavailableCount: number;
  savingsVsWorstUsd: number;
}
