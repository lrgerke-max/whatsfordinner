import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { DEPARTMENT_LABEL, formatIngredientQuantity } from '../src/utils/labels';
import { Body, BodyStrong, Caption, Title } from '../src/components/Typography';
import { EmptyState } from '../src/components/EmptyState';

/**
 * Send-to-Phone: shares the current grocery list to any phone on the same
 * WiFi via a QR code — no app, no account. The list lives in the local
 * server's memory for 10 minutes and never touches the internet.
 */
export default function SendListScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const household = useKitchenMemoryStore((s) => s.household);
  const groceryList = useKitchenMemoryStore((s) => s.groceryList);

  const [phoneUrl, setPhoneUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;

    async function setup() {
      try {
        // randomUUID exists only in secure contexts (localhost qualifies, a
        // LAN IP does not) — detect it and fail with the friendly error
        // instead of throwing before the catch can run.
        if (typeof crypto?.randomUUID !== 'function') {
          if (!cancelled) {
            setError('This feature needs to run from http://localhost on this computer. Reopen the app from the desktop launcher and try again.');
          }
          return;
        }
        const token = crypto.randomUUID();
        const infoRes = await fetch('/api/local-info');
        if (!infoRes.ok) throw new Error('local-info failed');
        const { ip, port } = await infoRes.json();
        if (cancelled) return;

        // Build the plain payload here so the phone page stays dumb. Prices
        // are intentionally omitted on the phone page.
        const items = (groceryList?.items ?? []).map((item) => ({
          name: item.name,
          quantity: formatIngredientQuantity(item.quantity, item.unit),
          checked: item.checked,
        }));
        const payload = {
          meta: `${household.name} · week of ${groceryList?.weekStartDate ?? ''}\n${items.filter((i) => !i.checked).length} things to buy`,
          items,
        };

        const post = await fetch(`/api/shopping-list/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!post.ok) throw new Error('send failed');

        const url = `http://${ip}:${port}/shopping-list/${token}`;
        if (!cancelled) setPhoneUrl(url);

        const QRCode = await import('qrcode');
        // Pure black on opaque white — maximum scanner contrast in any theme.
        const dataUrl = await QRCode.toDataURL(url, { margin: 2, width: 240, color: { dark: '#000000', light: '#FFFFFF' } });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setError("Couldn't reach the local server. Make sure you're using the desktop web-app build.");
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!phoneUrl) return;
    try {
      await navigator.clipboard.writeText(phoneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard permission denied — URL still visible on screen
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState emoji="📱" title="Desktop only" message="Sending the list to a phone works from the desktop web app." actionLabel="Back" onAction={() => router.back()} />
      </View>
    );
  }

  if (!groceryList || groceryList.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <EmptyState emoji="🛒" title="Nothing to send" message="Your grocery list is empty — there's nothing to put on your phone yet." actionLabel="Back" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 20 }}>Send List to Phone</Title>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        {error ? (
          <Body color={colors.danger} style={{ textAlign: 'center' }}>{error}</Body>
        ) : !qrDataUrl ? (
          <Body color={colors.textSecondary}>Preparing your list…</Body>
        ) : (
          <>
            <Body color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 320 }}>
              Scan this with your phone and your shopping list opens in its browser — checked-off items stay crossed out.
            </Body>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
              <Image source={{ uri: qrDataUrl }} style={{ width: 220, height: 220 }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning }} />
              <Caption>The link works for 10 minutes, on your WiFi only.</Caption>
            </View>

            <Pressable onPress={handleCopy} accessibilityRole="button" accessibilityLabel="Copy link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm }}>
              <Ionicons name={copied ? 'checkmark' : 'link'} size={16} color={colors.accentStrong} />
              <BodyStrong color={colors.accentStrong}>{copied ? 'Copied!' : 'Or copy the link instead'}</BodyStrong>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
