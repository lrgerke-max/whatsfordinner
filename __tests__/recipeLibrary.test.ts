import { useKitchenMemoryStore } from '../src/state/store';
import { findRecipeById, RECIPE_LIBRARY } from '../src/data/recipes';
import { cuisineEmoji } from '../src/theme/colors';
import { generateRecipes, GENERATED_RECIPE_COUNT } from '../src/data/recipeGenerator';
import { matchRequestsToRecipes } from '../src/engines/mealPlanningEngine';
import { Recipe } from '../src/types/recipe';

// The zustand store persists through AsyncStorage, which has no native
// module under jest — stub it so the store runs on its in-memory state.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiRemove: jest.fn(() => Promise.resolve()),
  },
}));

describe('recipe library', () => {
  it('contains at least 1000 recipes', () => {
    expect(RECIPE_LIBRARY.length).toBeGreaterThanOrEqual(1000);
  });

  it('has globally unique ids and names', () => {
    const ids = new Set(RECIPE_LIBRARY.map((r) => r.id));
    const names = new Set(RECIPE_LIBRARY.map((r) => r.name));
    expect(ids.size).toBe(RECIPE_LIBRARY.length);
    expect(names.size).toBe(RECIPE_LIBRARY.length);
  });

  it('only uses cuisines the UI has emoji for', () => {
    const known = new Set(Object.keys(cuisineEmoji));
    for (const recipe of RECIPE_LIBRARY) {
      expect(known.has(recipe.cuisine)).toBe(true);
    }
  });

  it('keeps hand-crafted signatures first — request matching ties resolve to earliest entries', () => {
    const generated = RECIPE_LIBRARY.filter((r) => r.id.startsWith('recipe_gen_'));
    expect(generated.length).toBe(GENERATED_RECIPE_COUNT);
    expect(RECIPE_LIBRARY.length - generated.length).toBe(20);
    // Every hand-crafted recipe precedes every generated one.
    const firstGeneratedIndex = RECIPE_LIBRARY.findIndex((r) => r.id.startsWith('recipe_gen_'));
    expect(firstGeneratedIndex).toBe(20);
  });

  it('every generated recipe is structurally valid', () => {
    const generated = RECIPE_LIBRARY.filter((r) => r.id.startsWith('recipe_gen_'));
    for (const recipe of generated) {
      expect(recipe.name.length).toBeGreaterThan(0);
      expect(recipe.cookTimeMinutes).toBeGreaterThanOrEqual(15);
      expect(recipe.cookTimeMinutes).toBeLessThanOrEqual(60);
      expect(recipe.servings).toBeGreaterThan(0);
      expect(recipe.proteinGrams).toBeGreaterThan(0);
      expect(recipe.description.length).toBeGreaterThan(0);
      expect(recipe.imageEmoji.length).toBeGreaterThan(0);
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(4);
      expect(recipe.instructions.length).toBeGreaterThanOrEqual(3);
      for (const ingredient of recipe.ingredients) {
        expect(ingredient.name.length).toBeGreaterThan(0);
        expect(ingredient.quantity).toBeGreaterThan(0);
        expect(ingredient.unit.length).toBeGreaterThan(0);
      }
    }
  });

  it('never tags a meat-containing recipe vegetarian', () => {
    const MEAT = ['chicken', 'beef', 'pork', 'turkey', 'sausage', 'steak', 'bacon', 'fish', 'shrimp', 'anchovy'];
    for (const recipe of RECIPE_LIBRARY) {
      if (!recipe.tags.includes('vegetarian')) continue;
      const hasMeat = recipe.ingredients.some((i) => MEAT.some((k) => i.name.toLowerCase().includes(k)));
      expect(hasMeat).toBe(false);
    }
  });

  it('is deterministic — regenerating yields an identical library', () => {
    const second = generateRecipes(GENERATED_RECIPE_COUNT);
    expect(second).toEqual(RECIPE_LIBRARY.slice(RECIPE_LIBRARY.length - GENERATED_RECIPE_COUNT));
  });

  it('resolves recipes by id via the map lookup', () => {
    const sample = RECIPE_LIBRARY[RECIPE_LIBRARY.length - 1];
    expect(findRecipeById(sample.id)).toBe(sample);
    expect(findRecipeById('recipe_missing')).toBeUndefined();
  });
});

describe('reshuffle flow (store-level)', () => {
  it('changes uncooked meals, keeps cooked ones, and bumps the seed', () => {
    const store = useKitchenMemoryStore.getState();
    const plan = store.mealPlan;
    if (!plan || plan.meals.length < 2) throw new Error('seeded state should have a plan');

    // Cook Monday with a rating; leave the rest planned.
    const monday = plan.meals[0];
    store.rateMeal(monday.id, 'loved');
    const state = useKitchenMemoryStore.getState();
    const cookedMeal = state.mealPlan!.meals.find((m) => m.id === monday.id)!;
    expect(cookedMeal.status).toBe('cooked');

    const beforeIds = state.mealPlan!.meals.filter((m) => m.status !== 'cooked').map((m) => m.recipeId);
    const seedBefore = state.planSeed;

    state.regenerateMealPlan({ reshuffle: true });

    const after = useKitchenMemoryStore.getState();
    expect(after.planSeed).toBe(seedBefore + 1);

    const afterPlan = after.mealPlan!;
    // Cooked night survives byte-for-byte (id, recipe, status, rating).
    const afterCooked = afterPlan.meals.find((m) => m.date === monday.date)!;
    expect(afterCooked.id).toBe(cookedMeal.id);
    expect(afterCooked.recipeId).toBe(cookedMeal.recipeId);
    expect(afterCooked.status).toBe('cooked');
    expect(afterCooked.rating).toBe('loved');

    // Every non-requested uncooked night got a different dish — exclusion +
    // new seed bench the old picks. Request-forced recipes (e.g. "Taco
    // Tuesday") legitimately come back: the household asked for them.
    const openRequests = state.specialRequests.filter((r) => r.status !== 'done');
    const forcedIds = new Set(matchRequestsToRecipes(openRequests, RECIPE_LIBRARY).values());
    const repeatableBefore = beforeIds.filter((id) => !forcedIds.has(id));
    const afterUncooked = afterPlan.meals.filter((m) => m.status !== 'cooked').map((m) => m.recipeId);
    expect(afterUncooked.some((id) => repeatableBefore.includes(id))).toBe(false);

    // A stock-driven replan keeps the seed (same inputs → same plan).
    const seedAfter = useKitchenMemoryStore.getState().planSeed;
    useKitchenMemoryStore.getState().regenerateMealPlan();
    expect(useKitchenMemoryStore.getState().planSeed).toBe(seedAfter);
  });

  it('every planned meal references a real recipe', () => {
    const plan = useKitchenMemoryStore.getState().mealPlan;
    for (const meal of plan?.meals ?? []) {
      const recipe: Recipe | undefined = findRecipeById(meal.recipeId);
      expect(recipe).toBeDefined();
    }
  });
});
