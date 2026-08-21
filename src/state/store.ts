import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateId } from '../utils/id';
import { nowIso, startOfWeek } from '../utils/date';
import { Household, HouseholdMember, ShoppingPreference } from '../types/household';
import { InventoryItem, RemovedInventoryItem } from '../types/inventory';
import { KitchenScan } from '../types/scan';
import { Meal, MealPlan, RatingValue } from '../types/mealPlan';
import { GroceryItem, GroceryList } from '../types/grocery';
import { RECIPE_LIBRARY, findRecipeById } from '../data/recipes';
import { buildBlankHousehold, buildSeedHousehold } from '../data/seedHousehold';
import { buildSeedInventory } from '../data/seedInventory';
import { generateMealPlan, matchRecipeToInventory } from '../engines/mealPlanningEngine';
import { generateGroceryList } from '../engines/groceryListEngine';
import { MergeResult } from '../engines/inventoryMerge';

const PAST_MEALS_LIMIT = 40;

interface LearningInsight {
  key: string;
  message: string;
}

interface KitchenMemoryState {
  household: Household;
  inventory: InventoryItem[];
  removedHistory: RemovedInventoryItem[];
  scans: KitchenScan[];
  mealPlan: MealPlan | null;
  pastMeals: Meal[];
  mealRatings: Record<string, RatingValue>;
  groceryList: GroceryList | null;
  acknowledgedInsightKeys: string[];
  notificationPreferences: Record<string, boolean>;
  hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;

  // Household
  replaceHousehold: (household: Household) => void;
  updateHouseholdFields: (fields: Partial<Household>) => void;
  updateShopping: (fields: Partial<ShoppingPreference>) => void;
  addMember: (member: HouseholdMember) => void;
  updateMember: (id: string, fields: Partial<HouseholdMember>) => void;
  removeMember: (id: string) => void;
  completeOnboarding: (household: Household) => void;

  // Inventory
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, fields: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;
  applyScanMerge: (merge: MergeResult, scan: KitchenScan) => void;

  // Meal plan
  ensureMealPlan: () => void;
  regenerateMealPlan: () => void;
  swapMealTo: (mealId: string, newRecipeId: string) => void;
  rateMeal: (mealId: string, rating: RatingValue) => void;
  setMealStatus: (mealId: string, status: Meal['status']) => void;

  // Grocery
  regenerateGroceryList: () => void;
  toggleGroceryItem: (id: string) => void;
  setGroceryItemQuantity: (id: string, quantity: number) => void;
  removeGroceryItem: (id: string) => void;
  addCustomGroceryItem: (input: { name: string; quantity: number; unit: string }) => void;
  markGroceryAlreadyHave: (id: string) => void;

  // Learning
  dismissInsight: (key: string) => void;

  // Notifications
  setNotificationPreference: (key: string, enabled: boolean) => void;

  // Danger zone
  resetAllData: () => void;
  loadDemoData: () => void;
}

function buildGroceryListForPlan(plan: MealPlan, inventory: InventoryItem[]): GroceryList {
  return generateGroceryList(plan, RECIPE_LIBRARY, inventory);
}

function buildStateFor(household: Household, inventory: InventoryItem[]) {
  const weekStartDate = startOfWeek();
  const mealPlan = household.onboardingCompleted
    ? generateMealPlan({ household, inventory, recipeLibrary: RECIPE_LIBRARY, pastMeals: [], weekStartDate })
    : null;
  const groceryList = mealPlan ? buildGroceryListForPlan(mealPlan, inventory) : null;

  return {
    household,
    inventory,
    removedHistory: [] as RemovedInventoryItem[],
    scans: [] as KitchenScan[],
    mealPlan,
    pastMeals: [] as Meal[],
    mealRatings: {} as Record<string, RatingValue>,
    groceryList,
    acknowledgedInsightKeys: [] as string[],
    notificationPreferences: {
      scanReminder: true,
      planReady: true,
      dinnerTonight: true,
      foodWaste: true,
    } as Record<string, boolean>,
  };
}

