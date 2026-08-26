import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  emoji?: string;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  accessibilityLabel?: string;
}

export function Chip({ label, selected, onPress, emoji, tone = 'default', accessibilityLabel }: ChipProps) {
  const { colors, font, radius, fontSize, fontWeight, spacing } = useTheme();

  const toneColors = {
    default: { bg: colors.accentSoft, fg: colors.accentStrong },
    danger: { bg: colors.dangerSoft, fg: colors.dangerStrong },
    success: { bg: colors.successSoft, fg: colors.successStrong },
    warning: { bg: colors.warningSoft, fg: colors.warningStrong },
  }[tone];

  const bg = selected ? toneColors.bg : colors.bgSubtle;
  const fg = selected ? toneColors.fg : colors.textSecondary;
  // border (cream300) was nearly invisible against bgSubtle — use the
  // stronger token so unselected chips read as tappable boundaries.
  const borderColor = selected ? toneColors.fg : colors.borderStrong;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
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
      <Text style={{ color: fg, fontSize: fontSize.small, fontFamily: font.medium, fontWeight: fontWeight.medium }} maxFontSizeMultiplier={1.6}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignSelf: 'flex-start' },
});
