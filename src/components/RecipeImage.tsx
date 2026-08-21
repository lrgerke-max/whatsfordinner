import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/useTheme';

const GRADIENTS: Record<string, [string, string]> = {
  Italian: ['#E9C08C', '#C1552C'],
  Brazilian: ['#8FC08A', '#2E7D4F'],
  Mexican: ['#F3B562', '#C1552C'],
  American: ['#93AFC7', '#4C7A93'],
  Asian: ['#E3A6C1', '#A24B5E'],
  Mediterranean: ['#A9C79E', '#5C7A5E'],
  Indian: ['#E8B23F', '#B5651D'],
  default: ['#D8C7AE', '#9A8360'],
};

interface RecipeImageProps {
  emoji: string;
  cuisine?: string;
  size?: number;
  style?: ViewStyle;
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
      <View accessible={false}>
        <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
      </View>
    </LinearGradient>
  );
}