function buildSeededState() {
  return buildStateFor(buildSeedHousehold(), buildSeedInventory());
}

function buildBlankState() {
  return buildStateFor(buildBlankHousehold(), []);
}

export const useKitchenMemoryStore = create<KitchenMemoryState>()(
  persist(
    (set, get) => ({
      ...buildSeededState(),
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      replaceHousehold: (household) => set({ household }),

      updateHouseholdFields: (fields) =>
        set((state) => ({ household: { ...state.household, ...fields, updatedAt: nowIso() } })),

      updateShopping: (fields) =>
        set((state) => ({
          household: { ...state.household, shopping: { ...state.household.shopping, ...fields }, updatedAt: nowIso() },
        })),

      addMember: (member) =>
        set((state) => ({ household: { ...state.household, members: [...state.household.members, member], updatedAt: nowIso() } })),

      updateMember: (id, fields) =>
        set((state) => ({
          household: {
            ...state.household,
            members: state.household.members.map((m) => (m.id === id ? { ...m, ...fields } : m)),
            updatedAt: nowIso(),
          },
        })),

      removeMember: (id) =>
        set((state) => ({
          household: { ...state.household, members: state.household.members.filter((m) => m.id !== id), updatedAt: nowIso() },
        })),

      completeOnboarding: (household) => {
        set({ household: { ...household, onboardingCompleted: true, updatedAt: nowIso() } });
        get().regenerateMealPlan();
      },

      addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),

      updateInventoryItem: (id, fields) =>
        set((state) => ({
          inventory: state.inventory.map((i) => (i.id === id ? { ...i, ...fields, updatedAt: nowIso() } : i)),
        })),

      removeInventoryItem: (id) => set((state) => ({ inventory: state.inventory.filter((i) => i.id !== id) })),

      applyScanMerge: (merge, scan) => {
        set((state) => ({
          inventory: merge.inventory,
          removedHistory: [...merge.removedItems, ...state.removedHistory],
          scans: [scan, ...state.scans].slice(0, 20),
        }));
        get().regenerateMealPlan();
      },

      ensureMealPlan: () => {
        const { mealPlan } = get();
        if (!mealPlan || mealPlan.weekStartDate !== startOfWeek()) get().regenerateMealPlan();
      },

      regenerateMealPlan: () => {
        const { household, inventory, pastMeals, mealRatings, mealPlan } = get();
        const weekStartDate = startOfWeek();
        const newPastMeals = mealPlan ? [...pastMeals, ...mealPlan.meals].slice(-PAST_MEALS_LIMIT) : pastMeals;
        const newPlan = generateMealPlan({
          household,
          inventory,
          recipeLibrary: RECIPE_LIBRARY,
          pastMeals: newPastMeals,
          mealRatings,
          weekStartDate,
        });
        const groceryList = buildGroceryListForPlan(newPlan, inventory);
        set({ mealPlan: newPlan, pastMeals: newPastMeals, groceryList });
      },

      swapMealTo: (mealId, newRecipeId) => {
        const { mealPlan, inventory } = get();
        if (!mealPlan) return;
        const recipe = findRecipeById(newRecipeId);
        if (!recipe) return;
        const match = matchRecipeToInventory(recipe, inventory);
        const updatedMeals = mealPlan.meals.map((m) =>
          m.id === mealId
            ? {
                ...m,
                recipeId: newRecipeId,
                inventoryMatchCount: match.matchedCount,
                totalIngredientCount: match.requiredCount,
                estimatedAdditionalCostUsd: Math.round(match.missingIngredientNames.length * 2.75 * 100) / 100,
                rating: undefined,
              }
            : m
        );
        const updatedPlan = { ...mealPlan, meals: updatedMeals };
        const groceryList = buildGroceryListForPlan(updatedPlan, inventory);
        set({ mealPlan: updatedPlan, groceryList });
      },

      rateMeal: (mealId, rating) => {
        const { mealPlan } = get();
        if (!mealPlan) return;
        const meal = mealPlan.meals.find((m) => m.id === mealId);
        if (!meal) return;
        const updatedMeals = mealPlan.meals.map((m) => (m.id === mealId ? { ...m, rating, status: 'cooked' as const } : m));
        set((state) => ({
          mealPlan: { ...mealPlan, meals: updatedMeals },
          mealRatings: { ...state.mealRatings, [meal.recipeId]: rating },
        }));
      },

      setMealStatus: (mealId, status) => {
        const { mealPlan } = get();
        if (!mealPlan) return;
        set({ mealPlan: { ...mealPlan, meals: mealPlan.meals.map((m) => (m.id === mealId ? { ...m, status } : m)) } });
      },

      regenerateGroceryList: () => {
        const { mealPlan, inventory } = get();
        if (!mealPlan) return;
        set({ groceryList: buildGroceryListForPlan(mealPlan, inventory) });
      },

      toggleGroceryItem: (id) => {
        const { groceryList } = get();
        if (!groceryList) return;
        set({
          groceryList: {
            ...groceryList,
            items: groceryList.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
          },
        });
      },

      setGroceryItemQuantity: (id, quantity) => {
        const { groceryList } = get();
        if (!groceryList) return;
        set({
          groceryList: {
            ...groceryList,
            items: groceryList.items.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i)),
          },
        });
      },

      removeGroceryItem: (id) => {
        const { groceryList } = get();
        if (!groceryList) return;
        set({ groceryList: { ...groceryList, items: groceryList.items.filter((i) => i.id !== id) } });
      },

      addCustomGroceryItem: ({ name, quantity, unit }) => {
        const { groceryList } = get();
        if (!groceryList) return;
        const newItem: GroceryItem = {
          id: generateId('grocery'),
          name,
          quantity,
          unit,
          department: 'other',
          reason: 'Added by you',
          usedInRecipeIds: [],
          checked: false,
          isCustom: true,
          alreadyHave: false,
        };
        set({ groceryList: { ...groceryList, items: [newItem, ...groceryList.items] } });
      },

      markGroceryAlreadyHave: (id) => {
        const { groceryList } = get();
        if (!groceryList) return;
        set({
          groceryList: {
            ...groceryList,
            items: groceryList.items.map((i) => (i.id === id ? { ...i, alreadyHave: true, checked: true } : i)),
          },
        });
      },

      dismissInsight: (key) => set((state) => ({ acknowledgedInsightKeys: [...state.acknowledgedInsightKeys, key] })),

      setNotificationPreference: (key, enabled) =>
        set((state) => ({ notificationPreferences: { ...state.notificationPreferences, [key]: enabled } })),

      resetAllData: () => set({ ...buildBlankState(), acknowledgedInsightKeys: [] }),

      loadDemoData: () => set({ ...buildSeededState() }),
    }),
    {
      name: 'kitchen-memory-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => {
        const { hasHydrated: _h, ...rest } = state;
        return rest;
      },
    }
  )
);

export function computeLearningInsight(state: KitchenMemoryState): LearningInsight | null {
  const lovedByCuisineQuick: Record<string, number> = {};
  for (const [recipeId, rating] of Object.entries(state.mealRatings)) {
    if (rating !== 'loved') continue;
    const recipe = findRecipeById(recipeId);
    if (!recipe || recipe.cookTimeMinutes > 30) continue;
    lovedByCuisineQuick[recipe.cuisine] = (lovedByCuisineQuick[recipe.cuisine] ?? 0) + 1;
  }
  const entry = Object.entries(lovedByCuisineQuick).sort((a, b) => b[1] - a[1])[0];
  if (!entry || entry[1] < 2) return null;
  const [cuisine] = entry;
  const key = `quick-cuisine-${cuisine}`;
  if (state.acknowledgedInsightKeys.includes(key)) return null;
  return { key, message: `You seem to really like quick ${cuisine} meals. Want us to include more?` };
}
