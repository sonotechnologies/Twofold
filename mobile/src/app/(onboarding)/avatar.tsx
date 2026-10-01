import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, ApiError } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarEditor } from '@/components/avatar/AvatarEditor';
import { AvatarStage } from '@/components/avatar/AvatarStage';
import { defaultAvatar, type AvatarConfig } from '@/components/avatar/avatarOptions';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { StepDots } from '@/components/ui/StepDots';
import { Text } from '@/components/ui/Text';
import { useOnboardingDraft } from '@/state/onboardingDraft';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

export default function AvatarStep() {
  const { t } = useTheme();
  const { refresh } = useSession();
  const { draft, update } = useOnboardingDraft();
  const [avatar, setAvatar] = useState<AvatarConfig>(draft.avatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(config: AvatarConfig) {
    setSaving(true);
    setError(null);
    try {
      update({ avatar: config });
      await api.createProfile({ name: draft.name, birthdate: draft.birthdate, avatar_config: config });
      await refresh(); // the gate moves on to pairing
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We couldn’t save your profile. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll style={{ paddingTop: 8 }} footer={<Button label="Looks like me" onPress={() => save(avatar)} loading={saving} />}>
      <View style={{ gap: 14 }}>
        <View style={styles.top}>
          <BackButton />
          <StepDots count={3} active={2} />
          <Pressable accessibilityRole="button" onPress={() => save(defaultAvatar)} hitSlop={10} style={{ width: 44, alignItems: 'flex-end' }}>
            <Text variant="caption" tone="mu" style={{ fontSize: 15, fontFamily: 'Figtree_600SemiBold' }}>
              Skip
            </Text>
          </Pressable>
        </View>

        <Text variant="title" style={{ fontSize: 32 }}>
          Make your avatar
        </Text>

        <AvatarStage height={180} style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}>
          <Avatar {...avatar} scale={1.6} />
        </AvatarStage>

        <AvatarEditor value={avatar} onChange={setAvatar} />

        {error ? (
          <Text variant="caption" color={t.co}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
