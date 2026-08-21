import React, { useMemo, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { generateId } from '../../src/utils/id';
import { confirmAction } from '../../src/utils/confirm';
import { ACTIVITY_LEVEL_OPTIONS, MEMBER_ROLE_OPTIONS, SPICE_TOLERANCE_OPTIONS } from '../../src/data/options';
import { ActivityLevel, CUISINE_OPTIONS, COMMON_ALLERGY_OPTIONS, DIETARY_RESTRICTION_OPTIONS, HouseholdMember, MemberRole, SpiceTolerance } from '../../src/types/household';
import { cuisineEmoji } from '../../src/theme/colors';
import { Title, Caption, Body } from '../../src/components/Typography';
import { TextField } from '../../src/components/TextField';
import { ChipGroup } from '../../src/components/ChipGroup';
import { TagInput } from '../../src/components/TagInput';
import { Button } from '../../src/components/Button';

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const addMember = useKitchenMemoryStore((s) => s.addMember);
  const updateMember = useKitchenMemoryStore((s) => s.updateMember);
  const removeMember = useKitchenMemoryStore((s) => s.removeMember);

  const existing = useMemo(() => household.members.find((m) => m.id === id), [household.members, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [role, setRole] = useState<MemberRole>(existing?.role ?? 'adult');
  const [age, setAge] = useState(existing?.age ? String(existing.age) : '');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existing?.activityLevel ?? 'moderate');
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>(existing?.foodPreference.favoriteCuisines ?? []);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>(existing?.foodPreference.dislikedFoods ?? []);
  const [allergies, setAllergies] = useState<string[]>(existing?.foodPreference.allergies ?? []);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(existing?.foodPreference.dietaryRestrictions ?? []);
  const [spiceTolerance, setSpiceTolerance] = useState<SpiceTolerance>(existing?.foodPreference.spiceTolerance ?? 'medium');

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const foodPreference = { favoriteCuisines, dislikedFoods, allergies, dietaryRestrictions, spiceTolerance };
    if (existing) {
      updateMember(existing.id, { name: name.trim(), role, age: age ? Number(age) : undefined, activityLevel, foodPreference });
    } else {
      const member: HouseholdMember = {
        id: generateId('member'),
        name: name.trim(),
        role,
        age: age ? Number(age) : undefined,
        activityLevel,
        foodPreference,
      };
      addMember(member);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmAction('Remove member?', `Remove ${existing.name} from your household.`, 'Remove', () => {
      removeMember(existing.id);
      router.back();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>{isNew ? 'Add Member' : existing?.name}</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <TextField label="Name" value={name} onChangeText={setName} autoFocus={isNew} />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Caption>ROLE</Caption>
            <ChipGroup options={MEMBER_ROLE_OPTIONS} selected={[role]} onToggle={(k) => setRole(k as MemberRole)} />
          </View>
          <View style={{ width: 90 }}>
            <TextField label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>ACTIVITY LEVEL</Caption>
          <ChipGroup options={ACTIVITY_LEVEL_OPTIONS} selected={[activityLevel]} onToggle={(k) => setActivityLevel(k as ActivityLevel)} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>FAVORITE CUISINES</Caption>
          <ChipGroup
            options={CUISINE_OPTIONS.map((c) => ({ key: c, label: c, emoji: cuisineEmoji[c] }))}
            selected={favoriteCuisines}
            onToggle={(k) => toggle(favoriteCuisines, setFavoriteCuisines, k)}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>DISLIKED FOODS</Caption>
          <TagInput values={dislikedFoods} onChange={setDislikedFoods} placeholder="e.g. seafood, mushrooms" />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>ALLERGIES</Caption>
          <ChipGroup
            options={COMMON_ALLERGY_OPTIONS.map((a) => ({ key: a, label: a }))}
            selected={allergies}
            onToggle={(k) => toggle(allergies, setAllergies, k)}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>DIETARY RESTRICTIONS</Caption>
          <ChipGroup
            options={DIETARY_RESTRICTION_OPTIONS.map((d) => ({ key: d, label: d }))}
            selected={dietaryRestrictions}
            onToggle={(k) => toggle(dietaryRestrictions, setDietaryRestrictions, k)}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>SPICE TOLERANCE</Caption>
          <ChipGroup options={SPICE_TOLERANCE_OPTIONS} selected={[spiceTolerance]} onToggle={(k) => setSpiceTolerance(k as SpiceTolerance)} />
        </View>

        <Button label={isNew ? 'Add Member' : 'Save Changes'} onPress={handleSave} disabled={!canSave} />
        {!isNew && household.members.length > 1 ? <Button label="Remove Member" variant="danger" onPress={handleDelete} /> : null}
      </ScrollView>
    </View>
  );
}
