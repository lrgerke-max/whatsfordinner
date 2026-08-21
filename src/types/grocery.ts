export type GroceryDepartment =
  | 'produce'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grains'
  | 'canned'
  | 'condiments'
  | 'spices'
  | 'baking'
  | 'beverages'
  | 'frozen'
  | 'snacks'
  | 'other';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  department: GroceryDepartment;
  /** human-readable "why am I buying this" explanation */
  reason: string;
  usedInRecipeIds: string[];
  checked: boolean;
  isCustom: boolean;
  alreadyHave: boolean;
  /** future store-integration pricing, mocked for now */
  estimatedPriceUsd?: number;
}

export interface GroceryList {
  id: string;
  mealPlanId: string;
  weekStartDate: string;
  items: GroceryItem[];
  generatedAt: string;
}
