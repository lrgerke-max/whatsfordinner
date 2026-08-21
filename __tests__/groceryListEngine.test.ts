import { explainGroceryItem, generateGroceryList } from '../src/engines/groceryListEngine';
import { buildInventoryItem, buildRecipe } from '../testUtils/fixtures';
import { MealPlan } from '../src/types/mealPlan';
import { generateId } from '../src/utils/id';
import { nowIso, weekdayLabel } from '../src/utils/date';

function buildPlan(meals: MealPlan['meals']): MealPlan {
  return { id: generateId('plan'), weekStartDate: '2026-08-24', meals, generatedAt: nowIso() };
}

describe('generateGroceryList', () => {
  it('does not list an ingredient the household already has enough of', () => {
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'rice', quantity: 1.5, unit: 'lb' }] });
    const inventory = [buildInventoryItem({ name: 'Rice', approxQuantity: { value: 3, unit: 'lb', isApproximate: true } })];
    const plan = buildPlan([{ id: 'm1', date: '2026-08-24', recipeId: recipe.id, status: 'planned', inventoryMatchCount: 1, totalIngredientCount: 1, estimatedAdditionalCostUsd: 0 }]);

    const list = generateGroceryList(plan, [recipe], inventory);
    expect(list.items.find((i) => i.name.toLowerCase() === 'rice')).toBeUndefined();
  });

  it('lists an ingredient that is nearly empty even if some is left', () => {
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'milk', quantity: 1, unit: 'gallon' }] });
    const inventory = [buildInventoryItem({ name: 'Milk', quantityLevel: 'nearly-empty', approxQuantity: undefined })];
    const plan = buildPlan([{ id: 'm1', date: '2026-08-24', recipeId: recipe.id, status: 'planned', inventoryMatchCount: 0, totalIngredientCount: 1, estimatedAdditionalCostUsd: 0 }]);

    const list = generateGroceryList(plan, [recipe], inventory);
    expect(list.items.find((i) => i.name.toLowerCase() === 'milk')).toBeDefined();
  });

  it('consolidates the same ingredient across multiple recipes into one rounded-up line item', () => {
    const recipeA = buildRecipe({ ingredients: [{ id: '1', name: 'onion', quantity: 1, unit: 'each' }] });
    const recipeB = buildRecipe({ ingredients: [{ id: '1', name: 'onion', quantity: 2, unit: 'each' }] });
    const plan = buildPlan([
      { id: 'm1', date: '2026-08-24', recipeId: recipeA.id, status: 'planned', inventoryMatchCount: 0, totalIngredientCount: 1, estimatedAdditionalCostUsd: 0 },
      { id: 'm2', date: '2026-08-25', recipeId: recipeB.id, status: 'planned', inventoryMatchCount: 0, totalIngredientCount: 1, estimatedAdditionalCostUsd: 0 },
    ]);

    const list = generateGroceryList(plan, [recipeA, recipeB], []);
    const onionItems = list.items.filter((i) => i.name.toLowerCase() === 'onion');
    expect(onionItems).toHaveLength(1);
    expect(onionItems[0].quantity).toBe(3);
    expect(onionItems[0].usedInRecipeIds.sort()).toEqual([recipeA.id, recipeB.id].sort());
  });

  it('skips optional ingredients entirely', () => {
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'truffle oil', quantity: 1, unit: 'tbsp', optional: true }] });
    const plan = buildPlan([{ id: 'm1', date: '2026-08-24', recipeId: recipe.id, status: 'planned', inventoryMatchCount: 0, totalIngredientCount: 0, estimatedAdditionalCostUsd: 0 }]);
    const list = generateGroceryList(plan, [recipe], []);
    expect(list.items).toHaveLength(0);
  });
});

describe('explainGroceryItem', () => {
  it('names the recipe and day the ingredient is needed for', () => {
    const recipe = buildRecipe({ name: 'Chicken Fajita Bowls', ingredients: [{ id: '1', name: 'chicken breast', quantity: 1.5, unit: 'lb' }] });
    const plan = buildPlan([{ id: 'm1', date: '2026-08-26', recipeId: recipe.id, status: 'planned', inventoryMatchCount: 0, totalIngredientCount: 1, estimatedAdditionalCostUsd: 0 }]);
    const list = generateGroceryList(plan, [recipe], []);
    const item = list.items[0];

    const explanation = explainGroceryItem(item, plan, [recipe], []);
    expect(explanation).toContain('Chicken Fajita Bowls');
    expect(explanation.toLowerCase()).toContain(weekdayLabel('2026-08-26').toLowerCase());
  });
});
