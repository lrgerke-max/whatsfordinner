import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Body, Title } from './Typography';
import { Button } from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm }}>
      <Body style={{ fontSize: 44 }}>{emoji}</Body>
      <Title style={{ textAlign: 'center' }}>{title}</Title>
      <Body style={{ textAlign: 'center', opacity: 0.7 }}>{message}</Body>
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md, minWidth: 200 }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
