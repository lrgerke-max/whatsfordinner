import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Chip } from './Chip';

interface Option {
  key: string;
  label: string;
  emoji?: string;
}

interface ChipGroupProps {
  options: Option[];
  selected: string[];
  onToggle: (key: string) => void;
}

export function ChipGroup({ options, selected, onToggle }: ChipGroupProps) {
  const { spacing } = useTheme();
  return (
    <View
      accessibilityLabel={options.length > 0 ? `Options, ${selected.length} of ${options.length} selected` : undefined}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}
    >
      {options.map((opt) => (
        <Chip key={opt.key} label={opt.label} emoji={opt.emoji} selected={selected.includes(opt.key)} onPress={() => onToggle(opt.key)} />
      ))}
    </View>
  );
}
