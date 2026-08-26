import { generateId } from '../utils/id';
import { nowIso } from '../utils/date';
import { InventoryItem } from '../types/inventory';
import { Recipe, RecipeIngredient } from '../types/recipe';
import { MealPlan } from '../types/mealPlan';
import { GroceryItem, GroceryList } from '../types/grocery';
import { estimateCoverage, findInventoryMatch, normalizeIngredientName, QUANTITY_LEVEL_FRACTION } from './inventoryMatch';
import { categorizeIngredient } from './categorize';

const COUNT_UNITS = new Set(['each', 'item', 'clove', 'head', 'bunch', 'slice', 'leaf', 'container']);
const MOCK_PRICE_PER_UNIT: Record<string, number> = {
  lb: 4.5,
  oz: 0.6,
  each: 0.9,
  clove: 0.15,
  cup: 1.2,
  tbsp: 0.3,
  tsp: 0.15,
  head: 2.5,
  bunch: 2,
  slice: 0.5,
  leaf: 0.2,
  container: 3,
  gallon: 4,
};

interface AggregatedNeed {
  name: string;
  unit: string;
  quantity: number;
  recipeIds: Set<string>;
}

function aggregateNeeds(meals: MealPlan['meals'], recipesById: Map<string, Recipe>): AggregatedNeed[] {
  const byKey = new Map<string, AggregatedNeed>();

  for (const meal of meals) {
    const recipe = recipesById.get(meal.recipeId);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      if (ingredient.optional) continue;
      const unit = ingredient.unit.toLowerCase().trim() || 'each';
      // Emoji-only names normalize to '' — fall back to the raw name so two
      // different emoji ingredients don't merge into one mystery row.
      const normalized = normalizeIngredientName(ingredient.name) || ingredient.name.toLowerCase().trim();
      const key = `${normalized}::${unit}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.quantity += Number.isFinite(ingredient.quantity) ? ingredient.quantity : 0;
        existing.recipeIds.add(recipe.id);
      } else {
        byKey.set(key, {
          name: ingredient.name,
          unit,
          quantity: Number.isFinite(ingredient.quantity) ? ingredient.quantity : 0,
          recipeIds: new Set([recipe.id]),
        });
      }
    }
  }

  return Array.from(byKey.values());
}

function roundQuantity(value: number, unit: string): number {
  if (COUNT_UNITS.has(unit)) return Math.max(1, Math.ceil(value));
  if (value < 1) return Math.round(value * 4) / 4; // nearest quarter
  return Math.round(value * 2) / 2; // nearest half
}

/** How much of a needed ingredient we still must buy, given what's in inventory. */
function amountToBuy(need: AggregatedNeed, inventory: InventoryItem[]): number {
  const item = findInventoryMatch(need.name, inventory);
  if (!item) return need.quantity;

  if (item.approxQuantity) {
    const coverage = estimateCoverage(item, need.quantity, need.unit);
    if (coverage >= 1) return 0;
    const owned = coverage * need.quantity;
    return Math.max(0, need.quantity - owned);
  }

  const fraction = QUANTITY_LEVEL_FRACTION[item.quantityLevel];
  if (fraction >= 0.6) return 0; // full / mostly-full: assume enough
  if (fraction <= 0.2) return need.quantity; // nearly-empty or unknown-low: buy the full amount
  return need.quantity * 0.5; // half / some: top up
}

export function generateGroceryList(mealPlan: MealPlan, recipeLibrary: Recipe[], inventory: InventoryItem[]): GroceryList {
  const recipesById = new Map(recipeLibrary.map((r) => [r.id, r]));
  const needs = aggregateNeeds(mealPlan.meals, recipesById);

  const items: GroceryItem[] = [];
  for (const need of needs) {
    // Corrupted quantities (NaN/Infinity/negative) must never become line
    // items — they'd poison every total downstream.
    if (!Number.isFinite(need.quantity)) continue;
    if (need.quantity <= 0) continue;
    const buyQuantity = roundQuantity(amountToBuy(need, inventory), need.unit);
    if (!Number.isFinite(buyQuantity) || buyQuantity <= 0) continue;

    const recipeNames = Array.from(need.recipeIds)
      .map((id) => recipesById.get(id)?.name)
      .filter((n): n is string => Boolean(n));

    items.push({
      id: generateId('grocery'),
      name: capitalize(need.name),
      quantity: buyQuantity,
      unit: need.unit,
      department: categorizeIngredient(need.name),
      reason: `Used in ${recipeNames.join(', ')}`,
      usedInRecipeIds: Array.from(need.recipeIds),
      checked: false,
      isCustom: false,
      alreadyHave: false,
      estimatedPriceUsd: Math.round(buyQuantity * (MOCK_PRICE_PER_UNIT[need.unit] ?? 1.5) * 100) / 100,
    });
  }

  items.sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));

  return {
    id: generateId('grocerylist'),
    mealPlanId: mealPlan.id,
    weekStartDate: mealPlan.weekStartDate,
    items,
    generatedAt: nowIso(),
  };
}

export function explainGroceryItem(
  item: GroceryItem,
  mealPlan: MealPlan,
  recipeLibrary: Recipe[],
  inventory: InventoryItem[]
): string {
  const recipesById = new Map(recipeLibrary.map((r) => [r.id, r]));
  const usages = item.usedInRecipeIds
    .map((id) => {
      const recipe = recipesById.get(id);
      const meal = mealPlan.meals.find((m) => m.recipeId === id);
      const ingredient = recipe?.ingredients.find((i: RecipeIngredient) => normalizeIngredientName(i.name) === normalizeIngredientName(item.name));
      return recipe && meal ? { recipeName: recipe.name, date: meal.date, quantity: ingredient?.quantity, unit: ingredient?.unit } : undefined;
    })
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  if (usages.length === 0) {
    return item.isCustom ? `You added ${item.name} yourself.` : `You're buying ${item.quantity} ${item.unit} of ${item.name}.`;
  }

  const owned = findInventoryMatch(item.name, inventory);
  const ownedClause = owned
    ? ` and you only have ${describeOwned(owned.quantityLevel, owned.approxQuantity)} left`
    : " and you don't have any right now";

  const usageClause = usages
    .map((u) => `${weekdayFromIso(u.date)}'s ${u.recipeName}`)
    .join(' and ');

  return `You're buying ${item.quantity} ${item.unit} of ${item.name} because it's needed for ${usageClause}${ownedClause}.`;
}

function describeOwned(level: string, approx?: { value: number; unit: string }): string {
  if (approx) return `about ${approx.value} ${approx.unit}`;
  return level.replace('-', ' ');
}

function weekdayFromIso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
