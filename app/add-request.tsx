import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../src/theme/useTheme';
import { useKitchenMemoryStore } from '../src/state/store';
import { startOfWeek, addDays } from '../src/utils/date';
import { Title, Body, Caption } from '../src/components/Typography';
import { Chip } from '../src/components/Chip';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';

const CRAVING_CHIPS: { emoji: string; label: string; text: string }[] = [
  { emoji: '🌮', label: 'Tacos', text: 'Taco night!' },
  { emoji: '🍕', label: 'Pizza', text: 'Pizza night please!' },
  { emoji: '🍝', label: 'Pasta', text: 'Pasta for dinner' },
  { emoji: '🍔', label: 'Burgers', text: 'Burgers on the grill' },
  { emoji: '🥞', label: 'Breakfast', text: 'Breakfast for dinner' },
  { emoji: '🍜', label: 'Noodle bowl', text: 'Ramen or noodle bowls' },
];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddRequestScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ memberId?: string | string[] }>();
  const household = useKitchenMemoryStore((s) => s.household);
  const addSpecialRequest = useKitchenMemoryStore((s) => s.addSpecialRequest);

  const paramMemberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const initialMemberId = household.members.some((m) => m.id === paramMemberId) ? paramMemberId : undefined;
  const [memberId, setMemberId] = useState<string | undefined>(initialMemberId);
  const [text, setText] = useState('');
  // -1 = any night; otherwise index into this week's Mon..Sun.
  const [preferredDayIndex, setPreferredDayIndex] = useState(-1);

  const canSave = Boolean(memberId) && text.trim().length > 0;

  const handleSave = () => {
    if (!memberId || !text.trim()) return;
    const preferredDate =
      preferredDayIndex >= 0 ? addDays(startOfWeek(), preferredDayIndex) : undefined;
    addSpecialRequest({ memberId, text, preferredDate });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.textSecondary} />
        </Pressable>
        <Title style={{ fontSize: 18 }}>What are you craving?</Title>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Body>Who's asking for it?</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {household.members.map((member) => (
              <Chip
                key={member.id}
                label={member.name}
                emoji={member.role === 'adult' ? undefined : '🙌'}
                selected={memberId === member.id}
                onPress={() => setMemberId(member.id === memberId ? undefined : member.id)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Body>Quick picks</Body>
          <Caption>Tap one to fill in the request — edit it if you like.</Caption>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {CRAVING_CHIPS.map((chip) => (
              <Chip
                key={chip.label}
                label={chip.label}
                emoji={chip.emoji}
                selected={text.trim() === chip.text}
                onPress={() => setText(chip.text)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <TextField
            label="Your request"
            placeholder="e.g. Can we have taco night this week?"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
            returnKeyType="done"
            accessibilityLabel="Request text"
          />
          <Caption>Tell us the dish or the vibe — we'll work it into this week's plan if we can.</Caption>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Body>Any night you're hoping for?</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Chip label="Any night" selected={preferredDayIndex === -1} onPress={() => setPreferredDayIndex(-1)} />
            {WEEKDAY_LABELS.map((label, idx) => (
              <Chip
                key={label}
                label={label}
                selected={preferredDayIndex === idx}
                onPress={() => setPreferredDayIndex(idx)}
              />
            ))}
          </View>
        </View>

        <Button label={canSave ? 'Add Request' : 'Pick who and what'} disabled={!canSave} onPress={handleSave} />
      </ScrollView>
    </View>
  );
}
