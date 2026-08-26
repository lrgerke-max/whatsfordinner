import { Recipe, RecipeIngredient, Difficulty } from '../types/recipe';

/**
 * Deterministic recipe library generator.
 *
 * Hand-writing a thousand recipes is unmaintainable, so the long tail of the
 * library is *composed*: cuisine profile × protein × format × flavor, with
 * ingredient lists built from grocery-plausible names (aligned with what a
 * kitchen scan typically produces) and format-specific instruction templates.
 *
 * Everything is index-driven — no Math.random — so the same build always
 * yields the exact same library. That stability is load-bearing: persisted
 * meal plans reference recipes by id, and ids derive from names.
 */

export const GENERATED_RECIPE_COUNT = 1080;

interface ProteinSpec {
  key: string;
  name: string;
  short: string;
  quantity: number;
  unit: string;
  proteinGrams: number;
  tag: string;
  vegetarian?: boolean;
  /** Formats this protein never suits (e.g. salmon stir-fry). */
  excludedFormats?: string[];
}

interface FlavorSpec {
  name: string;
  /** Ingredient names (beyond aromatics) that carry the flavor. */
  sauce: Array<{ name: string; quantity: number; unit: string }>;
  /** Word used inside instruction copy, e.g. "chipotle-lime". */
  word: string;
  /** Formats this flavor never suits ("Creamy Stroganoff Kebabs"…). */
  excludedFormats?: string[];
}

interface FormatSpec {
  key: string;
  /** Name suffix/pattern word, e.g. "Tacos". */
  label: string;
  emoji: string;
  baseTime: number;
  /** Staple/base ingredient the dish is built on. */
  base: Array<{ name: string; quantity: number; unit: string }>;
}

interface CuisineProfile {
  cuisine: string;
  tagline: string;
  flavors: FlavorSpec[];
  formats: string[];
  proteins: string[];
  veg: string[];
  garnish: string[];
  emoji: string[];
}

const PROTEINS: Record<string, ProteinSpec> = {
  'chicken-breast': { key: 'chicken-breast', name: 'chicken breast', short: 'Chicken', quantity: 1.5, unit: 'lb', proteinGrams: 34, tag: 'chicken' },
  'chicken-thighs': { key: 'chicken-thighs', name: 'chicken thighs', short: 'Chicken', quantity: 2, unit: 'lb', proteinGrams: 30, tag: 'chicken' },
  'ground-beef': { key: 'ground-beef', name: 'ground beef', short: 'Beef', quantity: 1, unit: 'lb', proteinGrams: 32, tag: 'beef' },
  'ground-turkey': { key: 'ground-turkey', name: 'ground turkey', short: 'Turkey', quantity: 1, unit: 'lb', proteinGrams: 30, tag: 'turkey' },
  'ground-pork': { key: 'ground-pork', name: 'ground pork', short: 'Pork', quantity: 1, unit: 'lb', proteinGrams: 29, tag: 'pork' },
  'pork-chops': { key: 'pork-chops', name: 'pork chops', short: 'Pork', quantity: 1.5, unit: 'lb', proteinGrams: 33, tag: 'pork', excludedFormats: ['meatballs', 'burgers', 'sliders'] },
  steak: { key: 'steak', name: 'flank steak', short: 'Steak', quantity: 1.5, unit: 'lb', proteinGrams: 34, tag: 'beef', excludedFormats: ['meatballs'] },
  shrimp: { key: 'shrimp', name: 'shrimp', short: 'Shrimp', quantity: 1, unit: 'lb', proteinGrams: 28, tag: 'shrimp', excludedFormats: ['burgers', 'sliders', 'meatballs', 'hash'] },
  salmon: { key: 'salmon', name: 'salmon fillets', short: 'Salmon', quantity: 1.5, unit: 'lb', proteinGrams: 32, tag: 'salmon', excludedFormats: ['soup', 'stir-fry', 'fried-rice', 'burgers', 'sliders', 'meatballs', 'quesadillas', 'hash'] },
  cod: { key: 'cod', name: 'cod fillets', short: 'Cod', quantity: 1.25, unit: 'lb', proteinGrams: 26, tag: 'fish', excludedFormats: ['stir-fry', 'fried-rice', 'burgers', 'sliders', 'meatballs', 'hash', 'kebabs'] },
  sausage: { key: 'sausage', name: 'smoked sausage', short: 'Sausage', quantity: 1, unit: 'lb', proteinGrams: 27, tag: 'sausage' },
  'black-beans': { key: 'black-beans', name: 'black beans', short: 'Black Bean', quantity: 3, unit: 'each', proteinGrams: 14, tag: 'black-bean', vegetarian: true },
  chickpeas: { key: 'chickpeas', name: 'chickpeas', short: 'Chickpea', quantity: 2, unit: 'each', proteinGrams: 13, tag: 'chickpea', vegetarian: true },
  tofu: { key: 'tofu', name: 'tofu', short: 'Tofu', quantity: 1, unit: 'each', proteinGrams: 16, tag: 'tofu', vegetarian: true },
  eggs: { key: 'eggs', name: 'eggs', short: 'Egg', quantity: 8, unit: 'each', proteinGrams: 15, tag: 'egg', vegetarian: true, excludedFormats: ['burgers', 'sliders', 'kebabs', 'meatballs'] },
  mushrooms: { key: 'mushrooms', name: 'mushrooms', short: 'Mushroom', quantity: 1, unit: 'lb', proteinGrams: 8, tag: 'mushroom', vegetarian: true, excludedFormats: ['burgers', 'sliders', 'fried-rice'] },
};

