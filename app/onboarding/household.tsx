import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { useOnboardingStore } from '../../src/state/onboardingStore';
import { DINNER_TIME_OPTIONS, ACTIVITY_LEVEL_OPTIONS } from '../../src/data/options';
import { useTheme } from '../../src/theme/useTheme';
import { OnboardingScaffold } from '../../src/components/OnboardingScaffold';
import { Stepper } from '../../src/components/Stepper';
import { ChipGroup } from '../../src/components/ChipGroup';
import { TextField } from '../../src/components/TextField';
import { Card } from '../../src/components/Card';
import { Body, BodyStrong, Caption, Display } from '../../src/components/Typography';
import { ActivityLevel } from '../../src/types/household';

export default function OnboardingHouseholdScreen() {
  const { spacing, colors } = useTheme();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const setMemberCounts = useOnboardingStore((s) => s.setMemberCounts);
  const updateMember = useOnboardingStore((s) => s.updateMember);

  const adults = draft.members.filter((m) => m.role === 'adult').length;
  const kids = draft.members.length - adults;

  return (
    <OnboardingScaffold step={0} totalSteps={4} ctaLabel="Continue" onNext={() => router.push('/onboarding/preferences')}>
      <Display style={{ fontSize: 30 }}>Tell us about your household.</Display>

      <View style={{ gap: spacing.lg }}>
        <Stepper label="Adults" value={adults} onChange={(v) => setMemberCounts(v, kids)} min={1} max={6} />
        <Stepper label="Kids & Teens" value={kids} onChange={(v) => setMemberCounts(adults, v)} min={0} max={8} />

        <View style={{ gap: spacing.xs }}>
          <Caption>TYPICAL DINNER TIME</Caption>
          <ChipGroup options={DINNER_TIME_OPTIONS} selected={[draft.dinnerTime]} onToggle={(k) => update({ dinnerTime: k })} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <BodyStrong>Household Members</BodyStrong>
        {draft.members.map((member) => (
          <Card key={member.id} style={{ gap: spacing.sm }}>
            <TextField
              label={member.role === 'adult' ? 'Adult name' : 'Kid / teen name'}
              value={member.name}
              onChangeText={(name) => updateMember(member.id, { name })}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' }}>
              <View style={{ width: 90 }}>
                <TextField
                  label="Age"
                  value={member.age ? String(member.age) : ''}
                  onChangeText={(v) => updateMember(member.id, { age: v ? Number(v) : undefined })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Caption>ACTIVITY LEVEL</Caption>
                <ChipGroup
                  options={ACTIVITY_LEVEL_OPTIONS}
                  selected={[member.activityLevel ?? 'moderate']}
                  onToggle={(k) => updateMember(member.id, { activityLevel: k as ActivityLevel })}
                />
              </View>
            </View>
          </Card>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
