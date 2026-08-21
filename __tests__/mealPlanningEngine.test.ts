import { generateMealPlan, matchRecipeToInventory, scoreRecipe } from '../src/engines/mealPlanningEngine';
import { DEFAULT_SCORING_WEIGHTS } from '../src/types/mealPlan';
import { buildHousehold, buildInventoryItem, buildMember, buildRecipe } from '../testUtils/fixtures';

describe('matchRecipeToInventory', () => {
  it('counts matched and missing ingredients', () => {
    const inventory = [
      buildInventoryItem({ name: 'Chicken breast', approxQuantity: { value: 2, unit: 'lb', isApproximate: true } }),
    ];
    const recipe = buildRecipe({
      ingredients: [
        { id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' },
        { id: '2', name: 'capers', quantity: 1, unit: 'tbsp' },
      ],
    });
    const match = matchRecipeToInventory(recipe, inventory);
    expect(match.requiredCount).toBe(2);
    expect(match.matchedCount).toBe(1);
    expect(match.missingIngredientNames).toEqual(['capers']);
  });

  it('ignores optional ingredients when computing requirements', () => {
    const recipe = buildRecipe({
      ingredients: [
        { id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' },
        { id: '2', name: 'parsley', quantity: 1, unit: 'bunch', optional: true },
      ],
    });
    const match = matchRecipeToInventory(recipe, []);
    expect(match.requiredCount).toBe(1);
  });
});

describe('scoreRecipe', () => {
  it('scores a recipe higher when more of its ingredients are already owned', () => {
    const household = buildHousehold();
    const recipe = buildRecipe();
    const wellStocked = [
      buildInventoryItem({ name: 'chicken breast', approxQuantity: { value: 2, unit: 'lb', isApproximate: true } }),
      buildInventoryItem({ name: 'rice', approxQuantity: { value: 2, unit: 'cup', isApproximate: true } }),
    ];
    const emptyPantry: ReturnType<typeof buildInventoryItem>[] = [];

    const stockedScore = scoreRecipe(recipe, { household, inventory: wellStocked, recentCuisines: [], weights: DEFAULT_SCORING_WEIGHTS });
    const emptyScore = scoreRecipe(recipe, { household, inventory: emptyPantry, recentCuisines: [], weights: DEFAULT_SCORING_WEIGHTS });

    expect(stockedScore.inventoryUtilization).toBeGreaterThan(emptyScore.inventoryUtilization);
    expect(stockedScore.total).toBeGreaterThan(emptyScore.total);
  });

  it('penalizes cuisines that have appeared recently, for variety', () => {
    const household = buildHousehold();
    const recipe = buildRecipe({ cuisine: 'Italian' });
    const fresh = scoreRecipe(recipe, { household, inventory: [], recentCuisines: [], weights: DEFAULT_SCORING_WEIGHTS });
    const repeated = scoreRecipe(recipe, { household, inventory: [], recentCuisines: ['Italian', 'Italian'], weights: DEFAULT_SCORING_WEIGHTS });
    expect(repeated.cuisineVariety).toBeLessThan(fresh.cuisineVariety);
  });
});

describe('generateMealPlan', () => {
  const household = buildHousehold({}, [
    buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: ['Shellfish'], dietaryRestrictions: [], spiceTolerance: 'medium' } }),
  ]);

  const library = [
    buildRecipe({ id: 'safe-1', cuisine: 'Italian' }),
    buildRecipe({ id: 'safe-2', cuisine: 'Mexican' }),
    buildRecipe({ id: 'safe-3', cuisine: 'American' }),
    buildRecipe({ id: 'shellfish-1', ingredients: [{ id: '1', name: 'shrimp', quantity: 1, unit: 'lb' }] }),
  ];

  it('never includes a recipe that violates a household allergy', () => {
    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: library, pastMeals: [], weekStartDate: '2026-08-24', numberOfDinners: 3 });
    expect(plan.meals.some((m) => m.recipeId === 'shellfish-1')).toBe(false);
  });

  it('produces one meal per requested day, each with a valid recipe reference', () => {
    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: library, pastMeals: [], weekStartDate: '2026-08-24', numberOfDinners: 3 });
    expect(plan.meals).toHaveLength(3);
    const validIds = new Set(library.map((r) => r.id));
    for (const meal of plan.meals) {
      expect(validIds.has(meal.recipeId)).toBe(true);
    }
  });

  it('avoids repeating the same recipe twice in one week when enough alternatives exist', () => {
    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: library, pastMeals: [], weekStartDate: '2026-08-24', numberOfDinners: 3 });
    const recipeIds = plan.meals.map((m) => m.recipeId);
    expect(new Set(recipeIds).size).toBe(recipeIds.length);
  });

  it('excludes a recipe rated never-again', () => {
    const plan = generateMealPlan({
      household,
      inventory: [],
      recipeLibrary: library,
      pastMeals: [],
      mealRatings: { 'safe-1': 'never-again' },
      weekStartDate: '2026-08-24',
      numberOfDinners: 3,
    });
    expect(plan.meals.some((m) => m.recipeId === 'safe-1')).toBe(false);
  });
});
