import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  haptics?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  disabled,
  loading,
  fullWidth = true,
  style,
  accessibilityHint,
  haptics = true,
}: ButtonProps) {
  const { colors, font, radius, fontSize, fontWeight, spacing } = useTheme();

  // accentDeep keeps primary-button labels above 4.5:1 against cream text.
  const backgroundColor =
    variant === 'primary' ? colors.accentDeep : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.bgSubtle : 'transparent';
  const textColor = variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.textPrimary;
  const borderColor = variant === 'ghost' ? colors.border : 'transparent';

  const paddingVertical = size === 'lg' ? 18 : size === 'sm' ? 10 : 14;
  const fs = size === 'lg' ? fontSize.bodyLg : size === 'sm' ? fontSize.small : fontSize.body;

  const handlePress = () => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      // While loading the label unmounts — keep the name for screen readers.
      accessibilityLabel={loading ? label : undefined}
      accessibilityHint={accessibilityHint}
      onPress={handlePress}
      disabled={disabled || loading}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth: variant === 'ghost' ? 1 : 0,
          paddingVertical,
          borderRadius: radius.pill,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: spacing.xl,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={{ color: textColor, fontSize: fs, fontFamily: font.semibold, fontWeight: fontWeight.semibold, letterSpacing: 0.2 }}
            maxFontSizeMultiplier={1.6}
          >
            {label}
          </Text>
          {trailingIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
