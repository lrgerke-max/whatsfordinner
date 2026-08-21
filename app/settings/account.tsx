import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { Card } from '../../src/components/Card';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';

export default function AccountScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Account</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xl }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <BodyStrong color={colors.accentStrong} style={{ fontSize: 24 }}>{household.name.charAt(0)}</BodyStrong>
          </View>
          <BodyStrong>{household.name}</BodyStrong>
          <Caption>Single-household local account</Caption>
        </Card>
        <Body color={colors.textSecondary}>
          Kitchen Memory currently runs entirely on this device. Shared multi-device household accounts and sign-in are on
          the roadmap — see the README for architecture notes.
        </Body>
      </ScrollView>
    </View>
  );
}
