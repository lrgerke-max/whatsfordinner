import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { COOKING_EFFORT_LABEL, COOKING_TIME_LABEL } from '../../src/utils/labels';
import { weekdayLabel } from '../../src/utils/date';
import { SpecialRequest } from '../../src/types/specialRequests';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function FamilyScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const specialRequests = useKitchenMemoryStore((s) => s.specialRequests);

  const openRequestsByMember = useMemo(() => {
    const byMember = new Map<string, SpecialRequest[]>();
    for (const request of specialRequests) {
      if (request.status === 'done') continue;
      const list = byMember.get(request.memberId) ?? [];
      list.push(request);
      byMember.set(request.memberId, list);
    }
    return byMember;
  }, [specialRequests]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Title>Family</Title>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.lg, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <Section title="Household" onPress={() => router.push('/edit-household')}>
          <BodyStrong>{household.name}</BodyStrong>
          <Caption>Dinner around {formatTime(household.dinnerTime)}</Caption>
        </Section>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Caption accessibilityRole="header">MEMBERS · {household.members.length}</Caption>
            <Pressable onPress={() => router.push('/edit-member/new')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add a family member">
              <Caption color={colors.accentStrong}>+ Add</Caption>
            </Pressable>
          </View>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {household.members.map((member, idx) => {
              const memberRequests = openRequestsByMember.get(member.id) ?? [];
              return (
                <View
                  key={member.id}
                  style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.border }}
                >
                  <Pressable
                    onPress={() => router.push(`/edit-member/${member.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${member.name}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.md,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <BodyStrong color={colors.accentStrong}>{member.name.charAt(0).toUpperCase()}</BodyStrong>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <BodyStrong>{member.name}</BodyStrong>
                      <Caption>
                        {member.role === 'adult' ? 'Adult' : member.role === 'teen' ? 'Teen' : 'Kid'}
                        {member.age ? ` · ${member.age}` : ''}
                        {member.activityLevel === 'high' ? ' · Active' : ''}
                      </Caption>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  </Pressable>
                  {memberRequests.length > 0 ? (
                    <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
                      {memberRequests.map((request) => (
                        <View key={request.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          <Body numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>{request.text}</Body>
                          {request.status === 'planned' && request.matchedMealDate ? (
                            <Badge label={`Planned ${weekdayLabel(request.matchedMealDate)}`} tone="success" />
                          ) : (
                            <Badge label="Still hoping" tone="warning" />
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add a meal request for ${member.name}`}
                    onPress={() => router.push(`/add-request?memberId=${member.id}`)}
                    hitSlop={8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: spacing.md,
                      paddingBottom: spacing.md,
                      paddingTop: 4,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.accentStrong} />
                    <Caption color={colors.accentStrong}>Add request</Caption>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </View>

        <Section title="Cooking" onPress={() => router.push('/edit-cooking')}>
          <BodyStrong>{COOKING_EFFORT_LABEL[household.cookingEffort]}</BodyStrong>
          <Caption>{COOKING_TIME_LABEL[household.cookingTimePreference]}</Caption>
        </Section>

        <Section title="Shopping" onPress={() => router.push('/edit-shopping')}>
          <BodyStrong>{household.shopping.preferredStores.join(', ') || 'No stores set'}</BodyStrong>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 }}>
            <Badge label={household.shopping.budgetPreference} tone="neutral" />
            <Badge label={household.shopping.brandLoyalty.replace('-', ' ')} tone="neutral" />
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, onPress, children }: { title: string; onPress: () => void; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Caption>{title.toUpperCase()}</Caption>
      <Card onPress={onPress} style={{ gap: 2 }}>
        {children}
      </Card>
    </View>
  );
}
