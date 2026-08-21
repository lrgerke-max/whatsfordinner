import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { Body, Title } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';

export default function ScanReviewScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const videoUri = useScanFlowStore((s) => s.videoUri);
  const reset = useScanFlowStore((s) => s.reset);

  const player = useVideoPlayer(videoUri ?? '', (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, padding: spacing.lg, gap: spacing.lg }}>
      <Title>Looking good?</Title>
      <Body color={colors.textSecondary}>Make sure your kitchen tour is clear enough to see what's inside. You can always retake it.</Body>

      <View style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' }}>
        {videoUri ? (
          <VideoView style={{ flex: 1 }} player={player} contentFit="cover" nativeControls />
        ) : null}
      </View>

      <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
        <Button label="Use This Video" onPress={() => router.push('/scan/processing')} />
        <Button
          label="Retake"
          variant="secondary"
          onPress={() => {
            reset();
            router.back();
          }}
        />
      </View>
    </View>
  );
}
