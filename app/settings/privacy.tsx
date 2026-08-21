import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { Card } from '../../src/components/Card';
import { Body, BodyStrong, Title } from '../../src/components/Typography';

const SECTIONS = [
  {
    title: 'What we look at',
    body: "Kitchen videos are used to identify food in your home — nothing else. We don't analyze anything outside the frame of your kitchen tour.",
  },
  {
    title: 'What we keep',
    body: "We store the structured list of what you have (names, approximate quantities, freshness) rather than the raw video itself for longer than needed to process it.",
  },
  {
    title: 'Who sees it',
    body: 'Your kitchen memory is visible to your household only. We do not sell household data to advertisers or anyone else.',
  },
  {
    title: 'Your control',
    body: 'You can edit or delete any item at any time, and you can export or permanently delete all of your household data from Settings → Data Export & Delete.',
  },
];

export default function PrivacyScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Privacy</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {SECTIONS.map((s) => (
          <Card key={s.title} style={{ gap: 4 }}>
            <BodyStrong>{s.title}</BodyStrong>
            <Body color={colors.textSecondary}>{s.body}</Body>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
