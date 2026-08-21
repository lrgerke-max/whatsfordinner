import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { COOKING_EFFORT_LABEL, COOKING_TIME_LABEL } from '../../src/utils/labels';
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
            <Caption>MEMBERS · {household.members.length}</Caption>
            <Pressable onPress={() => router.push('/edit-member/new')} hitSlop={8}>
              <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>+ Add</Caption>
            </Pressable>
          </View>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {household.members.map((member, idx) => (
              <Pressable
                key={member.id}
                onPress={() => router.push(`/edit-member/${member.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: colors.border,
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
            ))}
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
