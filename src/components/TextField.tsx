import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Caption } from './Typography';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const { colors, radius, spacing, fontSize } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Caption>{label}</Caption> : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        maxFontSizeMultiplier={1.6}
        style={[
          {
            backgroundColor: colors.bgSubtle,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 14,
            fontSize: fontSize.body,
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
