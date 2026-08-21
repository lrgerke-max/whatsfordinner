import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { TextField } from './TextField';
import { Chip } from './Chip';
import { Button } from './Button';

interface TagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function TagInput({ values, onChange, placeholder }: TagInputProps) {
  const { spacing } = useTheme();
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  };

  return (
    <View style={{ gap: spacing.xs }}>
      {values.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {values.map((v) => (
            <Chip key={v} label={`${v}  ✕`} selected onPress={() => onChange(values.filter((x) => x !== v))} />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <TextField placeholder={placeholder} value={draft} onChangeText={setDraft} onSubmitEditing={addTag} returnKeyType="done" />
        </View>
        <Button label="Add" variant="secondary" fullWidth={false} size="sm" onPress={addTag} />
      </View>
    </View>
  );
}
