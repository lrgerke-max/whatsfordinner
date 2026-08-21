import { dislikeCollisionScore, isRecipeSafeForHousehold } from '../src/engines/dietaryRules';
import { buildHousehold, buildMember, buildRecipe } from '../testUtils/fixtures';

describe('isRecipeSafeForHousehold', () => {
  it('excludes a recipe containing a member allergen', () => {
    const household = buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: ['Dairy'], dietaryRestrictions: [], spiceTolerance: 'medium' } })]);
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'mozzarella cheese', quantity: 1, unit: 'cup' }] });
    expect(isRecipeSafeForHousehold(recipe, household)).toBe(false);
  });

  it('allows a recipe with no allergen overlap', () => {
    const household = buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: ['Shellfish'], dietaryRestrictions: [], spiceTolerance: 'medium' } })]);
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' }] });
    expect(isRecipeSafeForHousehold(recipe, household)).toBe(true);
  });

  it('excludes meat for a vegetarian household', () => {
    const household = buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: [], dietaryRestrictions: ['Vegetarian'], spiceTolerance: 'medium' } })]);
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'ground beef', quantity: 1, unit: 'lb' }] });
    expect(isRecipeSafeForHousehold(recipe, household)).toBe(false);
  });

  it('allows a vegetarian recipe for a vegetarian household', () => {
    const household = buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: [], allergies: [], dietaryRestrictions: ['Vegetarian'], spiceTolerance: 'medium' } })]);
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'black beans', quantity: 1, unit: 'each' }, { id: '2', name: 'rice', quantity: 1, unit: 'cup' }] });
    expect(isRecipeSafeForHousehold(recipe, household)).toBe(true);
  });
});

describe('dislikeCollisionScore', () => {
  it('flags a seafood recipe when a member dislikes seafood', () => {
    const household = buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: ['seafood'], allergies: [], dietaryRestrictions: [], spiceTolerance: 'medium' } })]);
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'shrimp', quantity: 1, unit: 'lb' }] });
    expect(dislikeCollisionScore(recipe, household)).toBeGreaterThan(0);
  });

  it('returns 0 when nothing collides', () => {
    const household = buildHousehold({}, [buildMember({ foodPreference: { favoriteCuisines: [], dislikedFoods: ['mushrooms'], allergies: [], dietaryRestrictions: [], spiceTolerance: 'medium' } })]);
    const recipe = buildRecipe({ ingredients: [{ id: '1', name: 'chicken breast', quantity: 1, unit: 'lb' }] });
    expect(dislikeCollisionScore(recipe, household)).toBe(0);
  });
});
