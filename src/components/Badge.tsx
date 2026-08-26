import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Caption } from './Typography';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, radius, spacing } = useTheme();
  // Strong foregrounds keep small badge text at WCAG AA contrast on soft bg.
  const toneMap: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.bgSubtle, fg: colors.textSecondary },
    success: { bg: colors.successSoft, fg: colors.successStrong },
    warning: { bg: colors.warningSoft, fg: colors.warningStrong },
    danger: { bg: colors.dangerSoft, fg: colors.dangerStrong },
    info: { bg: colors.infoSoft, fg: colors.infoStrong },
    accent: { bg: colors.accentSoft, fg: colors.accentStrong },
  };
  const { bg, fg } = toneMap[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm, alignSelf: 'flex-start' }}>
      <Caption color={fg}>
        {label}
      </Caption>
    </View>
  );
}
