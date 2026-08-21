import { create } from 'zustand';
import { generateId } from '../utils/id';
import { nowIso } from '../utils/date';
import { FoodPreference, Household, HouseholdMember, MemberRole } from '../types/household';

function blankMember(role: MemberRole, index: number): HouseholdMember {
  const roleLabel = role === 'adult' ? 'Adult' : role === 'teen' ? 'Teen' : 'Kid';
  return {
    id: generateId('member'),
    name: `${roleLabel} ${index}`,
    role,
    foodPreference: {
      favoriteCuisines: [],
      dislikedFoods: [],
      allergies: [],
      dietaryRestrictions: [],
      spiceTolerance: 'medium',
    },
  };
}

function buildDraft(): Household {
  const now = nowIso();
  return {
    id: generateId('household'),
    name: 'My Household',
    dinnerTime: '18:30',
    cookingEffort: 'easy-weeknight',
    cookingTimePreference: '30-45',
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
    shopping: { preferredStores: [], budgetPreference: 'moderate', brandLoyalty: 'no-preference' },
    members: [blankMember('adult', 1)],
  };
}

interface OnboardingState {
  draft: Household;
  reset: () => void;
  update: (fields: Partial<Household>) => void;
  setMemberCounts: (adults: number, kids: number) => void;
  updateMember: (id: string, fields: Partial<Omit<HouseholdMember, 'foodPreference'>>) => void;
  updateMemberFoodPreference: (id: string, fields: Partial<FoodPreference>) => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: buildDraft(),
  reset: () => set({ draft: buildDraft() }),
  update: (fields) => set((state) => ({ draft: { ...state.draft, ...fields } })),
  setMemberCounts: (adults, kids) => {
    const { draft } = get();
    const existingAdults = draft.members.filter((m) => m.role === 'adult');
    const existingKids = draft.members.filter((m) => m.role !== 'adult');

    const nextAdults = Array.from({ length: adults }, (_, i) => existingAdults[i] ?? blankMember('adult', i + 1));
    const nextKids = Array.from({ length: kids }, (_, i) => existingKids[i] ?? blankMember('teen', i + 1));

    set({ draft: { ...draft, members: [...nextAdults, ...nextKids] } });
  },
  updateMember: (id, fields) =>
    set((state) => ({
      draft: {
        ...state.draft,
        members: state.draft.members.map((m) => (m.id === id ? { ...m, ...fields } : m)),
      },
    })),
  updateMemberFoodPreference: (id, fields) =>
    set((state) => ({
      draft: {
        ...state.draft,
        members: state.draft.members.map((m) =>
          m.id === id ? { ...m, foodPreference: { ...m.foodPreference, ...fields } } : m
        ),
      },
    })),
}));
