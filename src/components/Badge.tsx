import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Caption } from './Typography';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { colors, radius, spacing } = useTheme();
  const toneMap: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: colors.bgSubtle, fg: colors.textSecondary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    accent: { bg: colors.accentSoft, fg: colors.accentStrong },
  };
  const { bg, fg } = toneMap[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.sm, alignSelf: 'flex-start' }}>
      <Caption color={fg} style={{ fontWeight: '700' }}>
        {label}
      </Caption>
    </View>
  );
}
