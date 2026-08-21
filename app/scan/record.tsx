import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { SCAN_AREAS } from '../../src/types/scan';
import { Body, BodyStrong, Title } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';

export default function ScanRecordScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const finishRecording = useScanFlowStore((s) => s.finishRecording);
  const startRecording = useScanFlowStore((s) => s.startRecording);
  const areasCoveredHint = useScanFlowStore((s) => s.areasCoveredHint);
  const toggleAreaHint = useScanFlowStore((s) => s.toggleAreaHint);

  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
    if (!micPermission?.granted) requestMicPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  if (!cameraPermission || !micPermission) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState
          emoji="🎥"
          title="Camera access needed"
          message="Kitchen Memory needs your camera and microphone to record a kitchen tour. You can also upload an existing video instead."
          actionLabel="Allow Camera"
          onAction={requestCameraPermission}
        />
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const handleToggleRecord = async () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }
    setIsRecording(true);
    setElapsedSeconds(0);
    startRecording();
    try {
      const video = await cameraRef.current?.recordAsync({ maxDuration: 300 });
      setIsRecording(false);
      if (video?.uri) {
        finishRecording(video.uri, elapsedSeconds || 60, false);
        router.push('/scan/review');
      }
    } catch (e) {
      setIsRecording(false);
    }
  };

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const seconds = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="video" mute={false} />

      <View style={[styles.overlayTop, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancel">
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        {isRecording ? (
          <View style={styles.timerPill}>
            <View style={styles.recDot} />
            <BodyStrong color="#fff">{minutes}:{seconds}</BodyStrong>
          </View>
        ) : (
          <View />
        )}
      </View>

      <View style={[styles.overlayBottom, { paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg }]}>
        <View style={styles.chipsRow}>
          {SCAN_AREAS.map((area) => {
            const covered = areasCoveredHint.includes(area.key);
            return (
              <Pressable
                key={area.key}
                onPress={() => toggleAreaHint(area.key)}
                style={[styles.areaChip, { backgroundColor: covered ? 'rgba(116,147,111,0.85)' : 'rgba(255,255,255,0.18)' }]}
                accessibilityRole="button"
                accessibilityLabel={`${area.label}${covered ? ', covered' : ''}`}
              >
                {covered ? <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} /> : null}
                <Body color="#fff" style={{ fontSize: 13, fontWeight: '600' }}>{area.label}</Body>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleToggleRecord}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          style={styles.recordButtonOuter}
        >
          <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overlayBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', gap: 20 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  areaChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  timerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0453C' },
  recordButtonOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  recordButtonInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#E0453C' },
  recordButtonInnerActive: { width: 30, height: 30, borderRadius: 8 },
});
