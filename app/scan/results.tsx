import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { useKitchenMemoryStore } from '../../src/state/store';
import { kitchenScanProcessor } from '../../src/ai';
import { DetectedItem } from '../../src/types/scan';
import { generateId } from '../../src/utils/id';
import { nowIso } from '../../src/utils/date';
import { describeQuantity } from '../../src/utils/labels';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';

type ReviewGroup = 'Refrigerator' | 'Freezer' | 'Pantry' | 'Produce' | 'Other';

function groupFor(item: DetectedItem): ReviewGroup {
  if (item.category === 'produce') return 'Produce';
  if (item.location === 'refrigerator') return 'Refrigerator';
  if (item.location === 'freezer') return 'Freezer';
  if (item.location === 'pantry') return 'Pantry';
  return 'Other';
}

const GROUP_ORDER: ReviewGroup[] = ['Refrigerator', 'Freezer', 'Pantry', 'Produce', 'Other'];

export default function ScanResultsScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const analysis = useScanFlowStore((s) => s.analysis);
  const videoUri = useScanFlowStore((s) => s.videoUri);
  const isDemoVideo = useScanFlowStore((s) => s.isDemoVideo);
  const scanReset = useScanFlowStore((s) => s.reset);
  const inventory = useKitchenMemoryStore((s) => s.inventory);
  const applyScanMerge = useKitchenMemoryStore((s) => s.applyScanMerge);

  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<ReviewGroup, DetectedItem[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const item of analysis?.detectedItems ?? []) {
      map.get(groupFor(item))?.push(item);
    }
    return map;
  }, [analysis]);

  if (!analysis) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState emoji="🤔" title="Nothing to review yet" message="Start a new scan to see what we find." actionLabel="Scan Kitchen" onAction={() => router.replace('/scan')} />
      </View>
    );
  }

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const acceptedCount = analysis.detectedItems.length - excludedIds.size;

  const handleLooksGood = () => {
    const filteredAnalysis = {
      ...analysis,
      detectedItems: analysis.detectedItems.filter((i) => !excludedIds.has(i.id)),
    };
    const merge = kitchenScanProcessor.merge(inventory, filteredAnalysis);
    applyScanMerge(merge, {
      id: generateId('scan'),
      startedAt: nowIso(),
      completedAt: nowIso(),
      status: 'completed',
      videoUri: videoUri ?? undefined,
      isDemoVideo,
      areasCovered: analysis.areasObserved,
      analysis: filteredAnalysis,
      newItemCount: merge.newItems.length,
      updatedItemCount: merge.updatedItems.length,
      removedItemCount: merge.removedItems.length,
    });
    scanReset();
    router.replace('/scan/complete');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
        <Title>We found {analysis.detectedItems.length} things.</Title>
        <Body color={colors.textSecondary}>Tap anything that doesn't look right to leave it out. You can always fine-tune later.</Body>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {analysis.likelyRemovedItemIds.length > 0 ? (
          <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Body color={colors.danger}>{analysis.likelyRemovedItemIds.length} item(s) look like they've been used up and will be removed.</Body>
          </Card>
        ) : null}

        {GROUP_ORDER.map((group) => {
          const items = grouped.get(group) ?? [];
          if (items.length === 0) return null;
          return (
            <View key={group} style={{ gap: spacing.sm }}>
              <Caption>{group.toUpperCase()} · {items.length}</Caption>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((item, idx) => {
                  const excluded = excludedIds.has(item.id);
                  const lowConfidence = item.confidence < 0.6;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleExclude(item.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        padding: spacing.md,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: colors.border,
                        opacity: excluded ? 0.4 : 1,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.name}${excluded ? ', excluded' : ''}`}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                          <BodyStrong style={excluded ? { textDecorationLine: 'line-through' } : undefined}>{item.name}</BodyStrong>
                          {!item.matchedInventoryItemId ? <Badge label="New" tone="accent" /> : null}
                        </View>
                        <Caption>{describeQuantity(item.quantityLevel, item.approxQuantity)}</Caption>
                        {lowConfidence ? <Caption color={colors.warning} style={{ fontWeight: '700' }}>We aren't sure about this one</Caption> : null}
                      </View>
                      <Ionicons
                        name={excluded ? 'add-circle-outline' : 'checkmark-circle'}
                        size={24}
                        color={excluded ? colors.textTertiary : colors.success}
                      />
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.xs }}>
        <Caption style={{ textAlign: 'center' }}>Adding {acceptedCount} item{acceptedCount === 1 ? '' : 's'} to your kitchen memory</Caption>
        <Button label="Looks Good" onPress={handleLooksGood} />
      </View>
    </View>
  );
}
