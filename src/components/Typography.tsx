import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props extends TextProps {
  children: React.ReactNode;
  color?: string;
}

/** Resolves the fontSize a screen overrode (if any) so lineHeight can follow it. */
function overriddenFontSize(style: TextProps['style'], fallback: number): number {
  const flat = StyleSheet.flatten(style);
  const size = typeof flat?.fontSize === 'number' ? flat.fontSize : fallback;
  return size;
}

/** Big editorial statements — Poppins Bold, tight tracking. */
export function Display({ style, color, children, ...rest }: Props) {
  const { colors, font, fontSize, fontWeight } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.5}
      style={[{ fontSize: fontSize.display, fontFamily: font.bold, fontWeight: fontWeight.bold, color: color ?? colors.textPrimary, letterSpacing: -1.2 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Headline({ style, color, children, ...rest }: Props) {
  const { colors, font, fontSize, fontWeight } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.5}
      style={[{ fontSize: fontSize.headline, fontFamily: font.bold, fontWeight: fontWeight.bold, color: color ?? colors.textPrimary, letterSpacing: -0.8 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Title({ style, color, children, ...rest }: Props) {
  const { colors, font, fontSize, fontWeight } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={1.6}
      style={[{ fontSize: fontSize.title, fontFamily: font.semibold, fontWeight: fontWeight.semibold, color: color ?? colors.textPrimary, letterSpacing: -0.4 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Body({ style, color, children, ...rest }: Props) {
  const { colors, font, fontSize, fontWeight } = useTheme();
  // lineHeight tracks the EFFECTIVE size: screens override fontSize for hero
  // emojis and compact meta text, and a fixed base lineHeight turned those
  // into overlapping glyphs or double-spaced paragraphs.
  const size = overriddenFontSize(style, fontSize.body);
  return (
    <Text maxFontSizeMultiplier={1.8} style={[{ fontSize: size, fontFamily: font.regular, fontWeight: fontWeight.regular, color: color ?? colors.textPrimary, lineHeight: Math.round(size * 1.45) }, style]} {...rest}>
      {children}
    </Text>
  );
}

export function BodyStrong({ style, color, children, ...rest }: Props) {
  const { colors, font, fontSize, fontWeight } = useTheme();
  const size = overriddenFontSize(style, fontSize.body);
  return (
    <Text maxFontSizeMultiplier={1.8} style={[{ fontSize: size, fontFamily: font.semibold, fontWeight: fontWeight.semibold, color: color ?? colors.textPrimary, lineHeight: Math.round(size * 1.35) }, style]} {...rest}>
      {children}
    </Text>
  );
}

/** Small labels and eyebrows — Poppins SemiBold with a whisper of tracking. */
export function Caption({ style, color, children, ...rest }: Props) {
  const { colors, font, fontSize, fontWeight } = useTheme();
  return (
    <Text maxFontSizeMultiplier={1.8} style={[{ fontSize: fontSize.caption, fontFamily: font.semibold, fontWeight: fontWeight.semibold, color: color ?? colors.textSecondary, letterSpacing: 0.2 }, style]} {...rest}>
      {children}
    </Text>
  );
}
