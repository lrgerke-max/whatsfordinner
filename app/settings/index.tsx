import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { Card } from '../../src/components/Card';
import { Body, Caption, Title } from '../../src/components/Typography';

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: 'Household',
      rows: [
        { icon: 'home-outline', label: 'Household & Members', onPress: () => router.push('/(tabs)/family') },
        { icon: 'restaurant-outline', label: 'Food Preferences', onPress: () => router.push('/(tabs)/family') },
        { icon: 'cart-outline', label: 'Grocery Stores & Budget', onPress: () => router.push('/edit-shopping') },
      ],
    },
    {
      title: 'App',
      rows: [
        { icon: 'sparkles-outline', label: 'AI Settings', onPress: () => router.push('/settings/ai') },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => router.push('/settings/notifications') },
        { icon: 'shield-checkmark-outline', label: 'Privacy', onPress: () => router.push('/settings/privacy') },
        { icon: 'download-outline', label: 'Data Export & Delete', onPress: () => router.push('/settings/data') },
      ],
    },
    {
      title: 'Account',
      rows: [{ icon: 'person-circle-outline', label: 'Account', onPress: () => router.push('/settings/account') }],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 20 }}>Settings</Title>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        {sections.map((section) => (
          <View key={section.title} style={{ gap: spacing.sm }}>
            <Caption>{section.title.toUpperCase()}</Caption>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {section.rows.map((row, idx) => (
                <Pressable
                  key={row.label}
                  onPress={row.onPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.md,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={row.label}
                >
                  <Ionicons name={row.icon} size={20} color={colors.textSecondary} />
                  <Body style={{ flex: 1 }}>{row.label}</Body>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
