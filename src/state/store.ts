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
import { SpecialRequest } from '../types/specialRequests';
import { RECIPE_LIBRARY, findRecipeById } from '../data/recipes';
import { buildBlankHousehold, buildSeedHousehold, SEED_SPECIAL_REQUESTS } from '../data/seedHousehold';
import { buildSeedInventory } from '../data/seedInventory';
import { generateMealPlan, matchRecipeToInventory, reconcileRequests, ESTIMATED_COST_PER_MISSING_INGREDIENT } from '../engines/mealPlanningEngine';
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
  specialRequests: SpecialRequest[];
  groceryList: GroceryList | null;
  acknowledgedInsightKeys: string[];
  notificationPreferences: Record<string, boolean>;
  /** Bumped on every explicit reshuffle so "refresh" yields different meals. */
  planSeed: number;
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
  regenerateMealPlan: (options?: { reshuffle?: boolean }) => void;
  swapMealTo: (mealId: string, newRecipeId: string) => void;
  rateMeal: (mealId: string, rating: RatingValue) => void;
  setMealStatus: (mealId: string, status: Meal['status']) => void;

  // Special requests
  addSpecialRequest: (input: { memberId: string; text: string; preferredDate?: string }) => void;
  fulfillSpecialRequest: (id: string, mealDate: string, recipeId: string) => void;
  completeSpecialRequest: (id: string) => void;
  removeSpecialRequest: (id: string) => void;

  // Grocery
  regenerateGroceryList: () => void;
  toggleGroceryItem: (id: string) => void;
  setGroceryItemQuantity: (id: string, quantity: number) => void;
  removeGroceryItem: (id: string) => void;
  clearCheckedGroceryItems: () => void;
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

function normalizeGroceryKey(name: string, unit: string): string {
  return `${name.toLowerCase().trim()}::${unit.toLowerCase().trim()}`;
}

/**
 * Generate the list for a plan, carrying over what the shopper has already
 * done by hand: custom items survive regeneration, and check-off /
 * already-have marks follow the same ingredient across rebuilds so a
 * mid-week replan doesn't erase shopping progress.
 */
function buildGroceryListForPlan(plan: MealPlan, inventory: InventoryItem[], previous?: GroceryList | null): GroceryList {
  const fresh = generateGroceryList(plan, RECIPE_LIBRARY, inventory);
  if (!previous) return fresh;

  const previousByIngredient = new Map<string, GroceryItem>();
  const carriedCustoms: GroceryItem[] = [];
  for (const item of previous.items) {
    if (item.isCustom) {
      carriedCustoms.push(item);
    } else {
      previousByIngredient.set(normalizeGroceryKey(item.name, item.unit), item);
    }
  }

  const items = fresh.items.map((item) => {
    const prior = previousByIngredient.get(normalizeGroceryKey(item.name, item.unit));
    return prior ? { ...item, checked: prior.checked || item.checked, alreadyHave: prior.alreadyHave } : item;
  });

  // Re-add custom items that still belong, deduped among themselves — a user
  // who taps "Add" twice on the same custom item gets one line, not two.
  const freshCustomNames = new Set(items.filter((i) => i.isCustom).map((i) => normalizeGroceryKey(i.name, i.unit)));
  const seenCustomKeys = new Set<string>();
  for (const custom of carriedCustoms) {
    const key = normalizeGroceryKey(custom.name, custom.unit);
    if (freshCustomNames.has(key) || seenCustomKeys.has(key)) continue;
    seenCustomKeys.add(key);
    items.push(custom);
  }

  return { ...fresh, items };
}

function buildStateFor(household: Household, inventory: InventoryItem[], specialRequests: SpecialRequest[]) {
  const weekStartDate = startOfWeek();
  const planningRequests = specialRequests.filter((r) => r.status !== 'done');
  const mealPlan = household.onboardingCompleted
    ? generateMealPlan({ household, inventory, recipeLibrary: RECIPE_LIBRARY, pastMeals: [], weekStartDate, specialRequests: planningRequests })
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
    specialRequests: mealPlan ? reconcileRequests(mealPlan, specialRequests, RECIPE_LIBRARY) : specialRequests,
    groceryList,
    acknowledgedInsightKeys: [] as string[],
    planSeed: 0,
    notificationPreferences: {
      scanReminder: true,
      planReady: true,
      dinnerTonight: true,
      foodWaste: true,
    } as Record<string, boolean>,
  };
}

