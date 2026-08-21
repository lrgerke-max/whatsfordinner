import React from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { Card } from '../../src/components/Card';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';

const NOTIFICATIONS: { key: string; title: string; example: string }[] = [
  { key: 'scanReminder', title: 'Scan reminders', example: 'Saturday morning: "Ready to scan your kitchen?"' },
  { key: 'planReady', title: 'Meal plan ready', example: 'Sunday: "Your meal plan is ready."' },
  { key: 'dinnerTonight', title: "Tonight's dinner", example: 'Afternoon: "Tonight\'s dinner takes 25 minutes."' },
  { key: 'foodWaste', title: 'Food waste alerts', example: 'Anytime: "Your spinach should probably be used soon."' },
];

export default function NotificationsScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const preferences = useKitchenMemoryStore((s) => s.notificationPreferences);
  const setPreference = useKitchenMemoryStore((s) => s.setNotificationPreference);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>Notifications</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Body color={colors.textSecondary}>
          These are simulated for the MVP — no push notifications are sent yet, but your preferences are saved for when they are.
        </Body>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {NOTIFICATIONS.map((n, idx) => (
            <View
              key={n.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <BodyStrong>{n.title}</BodyStrong>
                <Caption>{n.example}</Caption>
              </View>
              <Switch
                value={preferences[n.key] ?? true}
                onValueChange={(v) => setPreference(n.key, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
              />
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}
