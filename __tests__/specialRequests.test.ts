import { generateMealPlan, matchRequestsToRecipes, reconcileRequests, scoreRecipe } from '../src/engines/mealPlanningEngine';
import { DEFAULT_SCORING_WEIGHTS } from '../src/types/mealPlan';
import { RECIPE_LIBRARY } from '../src/data/recipes';
import { SEED_SPECIAL_REQUESTS } from '../src/data/seedHousehold';
import { SpecialRequest } from '../src/types/specialRequests';
import { buildHousehold, buildMember, buildRecipe } from '../testUtils/fixtures';

function buildRequest(overrides: Partial<SpecialRequest> = {}): SpecialRequest {
  return {
    id: 'req_1',
    memberId: 'member_1',
    memberName: 'Test Member',
    text: '',
    createdAt: '2026-08-25T00:00:00.000Z',
    status: 'open',
    ...overrides,
  };
}

describe('matchRequestsToRecipes', () => {
  it('matches taco phrasing to the beef tacos recipe in the real library', () => {
    const matches = matchRequestsToRecipes([buildRequest({ text: 'Can we have taco night please??' })], RECIPE_LIBRARY);
    expect(matches.get('req_1')).toBe('recipe_beef-tacos');
  });

  it('ignores stopwords and requires a meaningful token', () => {
    const matches = matchRequestsToRecipes([buildRequest({ text: 'Dinner please!!' })], RECIPE_LIBRARY);
    expect(matches.has('req_1')).toBe(false);
  });

  it('leaves free-text cravings with no library counterpart unmatched', () => {
    const matches = matchRequestsToRecipes([buildRequest({ text: "Maya wants her friend's mom's birria" })], RECIPE_LIBRARY);
    expect(matches.has('req_1')).toBe(false);
  });

  it('matches on cuisine tokens when the dish name is unknown', () => {
    const matches = matchRequestsToRecipes([buildRequest({ text: 'Something Brazilian would be amazing' })], RECIPE_LIBRARY);
    expect(matches.get('req_1')).toBe('recipe_brazilian-beef-stroganoff');
  });
});

describe('generateMealPlan with specialRequests', () => {
  const household = buildHousehold({}, [
    buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: [], dietaryRestrictions: [], spiceTolerance: 'medium' } }),
  ]);

  it('forces a matched recipe into the earliest dinner slot of the real library', () => {
    const plan = generateMealPlan({
      household,
      inventory: [],
      recipeLibrary: RECIPE_LIBRARY,
      pastMeals: [],
      weekStartDate: '2026-08-24',
      specialRequests: [buildRequest({ text: 'Taco night!!' })],
    });
    expect(plan.meals[0].recipeId).toBe('recipe_beef-tacos');
    expect(plan.meals).toHaveLength(7);
  });

  it('forces one slot per matched request and caps at the number of dinners', () => {
    const plan = generateMealPlan({
      household,
      inventory: [],
      recipeLibrary: RECIPE_LIBRARY,
      pastMeals: [],
      weekStartDate: '2026-08-24',
      specialRequests: [buildRequest({ id: 'req_a', text: 'Taco night!!' }), buildRequest({ id: 'req_b', text: 'Margherita pizza please' })],
    });
    expect(plan.meals[0].recipeId).toBe('recipe_beef-tacos');
    expect(plan.meals[1].recipeId).toBe('recipe_margherita-flatbread');

    const shortWeek = generateMealPlan({
      household,
      inventory: [],
      recipeLibrary: RECIPE_LIBRARY,
      pastMeals: [],
      weekStartDate: '2026-08-24',
      numberOfDinners: 1,
      specialRequests: [buildRequest({ id: 'req_a', text: 'Taco night!!' }), buildRequest({ id: 'req_b', text: 'Margherita pizza please' })],
    });
    expect(shortWeek.meals).toHaveLength(1);
    expect(shortWeek.meals[0].recipeId).toBe('recipe_beef-tacos');
  });

  it('never forces a recipe that violates a household allergy', () => {
    const allergicHousehold = buildHousehold({}, [
      buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: ['Shellfish'], dietaryRestrictions: [], spiceTolerance: 'medium' } }),
    ]);
    const library = [
      buildRecipe({ id: 'safe-curry', name: 'Coconut Curry', cuisine: 'Indian' }),
      buildRecipe({ id: 'shrimp-boil', name: 'Shrimp Boil', cuisine: 'American', ingredients: [{ id: 'i1', name: 'shrimp', quantity: 1, unit: 'lb' }] }),
    ];
    const plan = generateMealPlan({
      household: allergicHousehold,
      inventory: [],
      recipeLibrary: library,
      pastMeals: [],
      weekStartDate: '2026-08-24',
      specialRequests: [buildRequest({ text: 'Shrimp boil night!!' })],
    });
    expect(plan.meals.some((m) => m.recipeId === 'shrimp-boil')).toBe(false);
    expect(plan.meals.length).toBeGreaterThan(0);
  });

  it('gives recipes tied to a request a family-preference boost in scoring', () => {
    const recipe = buildRecipe();
    const base = scoreRecipe(recipe, { household, inventory: [], recentCuisines: [], weights: DEFAULT_SCORING_WEIGHTS });
    const boosted = scoreRecipe(recipe, { household, inventory: [], recentCuisines: [], weights: DEFAULT_SCORING_WEIGHTS, requestBoost: 0.15 });
    expect(boosted.familyPreference).toBeCloseTo(base.familyPreference + 0.15, 5);
    expect(boosted.total).toBeGreaterThan(base.total);
  });
});