const FORMATS: Record<string, FormatSpec> = {
  tacos: { key: 'tacos', label: 'Tacos', emoji: '🌮', baseTime: 25, base: [{ name: 'tortillas', quantity: 8, unit: 'each' }] },
  bowls: { key: 'bowls', label: 'Bowls', emoji: '🍚', baseTime: 30, base: [{ name: 'rice', quantity: 1.5, unit: 'cup' }] },
  skillet: { key: 'skillet', label: 'Skillet', emoji: '🍳', baseTime: 30, base: [{ name: 'rice', quantity: 1.5, unit: 'cup' }] },
  pasta: { key: 'pasta', label: 'Pasta', emoji: '🍝', baseTime: 30, base: [{ name: 'pasta', quantity: 12, unit: 'oz' }] },
  'sheet-pan': { key: 'sheet-pan', label: 'Sheet-Pan', emoji: '🍽️', baseTime: 40, base: [{ name: 'potatoes', quantity: 1.5, unit: 'lb' }] },
  'stir-fry': { key: 'stir-fry', label: 'Stir-Fry', emoji: '🥡', baseTime: 25, base: [{ name: 'rice', quantity: 1.5, unit: 'cup' }] },
  soup: { key: 'soup', label: 'Soup', emoji: '🍲', baseTime: 40, base: [{ name: 'chicken broth', quantity: 6, unit: 'cup' }] },
  curry: { key: 'curry', label: 'Curry', emoji: '🍛', baseTime: 35, base: [{ name: 'rice', quantity: 1.5, unit: 'cup' }] },
  salad: { key: 'salad', label: 'Salad', emoji: '🥗', baseTime: 20, base: [{ name: 'mixed greens', quantity: 5, unit: 'oz' }] },
  wraps: { key: 'wraps', label: 'Wraps', emoji: '🌯', baseTime: 20, base: [{ name: 'tortillas', quantity: 4, unit: 'each' }] },
  quesadillas: { key: 'quesadillas', label: 'Quesadillas', emoji: '🫓', baseTime: 20, base: [{ name: 'tortillas', quantity: 8, unit: 'each' }] },
  'fried-rice': { key: 'fried-rice', label: 'Fried Rice', emoji: '🍚', baseTime: 25, base: [{ name: 'rice', quantity: 3, unit: 'cup' }] },
  noodles: { key: 'noodles', label: 'Noodles', emoji: '🍜', baseTime: 25, base: [{ name: 'rice noodles', quantity: 8, unit: 'oz' }] },
  burgers: { key: 'burgers', label: 'Burgers', emoji: '🍔', baseTime: 25, base: [{ name: 'burger buns', quantity: 4, unit: 'each' }] },
  flatbread: { key: 'flatbread', label: 'Flatbread', emoji: '🍕', baseTime: 25, base: [{ name: 'flatbread', quantity: 2, unit: 'each' }] },
  bake: { key: 'bake', label: 'Bake', emoji: '🥘', baseTime: 45, base: [{ name: 'tortillas', quantity: 8, unit: 'each' }] },
  hash: { key: 'hash', label: 'Hash', emoji: '🥔', baseTime: 30, base: [{ name: 'potatoes', quantity: 1.5, unit: 'lb' }] },
  kebabs: { key: 'kebabs', label: 'Kebabs', emoji: '🍢', baseTime: 30, base: [{ name: 'rice', quantity: 1.5, unit: 'cup' }] },
  sliders: { key: 'sliders', label: 'Sliders', emoji: '🍔', baseTime: 25, base: [{ name: 'burger buns', quantity: 6, unit: 'each' }] },
  meatballs: { key: 'meatballs', label: 'Meatballs', emoji: '🧆', baseTime: 35, base: [{ name: 'pasta', quantity: 12, unit: 'oz' }] },
};

