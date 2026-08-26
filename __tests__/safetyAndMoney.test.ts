import { isRecipeSafeForHousehold, dislikeCollisionScore } from '../src/engines/dietaryRules';
import { generateMealPlan, matchRequestsToRecipes, generateSwapAlternatives } from '../src/engines/mealPlanningEngine';
import { categorizeIngredient } from '../src/engines/categorize';
import { buildHousehold, buildInventoryItem, buildMember, buildRecipe } from '../testUtils/fixtures';
import { SpecialRequest } from '../src/types/specialRequests';
import { Recipe } from '../src/types/recipe';

function householdWith(allergies: string[], restrictions: string[] = [], dislikedFoods: string[] = []) {
  return buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods, allergies, dietaryRestrictions: restrictions, spiceTolerance: 'medium' } })]);
}

describe('dietary safety regression (generated-library hazards)', () => {
  const fishSauceCurry = buildRecipe({
    id: 'thai-curry',
    ingredients: [
      { id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' },
      { id: '2', name: 'fish sauce', quantity: 1, unit: 'tbsp' },
      { id: '3', name: 'coconut milk', quantity: 1, unit: 'cup' },
    ],
  });

  const bunBurger = buildRecipe({
    id: 'burger',
    ingredients: [
      { id: '1', name: 'ground beef', quantity: 1, unit: 'lb' },
      { id: '2', name: 'burger buns', quantity: 4, unit: 'each' },
    ],
  });

  const misoChicken = buildRecipe({
    id: 'miso',
    ingredients: [
      { id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' },
      { id: '2', name: 'miso paste', quantity: 2, unit: 'tbsp' },
    ],
  });

  const eggplantDish = buildRecipe({
    id: 'eggplant',
    ingredients: [{ id: '1', name: 'eggplant', quantity: 1, unit: 'each' }],
  });

  it('fish allergy rejects fish sauce — not just named fillets', () => {
    expect(isRecipeSafeForHousehold(fishSauceCurry, householdWith(['Fish']))).toBe(false);
  });

  it('wheat allergy rejects burger buns', () => {
    expect(isRecipeSafeForHousehold(bunBurger, householdWith(['Wheat']))).toBe(false);
  });

  it('soy allergy rejects miso paste', () => {
    expect(isRecipeSafeForHousehold(misoChicken, householdWith(['Soy']))).toBe(false);
  });

  it('egg allergy does not false-positive on eggplant', () => {
    expect(isRecipeSafeForHousehold(eggplantDish, householdWith(['Eggs']))).toBe(true);
  });

  it('vegetarian restriction rejects chicken broth', () => {
    const soup = buildRecipe({
      ingredients: [
        { id: '1', name: 'chicken broth', quantity: 6, unit: 'cup' },
        { id: '2', name: 'carrots', quantity: 2, unit: 'each' },
      ],
    });
    expect(isRecipeSafeForHousehold(soup, householdWith([], ['Vegetarian']))).toBe(false);
  });

  it('disliking "shellfish" (not just "seafood") penalizes shrimp recipes', () => {
    const shrimp = buildRecipe({ ingredients: [{ id: '1', name: 'shrimp', quantity: 1, unit: 'lb' }] });
    expect(dislikeCollisionScore(shrimp, householdWith([], [], ['shellfish']))).toBeGreaterThan(0);
  });
});

describe('dated special requests', () => {
  const household = householdWith([]);

  it('lands a preferredDate request on its exact night even when listed first', () => {
    const tuesday = '2026-08-25';
    const requests: SpecialRequest[] = [
      { id: 'req-1', memberId: 'm1', memberName: 'Alex', text: 'Taco Tuesday please', createdAt: '2026-08-20T00:00:00Z', status: 'open', preferredDate: tuesday },
      { id: 'req-2', memberId: 'm1', memberName: 'Alex', text: 'something with pasta', createdAt: '2026-08-20T00:00:00Z', status: 'open' },
    ];
    const library: Recipe[] = [
      buildRecipe({ id: 'tacos', name: 'Beef Tacos', cuisine: 'Mexican' }),
      buildRecipe({ id: 'pasta', name: 'Spaghetti', cuisine: 'Italian' }),
      buildRecipe({ id: 'other', name: 'Stew', cuisine: 'American' }),
    ];
    const matches = matchRequestsToRecipes(requests, library);
    expect(matches.get('req-1')).toBe('tacos');

    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: library, pastMeals: [], weekStartDate: '2026-08-24', numberOfDinners: 7, specialRequests: requests });
    const tacoNight = plan.meals.find((m) => m.recipeId === 'tacos');
    expect(tacoNight?.date).toBe(tuesday);
  });

  it('a garbage weekStartDate degrades to a valid Monday, including in the plan header', () => {
    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: [buildRecipe({ id: 'x' })], pastMeals: [], weekStartDate: 'not-a-date', numberOfDinners: 1 });
    expect(plan.weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${plan.weekStartDate}T00:00:00`).getDay()).toBe(1); // Monday
  });

  it('never-again recipes are excluded from swap alternatives too', () => {
    const library = [buildRecipe({ id: 'bad', name: 'Bad Dish' }), buildRecipe({ id: 'good', name: 'Good Dish' })];
    const alternatives = generateSwapAlternatives('other-recipe', {
      household,
      inventory: [],
      recipeLibrary: library,
      pastMeals: [],
      mealRatings: { bad: 'never-again' },
      count: 5,
    });
    expect(alternatives.some((r) => r.id === 'bad')).toBe(false);
  });
});

describe('ingredient categorization (generated-library vocabulary)', () => {
  it('files generator staples into real aisles, not "other"', () => {
    const expected: Array<[string, string]> = [
      ['flank steak', 'meat'],
      ['fish sauce', 'condiments'],
      ['tomato paste', 'canned'],
      ['black pepper', 'spices'],
      ['chicken broth', 'canned'],
      ['mixed greens', 'produce'],
      ['garam masala', 'spices'],
      ['tofu', 'other'],
      ['rice noodles', 'grains'],
      ['gochujang', 'condiments'],
      ['burger buns', 'grains'],
      ['coconut milk', 'canned'],
      ['sesame seeds', 'spices'],
      ['snap peas', 'produce'],
      ['eggs', 'dairy'],
      ['eggplant', 'produce'],
    ];
    for (const [name, dept] of expected) {
      expect(categorizeIngredient(name)).toBe(dept);
    }
  });
});

describe('money math', () => {
  it('estimated additional cost equals missing ingredients × the per-item estimate', () => {
    const { ESTIMATED_COST_PER_MISSING_INGREDIENT } = require('../src/engines/mealPlanningEngine');
    const household = householdWith([]);
    const recipe = buildRecipe({
      ingredients: [
        { id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' },
        { id: '2', name: 'saffron', quantity: 1, unit: 'tsp' },
        { id: '3', name: 'unicorn tears', quantity: 1, unit: 'tbsp' },
        { id: '4', name: 'moon cheese', quantity: 1, unit: 'oz' },
      ],
    });
    const plan = generateMealPlan({
      household,
      inventory: [buildInventoryItem({ name: 'chicken breast', approxQuantity: { value: 5, unit: 'lb', isApproximate: true } })],
      recipeLibrary: [recipe],
      pastMeals: [],
      weekStartDate: '2026-08-24',
      numberOfDinners: 1,
    });
    expect(plan.meals[0].estimatedAdditionalCostUsd).toBeCloseTo(ESTIMATED_COST_PER_MISSING_INGREDIENT * 3, 2);
  });
});
