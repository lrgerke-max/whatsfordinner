import { GroceryDepartment, GroceryItem } from '../types/grocery';
import { StoreProfile } from '../types/stores';

/**
 * Deterministic in-store route builder: places grocery items onto a store's
 * ordered walk sequence (produce early, frozen last) and estimates trip time.
 */

export interface RouteStop {
  order: number;
  aisleLabel: string;
  items: GroceryItem[];
  estMinutes: number;
}

export interface ShoppingTripPlan {
  stops: RouteStop[];
  /** Items the store likely doesn't carry — omitted from every stop. */
  skippedCount: number;
  totalMinutes: number;
}

/** Small deterministic per-item picking increment on top of the stop base. */
const MINUTES_PER_ITEM = 0.4;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function departmentToStopIndex(profile: StoreProfile): Map<GroceryDepartment, number> {
  const map = new Map<GroceryDepartment, number>();
  profile.walkSequence.forEach((stop, index) => {
    for (const department of stop.departments) {
      if (!map.has(department)) map.set(department, index);
    }
  });
  return map;
}

export function buildRoute(items: GroceryItem[], profile: StoreProfile): RouteStop[] {
  return planShoppingTrip(items, profile).stops;
}

export function planShoppingTrip(items: GroceryItem[], profile: StoreProfile): ShoppingTripPlan {
  const deptToStop = departmentToStopIndex(profile);
  const buckets = profile.walkSequence.map((stop) => ({
    aisleLabel: stop.aisleLabel,
    items: [] as GroceryItem[],
  }));

  let skippedCount = 0;
  for (const item of items) {
    const index = deptToStop.get(item.department);
    if (index === undefined) {
      skippedCount += 1; // store doesn't carry this department
      continue;
    }
    buckets[index].items.push(item);
  }

  let order = 0;
  const stops = buckets
    .filter((bucket) => bucket.items.length > 0)
    .map((bucket) => {
      order += 1;
      return {
        order,
        aisleLabel: bucket.aisleLabel,
        items: bucket.items,
        estMinutes: round1(profile.estMinutesPerStop + bucket.items.length * MINUTES_PER_ITEM),
      };
    });

  return {
    stops,
    skippedCount,
    totalMinutes: round1(stops.reduce((sum, stop) => sum + stop.estMinutes, 0)),
  };
}

export function totalRouteMinutes(stops: RouteStop[]): number {
  return round1(stops.reduce((sum, stop) => sum + stop.estMinutes, 0));
}
