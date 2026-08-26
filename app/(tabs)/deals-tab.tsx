import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { STORE_PROFILES } from '../../src/data/stores';
import { compareStores } from '../../src/engines/storeDealEngine';
import { planShoppingTrip } from '../../src/engines/storeRouteEngine';
import { StoreId, StoreQuote } from '../../src/types/stores';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';

const PRINT_CSS = `
  @page { margin: 14mm; }
  /* react-native-web forwards testID to data-testid, giving us a stable
     print selector without relying on className forwarding. */
  @media print {
    [data-testid="deals-chrome"], [data-testid="route-chrome"] { display: none !important; }
    body { background: #fff !important; }
  }
`;

function usd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function DealsScreen() {
  const { colors, spacing, radius, fontSize } = useTheme();
  const insets = useSafeAreaInsets();
  const groceryList = useKitchenMemoryStore((s) => s.groceryList);

  // Already-checked-off or already-owned items shouldn't inflate savings or
  // route the shopper past something they don't need to buy.
  const items = useMemo(
    () => (groceryList?.items ?? []).filter((i) => !i.checked && !i.alreadyHave),
    [groceryList]
  );
  const comparison = useMemo(() => compareStores(items, STORE_PROFILES), [items]);
  const quoteByStore = useMemo(
    () => new Map(comparison.quotes.map((q) => [q.storeId, q])),
    [comparison]
  );
  const profileById = useMemo(() => new Map(STORE_PROFILES.map((p) => [p.id, p])), []);

  // Default to the winner so the best deal is expanded right away.
  const [selectedId, setSelectedId] = useState<StoreId | null>(null);
  const activeId: StoreId | null = selectedId ?? (items.length > 0 ? comparison.best : null);
  const activeProfile = STORE_PROFILES.find((p) => p.id === activeId) ?? null;

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Title>Find the Best Deal</Title>
        </View>
        <EmptyState
          emoji="🏷️"
          title="Nothing to compare yet"
          message="Plan your week's dinners and we'll price the list at Walmart, Meijer, and Aldi."
          actionLabel="Plan my week"
          onAction={() => router.push('/(tabs)/plan')}
        />
      </View>
    );
  }

  const trip = activeProfile ? planShoppingTrip(items, activeProfile) : null;
  const activeUnavailableCount = activeId ? (quoteByStore.get(activeId)?.unavailableCount ?? 0) : 0;
  const bestProfile = profileById.get(comparison.best);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {Platform.OS === 'web' ? <style>{PRINT_CSS}</style> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View testID="deals-chrome" style={{ gap: spacing.md }}>
          <Title>Find the Best Deal</Title>

          {bestProfile && comparison.maxSavingUsd > 0 && activeProfile ? (
            <Card elevated style={{ backgroundColor: colors.successSoft, borderColor: colors.successSoft }}>
              <BodyStrong color={colors.successStrong}>
                {activeId === bestProfile.id
                  ? `${bestProfile.name} saves you ${usd(comparison.maxSavingUsd)} this week on this list.`
                  : `${bestProfile.name} would save you ${usd(comparison.maxSavingUsd)} vs the priciest option.`}
              </BodyStrong>
            </Card>
          ) : null}

          {/* One honest framing line — real retailer APIs plug into this same interface. */}
          <Caption accessibilityRole="text">
            Prices modeled from typical local costs — not live store pricing or weekly sales.
          </Caption>

          <View style={{ gap: spacing.md }} accessibilityRole="list">
            {STORE_PROFILES.map((profile) => {
              const quote: StoreQuote | undefined = quoteByStore.get(profile.id);
              if (!quote) return null;
              const isBest = profile.id === comparison.best;
              const isActive = profile.id === activeId;
              // A store carrying nothing on this list has no meaningful total.
              const carriesNothing = quote.unavailableCount === quote.lines.length;
              return (
                <Card
                  key={profile.id}
                  onPress={() => setSelectedId(profile.id)}
                  elevated={isActive}
                  style={isActive ? { borderColor: colors.accent } : undefined}
                  accessibilityLabel={`${profile.name}${carriesNothing ? ', most items not carried here' : `, estimated total ${usd(quote.subtotalUsd)}`}${isBest ? ', lowest estimated total' : ''}${quote.unavailableCount > 0 && !carriesNothing ? `, ${quote.unavailableCount} items may not be available` : ''}${isActive ? ', selected' : ''}`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <Body style={{ fontSize: 32 }}>{profile.emoji}</Body>
                    <View style={{ flex: 1, gap: 2 }}>
                      <BodyStrong>{profile.name}</BodyStrong>
                      <Caption numberOfLines={2}>{profile.tagline}</Caption>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {carriesNothing ? (
                        <>
                          <BodyStrong style={{ fontSize: fontSize.title }}>—</BodyStrong>
                          <Caption>Not priced here</Caption>
                        </>
                      ) : (
                        <>
                          <BodyStrong style={{ fontSize: fontSize.title }}>{usd(quote.subtotalUsd)} est.</BodyStrong>
                          {quote.savingsVsWorstUsd > 0 ? (
                            <Caption color={colors.success}>
                              Save {usd(quote.savingsVsWorstUsd)} vs priciest
                            </Caption>
                          ) : (
                            <Caption>Priciest this week</Caption>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                    {isBest && !carriesNothing ? <Badge label="Lowest estimated total" tone="success" /> : null}
                    {quote.unavailableCount > 0 ? (
                      <Badge label={`Excludes ${quote.unavailableCount} item${quote.unavailableCount === 1 ? '' : 's'} likely not carried`} tone="warning" />
                    ) : null}
                  </View>
                </Card>
              );
            })}
          </View>
        </View>

        {activeProfile && trip && trip.stops.length > 0 ? (
          <Card elevated accessibilityLabel={`Smart shopping route for ${activeProfile.name}`}>
            <View style={{ gap: spacing.sm }}>
              <BodyStrong style={{ fontSize: fontSize.bodyLg }}>Smart Shopping Route · {activeProfile.name}</BodyStrong>
              <Caption>Walk it in this order — produce first, frozen last so nothing thaws.</Caption>

              {trip.stops.map((stop) => (
                <View key={stop.order} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: radius.pill,
                      backgroundColor: colors.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Caption color={colors.accentStrong}>{stop.order}</Caption>
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <BodyStrong>{stop.aisleLabel}</BodyStrong>
                    <Caption numberOfLines={3}>{stop.items.map((i) => i.name).join(' · ')}</Caption>
                  </View>
                  <Caption>~{stop.estMinutes} min</Caption>
                </View>
              ))}

              <View testID="route-chrome" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs }}>
                <BodyStrong>About {trip.totalMinutes} min in-store</BodyStrong>
                {Platform.OS === 'web' ? (
                  <Button
                    label="Print route"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => window.print()}
                    accessibilityHint="Opens your browser's print dialog for this route"
                  />
                ) : null}
              </View>

              {activeUnavailableCount > 0 ? (
                <Caption color={colors.warning}>
                  Heads up: {activeUnavailableCount} item{activeUnavailableCount === 1 ? '' : 's'} may not be available here —{' '}
                  {activeProfile.availability?.note?.toLowerCase() ?? 'check in store'}.
                </Caption>
              ) : null}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}
