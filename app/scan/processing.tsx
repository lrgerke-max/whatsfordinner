import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { useKitchenMemoryStore } from '../../src/state/store';
import { kitchenScanProcessor, PROCESSING_STEPS } from '../../src/ai';
import { Body, Title } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';

const STEP_INTERVAL_MS = 900;

export default function ScanProcessingScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const hasStarted = useRef(false);

  const videoUri = useScanFlowStore((s) => s.videoUri);
  const durationSeconds = useScanFlowStore((s) => s.durationSeconds);
  const isDemoVideo = useScanFlowStore((s) => s.isDemoVideo);
  const setAnalysis = useScanFlowStore((s) => s.setAnalysis);
  const setStatus = useScanFlowStore((s) => s.setStatus);
  const inventory = useKitchenMemoryStore((s) => s.inventory);

  useEffect(() => {
    if (hasStarted.current || !videoUri) return;
    hasStarted.current = true;
    setStatus('processing');

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    kitchenScanProcessor
      .analyze({ uri: videoUri, durationSeconds, isDemoVideo }, inventory)
      .then((analysis) => {
        const minTime = PROCESSING_STEPS.length * STEP_INTERVAL_MS;
        setTimeout(() => {
          clearInterval(stepTimer);
          setAnalysis(analysis);
          setStatus('reviewing-results');
          router.replace('/scan/results');
        }, minTime);
      })
      .catch(() => {
        clearInterval(stepTimer);
        setFailed(true);
      });

    return () => clearInterval(stepTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUri]);

  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState emoji="😕" title="We couldn't finish your kitchen scan." message="Something interrupted processing. Your existing kitchen memory is untouched." actionLabel="Retry" onAction={() => router.replace('/scan')} />
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Button label="Try Again Later" variant="ghost" onPress={() => router.replace('/(tabs)/kitchen')} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, padding: spacing.xl, justifyContent: 'center', gap: spacing.xxl }}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <PulsingIcon />
        <Title style={{ textAlign: 'center' }}>Remembering your kitchen…</Title>
        <Body color={colors.textSecondary} style={{ textAlign: 'center' }}>
          This usually takes about a minute.
        </Body>
      </View>

      <View style={{ gap: spacing.md }}>
        {PROCESSING_STEPS.map((step, idx) => (
          <StepRow key={step} label={step} state={idx < stepIndex ? 'done' : idx === stepIndex ? 'active' : 'pending'} />
        ))}
      </View>
    </View>
  );
}

function StepRow({ label, state }: { label: string; state: 'done' | 'active' | 'pending' }) {
  const { colors, spacing, fontSize } = useTheme();
  const opacity = useRef(new Animated.Value(state === 'pending' ? 0.35 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: state === 'pending' ? 0.35 : 1, duration: 300, useNativeDriver: true }).start();
  }, [state, opacity]);

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: state === 'done' ? colors.success : state === 'active' ? colors.accent : colors.bgSubtle,
        }}
      >
        {state === 'done' ? <Ionicons name="checkmark" size={14} color={colors.textInverse} /> : null}
      </View>
      <Body style={{ fontSize: fontSize.body, fontWeight: state === 'active' ? '700' : '400' }}>{label}</Body>
    </Animated.View>
  );
}

function PulsingIcon() {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      <Ionicons name="sparkles" size={34} color={colors.accentStrong} />
    </Animated.View>
  );
}
