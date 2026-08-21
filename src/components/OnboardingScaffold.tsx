import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../theme/useTheme';
import { Button } from './Button';

interface OnboardingScaffoldProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  ctaLabel: string;
  onNext: () => void;
  ctaDisabled?: boolean;
  showBack?: boolean;
}

export function OnboardingScaffold({ step, totalSteps, children, ctaLabel, onNext, ctaDisabled, showBack = true }: OnboardingScaffoldProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        {showBack ? (
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step ? colors.accent : colors.border,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.sm }}>
        <Button label={ctaLabel} onPress={onNext} disabled={ctaDisabled} />
      </View>
    </View>
  );
}
