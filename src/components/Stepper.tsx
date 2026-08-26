import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { BodyStrong, Caption } from './Typography';

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function Stepper({ label, value, onChange, min = 0, max = 10 }: StepperProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Caption>{label.toUpperCase()}</Caption>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgSubtle, borderRadius: radius.pill, paddingHorizontal: spacing.xs }}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: value <= min ? 0.35 : pressed ? 0.6 : 1 })}
        >
          <Ionicons name="remove" size={18} color={colors.textPrimary} />
        </Pressable>
        <BodyStrong accessibilityLabel={`${label} count`} accessibilityValue={{ min, max, now: value }} style={{ minWidth: 20, textAlign: 'center' }}>{value}</BodyStrong>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: value >= max ? 0.35 : pressed ? 0.6 : 1 })}
        >
          <Ionicons name="add" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}
