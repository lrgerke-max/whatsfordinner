import { InventoryCategory } from '../types/inventory';

// InventoryCategory and GroceryDepartment are structurally identical unions,
// so one keyword-based categorizer serves both the scan pipeline and the
// grocery list engine. The vocabulary must cover the generated recipe
// library's ingredients — anything unmatched lands in the "other" junk drawer.
const CATEGORY_KEYWORDS: [InventoryCategory, string[]][] = [
  ['produce', ['mixed greens', 'snap peas', 'sweet potato', 'artichoke heart', 'baby corn', 'bok choy', 'kalamata olive', 'red onion', 'shallot', 'scallion', 'leek', 'kale', 'cabbage', 'cauliflower', 'zucchini', 'ginger', 'pea', 'pear', 'spinach', 'mushroom', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'pickle', 'cucumber', 'carrot', 'potato', 'lemon', 'lime', 'avocado', 'broccoli', 'apple', 'cilantro', 'parsley', 'basil', 'mint', 'tarragon', 'herb', 'corn', 'rosemary', 'celery', 'eggplant', 'pepper']],
  ['meat', ['flank steak', 'chicken', 'beef', 'pork', 'bacon', 'sausage', 'turkey', 'ham', 'lamb', 'steak']],
  ['seafood', ['shrimp', 'salmon', 'tuna', 'cod', 'crab', 'lobster', 'scallop', 'fish', 'tilapia', 'anchovy', 'trout', 'catfish', 'pollock', 'mahi', 'clam', 'mussel']],
  ['dairy', ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'sour cream', 'parmesan', 'mozzarella', 'feta', 'cheddar', 'gruyere']],
  ['grains', ['rice noodle', 'rice', 'pasta', 'noodle', 'bread', 'tortilla', 'flatbread', 'pita', 'bun', 'oat', 'couscous']],
  ['canned', ['crushed tomatoes', 'diced tomatoes', 'tomato paste', 'tomato sauce', 'chicken broth', 'chicken stock', 'black beans', 'chickpea', 'canned', 'broth', 'stock', 'coconut milk', 'pickled']],
  ['condiments', ['sweet chili sauce', 'buffalo sauce', 'ranch dressing', 'bbq sauce', 'hot sauce', 'sriracha', 'gochujang', 'hoisin sauce', 'soy sauce', 'fish sauce', 'curry paste', 'miso paste', 'pesto', 'capers', 'ketchup', 'salsa', 'mustard', 'mayo', 'oil', 'vinegar', 'peanut butter', 'honey', 'tahini', 'maple syrup', 'mirin', 'kimchi', 'harissa']],
  ['spices', ['garam masala', "za'atar", 'herbes de provence', 'baharat', 'red pepper flakes', 'black pepper', 'peppercorn', 'chili powder', 'smoked paprika', 'curry powder', 'sesame seed', 'sumac', 'chili', 'cumin', 'oregano', 'salt', 'cinnamon', 'paprika', 'spice', 'lemongrass']],
  ['baking', ['flour', 'sugar', 'baking powder', 'baking soda', 'vanilla', 'breadcrumb', 'cornstarch', 'cashew']],
  ['beverages', ['juice', 'soda', 'coffee', 'tea', 'water', 'apple cider']],
  ['frozen', ['frozen']],
  ['snacks', ['chips', 'crackers', 'pretzel', 'tortilla chip', 'peanut']],
  ['other', ['tofu', 'seitan']],
];

// Longest keywords first, so "red pepper flakes" (spices) wins over the bare
// "pepper" (produce) instead of being shadowed by category order.
const ORDERED_KEYWORDS = CATEGORY_KEYWORDS.flatMap(([category, keywords]) =>
  keywords.map((keyword) => ({ category, keyword }))
).sort((a, b) => b.keyword.length - a.keyword.length);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Precompiled once per single-word keyword instead of per categorizeIngredient
// call — this loop runs on every grocery-list/inventory item.
const WHOLE_WORD_PATTERNS = new Map<string, RegExp>(
  ORDERED_KEYWORDS.filter(({ keyword }) => !keyword.includes(' ')).map(({ keyword }) => [
    keyword,
    new RegExp(`\\b${escapeRegExp(keyword)}(?:s|es)?\\b`),
  ])
);

/** Whole-word match with plural tolerance ("tomatoes" matches "tomato"). */
function matchesWholeWord(lowercasedName: string, keyword: string): boolean {
  return WHOLE_WORD_PATTERNS.get(keyword)!.test(lowercasedName);
}

export function categorizeIngredient(name: string): InventoryCategory {
  const lower = name.toLowerCase();
  for (const { category, keyword } of ORDERED_KEYWORDS) {
    if (keyword.includes(' ') ? lower.includes(keyword) : matchesWholeWord(lower, keyword)) {
      return category;
    }
  }
  // Whole-word "egg(s)" only — substring matching used to file eggplant
  // under dairy.
  if (/\beggs?\b/.test(lower)) return 'dairy';
  return 'other';
}
