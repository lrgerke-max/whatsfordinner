import { Household } from '../types/household';
import { Recipe } from '../types/recipe';

const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  peanuts: ['peanut'],
  'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut'],
  shellfish: ['shrimp', 'crab', 'lobster', 'scallop', 'clam', 'mussel'],
  // 'fish' catches fish sauce and generic "white fish"; species names catch
  // named fillets. Allergy matching is substring-based, so the bare word
  // also covers compounds ("fish stock", "fish cake").
  fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'trout', 'catfish', 'pollock', 'mahi'],
  eggs: ['egg'],
  dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'parmesan', 'mozzarella', 'feta', 'cheddar'],
  soy: ['soy', 'tofu', 'edamame', 'miso', 'hoisin'],
  wheat: ['flour', 'pasta', 'bread', 'tortilla', 'breadcrumb', 'noodle', 'pita', 'flatbread', 'bun', 'couscous', 'semolina'],
  sesame: ['sesame', 'tahini'],
};

const MEAT_KEYWORDS = ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'turkey', 'ham', 'lamb', 'steak'];
// Derived from ALLERGEN_KEYWORDS so the vegetarian/seafood-dislike checks stay
// in sync with the allergy list instead of drifting when a species is added.
const SEAFOOD_KEYWORDS = [...ALLERGEN_KEYWORDS.fish, ...ALLERGEN_KEYWORDS.shellfish];
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
// Same hazard as ALLERGEN_KEYWORDS.wheat, kept as one list so a new
// wheat-containing ingredient protects gluten-free restrictions too.
const GLUTEN_KEYWORDS = ALLERGEN_KEYWORDS.wheat;
const DAIRY_KEYWORDS = ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'parmesan', 'mozzarella', 'feta', 'cheddar', 'sour cream'];

/**
 * Allergy matching is deliberately substring-based (fail-safe: "fish" catches
 * "fish sauce"). The only exception is documented false friends — words that
 * merely contain the keyword ("eggplant" is not an egg).
 */
const KEYWORD_FALSE_FRIENDS: Record<string, string[]> = {
  egg: ['eggplant'],
};

function nameContainsKeyword(ingredientName: string, keyword: string): boolean {
  const name = ingredientName.toLowerCase();
  if (!name.includes(keyword)) return false;
  const falseFriends = KEYWORD_FALSE_FRIENDS[keyword];
  if (falseFriends && falseFriends.some((f) => name.includes(f))) return false;
  return true;
}

function recipeContainsAny(recipe: Recipe, keywords: string[]): boolean {
  return recipe.ingredients.some((ing) => keywords.some((k) => nameContainsKeyword(ing.name, k)));
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
  return createSafetyChecker(household)(recipe);
}

interface SafetyChecker {
  (recipe: Recipe): boolean;
}

const safetyCheckerCache = new WeakMap<Household, SafetyChecker>();

/**
 * Precompiled version of isRecipeSafeForHousehold: the household's keyword
 * lists are resolved once instead of per recipe. Planning filters thousands
 * of recipes through this, and the household object is stable between runs,
 * so checkers are cached per household instance.
 */
export function createSafetyChecker(household: Household): SafetyChecker {
  const cached = safetyCheckerCache.get(household);
  if (cached) return cached;

  const allergyKeywords: string[][] = householdAllergies(household).map((a) => ALLERGEN_KEYWORDS[a] ?? [a]);
  const restrictions = householdDietaryRestrictions(household);
  const checkMeat = restrictions.includes('pescatarian');
  const checkMeatFish = restrictions.includes('vegetarian');
  const checkAnimal = restrictions.includes('vegan');
  const checkGluten = restrictions.includes('gluten-free');
  const checkDairy = restrictions.includes('dairy-free');

  const checker: SafetyChecker = (recipe) => {
    for (const keywords of allergyKeywords) {
      if (recipeContainsAny(recipe, keywords)) return false;
    }
    if (checkMeatFish && recipeContainsAny(recipe, [...MEAT_KEYWORDS, ...SEAFOOD_KEYWORDS])) return false;
    if (checkMeat && recipeContainsAny(recipe, MEAT_KEYWORDS)) return false;
    if (checkAnimal && recipeContainsAny(recipe, ANIMAL_PRODUCT_KEYWORDS)) return false;
    if (checkGluten && recipeContainsAny(recipe, GLUTEN_KEYWORDS)) return false;
    if (checkDairy && recipeContainsAny(recipe, DAIRY_KEYWORDS)) return false;
    return true;
  };

  safetyCheckerCache.set(household, checker);
  return checker;
}

/** Soft signal: how strongly this recipe collides with someone's stated dislikes, 0 (no collision) to 1 (heavy). */
export function dislikeCollisionScore(recipe: Recipe, household: Household): number {
  const dislikes = householdDislikes(household);
  if (dislikes.length === 0) return 0;

  let hits = 0;
  for (const dislike of dislikes) {
    // Umbrella terms users actually type must map to their keyword families,
    // not fall through to a literal string no ingredient contains.
    if (dislike === 'seafood') {
      if (recipeContainsAny(recipe, SEAFOOD_KEYWORDS)) hits += 1;
    } else if (dislike === 'shellfish') {
      if (recipeContainsAny(recipe, ALLERGEN_KEYWORDS.shellfish)) hits += 1;
    } else if (dislike === 'nuts') {
      if (recipeContainsAny(recipe, ['peanut', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut'])) hits += 1;
    } else if (recipeContainsAny(recipe, [dislike])) {
      hits += 1;
    } else if (recipe.tags.some((t) => t.toLowerCase() === dislike)) {
      hits += 1;
    }
  }
  return Math.min(1, hits / 2);
}
