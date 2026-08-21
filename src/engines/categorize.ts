import { InventoryCategory } from '../types/inventory';

// InventoryCategory and GroceryDepartment are structurally identical unions,
// so one keyword-based categorizer serves both the scan pipeline and the
// grocery list engine.
const CATEGORY_KEYWORDS: [InventoryCategory, string[]][] = [
  ['produce', ['spinach', 'mushroom', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'cucumber', 'carrot', 'potato', 'lemon', 'lime', 'avocado', 'broccoli', 'apple', 'cilantro', 'parsley', 'basil', 'herb', 'corn', 'rosemary']],
  ['meat', ['chicken', 'beef', 'pork', 'bacon', 'sausage', 'turkey', 'ham', 'lamb']],
  ['seafood', ['shrimp', 'salmon', 'tuna', 'cod', 'crab', 'lobster', 'scallop', 'fish', 'tilapia']],
  ['dairy', ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'sour cream', 'parmesan', 'mozzarella', 'feta', 'cheddar']],
  ['grains', ['rice', 'pasta', 'noodle', 'bread', 'tortilla', 'flatbread', 'pita', 'bun', 'oat']],
  ['canned', ['crushed tomatoes', 'black beans', 'chickpeas', 'canned', 'broth', 'stock']],
  ['condiments', ['ketchup', 'salsa', 'soy sauce', 'mustard', 'mayo', 'oil', 'vinegar', 'peanut butter', 'honey', 'tahini']],
  ['spices', ['cumin', 'oregano', 'salt', 'pepper flakes', 'chili', 'cinnamon', 'paprika', 'red pepper flakes']],
  ['baking', ['flour', 'sugar', 'baking powder', 'baking soda', 'vanilla', 'breadcrumb', 'cornstarch']],
  ['beverages', ['juice', 'soda', 'coffee', 'tea', 'water']],
  ['frozen', ['frozen']],
  ['snacks', ['chips', 'crackers', 'pretzel']],
];

export function categorizeIngredient(name: string): InventoryCategory {
  const lower = name.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  if (lower.includes('egg')) return 'dairy';
  return 'other';
}
