import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { InventoryItem, StorageLocation } from '../../src/types/inventory';
import { FRESHNESS_LABEL, LOCATION_EMOJI, LOCATION_LABEL, describeQuantity } from '../../src/utils/labels';
import { formatRelativeScanTime } from '../../src/utils/date';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { TextField } from '../../src/components/TextField';
import { EmptyState } from '../../src/components/EmptyState';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../src/theme/colors';

const LOCATION_ORDER: StorageLocation[] = ['refrigerator', 'freezer', 'pantry', 'cabinet', 'countertop', 'other'];

function freshnessTone(freshness: InventoryItem['freshness']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (freshness === 'fresh') return 'success';
  if (freshness === 'use-soon') return 'warning';
  if (freshness === 'likely-expired') return 'danger';
  return 'neutral';
}

export default function KitchenScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const scans = useKitchenMemoryStore((s) => s.scans);
  const [searchQuery, setSearchQuery] = useState('');

  const lastScanAt = useMemo(() => {
    if (scans[0]?.completedAt) return scans[0].completedAt;
    const timestamps = inventory.map((i) => i.lastSeenAt).sort();
    return timestamps[timestamps.length - 1];
  }, [scans, inventory]);

  const filteredInventory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return inventory;
    return inventory.filter((item) => item.name.toLowerCase().includes(query));
  }, [inventory, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<StorageLocation, InventoryItem[]>();
    for (const loc of LOCATION_ORDER) map.set(loc, []);
    for (const item of filteredInventory) {
      map.get(item.location)?.push(item);
    }
    for (const items of map.values()) {
      items.sort((a, b) => Number(b.needsReview) - Number(a.needsReview) || a.name.localeCompare(b.name));
    }
    return map;
  }, [filteredInventory]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title>Kitchen</Title>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add item manually"
          onPress={() => router.push('/inventory-item')}
          hitSlop={12}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSubtle, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="add" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Card
          elevated
          onPress={() => router.push('/scan')}
          style={{ borderWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md, overflow: 'hidden' }}
        >
          <LinearGradient colors={[...gradients.accent]} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, padding: spacing.lg }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(8, 11, 9, 0.28)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam" size={24} color={colors.textInverse} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <BodyStrong color={colors.textInverse}>Scan Kitchen</BodyStrong>
              <Caption color="rgba(8, 11, 9, 0.75)">{formatRelativeScanTime(lastScanAt)} · {inventory.length} items tracked</Caption>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textInverse} />
          </LinearGradient>
        </Card>

        {inventory.length > 5 ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <TextField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search your kitchen…" />
          </View>
        ) : null}

        {inventory.length === 0 ? (
          <EmptyState
            emoji="🧺"
            title="Your kitchen is empty — for now"
            message="Record a quick tour of your fridge, freezer, and pantry and we'll remember what you have."
            actionLabel="Scan Kitchen"
            onAction={() => router.push('/scan')}
          />
        ) : filteredInventory.length === 0 ? (
          <EmptyState emoji="🔍" title={`No matches for "${searchQuery}"`} message="Try a shorter search, or the item may not be tracked yet." />
        ) : (
          LOCATION_ORDER.map((loc) => {
            const items = grouped.get(loc) ?? [];
            if (items.length === 0) return null;
            return (
              <View key={loc} style={{ gap: spacing.sm }}>
                <Caption>{LOCATION_EMOJI[loc]} {LOCATION_LABEL[loc].toUpperCase()} · {items.length}</Caption>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {items.map((item, idx) => (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push({ pathname: '/inventory-item', params: { id: item.id } })}
                      style={({ pressed }) => [
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.sm,
                          padding: spacing.md,
                          borderTopWidth: idx === 0 ? 0 : 1,
                          borderTopColor: colors.border,
                          backgroundColor: pressed ? colors.bgSubtle : 'transparent',
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}, ${describeQuantity(item.quantityLevel, item.approxQuantity)}`}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                          <BodyStrong>{item.name}</BodyStrong>
                          {item.isNew ? <Badge label="New" tone="accent" /> : null}
                        </View>
                        <Caption>{describeQuantity(item.quantityLevel, item.approxQuantity)}</Caption>
                        {item.needsReview ? (
                          <Caption color={colors.warning}>We aren't sure about this one · Fix</Caption>
                        ) : null}
                      </View>
                      {item.freshness !== 'unknown' ? <Badge label={FRESHNESS_LABEL[item.freshness]} tone={freshnessTone(item.freshness)} /> : null}
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </Pressable>
                  ))}
                </Card>
              </View>
            );
          })
        )}

        {inventory.length > 0 ? (
          <Button label="Add Item Manually" variant="ghost" onPress={() => router.push('/inventory-item')} />
        ) : null}
      </ScrollView>
    </View>
  );
}
