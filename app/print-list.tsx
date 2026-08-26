import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useTheme } from '../src/theme/useTheme';
import { printColors } from '../src/theme/colors';
import { useKitchenMemoryStore } from '../src/state/store';
import { GroceryDepartment, GroceryItem } from '../src/types/grocery';
import { DEPARTMENT_LABEL, formatIngredientQuantity } from '../src/utils/labels';
import { Button } from '../src/components/Button';
import { Body, BodyStrong, Caption, Title } from '../src/components/Typography';
import { EmptyState } from '../src/components/EmptyState';

const DEPARTMENT_ORDER: GroceryDepartment[] = ['produce', 'meat', 'seafood', 'dairy', 'grains', 'canned', 'condiments', 'spices', 'baking', 'frozen', 'beverages', 'snacks', 'other'];

const AUTO_PRINT_DELAY_MS = 600;

// Raw CSS (web only): hide on-screen controls and give the printout clean margins.
const PRINT_CSS = `
  @page { margin: 14mm; }
  @media print {
    .no-print { display: none !important; }
    body, #root { background: #ffffff !important; }
  }
`;

function weekLabel(isoDate: string): string {
  // "Mon, Aug 24"
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function generatedLabel(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function PrintListScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const groceryList = useKitchenMemoryStore((s) => s.groceryList);
  // Paper needs black-ink-on-white regardless of the app's dark identity —
  // pin to the dedicated print palette on every platform.
  const ink = printColors;
  // Shoppers mid-trip want what's LEFT, not what's already in the cart.
  const [remainingOnly, setRemainingOnly] = useState(false);

  // Auto-print exactly once per mount, even if React re-renders around it,
  // and only when explicitly requested via ?autoprint=1 from the printer
  // button — never hijack someone who deep-linked or refreshed here. (No
  // session-wide flag: the printer button must work on every visit.)
  const hasAutoPrintedRef = useRef(false);
  const shouldAutoPrint =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autoprint') === '1';

  useEffect(() => {
    if (!shouldAutoPrint) return;
    const timer = setTimeout(() => {
      if (hasAutoPrintedRef.current || typeof window?.print !== 'function') return;
      const state = useKitchenMemoryStore.getState();
      if (!state.groceryList || state.groceryList.items.length === 0) return;
      hasAutoPrintedRef.current = true;
      window.print();
    }, AUTO_PRINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldAutoPrint]);

  // Deep links / refreshes have no in-app history: Back must stay in-app.
  const goBackSafely = () => {
    if (router.canDismiss?.()) router.back();
    else router.replace('/(tabs)/grocery');
  };

  const allItems = useMemo(() => groceryList?.items ?? [], [groceryList]);
  const items = useMemo(
    () => (remainingOnly ? allItems.filter((i) => !i.checked) : allItems),
    [allItems, remainingOnly]
  );

  const grouped = useMemo(() => {
    const map = new Map<GroceryDepartment, GroceryItem[]>();
    for (const d of DEPARTMENT_ORDER) map.set(d, []);
    for (const item of items) map.get(item.department)?.push(item);
    return map;
  }, [items]);

  const totalCost = useMemo(() => items.reduce((sum, i) => sum + (Number(i.estimatedPriceUsd) || 0), 0), [items]);
  const budgetUsd = household.shopping.weeklyBudgetUsd;

  if (!groceryList || items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState
          emoji="🖨️"
          title="Nothing to print"
          message="Your grocery list is empty right now. Plan this week's meals first, then come back to print what you need."
          actionLabel="Back"
          onAction={goBackSafely}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {Platform.OS === 'web' ? <style>{PRINT_CSS}</style> : null}

      {/* On-screen controls only — excluded from the printed page via .no-print */}
      {Platform.OS === 'web' ? (
        <div
          className="no-print"
          style={{ display: 'flex', flexDirection: 'row', gap: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Button label="Back" variant="secondary" fullWidth={false} onPress={goBackSafely} />
          <Button label="Print again" fullWidth={false} onPress={() => window.print()} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: colors.textSecondary, cursor: 'pointer', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={remainingOnly}
              onChange={(e) => setRemainingOnly(e.target.checked)}
            />
            Remaining items only
          </label>
        </div>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: ink.border,
            padding: spacing.xl,
            gap: spacing.lg,
          }}
        >
          {/* Screen-reader anchor for the printable document. */}
          <Title color={ink.textPrimary} style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
            Shopping list for {household.name}
          </Title>
          <View style={{ gap: spacing.xxs, borderBottomWidth: 1, borderBottomColor: ink.border, paddingBottom: spacing.md }}>
            <BodyStrong color={ink.textPrimary}>{household.name}</BodyStrong>
            <BodyStrong color={ink.textSecondary}>Shopping List · Week of {weekLabel(groceryList.weekStartDate)}</BodyStrong>
            <Caption color={ink.textTertiary}>Generated {generatedLabel(groceryList.generatedAt)}</Caption>
          </View>

          {DEPARTMENT_ORDER.map((dept) => {
            const deptItems = grouped.get(dept) ?? [];
            if (deptItems.length === 0) return null;
            const subtotal = deptItems.reduce((sum, i) => sum + (i.estimatedPriceUsd ?? 0), 0);
            return (
              <View key={dept} style={{ gap: spacing.xs }}>
                <Caption color={ink.textSecondary} style={{ textTransform: 'uppercase' }}>
                  {DEPARTMENT_LABEL[dept]}
                </Caption>
                {deptItems.map((item) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Body style={{ width: 20, textAlign: 'center', color: item.checked ? ink.textTertiary : ink.textPrimary }}>
                      {item.checked ? '☑' : '☐'}
                    </Body>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.xs }}>
                      <BodyStrong
                        style={{
                          color: item.checked ? ink.textTertiary : ink.textPrimary,
                          textDecorationLine: item.checked ? 'line-through' : 'none',
                        }}
                      >
                        {item.name}
                      </BodyStrong>
                      <Caption color={item.checked ? ink.textTertiary : ink.textSecondary}>
                        {formatIngredientQuantity(item.quantity, item.unit)}
                      </Caption>
                    </View>
                    {typeof item.estimatedPriceUsd === 'number' ? (
                      <Body color={item.checked ? ink.textTertiary : ink.textPrimary}>${item.estimatedPriceUsd.toFixed(2)}</Body>
                    ) : null}
                  </View>
                ))}
                <Caption color={ink.textSecondary} style={{ textAlign: 'right' }}>
                  Subtotal ~${subtotal.toFixed(2)}
                </Caption>
              </View>
            );
          })}

          <View style={{ borderTopWidth: 1, borderTopColor: ink.border, paddingTop: spacing.md, gap: spacing.xxs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <BodyStrong color={ink.textPrimary}>Total</BodyStrong>
              <BodyStrong color={ink.textPrimary}>~${totalCost.toFixed(2)} total</BodyStrong>
            </View>
            {budgetUsd != null && budgetUsd > 0 ? (
              <Caption color={ink.textSecondary}>of ${budgetUsd} weekly budget</Caption>
            ) : null}
          </View>

          <Caption color={ink.textTertiary} style={{ textAlign: 'center' }}>
            Generated by Kitchen Memory
          </Caption>
        </View>
      </ScrollView>
    </View>
  );
}