function buildSeededState() {
  return buildStateFor(buildSeedHousehold(), buildSeedInventory(), SEED_SPECIAL_REQUESTS);
}

function buildBlankState() {
  return buildStateFor(buildBlankHousehold(), [], []);
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
          removedHistory: [...merge.removedItems, ...state.removedHistory].slice(0, 200),
          scans: [scan, ...state.scans].slice(0, 20),
        }));
        get().regenerateMealPlan();
      },

      ensureMealPlan: () => {
        const { mealPlan, household } = get();
        // No plan for un-onboarded households — deep links must not conjure a
        // plan for the blank placeholder household.
        if (!household.onboardingCompleted) return;
        if (!mealPlan || mealPlan.weekStartDate !== startOfWeek()) get().regenerateMealPlan();
      },

      regenerateMealPlan: (options) => {
        const { household, inventory, pastMeals, mealRatings, mealPlan, specialRequests, groceryList, planSeed } = get();
        if (!household.onboardingCompleted) return;
        const weekStartDate = startOfWeek();
        // Archive the old plan's meals only when the week actually rolls
        // over — regenerating mid-week would otherwise stuff pastMeals with
        // duplicate copies of this week and skew the recommender.
        const isNewWeek = !mealPlan || mealPlan.weekStartDate !== weekStartDate;
        const newPastMeals = isNewWeek && mealPlan ? [...pastMeals, ...mealPlan.meals].slice(-PAST_MEALS_LIMIT) : pastMeals;

        // An explicit reshuffle ("give me different options") bumps the seed
        // and benches this week's picks; a stock-driven replan keeps the
        // seed so the same ingredients converge on the same best plan.
        const reshuffle = options?.reshuffle ?? false;
        const nextSeed = reshuffle ? planSeed + 1 : planSeed;
        const excludeRecipeIds =
          reshuffle && mealPlan ? mealPlan.meals.filter((m) => m.status !== 'cooked').map((m) => m.recipeId) : [];
        // Dinners already cooked this week keep their record (status/rating)
        // through a same-week regeneration instead of silently reverting to
        // "planned" under a new id — the engine treats their date as already
        // spoken for, so it won't force a request's recipe onto a night that
        // already happened.
        const lockedMeals = !isNewWeek && mealPlan ? mealPlan.meals.filter((m) => m.status === 'cooked') : [];

        const newPlan = generateMealPlan({
          household,
          inventory,
          recipeLibrary: RECIPE_LIBRARY,
          pastMeals: newPastMeals,
          mealRatings,
          weekStartDate,
          specialRequests: specialRequests.filter((r) => r.status !== 'done'),
          seed: nextSeed,
          excludeRecipeIds,
          lockedMeals,
        });
        const nextGroceryList = buildGroceryListForPlan(newPlan, inventory, groceryList);
        set({
          mealPlan: newPlan,
          pastMeals: newPastMeals,
          groceryList: nextGroceryList,
          planSeed: nextSeed,
          specialRequests: reconcileRequests(newPlan, specialRequests, RECIPE_LIBRARY),
        });
      },

      addSpecialRequest: ({ memberId, text, preferredDate }) => {
        const trimmed = text.trim();
        const member = get().household.members.find((m) => m.id === memberId);
        if (!member || !trimmed) return;
        const request: SpecialRequest = {
          id: generateId('request'),
          memberId,
          memberName: member.name,
          text: trimmed,
          createdAt: nowIso(),
          status: 'open',
          ...(preferredDate ? { preferredDate } : {}),
        };
        set((state) => ({ specialRequests: [request, ...state.specialRequests] }));
        get().regenerateMealPlan();
      },

      fulfillSpecialRequest: (id, mealDate, recipeId) =>
        set((state) => ({
          specialRequests: state.specialRequests.map((r) =>
            r.id === id ? { ...r, status: 'planned' as const, matchedMealDate: mealDate, matchedRecipeId: recipeId } : r
          ),
        })),

      completeSpecialRequest: (id) =>
        set((state) => ({
          specialRequests: state.specialRequests.map((r) => (r.id === id ? { ...r, status: 'done' as const } : r)),
        })),

      removeSpecialRequest: (id) =>
        set((state) => ({ specialRequests: state.specialRequests.filter((r) => r.id !== id) })),

      swapMealTo: (mealId, newRecipeId) => {
        const { mealPlan, inventory, specialRequests, groceryList } = get();
        if (!mealPlan) return;
        const recipe = findRecipeById(newRecipeId);
        if (!recipe) return;
        const match = matchRecipeToInventory(recipe, inventory);
        const updatedMeals = mealPlan.meals.map((m) =>
          m.id === mealId
            ? {
                ...m,
                recipeId: newRecipeId,
                // A swapped-in recipe has not been cooked yet — inheriting the
                // old night's status would archive it as cooked and exempt it
                // from future reshuffles.
                status: 'planned' as const,
                inventoryMatchCount: match.matchedCount,
                totalIngredientCount: match.requiredCount,
                estimatedAdditionalCostUsd:
                  Math.round(match.missingIngredientNames.length * ESTIMATED_COST_PER_MISSING_INGREDIENT * 100) / 100,
                rating: undefined,
              }
            : m
        );
        const updatedPlan = { ...mealPlan, meals: updatedMeals };
        const nextGroceryList = buildGroceryListForPlan(updatedPlan, inventory, groceryList);
        // Swapping away from (or to) a night that carried a request must
        // update the request pointers too, or the Plan tab shows a chip for
        // a meal that no longer exists.
        set({
          mealPlan: updatedPlan,
          groceryList: nextGroceryList,
          specialRequests: reconcileRequests(updatedPlan, specialRequests, RECIPE_LIBRARY),
        });
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
        const { mealPlan, inventory, groceryList } = get();
        if (!mealPlan) return;
        set({ groceryList: buildGroceryListForPlan(mealPlan, inventory, groceryList) });
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

      clearCheckedGroceryItems: () => {
        const { groceryList } = get();
        if (!groceryList) return;
        set({
          groceryList: {
            ...groceryList,
            items: groceryList.items.map((i) => (i.checked ? { ...i, checked: false, alreadyHave: false } : i)),
          },
        });
      },

      addCustomGroceryItem: ({ name, quantity, unit }) => {
        const { groceryList } = get();
        if (!groceryList) return;
        const safeQuantity =
          Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, 999) : 1;
        const newItem: GroceryItem = {
          id: generateId('grocery'),
          name,
          quantity: safeQuantity,
          unit,
          department: 'other',
          reason: 'Added by you',
          usedInRecipeIds: [],
          checked: false,
          isCustom: true,
          alreadyHave: false,
          // Flat estimate so custom items aren't silently "free" in totals.
          estimatedPriceUsd: 3.49,
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, version) => {
        // v1 → v2 introduced planSeed; older blobs simply fall through to the
        // merge() sanitizer, which defaults anything missing. Future shape
        // changes get a real migration branch here instead of silent drift.
        return persisted as KitchenMemoryState;
      },
      onRehydrateStorage: () => () => {
        // Must fire even when hydration THREW (corrupt JSON): zustand calls
        // this with `undefined` state on failure, and the app gates rendering
        // on hasHydrated — a conditional here would hang on the splash
        // forever. Corrupt blobs degrade to the seeded defaults via merge().
        useKitchenMemoryStore.getState().setHasHydrated(true);
      },
      partialize: (state) => {
        const { hasHydrated: _h, ...rest } = state;
        return rest;
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<KitchenMemoryState>) } as KitchenMemoryState;
        // Shape-sanitize hydrated state: a corrupt or old-schema blob must
        // degrade to defaults, never white-screen the app on boot.
        if (!merged.household || !Array.isArray(merged.household.members)) {
          merged.household = current.household;
        } else {
          // Member elements themselves must be well-formed — engines iterate
          // foodPreference arrays and screens read name/role directly, so a
          // half-formed member in a corrupt blob would crash the boot.
          const VALID_TIME_PREFS = new Set(['under-20', '20-30', '30-45', '45-60', 'no-preference']);
          merged.household.members = merged.household.members.filter(
            (m) =>
              m &&
              typeof m.id === 'string' &&
              typeof m.name === 'string' &&
              m.foodPreference &&
              Array.isArray(m.foodPreference.allergies) &&
              Array.isArray(m.foodPreference.dietaryRestrictions) &&
              Array.isArray(m.foodPreference.dislikedFoods) &&
              Array.isArray(m.foodPreference.favoriteCuisines)
          );
          if (merged.household.members.length === 0) merged.household.members = current.household.members;
          // Screens dereference shopping/dinnerTime unconditionally; older
          // blobs predate them.
          if (!merged.household.shopping || !Array.isArray(merged.household.shopping.preferredStores)) {
            merged.household.shopping = current.household.shopping;
          }
          if (typeof merged.household.dinnerTime !== 'string' || !merged.household.dinnerTime) {
            merged.household.dinnerTime = current.household.dinnerTime;
          }
          if (typeof merged.household.cookingTimePreference !== 'string' || !VALID_TIME_PREFS.has(merged.household.cookingTimePreference)) {
            merged.household.cookingTimePreference = current.household.cookingTimePreference;
          }
        }
        if (!Array.isArray(merged.specialRequests)) {
          merged.specialRequests = [];
        } else {
          const memberIds = new Set((merged.household?.members ?? []).map((m) => m.id));
          merged.specialRequests = merged.specialRequests.filter(
            (r) =>
              r &&
              typeof r.id === 'string' &&
              typeof r.text === 'string' &&
              typeof r.memberName === 'string' &&
              // Drop requests pointing at members that no longer exist —
              // otherwise "requested by <undefined>" ghosts linger forever.
              memberIds.has(r.memberId)
          );
        }
        if (!Array.isArray(merged.acknowledgedInsightKeys)) merged.acknowledgedInsightKeys = [];
        if (!Array.isArray(merged.scans)) merged.scans = [];
        if (!Array.isArray(merged.inventory)) merged.inventory = [];
        if (!Array.isArray(merged.removedHistory)) merged.removedHistory = [];
        if (!Array.isArray(merged.pastMeals)) merged.pastMeals = [];
        if (!merged.mealRatings || typeof merged.mealRatings !== 'object') merged.mealRatings = {};
        if (typeof merged.planSeed !== 'number' || !Number.isFinite(merged.planSeed)) merged.planSeed = 0;
        if (!merged.notificationPreferences || typeof merged.notificationPreferences !== 'object') {
          merged.notificationPreferences = { ...current.notificationPreferences };
        }
        // Malformed week markers would re-trigger regeneration every launch;
        // a plan whose meals array is missing would crash the Plan tab.
        if (merged.mealPlan && (!/^\d{4}-\d{2}-\d{2}$/.test(merged.mealPlan.weekStartDate ?? '') || !Array.isArray(merged.mealPlan.meals))) {
          merged.mealPlan = null;
          merged.groceryList = null;
        }
        if (merged.groceryList) {
          if (!Array.isArray(merged.groceryList.items)) {
            merged.groceryList = null;
          } else {
            // Legacy blobs stored quantities as strings — money math calls
            // .toFixed on these and would crash the Grocery tab. Rows without
            // a usable name/unit would crash aggregation instead — drop them.
            merged.groceryList.items = merged.groceryList.items
              .filter((item) => item && typeof item.name === 'string' && typeof item.unit === 'string')
              .map((item) => (typeof item.quantity !== 'number' ? { ...item, quantity: Number(item.quantity) || 0 } : item));
          }
        }
        return merged;
      },
    }
  )
);

export function computeLearningInsight(
  state: Pick<KitchenMemoryState, 'mealRatings' | 'acknowledgedInsightKeys'>
): LearningInsight | null {
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
