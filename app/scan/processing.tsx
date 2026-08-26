import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { useKitchenMemoryStore } from '../../src/state/store';
import { kitchenScanProcessor, PROCESSING_STEPS } from '../../src/ai';
import { Body, BodyStrong, Title } from '../../src/components/Typography';
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
    // If state was lost (e.g., a page refresh mid-processing), the ephemeral
    // scan store has no video — fail fast instead of animating forever.
    if (hasStarted.current) return;
    if (!videoUri) {
      setFailed(true);
      return;
    }
    hasStarted.current = true;
    setStatus('processing');

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    let navTimer: ReturnType<typeof setTimeout> | undefined;
    let failedPermanently = false;
    const fail = () => {
      failedPermanently = true;
      clearInterval(stepTimer);
      clearTimeout(watchdog);
      setFailed(true);
    };
    // A late success after the watchdog fired must NOT navigate — the user is
    // already looking at the failure screen.
    const watchdog = setTimeout(fail, 45000);
    const clearAll = () => {
      clearInterval(stepTimer);
      clearTimeout(watchdog);
      if (navTimer) clearTimeout(navTimer);
    };

    kitchenScanProcessor
      .analyze({ uri: videoUri, durationSeconds, isDemoVideo }, inventory)
      .then((analysis) => {
        if (failedPermanently) return;
        const minTime = PROCESSING_STEPS.length * STEP_INTERVAL_MS;
        navTimer = setTimeout(() => {
          if (failedPermanently) return;
          clearAll();
          setAnalysis(analysis);
          setStatus('reviewing-results');
          router.replace('/scan/results');
        }, minTime);
      })
      .catch((err) => {
        clearAll();
        console.error('Kitchen scan failed:', err);
        setFailed(true);
      });

    return clearAll;
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
          A few seconds with the demo kitchen — about a minute with a real one.
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
  const { colors, spacing } = useTheme();
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
      {state === 'active' ? <BodyStrong>{label}</BodyStrong> : <Body>{label}</Body>}
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
