import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { RECIPE_LIBRARY } from '../../src/data/recipes';
import { explainGroceryItem } from '../../src/engines/groceryListEngine';
import { informAction } from '../../src/utils/confirm';
import { GroceryDepartment, GroceryItem } from '../../src/types/grocery';
import { DEPARTMENT_EMOJI, DEPARTMENT_LABEL, formatIngredientQuantity } from '../../src/utils/labels';
import { Card } from '../../src/components/Card';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';

const DEPARTMENT_ORDER: GroceryDepartment[] = ['produce', 'meat', 'seafood', 'dairy', 'grains', 'canned', 'condiments', 'spices', 'baking', 'frozen', 'beverages', 'snacks', 'other'];

export default function GroceryScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const groceryList = useKitchenMemoryStore((s) => s.groceryList);
  const mealPlan = useKitchenMemoryStore((s) => s.mealPlan);
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const household = useKitchenMemoryStore((s) => s.household);
  const toggleGroceryItem = useKitchenMemoryStore((s) => s.toggleGroceryItem);
  const removeGroceryItem = useKitchenMemoryStore((s) => s.removeGroceryItem);
  const addCustomGroceryItem = useKitchenMemoryStore((s) => s.addCustomGroceryItem);
  const regenerateGroceryList = useKitchenMemoryStore((s) => s.regenerateGroceryList);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('each');

  const grouped = useMemo(() => {
    const map = new Map<GroceryDepartment, GroceryItem[]>();
    for (const d of DEPARTMENT_ORDER) map.set(d, []);
    for (const item of groceryList?.items ?? []) {
      map.get(item.department)?.push(item);
    }
    return map;
  }, [groceryList]);

  const totalCost = useMemo(
    () => (groceryList?.items ?? []).reduce((sum, i) => sum + (i.estimatedPriceUsd ?? 0), 0),
    [groceryList]
  );
  const checkedCount = (groceryList?.items ?? []).filter((i) => i.checked).length;
  const totalCount = groceryList?.items.length ?? 0;

  const handleWhy = (item: GroceryItem) => {
    if (!mealPlan) return;
    informAction('Why am I buying this?', explainGroceryItem(item, mealPlan, RECIPE_LIBRARY, inventory));
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addCustomGroceryItem({ name: newName.trim(), quantity: Number(newQuantity) || 1, unit: newUnit.trim() || 'each' });
    setNewName('');
    setNewQuantity('1');
    setNewUnit('each');
    setShowAdd(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title>Grocery List</Title>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Pressable
            onPress={() => setShowAdd((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Add custom item"
            hitSlop={12}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={regenerateGroceryList}
            accessibilityRole="button"
            accessibilityLabel="Regenerate grocery list"
            hitSlop={12}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {totalCount > 0 ? (
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
          <Caption>
            {checkedCount} of {totalCount} checked · ~${totalCost.toFixed(2)} estimated
            {household.shopping.weeklyBudgetUsd ? ` of $${household.shopping.weeklyBudgetUsd} budget` : ''}
          </Caption>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {showAdd ? (
          <Card style={{ gap: spacing.sm }}>
            <TextField label="Item" value={newName} onChangeText={setNewName} placeholder="e.g. Paper towels" autoFocus />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField label="Quantity" value={newQuantity} onChangeText={setNewQuantity} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Unit" value={newUnit} onChangeText={setNewUnit} placeholder="each" />
              </View>
            </View>
            <Button label="Add to List" onPress={handleAdd} disabled={!newName.trim()} />
          </Card>
        ) : null}

        {totalCount === 0 ? (
          <EmptyState emoji="🛒" title="Nothing to buy" message="Your grocery list is generated from this week's meal plan — plan your week to see what you need." />
        ) : (
          DEPARTMENT_ORDER.map((dept) => {
            const items = grouped.get(dept) ?? [];
            if (items.length === 0) return null;
            return (
              <View key={dept} style={{ gap: spacing.sm }}>
                <Caption>{DEPARTMENT_EMOJI[dept]} {DEPARTMENT_LABEL[dept].toUpperCase()} · {items.length}</Caption>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        padding: spacing.md,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                      }}
                    >
                      <Pressable
                        onPress={() => toggleGroceryItem(item.id)}
                        hitSlop={8}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.checked }}
                        accessibilityLabel={item.name}
                      >
                        <Ionicons
                          name={item.checked ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={item.checked ? colors.success : colors.textTertiary}
                        />
                      </Pressable>
                      <Pressable style={{ flex: 1 }} onPress={() => toggleGroceryItem(item.id)}>
                        <BodyStrong style={item.checked ? { textDecorationLine: 'line-through', color: colors.textTertiary } : undefined}>
                          {item.name}
                        </BodyStrong>
                        <Caption>{formatIngredientQuantity(item.quantity, item.unit)}</Caption>
                      </Pressable>
                      {!item.isCustom ? (
                        <Pressable onPress={() => handleWhy(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Why am I buying this?">
                          <Ionicons name="information-circle-outline" size={20} color={colors.textTertiary} />
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => removeGroceryItem(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
                        <Ionicons name="close" size={20} color={colors.textTertiary} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
