# Grocery provider architecture

The grocery list is generated purely from data already in the app — a meal
plan, a recipe library, and current inventory — via
`engines/groceryListEngine.ts#generateGroceryList`. No store integration is
required for the core "what do I need to buy" experience, and none of the
MVP depends on a live grocery API being available.

## How the list is built

1. **Aggregate needs** — walk every `Meal` in the plan, look up its
   `Recipe`, sum non-optional ingredient quantities across all recipes,
   grouped by normalized ingredient name + unit (`aggregateNeeds`). This is
   the consolidation step: three recipes each needing onions become one line
   item with the summed quantity.
2. **Diff against inventory** (`amountToBuy`) — for each aggregated need,
   look up a matching `InventoryItem`
   (`engines/inventoryMatch.ts#findInventoryMatch`, fuzzy name matching).
   - If we have a numeric `approxQuantity` and it covers the need, buy
     nothing.
   - If we only have a qualitative `quantityLevel`: `full`/`mostly-full`
     assumes enough (buy 0), `nearly-empty`/`unknown` assumes we need the
     full amount, `half`/`some` buys half to top up. This mirrors the
     product principle: *"Rice — 3 lb" and recipes need 1.5 lb → don't add
     rice. "Milk — ~10% remaining" → add milk.*
3. **Round for shopping** (`roundQuantity`) — count-style units (`each`,
   `clove`, `head`, ...) round up to a whole number; weight/volume units
   round to the nearest quarter or half. A recipe needing 0.5 onions and
   another needing 2.5 becomes "Onions — 3", not two fractional entries.
4. **Categorize** (`engines/categorize.ts#categorizeIngredient`) — a
   keyword-based mapping shared with the inventory scan pipeline (the two
   category unions are structurally identical), producing the department
   grouping (Produce/Meat/Dairy/...) the Grocery screen renders.
5. **Explain** (`explainGroceryItem`) — built on demand, not stored, from
   the `GroceryItem` + the `MealPlan` + the recipe library: which recipe(s),
   which day, and how much was already owned. This is what "Why am I buying
   this?" shows.

## Brand-agnostic by default

`GroceryItem.name` is always the generic ingredient name ("Spaghetti"), not
a brand ("Barilla Spaghetti") — matching a household that said it doesn't
care about brands (`ShoppingPreference.brandLoyalty`). `estimatedPriceUsd`
is a flat per-unit mock table (`MOCK_PRICE_PER_UNIT` in
`groceryListEngine.ts`), clearly a placeholder for real pricing.

## The `GroceryProvider` extension point

The MVP doesn't need a `GroceryProvider` interface to work — mock pricing is
just a lookup table inline in the engine. The architecture is ready for a
real one without changing the engine's core diffing logic:

```ts
interface GroceryProvider {
  searchProducts(query: string): Promise<Product[]>;
  getAvailability(productId: string, storeId: string): Promise<Availability>;
  getPrice(productId: string, storeId: string): Promise<Price>;
  buildCart(items: { productId: string; quantity: number }[]): Promise<Cart>;
}
```

Adding this later means: implement it per retailer (Walmart, Instacart,
Kroger, Amazon Fresh — see the README's "remaining integrations" list),
call it *after* `generateGroceryList` produces the generic ingredient list,
to enrich each `GroceryItem` with real price/availability and brand options
respecting `brandLoyalty` (cheapest / best value / preferred brand /
organic). The diffing and consolidation logic in this doc stays exactly the
same — a `GroceryProvider` only adds pricing/ordering on top, it never
decides *what* goes on the list.