describe('reconcileRequests', () => {
  const household = buildHousehold();

  it('marks an open request planned when its recipe lands in the plan', () => {
    const request = buildRequest({ text: 'Taco night!!' });
    const plan = generateMealPlan({
      household,
      inventory: [],
      recipeLibrary: RECIPE_LIBRARY,
      pastMeals: [],
      weekStartDate: '2026-08-24',
      specialRequests: [request],
    });
    const [reconciled] = reconcileRequests(plan, [request], RECIPE_LIBRARY);
    expect(reconciled.status).toBe('planned');
    expect(reconciled.matchedRecipeId).toBe('recipe_beef-tacos');
    expect(reconciled.matchedMealDate).toBe('2026-08-24');
  });

  it('leaves requests without any matching recipe open', () => {
    const request = buildRequest({ text: "Maya wants her friend's mom's birria" });
    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: RECIPE_LIBRARY, pastMeals: [], weekStartDate: '2026-08-24' });
    const [reconciled] = reconcileRequests(plan, [request], RECIPE_LIBRARY);
    expect(reconciled.status).toBe('open');
    expect(reconciled.matchedRecipeId).toBeUndefined();
    expect(reconciled.matchedMealDate).toBeUndefined();
  });

  it('reverts a planned request to open once its meal leaves the plan', () => {
    const allergicHousehold = buildHousehold({}, [
      buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: ['Shellfish'], dietaryRestrictions: [], spiceTolerance: 'medium' } }),
    ]);
    const library = [
      buildRecipe({ id: 'safe-curry', name: 'Coconut Curry', cuisine: 'Indian' }),
      buildRecipe({ id: 'dream-dish', name: 'Birria Ramen', cuisine: 'Mexican', ingredients: [{ id: 'i1', name: 'shrimp', quantity: 1, unit: 'lb' }] }),
    ];
    const plannedRequest = buildRequest({ text: 'Birria ramen night!', status: 'planned', matchedRecipeId: 'dream-dish', matchedMealDate: '2026-08-24' });
    const plan = generateMealPlan({ household: allergicHousehold, inventory: [], recipeLibrary: library, pastMeals: [], weekStartDate: '2026-08-24' });
    const [reconciled] = reconcileRequests(plan, [plannedRequest], library);
    expect(reconciled.status).toBe('open');
    expect(reconciled.matchedRecipeId).toBeUndefined();
    expect(reconciled.matchedMealDate).toBeUndefined();
  });

  it('never touches done requests', () => {
    const doneRequest = buildRequest({ status: 'done', matchedRecipeId: 'recipe_beef-tacos', matchedMealDate: '2026-08-24' });
    const plan = generateMealPlan({ household, inventory: [], recipeLibrary: RECIPE_LIBRARY, pastMeals: [], weekStartDate: '2026-08-24' });
    const [reconciled] = reconcileRequests(plan, [doneRequest], RECIPE_LIBRARY);
    expect(reconciled).toEqual(doneRequest);
  });
});

describe('SEED_SPECIAL_REQUESTS', () => {
  it('contains exactly one library match and one open-ended craving', () => {
    expect(SEED_SPECIAL_REQUESTS).toHaveLength(2);
    const matches = matchRequestsToRecipes(SEED_SPECIAL_REQUESTS, RECIPE_LIBRARY);
    expect(matches.get(SEED_SPECIAL_REQUESTS[0].id)).toBe('recipe_beef-tacos');
    expect(matches.has(SEED_SPECIAL_REQUESTS[1].id)).toBe(false);
    for (const request of SEED_SPECIAL_REQUESTS) {
      expect(request.status).toBe('open');
      expect(request.memberName === 'Sofia' || request.memberName === 'Giulia').toBe(true);
    }
  });
});
