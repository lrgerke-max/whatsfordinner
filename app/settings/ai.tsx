import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Body, BodyStrong, Title } from '../../src/components/Typography';

export default function AiSettingsScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>AI Settings</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <BodyStrong>Kitchen scanning</BodyStrong>
            <Badge label="Demo mode" tone="accent" />
          </View>
          <Body color={colors.textSecondary}>
            This build ships with a self-contained demo scanner so the whole app works with no API keys. Connecting a real
            multimodal model is a drop-in swap — see the AI provider architecture in the project README.
          </Body>
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <BodyStrong>Meal planning</BodyStrong>
          <Body color={colors.textSecondary}>
            Meal plans come from a transparent scoring engine — not a black-box model — weighing what's already in your
            kitchen, your family's preferences, food waste, cooking time, nutrition, variety, and cost.
          </Body>
        </Card>
        <Card style={{ gap: spacing.sm }}>
          <BodyStrong>Our honesty promise</BodyStrong>
          <Body color={colors.textSecondary}>
            We never invent exact quantities or expiration dates the system can't actually know. When we're not sure, we say
            so — and let you fix it in a couple of taps.
          </Body>
        </Card>
      </ScrollView>
    </View>
  );
}
