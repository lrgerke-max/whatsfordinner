import React from 'react';
import { Text, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';

// Light→dark diagonal per cuisine — the art direction that signals what a
// card is at a glance. Must cover every cuisine in the recipe library;
// anything missing silently degrades to the tan default.
const GRADIENTS: Record<string, [string, string]> = {
  Italian: ['#E9C08C', '#C1552C'],
  Brazilian: ['#8FC08A', '#2E7D4F'],
  Mexican: ['#F3B562', '#C1552C'],
  American: ['#93AFC7', '#4C7A93'],
  Asian: ['#E3A6C1', '#A24B5E'],
  Mediterranean: ['#A9C79E', '#5C7A5E'],
  Indian: ['#E8B23F', '#B5651D'],
  Chinese: ['#E88A8A', '#B03A34'],
  Japanese: ['#9AA8D8', '#3E4A78'],
  Korean: ['#E89A9A', '#A64B4B'],
  Thai: ['#9FD8B8', '#2E7D5F'],
  Greek: ['#9ECBE8', '#2E6E93'],
  French: ['#B8C4DC', '#4C5A82'],
  MiddleEastern: ['#E8C08A', '#A6683A'],
  default: ['#D8C7AE', '#9A8360'],
};

interface RecipeImageProps {
  emoji: string;
  cuisine?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}

export function RecipeImage({ emoji, cuisine, size = 96, style, radius }: RecipeImageProps) {
  const { radius: themeRadius } = useTheme();
  const colors = (cuisine && GRADIENTS[cuisine]) || GRADIENTS.default;
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius ?? themeRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {/* Decorative: the parent card supplies the meaningful label; the emoji
          itself would otherwise be announced ("taco", "flag of Japan"). */}
      <View accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden>
        <Text aria-hidden maxFontSizeMultiplier={1} style={{ fontSize: size * 0.42 }}>{emoji}</Text>
      </View>
    </LinearGradient>
  );
}
