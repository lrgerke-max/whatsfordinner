import React, { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Caption } from './Typography';

interface TextFieldProps extends TextInputProps {
  label?: string;
}

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const { colors, font, radius, spacing, fontSize } = useTheme();
  // Visible focus affordance: the global web focus-ring CSS targets role'd
  // controls, not inputs, so keyboard users had no indicator here.
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Caption>{label}</Caption> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        maxFontSizeMultiplier={1.6}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        style={[
          {
            backgroundColor: colors.bgSubtle,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 14,
            fontSize: fontSize.body,
            fontFamily: font.regular,
            color: colors.textPrimary,
            borderWidth: 1,
            borderColor: focused ? colors.accentStrong : colors.border,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
