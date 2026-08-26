import React, { useRef } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { useKitchenMemoryStore } from '../../src/state/store';
import { confirmAction } from '../../src/utils/confirm';
import { SCAN_AREAS } from '../../src/types/scan';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';

export default function ScanIntroScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const finishRecording = useScanFlowStore((s) => s.finishRecording);
  const reset = useScanFlowStore((s) => s.reset);
  const loadDemoData = useKitchenMemoryStore((s) => s.loadDemoData);
  // Double-taps push duplicate screens onto the stack; one lock per visit.
  const navLockRef = useRef(false);

  const beginNavigation = (): boolean => {
    if (navLockRef.current) return false;
    navLockRef.current = true;
    return true;
  };

  const openRecordScreen = () => {
    if (!beginNavigation()) return;
    router.push('/scan/record');
  };

  const openPhoneUpload = () => {
    if (!beginNavigation()) return;
    router.push('/scan/phone-upload');
  };

  const handleUseDemo = () => {
    if (!beginNavigation()) return;
    // loadDemoData replaces the ENTIRE store (household, inventory, plan,
    // ratings, history) with the seed — for a real user that's silent data
    // loss behind an innocuous-looking demo link. Make it deliberate.
    confirmAction(
      'Reset to the demo household?',
      'This replaces your real household, kitchen, and meal plan with the demo data. It cannot be undone.',
      'Use demo data',
      () => {
        // Always start the demo scan from the seeded household so repeated runs
        // produce identical, rehearsed results (a first scan consumes the seed's
        // "used up" items and would flatten every later run).
        reset();
        loadDemoData();
        finishRecording('demo://kitchen-tour', 180, true);
        router.push('/scan/processing');
      },
      true,
      // Declined: release the nav lock so the demo can be re-attempted. (On
      // native the alert is async — releasing here, not below, is what stops
      // a second tap from stacking a second dialog.)
      () => {
        navLockRef.current = false;
      }
    );
  };

  const handleUpload = async () => {
    if (!beginNavigation()) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      navLockRef.current = false;
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) {
      navLockRef.current = false;
      return;
    }
    const asset = result.assets[0];
    reset();
    finishRecording(asset.uri, asset.duration ? Math.round(asset.duration / 1000) : 120, false);
    router.push('/scan/review');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.xs }}>
          <Title style={{ fontSize: 30 }}>Walk through your kitchen like you're giving us a tour.</Title>
        </View>

        <Card style={{ gap: spacing.md }}>
          {SCAN_AREAS.map((area, idx) => (
            <View key={area.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Caption color={colors.accentStrong}>{idx + 1}</Caption>
              </View>
              <BodyStrong>
                {area.key === 'refrigerator' && 'Open the refrigerator'}
                {area.key === 'freezer' && 'Open the freezer'}
                {area.key === 'pantry' && 'Show your pantry'}
                {area.key === 'cabinets' && 'Show your cabinets'}
                {area.key === 'countertops' && 'Show your countertops'}
              </BodyStrong>
            </View>
          ))}
          <Body color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
            Don't worry about being perfect — or doing it in this order.
          </Body>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button label="Record Kitchen" icon={<Ionicons name="videocam" size={18} color={colors.textInverse} />} onPress={openRecordScreen} />
          <Button label="Upload a Video" variant="secondary" onPress={handleUpload} />
          {Platform.OS === 'web' ? (
            <Button
              label="Send from Phone"
              variant="secondary"
              icon={<Ionicons name="qr-code-outline" size={18} color={colors.textPrimary} />}
              onPress={openPhoneUpload}
            />
          ) : null}
          <Pressable
            onPress={handleUseDemo}
            style={{ alignSelf: 'center', marginTop: spacing.xs, paddingVertical: spacing.sm }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Try it with a demo video"
          >
            <Caption color={colors.accentStrong}>✨ Try it with a demo video</Caption>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.bgSubtle, borderRadius: radius.md, padding: spacing.md, gap: 4 }}>
          <Caption>Your privacy</Caption>
          <Body color={colors.textSecondary} style={{ fontSize: 14 }}>
            Kitchen videos are used only to identify food in your home. We keep the structured list of what you have — not the raw video.
          </Body>
        </View>
      </ScrollView>
    </View>
  );
}