const CUISINE_PROFILES: CuisineProfile[] = [
  {
    cuisine: 'Mexican',
    tagline: 'a weeknight favorite with bold, bright flavor',
    flavors: [
      { name: 'Chipotle Lime', word: 'chipotle-lime', sauce: [{ name: 'salsa', quantity: 0.5, unit: 'cup' }, { name: 'cumin', quantity: 1, unit: 'tsp' }, { name: 'lime', quantity: 2, unit: 'each' }] },
      { name: 'Smoky Adobo', word: 'smoky adobo', sauce: [{ name: 'chili powder', quantity: 1, unit: 'tbsp' }, { name: 'cumin', quantity: 1, unit: 'tsp' }, { name: 'tomato paste', quantity: 2, unit: 'tbsp' }] },
      { name: 'Salsa Verde', word: 'salsa verde', sauce: [{ name: 'salsa verde', quantity: 0.75, unit: 'cup' }, { name: 'cumin', quantity: 1, unit: 'tsp' }] },
      { name: 'Cilantro Lime', word: 'cilantro-lime', sauce: [{ name: 'lime', quantity: 2, unit: 'each' }, { name: 'cumin', quantity: 1, unit: 'tsp' }, { name: 'olive oil', quantity: 2, unit: 'tbsp' }] },
      { name: 'Street Corn', word: 'street-corn', sauce: [{ name: 'sour cream', quantity: 0.5, unit: 'cup' }, { name: 'corn', quantity: 2, unit: 'each' }, { name: 'chili powder', quantity: 1, unit: 'tsp' }] },
      { name: 'Chipotle Honey', word: 'chipotle-honey', sauce: [{ name: 'honey', quantity: 2, unit: 'tbsp' }, { name: 'salsa', quantity: 0.25, unit: 'cup' }] },
    ],
    formats: ['tacos', 'bowls', 'quesadillas', 'soup', 'bake', 'skillet', 'salad', 'wraps', 'flatbread', 'hash'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-beef', 'ground-turkey', 'steak', 'shrimp', 'black-beans', 'eggs', 'sausage'],
    veg: ['bell pepper', 'onion', 'corn', 'tomatoes', 'avocado', 'cabbage'],
    garnish: ['cilantro', 'avocado', 'sour cream', 'cheddar cheese'],
    emoji: ['🌮', '🌶️', '🇲🇽'],
  },
  {
    cuisine: 'Italian',
    tagline: 'simple ingredients handled the Italian way',
    flavors: [
      { name: 'Garlic Parmesan', word: 'garlic-parmesan', sauce: [{ name: 'parmesan cheese', quantity: 4, unit: 'oz' }, { name: 'butter', quantity: 3, unit: 'tbsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }] },
      { name: 'Lemon Butter', word: 'lemon-butter', sauce: [{ name: 'butter', quantity: 3, unit: 'tbsp' }, { name: 'lemon', quantity: 1, unit: 'each' }, { name: 'garlic', quantity: 2, unit: 'clove' }] },
      { name: 'Tomato Basil', word: 'tomato-basil', sauce: [{ name: 'crushed tomatoes', quantity: 1, unit: 'each' }, { name: 'olive oil', quantity: 2, unit: 'tbsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }] },
      { name: 'Creamy Tuscan', word: 'creamy tuscan', sauce: [{ name: 'heavy cream', quantity: 0.75, unit: 'cup' }, { name: 'parmesan cheese', quantity: 3, unit: 'oz' }, { name: 'spinach', quantity: 3, unit: 'oz' }] },
      { name: 'Pesto', word: 'pesto', sauce: [{ name: 'pesto', quantity: 0.5, unit: 'cup' }, { name: 'parmesan cheese', quantity: 2, unit: 'oz' }] },
      { name: 'Cacio e Pepe', word: 'cacio e pepe', excludedFormats: ['salad', 'kebabs'], sauce: [{ name: 'parmesan cheese', quantity: 4, unit: 'oz' }, { name: 'butter', quantity: 2, unit: 'tbsp' }, { name: 'black pepper', quantity: 1, unit: 'tsp' }] },
    ],
    formats: ['pasta', 'soup', 'skillet', 'sheet-pan', 'flatbread', 'meatballs', 'salad', 'bake'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-beef', 'ground-pork', 'sausage', 'shrimp', 'cod', 'mushrooms'],
    veg: ['spinach', 'tomatoes', 'mushrooms', 'zucchini', 'onion', 'kale'],
    garnish: ['parsley', 'basil', 'parmesan cheese', 'mozzarella cheese'],
    emoji: ['🍝', '🇮🇹', '🧄'],
  },
  {
    cuisine: 'Brazilian',
    tagline: 'comforting Brazilian home cooking',
    flavors: [
      { name: 'Coconut Tomato', word: 'coconut-tomato', sauce: [{ name: 'coconut milk', quantity: 1, unit: 'cup' }, { name: 'crushed tomatoes', quantity: 1, unit: 'each' }, { name: 'lime', quantity: 1, unit: 'each' }] },
      { name: 'Garlic Butter', word: 'garlic-butter', sauce: [{ name: 'butter', quantity: 3, unit: 'tbsp' }, { name: 'garlic', quantity: 4, unit: 'clove' }, { name: 'lime', quantity: 1, unit: 'each' }] },
      { name: 'Creamy Stroganoff', word: 'stroganoff', excludedFormats: ['kebabs', 'salad'], sauce: [{ name: 'heavy cream', quantity: 1, unit: 'cup' }, { name: 'ketchup', quantity: 2, unit: 'tbsp' }, { name: 'mushrooms', quantity: 8, unit: 'oz' }] },
      { name: 'Bahian Spice', word: 'Bahian', sauce: [{ name: 'coconut milk', quantity: 1, unit: 'cup' }, { name: 'smoked paprika', quantity: 1, unit: 'tsp' }, { name: 'lime', quantity: 1, unit: 'each' }] },
      { name: 'Lime Garlic', word: 'lime-garlic', sauce: [{ name: 'lime', quantity: 2, unit: 'each' }, { name: 'garlic', quantity: 3, unit: 'clove' }, { name: 'olive oil', quantity: 2, unit: 'tbsp' }] },
    ],
    formats: ['bowls', 'skillet', 'soup', 'fried-rice', 'kebabs', 'hash'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-beef', 'pork-chops', 'steak', 'shrimp', 'cod', 'black-beans'],
    veg: ['onion', 'tomatoes', 'bell pepper', 'carrots', 'corn', 'cabbage'],
    garnish: ['parsley', 'lime', 'sour cream'],
    emoji: ['🇧🇷', '🥘'],
  },
  {
    cuisine: 'American',
    tagline: 'classic American comfort, weeknight edition',
    flavors: [
      { name: 'Smoky BBQ', word: 'barbecue', sauce: [{ name: 'bbq sauce', quantity: 0.5, unit: 'cup' }, { name: 'smoked paprika', quantity: 1, unit: 'tsp' }] },
      { name: 'Buffalo Ranch', word: 'buffalo-ranch', excludedFormats: ['soup', 'curry'], sauce: [{ name: 'buffalo sauce', quantity: 0.33, unit: 'cup' }, { name: 'ranch dressing', quantity: 0.33, unit: 'cup' }, { name: 'butter', quantity: 2, unit: 'tbsp' }] },
      { name: 'Honey Mustard', word: 'honey-mustard', sauce: [{ name: 'dijon mustard', quantity: 3, unit: 'tbsp' }, { name: 'honey', quantity: 2, unit: 'tbsp' }] },
      { name: 'Cajun', word: 'cajun', sauce: [{ name: 'smoked paprika', quantity: 1, unit: 'tbsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }, { name: 'heavy cream', quantity: 0.5, unit: 'cup' }] },
      { name: 'Maple Glaze', word: 'maple', sauce: [{ name: 'maple syrup', quantity: 3, unit: 'tbsp' }, { name: 'dijon mustard', quantity: 1, unit: 'tbsp' }] },
      { name: 'Garlic Butter', word: 'garlic-butter', sauce: [{ name: 'butter', quantity: 3, unit: 'tbsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }] },
    ],
    formats: ['burgers', 'sliders', 'sheet-pan', 'skillet', 'soup', 'salad', 'wraps', 'hash', 'pasta', 'meatballs', 'flatbread'],
    proteins: ['chicken-breast', 'ground-beef', 'ground-turkey', 'pork-chops', 'steak', 'salmon', 'sausage', 'black-beans', 'eggs'],
    veg: ['corn', 'potatoes', 'bell pepper', 'onion', 'carrots', 'celery', 'kale'],
    garnish: ['cheddar cheese', 'pickles', 'sour cream', 'scallions'],
    emoji: ['🇺🇸', '🍔'],
  },
  {
    cuisine: 'Asian',
    tagline: 'fast, glossy, and built for rice',
    flavors: [
      { name: 'Ginger Soy', word: 'ginger-soy', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'ginger', quantity: 1, unit: 'tbsp' }, { name: 'cornstarch', quantity: 1, unit: 'tbsp' }] },
      { name: 'Sesame Garlic', word: 'sesame-garlic', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'sesame oil', quantity: 1, unit: 'tbsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }] },
      { name: 'Honey Sriracha', word: 'honey-sriracha', sauce: [{ name: 'honey', quantity: 2, unit: 'tbsp' }, { name: 'sriracha', quantity: 1, unit: 'tbsp' }, { name: 'soy sauce', quantity: 2, unit: 'tbsp' }] },
      { name: 'Sweet Chili', word: 'sweet-chili', sauce: [{ name: 'sweet chili sauce', quantity: 0.33, unit: 'cup' }, { name: 'lime', quantity: 1, unit: 'each' }] },
      { name: 'Hoisin', word: 'hoisin', sauce: [{ name: 'hoisin sauce', quantity: 3, unit: 'tbsp' }, { name: 'soy sauce', quantity: 1, unit: 'tbsp' }] },
    ],
    formats: ['stir-fry', 'noodles', 'fried-rice', 'soup', 'wraps', 'kebabs', 'salad', 'bowls'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-pork', 'steak', 'shrimp', 'tofu', 'eggs'],
    veg: ['broccoli', 'snap peas', 'carrots', 'bell pepper', 'cabbage', 'mushrooms', 'baby corn'],
    garnish: ['scallions', 'sesame seeds', 'peanuts', 'cilantro'],
    emoji: ['🥢', '🥡'],
  },
  {
    cuisine: 'Chinese',
    tagline: 'wok classics you can pull off on a Tuesday',
    flavors: [
      { name: 'Kung Pao', word: 'kung pao', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'peanuts', quantity: 0.33, unit: 'cup' }, { name: 'dried chilies', quantity: 4, unit: 'each' }] },
      { name: 'General Tso', word: "general tso's", sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'honey', quantity: 3, unit: 'tbsp' }, { name: 'cornstarch', quantity: 2, unit: 'tbsp' }] },
      { name: 'Garlic Ginger', word: 'garlic-ginger', sauce: [{ name: 'garlic', quantity: 4, unit: 'clove' }, { name: 'ginger', quantity: 1, unit: 'tbsp' }, { name: 'soy sauce', quantity: 2, unit: 'tbsp' }] },
      { name: 'Sweet and Sour', word: 'sweet-and-sour', sauce: [{ name: 'rice vinegar', quantity: 2, unit: 'tbsp' }, { name: 'ketchup', quantity: 3, unit: 'tbsp' }, { name: 'sugar', quantity: 2, unit: 'tbsp' }] },
      { name: 'Char Siu', word: 'char siu', sauce: [{ name: 'hoisin sauce', quantity: 3, unit: 'tbsp' }, { name: 'honey', quantity: 2, unit: 'tbsp' }] },
    ],
    formats: ['stir-fry', 'fried-rice', 'noodles', 'soup'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-pork', 'steak', 'shrimp', 'tofu', 'eggs'],
    veg: ['broccoli', 'bok choy', 'bell pepper', 'snap peas', 'cabbage', 'carrots'],
    garnish: ['scallions', 'sesame seeds', 'peanuts'],
    emoji: ['🇨🇳', '🥡'],
  },
  {
    cuisine: 'Japanese',
    tagline: 'umami-forward and quietly perfect',
    flavors: [
      { name: 'Teriyaki', word: 'teriyaki', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'mirin', quantity: 2, unit: 'tbsp' }, { name: 'sugar', quantity: 1, unit: 'tbsp' }] },
      { name: 'Miso Glazed', word: 'miso', sauce: [{ name: 'miso paste', quantity: 2, unit: 'tbsp' }, { name: 'mirin', quantity: 1, unit: 'tbsp' }, { name: 'honey', quantity: 1, unit: 'tbsp' }] },
      { name: 'Ginger Scallion', word: 'ginger-scallion', sauce: [{ name: 'ginger', quantity: 1, unit: 'tbsp' }, { name: 'scallions', quantity: 4, unit: 'each' }, { name: 'soy sauce', quantity: 2, unit: 'tbsp' }] },
      { name: 'Yakiniku', word: 'yakiniku', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'sesame oil', quantity: 1, unit: 'tbsp' }, { name: 'sugar', quantity: 1, unit: 'tbsp' }] },
    ],
    formats: ['bowls', 'curry', 'fried-rice', 'noodles', 'soup', 'sheet-pan'],
    proteins: ['chicken-breast', 'chicken-thighs', 'steak', 'salmon', 'ground-pork', 'tofu', 'eggs'],
    veg: ['cabbage', 'carrots', 'mushrooms', 'snap peas', 'spinach', 'onion'],
    garnish: ['scallions', 'sesame seeds', 'pickled ginger'],
    emoji: ['🇯🇵', '🍱'],
  },
  {
    cuisine: 'Korean',
    tagline: 'sweet, spicy, and impossible to resist',
    flavors: [
      { name: 'Gochujang', word: 'gochujang', sauce: [{ name: 'gochujang', quantity: 2, unit: 'tbsp' }, { name: 'soy sauce', quantity: 2, unit: 'tbsp' }, { name: 'honey', quantity: 1, unit: 'tbsp' }] },
      { name: 'Bulgogi', word: 'bulgogi', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'sugar', quantity: 1, unit: 'tbsp' }, { name: 'sesame oil', quantity: 1, unit: 'tbsp' }, { name: 'pear', quantity: 1, unit: 'each' }] },
      { name: 'Kimchi', word: 'kimchi', sauce: [{ name: 'kimchi', quantity: 1, unit: 'cup' }, { name: 'soy sauce', quantity: 1, unit: 'tbsp' }, { name: 'sesame oil', quantity: 1, unit: 'tbsp' }] },
      { name: 'Sesame Soy', word: 'sesame-soy', sauce: [{ name: 'soy sauce', quantity: 3, unit: 'tbsp' }, { name: 'sesame oil', quantity: 1, unit: 'tbsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }] },
    ],
    formats: ['bowls', 'stir-fry', 'soup', 'noodles', 'tacos', 'sliders', 'fried-rice'],
    proteins: ['chicken-thighs', 'ground-beef', 'steak', 'ground-pork', 'tofu', 'eggs'],
    veg: ['cabbage', 'carrots', 'spinach', 'mushrooms', 'cucumber', 'onion'],
    garnish: ['scallions', 'sesame seeds', 'kimchi', 'fried eggs'],
    emoji: ['🇰🇷', '🌶️'],
  },
  {
    cuisine: 'Thai',
    tagline: 'sweet, sour, salty, spicy — balanced like Thailand does it',
    flavors: [
      { name: 'Red Curry', word: 'red curry', sauce: [{ name: 'red curry paste', quantity: 2, unit: 'tbsp' }, { name: 'coconut milk', quantity: 1, unit: 'cup' }, { name: 'fish sauce', quantity: 1, unit: 'tbsp' }] },
      { name: 'Green Curry', word: 'green curry', sauce: [{ name: 'green curry paste', quantity: 2, unit: 'tbsp' }, { name: 'coconut milk', quantity: 1, unit: 'cup' }, { name: 'fish sauce', quantity: 1, unit: 'tbsp' }] },
      { name: 'Basil Chili', word: 'thai basil chili', sauce: [{ name: 'soy sauce', quantity: 2, unit: 'tbsp' }, { name: 'hot sauce', quantity: 1, unit: 'tsp' }, { name: 'basil', quantity: 1, unit: 'bunch' }] },
      { name: 'Peanut Satay', word: 'satay', sauce: [{ name: 'peanut butter', quantity: 3, unit: 'tbsp' }, { name: 'soy sauce', quantity: 2, unit: 'tbsp' }, { name: 'lime', quantity: 1, unit: 'each' }] },
      { name: 'Lemongrass Chili', word: 'lemongrass', sauce: [{ name: 'lemongrass', quantity: 1, unit: 'each' }, { name: 'lime', quantity: 1, unit: 'each' }, { name: 'fish sauce', quantity: 1, unit: 'tbsp' }] },
    ],
    formats: ['curry', 'noodles', 'soup', 'salad', 'stir-fry', 'fried-rice'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-pork', 'shrimp', 'tofu', 'eggs'],
    veg: ['bell pepper', 'carrots', 'cabbage', 'broccoli', 'snap peas', 'cucumber'],
    garnish: ['cilantro', 'lime', 'peanuts', 'basil'],
    emoji: ['🇹🇭', '🍛'],
  },
  {
    cuisine: 'Indian',
    tagline: 'warm spices and slow-simmered sauce',
    flavors: [
      { name: 'Tikka Masala', word: 'tikka masala', sauce: [{ name: 'tomato paste', quantity: 3, unit: 'tbsp' }, { name: 'heavy cream', quantity: 0.75, unit: 'cup' }, { name: 'garam masala', quantity: 1, unit: 'tbsp' }] },
      { name: 'Coconut Korma', word: 'korma', sauce: [{ name: 'coconut milk', quantity: 1, unit: 'cup' }, { name: 'garam masala', quantity: 1, unit: 'tbsp' }, { name: 'cashews', quantity: 0.25, unit: 'cup' }] },
      { name: 'Saag', word: 'saag', sauce: [{ name: 'spinach', quantity: 6, unit: 'oz' }, { name: 'heavy cream', quantity: 0.5, unit: 'cup' }, { name: 'garam masala', quantity: 1, unit: 'tbsp' }] },
      { name: 'Butter Masala', word: 'butter masala', sauce: [{ name: 'crushed tomatoes', quantity: 1, unit: 'each' }, { name: 'butter', quantity: 4, unit: 'tbsp' }, { name: 'garam masala', quantity: 1, unit: 'tbsp' }] },
      { name: 'Chana Masala', word: 'chana masala', sauce: [{ name: 'crushed tomatoes', quantity: 1, unit: 'each' }, { name: 'chickpeas', quantity: 2, unit: 'each' }, { name: 'garam masala', quantity: 1, unit: 'tbsp' }] },
    ],
    formats: ['curry', 'soup', 'bowls', 'wraps', 'kebabs', 'hash'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-turkey', 'chickpeas', 'black-beans', 'mushrooms', 'eggs'],
    veg: ['onion', 'spinach', 'cauliflower', 'tomatoes', 'potatoes', 'peas'],
    garnish: ['cilantro', 'greek yogurt', 'lime'],
    emoji: ['🇮🇳', '🍛'],
  },
  {
    cuisine: 'Mediterranean',
    tagline: 'olive oil, lemon, and herbs doing the heavy lifting',
    flavors: [
      { name: 'Lemon Herb', word: 'lemon-herb', sauce: [{ name: 'lemon', quantity: 1, unit: 'each' }, { name: 'oregano', quantity: 1, unit: 'tsp' }, { name: 'olive oil', quantity: 3, unit: 'tbsp' }] },
      { name: "Za'atar", word: "za'atar", sauce: [{ name: "za'atar", quantity: 1, unit: 'tbsp' }, { name: 'olive oil', quantity: 3, unit: 'tbsp' }, { name: 'lemon', quantity: 1, unit: 'each' }] },
      { name: 'Harissa', word: 'harissa', sauce: [{ name: 'harissa', quantity: 2, unit: 'tbsp' }, { name: 'honey', quantity: 1, unit: 'tbsp' }, { name: 'lemon', quantity: 1, unit: 'each' }] },
      { name: 'Garlic Oregano', word: 'garlic-oregano', sauce: [{ name: 'garlic', quantity: 3, unit: 'clove' }, { name: 'oregano', quantity: 1, unit: 'tsp' }, { name: 'olive oil', quantity: 3, unit: 'tbsp' }] },
      { name: 'Balsamic', word: 'balsamic', sauce: [{ name: 'balsamic vinegar', quantity: 2, unit: 'tbsp' }, { name: 'honey', quantity: 1, unit: 'tbsp' }, { name: 'olive oil', quantity: 2, unit: 'tbsp' }] },
    ],
    formats: ['bowls', 'sheet-pan', 'salad', 'kebabs', 'wraps', 'soup', 'flatbread'],
    proteins: ['chicken-breast', 'chicken-thighs', 'steak', 'salmon', 'cod', 'chickpeas', 'sausage', 'shrimp'],
    veg: ['cucumber', 'tomatoes', 'red onion', 'zucchini', 'bell pepper', 'kale', 'artichoke hearts'],
    garnish: ['feta cheese', 'parsley', 'mint', 'greek yogurt'],
    emoji: ['🫒', '🌿'],
  },
  {
    cuisine: 'Greek',
    tagline: 'sunny, herby, and feta-topped',
    flavors: [
      { name: 'Lemon Oregano', word: 'lemon-oregano', sauce: [{ name: 'lemon', quantity: 1, unit: 'each' }, { name: 'oregano', quantity: 1, unit: 'tsp' }, { name: 'olive oil', quantity: 3, unit: 'tbsp' }] },
      { name: 'Tzatziki', word: 'tzatziki', sauce: [{ name: 'greek yogurt', quantity: 0.75, unit: 'cup' }, { name: 'cucumber', quantity: 1, unit: 'each' }, { name: 'garlic', quantity: 2, unit: 'clove' }] },
      { name: 'Feta Spinach', word: 'feta-spinach', sauce: [{ name: 'feta cheese', quantity: 4, unit: 'oz' }, { name: 'spinach', quantity: 4, unit: 'oz' }, { name: 'lemon', quantity: 1, unit: 'each' }] },
      { name: 'Greek Dressing', word: 'greek', sauce: [{ name: 'red wine vinegar', quantity: 2, unit: 'tbsp' }, { name: 'oregano', quantity: 1, unit: 'tsp' }, { name: 'olive oil', quantity: 3, unit: 'tbsp' }] },
    ],
    formats: ['bowls', 'salad', 'kebabs', 'wraps', 'sheet-pan', 'soup'],
    proteins: ['chicken-breast', 'chicken-thighs', 'ground-beef', 'ground-turkey', 'shrimp', 'cod', 'chickpeas'],
    veg: ['cucumber', 'tomatoes', 'red onion', 'bell pepper', 'spinach', 'kalamata olives'],
    garnish: ['feta cheese', 'greek yogurt', 'parsley', 'kalamata olives'],
    emoji: ['🇬🇷', '🥗'],
  },
  {
    cuisine: 'French',
    tagline: 'a little butter, a little wine, a lot of technique',
    flavors: [
      { name: 'Dijon Cream', word: 'dijon cream', sauce: [{ name: 'dijon mustard', quantity: 2, unit: 'tbsp' }, { name: 'heavy cream', quantity: 0.5, unit: 'cup' }, { name: 'shallots', quantity: 2, unit: 'each' }] },
      { name: 'Provencal', word: 'provencal', sauce: [{ name: 'crushed tomatoes', quantity: 1, unit: 'each' }, { name: 'herbes de provence', quantity: 1, unit: 'tsp' }, { name: 'garlic', quantity: 3, unit: 'clove' }] },
      { name: 'Vermouth Cream', word: 'vermouth cream', sauce: [{ name: 'heavy cream', quantity: 0.5, unit: 'cup' }, { name: 'mushrooms', quantity: 8, unit: 'oz' }, { name: 'butter', quantity: 2, unit: 'tbsp' }] },
      { name: 'Cider Glaze', word: 'cider', sauce: [{ name: 'apple cider', quantity: 0.5, unit: 'cup' }, { name: 'dijon mustard', quantity: 1, unit: 'tbsp' }, { name: 'butter', quantity: 2, unit: 'tbsp' }] },
    ],
    formats: ['skillet', 'soup', 'sheet-pan', 'salad', 'flatbread', 'pasta'],
    proteins: ['chicken-breast', 'chicken-thighs', 'pork-chops', 'steak', 'salmon', 'cod', 'mushrooms'],
    veg: ['mushrooms', 'leeks', 'potatoes', 'carrots', 'kale', 'tomatoes'],
    garnish: ['parsley', 'tarragon', 'gruyere cheese'],
    emoji: ['🇫🇷', '🍷'],
  },
  {
    cuisine: 'MiddleEastern',
    tagline: 'warm spices, char, and cool yogurt',
    flavors: [
      { name: 'Shawarma', word: 'shawarma', sauce: [{ name: 'cumin', quantity: 1, unit: 'tsp' }, { name: 'smoked paprika', quantity: 1, unit: 'tsp' }, { name: 'lemon', quantity: 1, unit: 'each' }] },
      { name: 'Baharat', word: 'baharat', sauce: [{ name: 'baharat spice', quantity: 1, unit: 'tbsp' }, { name: 'olive oil', quantity: 2, unit: 'tbsp' }, { name: 'lemon', quantity: 1, unit: 'each' }] },
      { name: 'Sumac Onion', word: 'sumac', sauce: [{ name: 'sumac', quantity: 1, unit: 'tbsp' }, { name: 'red onion', quantity: 1, unit: 'each' }, { name: 'olive oil', quantity: 2, unit: 'tbsp' }] },
      { name: 'Garlic Toum', word: 'toum', sauce: [{ name: 'garlic', quantity: 4, unit: 'clove' }, { name: 'lemon', quantity: 1, unit: 'each' }, { name: 'olive oil', quantity: 3, unit: 'tbsp' }] },
    ],
    formats: ['wraps', 'bowls', 'kebabs', 'salad', 'flatbread', 'hash', 'soup'],
    proteins: ['chicken-thighs', 'ground-beef', 'ground-turkey', 'steak', 'chickpeas', 'mushrooms', 'eggs'],
    veg: ['cucumber', 'tomatoes', 'red onion', 'eggplant', 'bell pepper', 'parsley'],
    garnish: ['greek yogurt', 'feta cheese', 'parsley', 'pickled turnips'],
    emoji: ['🧆', '🫓'],
  },
];

// Sensible package units for garnishes and vegetables — "1 bunch sour cream"
// would undermine trust in the ingredient list.
const GARNISH_UNITS: Record<string, { quantity: number; unit: string }> = {
  cilantro: { quantity: 1, unit: 'bunch' },
  parsley: { quantity: 1, unit: 'bunch' },
  basil: { quantity: 1, unit: 'bunch' },
  mint: { quantity: 1, unit: 'bunch' },
  scallions: { quantity: 1, unit: 'bunch' },
  tarragon: { quantity: 1, unit: 'bunch' },
  avocado: { quantity: 2, unit: 'each' },
  'sour cream': { quantity: 0.5, unit: 'cup' },
  'greek yogurt': { quantity: 0.5, unit: 'cup' },
  'cheddar cheese': { quantity: 2, unit: 'oz' },
  'feta cheese': { quantity: 2, unit: 'oz' },
  'parmesan cheese': { quantity: 2, unit: 'oz' },
  'mozzarella cheese': { quantity: 3, unit: 'oz' },
  'gruyere cheese': { quantity: 2, unit: 'oz' },
  lime: { quantity: 1, unit: 'each' },
  lemon: { quantity: 1, unit: 'each' },
  'sesame seeds': { quantity: 2, unit: 'tbsp' },
  peanuts: { quantity: 0.25, unit: 'cup' },
  cashews: { quantity: 0.25, unit: 'cup' },
  kimchi: { quantity: 0.5, unit: 'cup' },
  'fried eggs': { quantity: 4, unit: 'each' },
  'pickled ginger': { quantity: 0.25, unit: 'cup' },
  pickles: { quantity: 0.25, unit: 'cup' },
  'pickled turnips': { quantity: 0.25, unit: 'cup' },
  'kalamata olives': { quantity: 0.33, unit: 'cup' },
};

const VEG_UNITS: Record<string, { quantity: number; unit: string }> = {
  spinach: { quantity: 5, unit: 'oz' },
  kale: { quantity: 5, unit: 'oz' },
  parsley: { quantity: 1, unit: 'bunch' },
  cabbage: { quantity: 0.5, unit: 'head' },
  mushrooms: { quantity: 8, unit: 'oz' },
  tomatoes: { quantity: 3, unit: 'each' },
  corn: { quantity: 3, unit: 'each' },
  avocado: { quantity: 2, unit: 'each' },
  'red onion': { quantity: 1, unit: 'each' },
  onion: { quantity: 1, unit: 'each' },
  cucumber: { quantity: 1, unit: 'each' },
  'bell pepper': { quantity: 2, unit: 'each' },
  broccoli: { quantity: 1, unit: 'head' },
  cauliflower: { quantity: 1, unit: 'head' },
  carrots: { quantity: 1, unit: 'lb' },
  potatoes: { quantity: 1.5, unit: 'lb' },
  'sweet potato': { quantity: 1.5, unit: 'lb' },
  zucchini: { quantity: 2, unit: 'each' },
  eggplant: { quantity: 1, unit: 'each' },
  leeks: { quantity: 2, unit: 'each' },
  celery: { quantity: 4, unit: 'each' },
  'snap peas': { quantity: 8, unit: 'oz' },
  'bok choy': { quantity: 2, unit: 'each' },
  'baby corn': { quantity: 1, unit: 'cup' },
  'artichoke hearts': { quantity: 1, unit: 'each' },
  peas: { quantity: 1, unit: 'cup' },
  'kalamata olives': { quantity: 0.5, unit: 'cup' },
};

function unitFor(list: Record<string, { quantity: number; unit: string }>, name: string): { quantity: number; unit: string } {
  return list[name] ?? { quantity: 2, unit: 'each' };
}

/** 32-bit mix — deterministic, well-distributed index hashing. */
function mix(n: number): number {
  let x = n | 0;
  x = (x ^ 61) ^ (x >>> 16);
  x = Math.imul(x, 9);
  x = x ^ (x >>> 4);
  x = Math.imul(x, 0x27d4eb2d);
  x = x ^ (x >>> 15);
  return x >>> 0;
}

function pick<T>(arr: T[], salt: number): T {
  return arr[mix(salt) % arr.length];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ing(id: string, name: string, quantity: number, unit: string, extra: Partial<Pick<RecipeIngredient, 'optional' | 'group'>> = {}): RecipeIngredient {
  return { id, name, quantity, unit, ...extra };
}

function titleCaseForName(flavor: string, proteinShort: string, format: FormatSpec): string {
  // Curry flavors already contain "curry" — avoid "Red Curry Chicken Curry".
  if (format.key === 'curry' && /curry/i.test(flavor)) return `${proteinShort} ${flavor}`;
  switch (format.key) {
    case 'tacos':
    case 'bowls':
    case 'skillet':
    case 'pasta':
    case 'soup':
    case 'curry':
    case 'salad':
    case 'wraps':
    case 'noodles':
    case 'burgers':
    case 'flatbread':
    case 'bake':
    case 'hash':
    case 'kebabs':
    case 'sliders':
    case 'meatballs':
    case 'quesadillas':
      return `${flavor} ${proteinShort} ${format.label}`;
    case 'sheet-pan':
      return `Sheet-Pan ${flavor} ${proteinShort}`;
    case 'stir-fry':
    case 'fried-rice':
      return `${flavor} ${proteinShort} ${format.label}`;
    default:
      return `${flavor} ${proteinShort} ${format.label}`;
  }
}

/**
 * Staples a format's instructions assume but the flavor tables don't provide
 * ("melt cheese over the patties", "scramble the eggs"). Kept beside the
 * templates so the copy and the ingredient list can never drift apart.
 */
function templateStaples(format: FormatSpec): Array<{ name: string; quantity: number; unit: string; optional?: boolean }> {
  switch (format.key) {
    case 'meatballs':
      return [{ name: 'breadcrumbs', quantity: 0.5, unit: 'cup' }, { name: 'eggs', quantity: 1, unit: 'each' }];
    case 'burgers':
    case 'sliders':
      return [{ name: 'cheddar cheese', quantity: 4, unit: 'oz' }];
    case 'quesadillas':
      return [{ name: 'cheddar cheese', quantity: 6, unit: 'oz' }];
    case 'flatbread':
      return [{ name: 'mozzarella cheese', quantity: 6, unit: 'oz' }];
    case 'bake':
      return [{ name: 'cheddar cheese', quantity: 4, unit: 'oz' }];
    case 'fried-rice':
      return [{ name: 'eggs', quantity: 3, unit: 'each', optional: true }];
    default:
      return [];
  }
}

function buildInstructions(format: FormatSpec, protein: ProteinSpec, flavor: FlavorSpec, veg: string, garnish: string, base: string): string[] {
  const p = protein.name;
  switch (format.key) {
    case 'tacos':
      return [
        `Season the ${p} with salt, pepper, and the ${flavor.word} spices.`,
        `Sear the ${p} in olive oil over medium-high heat until browned and cooked through; rest briefly, then slice or shred.`,
        `Cook the ${veg} in the same pan until just tender.`,
        `Stir in ${flavor.sauce[0].name} and scrape up the browned bits.`,
        `Pile into warm tortillas with the ${veg} and top with ${garnish}.`,
      ];
    case 'bowls':
      return [
        `Start the ${base} according to the package.`,
        `Season the ${p} and sear until golden and cooked through; set aside.`,
        `Cook the ${veg} with garlic until crisp-tender.`,
        `Whisk the ${flavor.word} sauce and toss it with the ${p} and ${veg}.`,
        `Build bowls over the ${base} and finish with ${garnish}.`,
      ];
    case 'skillet':
      return [
        `Heat olive oil in a large skillet and brown the ${p} on both sides.`,
        `Remove the ${p}; cook the ${veg} and garlic in the same pan.`,
        `Add ${flavor.sauce[0].name} and deglaze, scraping up the flavor.`,
        `Return the ${p} to the pan and simmer until the sauce coats a spoon.`,
        `Serve straight from the skillet over the ${base} with ${garnish}.`,
      ];
    case 'pasta':
      return [
        `Boil the ${base} in salted water until al dente; reserve a mug of pasta water.`,
        `Season and sear the ${p}; set aside.`,
        `Cook the ${veg} with garlic and olive oil until soft.`,
        `Add the ${flavor.word} sauce ingredients and loosen with pasta water.`,
        `Toss the pasta and ${p} in the sauce; finish with ${garnish}.`,
      ];
    case 'sheet-pan':
      return [
        `Heat the oven to 425°F and toss the ${base} with olive oil, salt, and pepper.`,
        `Roast the potatoes 15 minutes, then add the ${veg} to the pan.`,
        `Season the ${p} with the ${flavor.word} rub and nestle it among the vegetables.`,
        `Roast 15-20 minutes until the ${p} is cooked through and edges are crisp.`,
        `Drizzle with the pan juices and top with ${garnish}.`,
      ];
    case 'stir-fry':
      return [
        `Get a wok or large skillet ripping hot with a neutral oil.`,
        `Stir-fry the ${p} until seared on all sides; remove.`,
        `Flash-cook the ${veg} for 1-2 minutes so it stays crisp.`,
        `Return the ${p}, add the ${flavor.word} sauce, and toss until glossy.`,
        `Serve over the ${base} topped with ${garnish}.`,
      ];
    case 'soup':
      return [
        `Sweat onion and garlic in olive oil until translucent.`,
        `Brown the ${p} lightly, then add the ${veg} and cook 3 minutes.`,
        `Pour in the ${base} and the ${flavor.word} seasonings; simmer 15 minutes.`,
        `Taste and adjust salt, acid, and heat.`,
        `Ladle into bowls and finish with ${garnish}.`,
      ];
    case 'curry':
      return [
        `Bloom the ${flavor.word} spices in oil until fragrant.`,
        `Brown the ${p} in the spiced oil.`,
        `Add the ${veg} and the sauce ingredients; stir to coat.`,
        `Simmer gently 15-20 minutes until the sauce thickens and the ${p} is tender.`,
        `Serve over the ${base} with ${garnish}.`,
      ];
    case 'salad':
      return [
        `Cook the ${p} with the ${flavor.word} seasoning; slice when rested.`,
        `Crisp the ${veg} and toss with the ${base}.`,
        `Shake the ${flavor.word} dressing together in a jar.`,
        `Arrange the ${p} over the greens and vegetables.`,
        `Drizzle with dressing and scatter ${garnish} on top.`,
      ];
    case 'wraps':
      return [
        `Cook the ${p} with the ${flavor.word} seasoning until caramelized at the edges.`,
        `Toss the ${veg} with a splash of lemon and olive oil.`,
        `Warm the tortillas until soft and pliable.`,
        `Spread on ${flavor.sauce[0].name}, then layer in the ${p} and vegetables.`,
        `Roll tight, halve on the bias, and serve with extra ${garnish}.`,
      ];
    case 'quesadillas':
      return [
        `Cook the ${p} with the ${flavor.word} spices; chop small.`,
        `Mix the ${p} with the ${veg} and plenty of cheese.`,
        `Load tortillas, fold, and toast in a dry skillet until crisp and molten.`,
        `Rest a minute so the cheese sets, then cut into wedges.`,
        `Serve with ${garnish} on the side.`,
      ];
    case 'fried-rice':
      return [
        `Cook the ${base} ahead and chill it — day-old rice fries best.`,
        `Scramble the eggs in a hot oiled pan; set aside.`,
        `Sear the ${p}, then add the ${veg} and stir-fry 2 minutes.`,
        `Add the rice, breaking it up, and fry until toasty.`,
        `Season with the ${flavor.word} sauce and fold in ${garnish}.`,
      ];
    case 'noodles':
      return [
        `Cook the ${base} until just tender; drain and rinse.`,
        `Stir-fry the ${p} until browned; remove.`,
        `Cook the ${veg} with garlic until crisp-tender.`,
        `Add the ${flavor.word} sauce and a splash of noodle water; simmer to a glossy coat.`,
        `Toss in the noodles and the ${p}; top with ${garnish}.`,
      ];
    case 'burgers':
    case 'sliders':
      return [
        `Gently mix the ${p} with the ${flavor.word} seasonings; form patties without overworking.`,
        `Sear in a hot cast-iron pan or grill, 3-4 minutes per side.`,
        `Toast the buns cut-side down in the drippings.`,
        `Melt cheese over the patties in the last minute of cooking.`,
        `Build with the ${veg} and ${garnish}, and serve.`,
      ];
    case 'flatbread':
      return [
        `Heat the oven to 450°F with a pizza steel or sheet inside.`,
        `Cook the ${p} with the ${flavor.word} seasoning; slice thin.`,
        `Spread the bases with ${flavor.sauce[0].name} and top with the ${p} and ${veg}.`,
        `Bake 8-10 minutes until the edges are crisp and cheese is blistered.`,
        `Finish with ${garnish} and a thread of olive oil.`,
      ];
    case 'bake':
      return [
        `Heat the oven to 400°F and oil a 9x13 baking dish.`,
        `Cook the ${p} with the ${flavor.word} sauce until just done.`,
        `Simmer with the ${veg} for 5 minutes so the filling thickens slightly.`,
        `Layer with the ${base} and cheese, cover with foil, and bake 20 minutes.`,
        `Uncover, brown 10 more minutes, and rest before serving with ${garnish}.`,
      ];
    case 'hash':
      return [
        `Fry the diced ${base} in olive oil undisturbed until deeply browned.`,
        `Add the ${veg} and onion; cook until softened and caramelized.`,
        `Push everything aside and crisp the seasoned ${p} in the same pan.`,
        `Toss with the ${flavor.word} sauce and taste for salt.`,
        `Top with ${garnish} and eggs, if you have them.`,
      ];
    case 'kebabs':
      return [
        `Marinate the ${p} in the ${flavor.word} mixture for at least 15 minutes.`,
        `Thread onto skewers alternating with the ${veg}.`,
        `Grill or broil, turning, until charred and cooked through.`,
        `Rest 5 minutes off the heat.`,
        `Serve over the ${base} with ${garnish}.`,
      ];
    case 'meatballs':
      return [
        `Mix the ${p} with breadcrumbs, egg, and the ${flavor.word} seasonings.`,
        `Roll into balls and brown all over in olive oil.`,
        `Simmer in the ${flavor.sauce[0].name} sauce for 15 minutes until cooked through.`,
        `Cook the ${base} and toss with a little sauce.`,
        `Plate the meatballs over the ${base} with ${garnish}.`,
      ];
    default:
      return [
        `Season the ${p} and cook with the ${flavor.word} sauce until done.`,
        `Cook the ${veg} alongside.`,
        `Serve over the ${base} with ${garnish}.`,
      ];
  }
}

function buildGeneratedRecipe(index: number): Recipe | null {
  const profile = pick(CUISINE_PROFILES, index * 4 + 1);
  const protein = PROTEINS[pick(profile.proteins, index * 4 + 2)];
  const format = FORMATS[pick(profile.formats, index * 4 + 3)];
  const flavor = pick(profile.flavors, index * 4 + 4);

  if (!protein || !format || !flavor) return null;
  if (protein.excludedFormats?.includes(format.key)) return null;
  if (flavor.excludedFormats?.includes(format.key)) return null;
  // "Chana Masala Chickpea Curry" — chana IS chickpeas; the combo is redundant.
  if (flavor.name === 'Chana Masala' && protein.key === 'chickpeas') return null;

  const name = titleCaseForName(flavor.name, protein.short, format);
  if (!name) return null;

  // Soups default to chicken broth — vegetarian proteins get a vegetable
  // base so the dish matches its dietary tag.
  const baseIngredient =
    format.key === 'soup' && protein.vegetarian
      ? { name: 'vegetable broth', quantity: 6, unit: 'cup' }
      : pick(format.base, index * 7 + 7);
  const baseName = baseIngredient.name;

  const rawVeg = pick(profile.veg, index * 7 + 5);
  // A protein or staple can share a name with a veg (mushrooms, potatoes in
  // hashes) — swap the veg out rather than listing an ingredient twice.
  const effectiveVeg =
    rawVeg !== protein.name && rawVeg !== baseName
      ? rawVeg
      : profile.veg.find((v) => v !== protein.name && v !== baseName) ?? rawVeg;
  const garnish = pick(profile.garnish, index * 7 + 6);
  const timeDelta = (mix(index * 11 + 8) % 3) - 1; // -5, 0, or +5 minutes
  const cookTimeMinutes = Math.max(15, Math.min(60, format.baseTime + timeDelta * 5));
  const difficulty: Difficulty = cookTimeMinutes <= 25 ? 'easy' : cookTimeMinutes <= 40 ? 'medium' : 'hard';
  const proteinGrams = Math.max(6, protein.proteinGrams + ((mix(index * 13 + 9) % 5) - 2));

  const vegUnit = unitFor(VEG_UNITS, effectiveVeg);
  const garnishUnit = unitFor(GARNISH_UNITS, garnish);
  const ingredients: RecipeIngredient[] = [];
  const addIngredient = (name: string, quantity: number, unit: string, extra: Partial<Pick<RecipeIngredient, 'optional' | 'group'>> = {}) => {
    // Merge repeats (a sauce reusing the veg, a garnish equal to the base)
    // into one line instead of listing an ingredient twice.
    if (ingredients.some((i) => i.name === name)) return;
    ingredients.push(ing(`gi_${index}_${ingredients.length}`, name, quantity, unit, extra));
  };

  addIngredient(protein.name, protein.quantity, protein.unit);
  addIngredient(baseName, baseIngredient.quantity, baseIngredient.unit);
  addIngredient(effectiveVeg, vegUnit.quantity, vegUnit.unit);
  addIngredient('onion', 1, 'each');
  addIngredient('garlic', 3, 'clove');
  for (const s of flavor.sauce) {
    // Fish sauce in a vegetarian dish breaks the dietary promise — soy sauce
    // is the honest stand-in.
    if (protein.vegetarian && s.name === 'fish sauce') {
      addIngredient('soy sauce', 1, 'tbsp');
      continue;
    }
    addIngredient(s.name, s.quantity, s.unit);
  }
  for (const staple of templateStaples(format)) {
    addIngredient(staple.name, staple.quantity, staple.unit, staple.optional ? { optional: true } : {});
  }
  addIngredient(garnish, garnishUnit.quantity, garnishUnit.unit, { optional: true });

  // The vegetarian tag must reflect what's actually in the pot, not just the
  // protein — a stray broth or sauce would make the badge a lie.
  const MEAT_SCAN = ['chicken', 'beef', 'pork', 'turkey', 'sausage', 'steak', 'bacon', 'ham', 'lamb', 'fish', 'shrimp', 'anchovy', 'tuna', 'salmon', 'cod'];
  const isTrulyVegetarian = Boolean(protein.vegetarian) && !ingredients.some((i) => MEAT_SCAN.some((k) => i.name.includes(k)));

  const tags = [protein.tag, format.key, 'weeknight'];
  if (cookTimeMinutes <= 25) tags.push('quick');
  if (isTrulyVegetarian) tags.push('vegetarian');

  const formatNoun = format.key === 'sheet-pan' ? 'sheet-pan dinner' : format.label.toLowerCase();
  // "Red Curry egg curry" doubles the word — say "in a red curry sauce".
  const description =
    format.key === 'curry' && /curry/i.test(flavor.name)
      ? `${protein.short.toLowerCase()} simmered in a ${flavor.word} sauce — ${profile.tagline}.`
      : `${flavor.name} ${protein.short.toLowerCase()} ${formatNoun} — ${profile.tagline}.`;

  return {
    id: `recipe_gen_${slugify(name)}`,
    name,
    cuisine: profile.cuisine,
    description,
    imageEmoji: format.emoji,
    cookTimeMinutes,
    difficulty,
    servings: 4,
    proteinGrams,
    tags,
    ingredients,
    instructions: buildInstructions(format, protein, flavor, effectiveVeg, garnish, baseName),
  };
}

/**
 * Build the generated library. Iterates the combination space with hashed
 * indices, skipping collisions and invalid pairings, until the target count
 * is reached. Purely deterministic: identical across runs and builds.
 */
export function generateRecipes(target: number = GENERATED_RECIPE_COUNT): Recipe[] {
  const recipes: Recipe[] = [];
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const maxIterations = target * 30;

  for (let i = 0; recipes.length < target && i < maxIterations; i += 1) {
    const recipe = buildGeneratedRecipe(i);
    if (!recipe) continue;
    if (seenNames.has(recipe.name) || seenIds.has(recipe.id)) continue;
    seenNames.add(recipe.name);
    seenIds.add(recipe.id);
    recipes.push(recipe);
  }

  return recipes;
}
