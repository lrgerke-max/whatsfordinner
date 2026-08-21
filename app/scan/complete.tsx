import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useKitchenMemoryStore } from '../../src/state/store';
import { Body, Title } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';

export default function ScanCompleteScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const scan = useKitchenMemoryStore((s) => s.scans[0]);
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  const parts: string[] = [];
  if (scan) {
    if (scan.newItemCount > 0) parts.push(`${scan.newItemCount} new`);
    if (scan.updatedItemCount > 0) parts.push(`${scan.updatedItemCount} updated`);
    if (scan.removedItemCount > 0) parts.push(`${scan.removedItemCount} used up`);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
      <Animated.View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.successSoft,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale }],
          opacity,
        }}
      >
        <Ionicons name="checkmark" size={44} color={colors.success} />
      </Animated.View>
      <Title style={{ textAlign: 'center' }}>Your kitchen memory is up to date.</Title>
      {parts.length > 0 ? <Body color={colors.textSecondary} style={{ textAlign: 'center' }}>{parts.join(' · ')}</Body> : null}
      <Body color={colors.textSecondary} style={{ textAlign: 'center' }}>We've also refreshed this week's meal plan and grocery list.</Body>

      <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.md }}>
        <Button label="See This Week's Meals" onPress={() => router.replace('/(tabs)/plan')} />
        <Button label="Back to Kitchen" variant="secondary" onPress={() => router.replace('/(tabs)/kitchen')} />
      </View>
    </View>
  );
}
