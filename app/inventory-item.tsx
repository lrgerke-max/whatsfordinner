import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { generateId } from '../src/utils/id';
import { nowIso } from '../src/utils/date';
import { confirmAction } from '../src/utils/confirm';
import { InventoryCategory, InventoryItem, QuantityLevel, StorageLocation, FreshnessStatus } from '../src/types/inventory';
import { FRESHNESS_LABEL, LOCATION_LABEL, QUANTITY_LEVEL_LABEL } from '../src/utils/labels';
import { Title, Body, Caption } from '../src/components/Typography';
import { TextField } from '../src/components/TextField';
import { ChipGroup } from '../src/components/ChipGroup';
import { Button } from '../src/components/Button';

const CATEGORIES: InventoryCategory[] = ['produce', 'meat', 'seafood', 'dairy', 'grains', 'canned', 'condiments', 'spices', 'baking', 'beverages', 'frozen', 'snacks', 'other'];
const LOCATIONS: StorageLocation[] = ['refrigerator', 'freezer', 'pantry', 'cabinet', 'countertop', 'other'];
const QUANTITY_LEVELS: QuantityLevel[] = ['full', 'mostly-full', 'half', 'some', 'nearly-empty', 'unknown'];
const FRESHNESS: FreshnessStatus[] = ['fresh', 'use-soon', 'likely-expired', 'unknown'];

export default function InventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const addInventoryItem = useKitchenMemoryStore((s) => s.addInventoryItem);
  const updateInventoryItem = useKitchenMemoryStore((s) => s.updateInventoryItem);
  const removeInventoryItem = useKitchenMemoryStore((s) => s.removeInventoryItem);

  const existing = useMemo(() => inventory.find((i) => i.id === id), [inventory, id]);
  const isEditing = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<InventoryCategory>(existing?.category ?? 'other');
  const [location, setLocation] = useState<StorageLocation>(existing?.location ?? 'refrigerator');
  const [quantityLevel, setQuantityLevel] = useState<QuantityLevel>(existing?.quantityLevel ?? 'unknown');
  const [freshness, setFreshness] = useState<FreshnessStatus>(existing?.freshness ?? 'unknown');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const now = nowIso();
    if (existing) {
      updateInventoryItem(existing.id, {
        name: name.trim(),
        category,
        location,
        quantityLevel,
        freshness,
        notes: notes.trim() || undefined,
        needsReview: false,
        confidence: 1,
      });
    } else {
      const item: InventoryItem = {
        id: generateId('item'),
        name: name.trim(),
        category,
        location,
        quantityLevel,
        confidence: 1,
        freshness,
        isNew: false,
        needsReview: false,
        source: 'manual',
        notes: notes.trim() || undefined,
        addedAt: now,
        updatedAt: now,
        lastSeenAt: now,
      };
      addInventoryItem(item);
    }
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmAction('Remove item?', `Remove ${existing.name} from your kitchen memory.`, 'Remove', () => {
      removeInventoryItem(existing.id);
      router.back();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>{isEditing ? 'Edit Item' : 'Add Item'}</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Chicken breast" autoFocus={!isEditing} />

        <View style={{ gap: spacing.xs }}>
          <Caption>CATEGORY</Caption>
          <ChipGroup options={CATEGORIES.map((c) => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} selected={[category]} onToggle={(k) => setCategory(k as InventoryCategory)} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>STORAGE LOCATION</Caption>
          <ChipGroup options={LOCATIONS.map((l) => ({ key: l, label: LOCATION_LABEL[l] }))} selected={[location]} onToggle={(k) => setLocation(k as StorageLocation)} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>HOW MUCH IS LEFT?</Caption>
          <ChipGroup options={QUANTITY_LEVELS.map((q) => ({ key: q, label: QUANTITY_LEVEL_LABEL[q] }))} selected={[quantityLevel]} onToggle={(k) => setQuantityLevel(k as QuantityLevel)} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Caption>FRESHNESS</Caption>
          <ChipGroup options={FRESHNESS.map((f) => ({ key: f, label: FRESHNESS_LABEL[f] }))} selected={[freshness]} onToggle={(k) => setFreshness(k as FreshnessStatus)} />
        </View>

        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything worth remembering" multiline />

        <Body color={colors.textTertiary}>
          Manually added items are always exact — no need to guess quantities the way a kitchen scan does.
        </Body>

        <Button label={isEditing ? 'Save Changes' : 'Add to Kitchen'} onPress={handleSave} disabled={!canSave} />
        {isEditing ? <Button label="Remove Item" variant="danger" onPress={handleDelete} /> : null}
      </ScrollView>
    </View>
  );
}
