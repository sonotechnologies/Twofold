import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarEditor } from '@/components/avatar/AvatarEditor';
import { AvatarStage } from '@/components/avatar/AvatarStage';
import { normalizeAvatar, type AvatarConfig } from '@/components/avatar/avatarOptions';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditAvatar() {
  const { t } = useTheme();
  const { profile, refresh } = useSession();
  const [avatar, setAvatar] = useState<AvatarConfig>(normalizeAvatar(profile?.avatar_config));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.updateProfile({ avatar_config: avatar });
      await refresh();
      router.back();
    } catch {
      setError('Couldn’t save. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll footer={<Button label="Save" onPress={save} loading={saving} />}>
      <View style={{ gap: 14 }}>
        <BackButton />
        <Text variant="title" style={{ fontSize: 32 }}>
          Your avatar
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
