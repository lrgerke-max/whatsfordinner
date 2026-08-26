import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';
import { EmptyState } from '../../src/components/EmptyState';

const POLL_INTERVAL_MS = 2000;

function readVideoDuration(objectUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 60;
      resolve(duration);
    };
    video.onerror = () => resolve(60);
  });
}

export default function PhoneUploadScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const finishRecording = useScanFlowStore((s) => s.finishRecording);
  const reset = useScanFlowStore((s) => s.reset);

  const [phoneUrl, setPhoneUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Generated lazily in the effect, not at render: crypto.randomUUID exists
  // only in secure contexts (localhost qualifies, a LAN IP does not), and a
  // render-time throw here would crash the screen the app itself advertises
  // visiting from other machines.
  const tokenRef = useRef<string>('');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    async function setup() {
      try {
        if (typeof crypto?.randomUUID !== 'function') {
          if (!cancelled) {
            setError('This feature needs to run from http://localhost on this computer. Reopen the app from the desktop launcher and try again.');
          }
          return;
        }
        tokenRef.current = crypto.randomUUID();
        const res = await fetch('/api/local-info');
        if (!res.ok) throw new Error('local-info failed');
        const { ip, port } = await res.json();
        const url = `http://${ip}:${port}/phone-upload/${tokenRef.current}`;
        if (cancelled) return;
        setPhoneUrl(url);

        const QRCode = await import('qrcode');
        // Pure black on opaque white — maximum scanner contrast in any theme.
        const dataUrl = await QRCode.toDataURL(url, { margin: 2, width: 240, color: { dark: '#000000', light: '#FFFFFF' } });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setError("Couldn't reach the local server. Make sure you're using the desktop web-app build.");
        return;
      }

      let claiming = false;
      pollTimer = setInterval(async () => {
        // Overlapping callbacks can both see ready:true; only one may claim
        // the single-use upload, and the interval must stay alive until the
        // claim fully succeeds (a mid-transfer failure should keep polling).
        if (claiming) return;
        claiming = true;
        try {
          const statusRes = await fetch(`/api/phone-upload/${tokenRef.current}/status`);
          const { ready } = await statusRes.json();
          if (!ready) return;

          const videoRes = await fetch(`/api/phone-upload/${tokenRef.current}`);
          if (!videoRes.ok) return; // someone else claimed it, or it vanished — keep waiting
          const blob = await videoRes.blob();
          if (blob.size === 0) return;
          const objectUrl = URL.createObjectURL(blob);
          const duration = await readVideoDuration(objectUrl);

          clearInterval(pollTimer);
          if (cancelled) return;
          reset();
          finishRecording(objectUrl, Math.round(duration), false);
          router.replace('/scan/review');
        } catch {
          // transient network hiccup — keep polling
        } finally {
          claiming = false;
        }
      }, POLL_INTERVAL_MS);
    }

    setup();
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const handleCopy = async () => {
    if (!phoneUrl) return;
    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied — the URL is still shown on screen
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState emoji="📱" title="Desktop only" message="Uploading from your phone is for the desktop web app — on your phone, just record directly." actionLabel="Back" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 20 }}>Send from Phone</Title>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        {error ? (
          <Body color={colors.danger} style={{ textAlign: 'center' }}>{error}</Body>
        ) : !qrDataUrl ? (
          <Body color={colors.textSecondary}>Setting up…</Body>
        ) : (
          <>
            <Body color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 320 }}>
              Scan this with your phone's camera to open a page where you can record or pick your kitchen video.
            </Body>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
              <Image source={{ uri: qrDataUrl }} style={{ width: 220, height: 220 }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning }} />
              <Caption>Waiting for your phone…</Caption>
            </View>

            <Pressable onPress={handleCopy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm }} accessibilityRole="button" accessibilityLabel="Copy link">
              <Ionicons name={copied ? 'checkmark' : 'link'} size={16} color={colors.accentStrong} />
              <BodyStrong color={colors.accentStrong}>{copied ? 'Copied!' : 'Or copy the link instead'}</BodyStrong>
            </Pressable>

            <Body color={colors.textTertiary} style={{ textAlign: 'center', fontSize: 13 }}>
              Your phone and computer need to be on the same WiFi network.
            </Body>
          </>
        )}
      </View>
    </View>
  );
}
