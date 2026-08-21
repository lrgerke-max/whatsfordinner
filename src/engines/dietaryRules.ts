import { Household } from '../types/household';
import { Recipe } from '../types/recipe';

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  peanuts: ['peanut'],
  'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut'],
  shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'clam', 'mussel'],
  fish: ['salmon', 'tuna', 'cod', 'tilapia', 'anchovy'],
  eggs: ['egg'],
  dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'parmesan', 'mozzarella', 'feta', 'cheddar'],
  soy: ['soy', 'tofu', 'edamame'],
  wheat: ['flour', 'pasta', 'bread', 'tortilla', 'breadcrumb', 'noodle'],
  sesame: ['sesame', 'tahini'],
};

const MEAT_KEYWORDS = ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'turkey', 'ham', 'lamb'];
const SEAFOOD_KEYWORDS = ['shrimp', 'salmon', 'tuna', 'cod', 'crab', 'lobster', 'scallop', 'fish', 'tilapia'];
const ANIMAL_PRODUCT_KEYWORDS = [
  ...MEAT_KEYWORDS,
  ...SEAFOOD_KEYWORDS,
  'egg',
  'milk',
  'cheese',
  'cream',
  'butter',
  'yogurt',
  'honey',
  'parmesan',
  'mozzarella',
  'feta',
  'cheddar',
];
const GLUTEN_KEYWORDS = ['flour', 'pasta', 'bread', 'tortilla', 'breadcrumb', 'noodle', 'flatbread', 'pita', 'bun'];
const DAIRY_KEYWORDS = ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'parmesan', 'mozzarella', 'feta', 'cheddar', 'sour cream'];

function recipeContainsAny(recipe: Recipe, keywords: string[]): boolean {
  return recipe.ingredients.some((ing) => keywords.some((k) => ing.name.toLowerCase().includes(k)));
}

export function householdAllergies(household: Household): string[] {
  const set = new Set<string>();
  for (const m of household.members) for (const a of m.foodPreference.allergies) set.add(a.toLowerCase());
  return Array.from(set);
}

export function householdDietaryRestrictions(household: Household): string[] {
  const set = new Set<string>();
  for (const m of household.members) for (const r of m.foodPreference.dietaryRestrictions) set.add(r.toLowerCase());
  return Array.from(set);
}

export function householdDislikes(household: Household): string[] {
  const set = new Set<string>();
  for (const m of household.members) for (const d of m.foodPreference.dislikedFoods) set.add(d.toLowerCase());
  return Array.from(set);
}

/**
 * Hard safety/dietary filter. A meal is shared by the whole household, so if
 * anyone has an allergy or a strict dietary restriction, the whole recipe is
 * disqualified rather than merely down-ranked.
 */
export function isRecipeSafeForHousehold(recipe: Recipe, household: Household): boolean {
  const allergies = householdAllergies(household);
  for (const allergy of allergies) {
    const keywords = ALLERGEN_KEYWORDS[allergy] ?? [allergy];
    if (recipeContainsAny(recipe, keywords)) return false;
  }

  const restrictions = householdDietaryRestrictions(household);
  for (const restriction of restrictions) {
    if (restriction === 'vegetarian' && recipeContainsAny(recipe, [...MEAT_KEYWORDS, ...SEAFOOD_KEYWORDS])) return false;
    if (restriction === 'pescatarian' && recipeContainsAny(recipe, MEAT_KEYWORDS)) return false;
    if (restriction === 'vegan' && recipeContainsAny(recipe, ANIMAL_PRODUCT_KEYWORDS)) return false;
    if (restriction === 'gluten-free' && recipeContainsAny(recipe, GLUTEN_KEYWORDS)) return false;
    if (restriction === 'dairy-free' && recipeContainsAny(recipe, DAIRY_KEYWORDS)) return false;
  }

  return true;
}

/** Soft signal: how strongly this recipe collides with someone's stated dislikes, 0 (no collision) to 1 (heavy). */
export function dislikeCollisionScore(recipe: Recipe, household: Household): number {
  const dislikes = householdDislikes(household);
  if (dislikes.length === 0) return 0;

  let hits = 0;
  for (const dislike of dislikes) {
    if (dislike === 'seafood' && recipeContainsAny(recipe, SEAFOOD_KEYWORDS)) hits += 1;
    else if (recipeContainsAny(recipe, [dislike])) hits += 1;
    else if (recipe.tags.some((t) => t.toLowerCase() === dislike)) hits += 1;
  }
  return Math.min(1, hits / 2);
}
