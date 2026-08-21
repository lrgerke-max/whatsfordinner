import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../src/theme/useTheme';
import { useScanFlowStore } from '../../src/state/scanFlowStore';
import { SCAN_AREAS } from '../../src/types/scan';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Body, BodyStrong, Caption, Title } from '../../src/components/Typography';

export default function ScanIntroScreen() {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const finishRecording = useScanFlowStore((s) => s.finishRecording);
  const reset = useScanFlowStore((s) => s.reset);

  const handleUseDemo = () => {
    reset();
    finishRecording('demo://kitchen-tour', 180, true);
    router.push('/scan/processing');
  };

  const handleUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
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
                <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>{idx + 1}</Caption>
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
          <Button label="Record Kitchen" icon={<Ionicons name="videocam" size={18} color={colors.textInverse} />} onPress={() => router.push('/scan/record')} />
          <Button label="Upload a Video" variant="secondary" onPress={handleUpload} />
          <Pressable onPress={handleUseDemo} style={{ alignSelf: 'center', marginTop: spacing.xs, paddingVertical: spacing.sm }} hitSlop={8}>
            <Caption color={colors.accentStrong} style={{ fontWeight: '700' }}>✨ Try it with a demo video</Caption>
          </Pressable>
        </View>

        <View style={{ backgroundColor: colors.bgSubtle, borderRadius: radius.md, padding: spacing.md, gap: 4 }}>
          <Caption style={{ fontWeight: '700' }}>Your privacy</Caption>
          <Body color={colors.textSecondary} style={{ fontSize: 14 }}>
            Kitchen videos are used to identify food in your home. We keep the structured list of what you have, not the raw video, longer than needed to process it.
          </Body>
        </View>
      </ScrollView>
    </View>
  );
}
