import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}

export function Chip({ label, selected, onPress, emoji, tone = 'default' }: ChipProps) {
  const { colors, radius, fontSize, fontWeight, spacing } = useTheme();

  const toneColors = {
    default: { bg: colors.accentSoft, fg: colors.accentStrong },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  }[tone];

  const bg = selected ? toneColors.bg : colors.bgSubtle;
  const fg = selected ? toneColors.fg : colors.textSecondary;
  const borderColor = selected ? toneColors.fg : colors.border;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderRadius: radius.pill,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={{ color: fg, fontSize: fontSize.small, fontWeight: fontWeight.medium }} maxFontSizeMultiplier={1.6}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignSelf: 'flex-start' },
});
