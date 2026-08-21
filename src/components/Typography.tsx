import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props extends TextProps {
  children: React.ReactNode;
  color?: string;
}

export function Display({ style, color, children, ...rest }: Props) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.5}
      style={[{ fontSize: fontSize.display, fontWeight: fontWeight.heavy, color: color ?? colors.textPrimary, letterSpacing: -0.5 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Headline({ style, color, children, ...rest }: Props) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={1.5}
      style={[{ fontSize: fontSize.headline, fontWeight: fontWeight.bold, color: color ?? colors.textPrimary, letterSpacing: -0.3 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Title({ style, color, children, ...rest }: Props) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <Text maxFontSizeMultiplier={1.6} style={[{ fontSize: fontSize.title, fontWeight: fontWeight.bold, color: color ?? colors.textPrimary }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Body({ style, color, children, ...rest }: Props) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <Text maxFontSizeMultiplier={1.8} style={[{ fontSize: fontSize.body, fontWeight: fontWeight.regular, color: color ?? colors.textPrimary, lineHeight: fontSize.body * 1.4 }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function BodyStrong({ style, color, children, ...rest }: Props) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <Text maxFontSizeMultiplier={1.8} style={[{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: color ?? colors.textPrimary }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function Caption({ style, color, children, ...rest }: Props) {
  const { colors, fontSize, fontWeight } = useTheme();
  return (
    <Text maxFontSizeMultiplier={1.8} style={[{ fontSize: fontSize.caption, fontWeight: fontWeight.medium, color: color ?? colors.textSecondary }, style]} {...rest}>
      {children}
    </Text>
  );
}
