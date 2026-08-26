import { GroceryDepartment, GroceryItem } from '../types/grocery';
import { StoreId, StoreProfile, StoreQuote, StoreQuoteLineItem } from '../types/stores';
import { hashString } from '../utils/hash';

/**
 * OFFLINE store deal estimator — deterministic, hash-based pricing.
 *
 * This does NOT scrape or call any retailer. Each item's estimated price is
 * derived from a stable string hash of its name mapped into a plausible
 * price band for its department ("typical local prices"), then adjusted by
 * the store profile. Same input always produces the same quote.
 *
 * A real provider (retail API) can later implement the same shape without
 * touching callers — see docs/grocery-provider-architecture.md.
 */

/** Plausible per-unit price band (USD) per department. */
const PRICE_BANDS_USD: Record<GroceryDepartment, { min: number; max: number }> = {
  produce: { min: 0.79, max: 4.5 },
  meat: { min: 4.99, max: 12.99 },
  seafood: { min: 6.99, max: 16.99 },
  dairy: { min: 2.29, max: 5.99 },
  grains: { min: 1.99, max: 5.49 },
  canned: { min: 0.89, max: 3.49 },
  condiments: { min: 1.79, max: 4.99 },
  spices: { min: 1.99, max: 6.49 },
  baking: { min: 1.49, max: 4.99 },
  beverages: { min: 1.29, max: 4.99 },
  frozen: { min: 2.49, max: 7.99 },
  snacks: { min: 1.99, max: 5.49 },
  other: { min: 1.49, max: 5.99 },
};

/** Aldi prices in nickel steps; others round to the cent. */
const ROUNDING_STEP_USD: Record<StoreId, number> = {
  walmart: 0.01,
  aldi: 0.05,
  meijer: 0.01,
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function baseUnitPriceUsd(name: string, department: GroceryDepartment): number {
  const band = PRICE_BANDS_USD[department];
  const fraction = (hashString(name.toLowerCase().trim()) % 10000) / 10000;
  return band.min + fraction * (band.max - band.min);
}

function roundToStep(value: number, step: number): number {
  return roundCents(Math.round(value / step) * step);
}

export function quoteStore(items: GroceryItem[], profile: StoreProfile): StoreQuote {
  const roundingStep = ROUNDING_STEP_USD[profile.id];
  const unavailableDepartments = new Set(profile.availability?.departments ?? []);

  const lines: StoreQuoteLineItem[] = items.map((item) => {
    // Clamp hostile quantities so a corrupted item can't produce negative or
    // infinite money math downstream.
    const qty = Number.isFinite(item.quantity) ? Math.max(0, item.quantity) : 0;
    if (unavailableDepartments.has(item.department)) {
      return {
        itemId: item.id,
        name: item.name,
        quantity: qty,
        unit: item.unit,
        priceUsd: null,
        available: false,
        substitution: profile.availability?.note,
      };
    }
    const deptMultiplier = profile.departmentMultipliers[item.department] ?? 1;
    const raw =
      baseUnitPriceUsd(item.name, item.department) *
      qty *
      profile.pricingMultiplier *
      deptMultiplier;
    return {
      itemId: item.id,
      name: item.name,
      quantity: qty,
      unit: item.unit,
      priceUsd: roundToStep(raw, roundingStep),
      available: true,
    };
  });

  const subtotalUsd = roundCents(lines.reduce((sum, line) => sum + (line.priceUsd ?? 0), 0));
  const unavailableCount = lines.filter((line) => !line.available).length;

  return {
    storeId: profile.id,
    lines,
    subtotalUsd,
    unavailableCount,
    // Computed against the full basket in compareStores (equal-basket basis).
    savingsVsWorstUsd: 0,
  };
}

export interface StoreComparison {
  /** Sorted cheapest-first. */
  quotes: StoreQuote[];
  best: StoreId;
  worst: StoreId;
  maxSavingUsd: number;
}

export function compareStores(items: GroceryItem[], profiles: StoreProfile[]): StoreComparison {
  if (profiles.length === 0) {
    throw new Error('compareStores requires at least one store profile');
  }

  const quoted = profiles.map((profile) => quoteStore(items, profile));

  // A store carrying NONE of the list isn't a real deal candidate — without
  // this guard an all-seafood basket makes Aldi "win" at $0.00.
  const rankable = quoted.filter((q) => q.lines.some((l) => l.available));
  const pool = rankable.length > 0 ? rankable : quoted;

  // Stable tie-break on original profile order keeps this deterministic.
  const sorted = pool
    .map((quote, index) => ({ quote, index }))
    .sort((a, b) => a.quote.subtotalUsd - b.quote.subtotalUsd || a.index - b.index)
    .map((entry) => entry.quote);

  const worstOverall = [...quoted].sort((a, b) => b.subtotalUsd - a.subtotalUsd)[0];
  const worstLinesById = new Map(worstOverall.lines.map((l) => [l.itemId, l]));

  // Savings are computed on the equal basket both stores actually carry, so
  // excluding an item can't masquerade as a discount.
  const withSavings = sorted.map((quote) => {
    let commonThis = 0;
    let commonWorst = 0;
    for (const line of quote.lines) {
      const worstLine = worstLinesById.get(line.itemId);
      if (!line.available || !worstLine?.available) continue;
      commonThis += line.priceUsd ?? 0;
      commonWorst += worstLine.priceUsd ?? 0;
    }
    return { ...quote, savingsVsWorstUsd: roundCents(Math.max(0, commonWorst - commonThis)) };
  });

  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return {
    quotes: withSavings,
    best: best.storeId,
    worst: worst.storeId,
    // Read from the enriched quote — the raw quote still carries 0.
    maxSavingUsd: withSavings.find((q) => q.storeId === best.storeId)?.savingsVsWorstUsd ?? 0,
  };
}
