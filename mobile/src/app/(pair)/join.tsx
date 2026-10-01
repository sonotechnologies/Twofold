import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { api, ApiError, type InvitePreview } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarStage } from '@/components/avatar/AvatarStage';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { pairingIntent } from '@/state/intent';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

const errors: Record<string, string> = {
  own_code: 'That’s your own code. Send it to your partner instead.',
  already_paired: 'One of you is already linked with someone on Twofold.',
  rate_limited: 'Too many tries. Wait a little and try again.',
};

export default function Join() {
  const { t } = useTheme();
  const { profile, refresh } = useSession();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState((params.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pairingIntent.setJoin(false);
  }, []);

  async function find() {
    setBusy(true);
    setError(null);
    try {
      const p = await api.previewInvite(code);
      if (!p) setError('That code isn’t valid or has expired. Ask for a fresh one.');
      setPreview(p);
    } catch (e) {
      setError((e instanceof ApiError && e.code && errors[e.code]) || 'Something went wrong. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  async function link() {
    setBusy(true);
    setError(null);
    try {
      const c = await api.redeemInvite(code);
      if (!c) {
        setPreview(null);
        setError('That code isn’t valid any more. Ask for a fresh one.');
        return;
      }
      await refresh(); // gate moves to "waiting for them to confirm"
    } catch (e) {
      setError((e instanceof ApiError && e.code && errors[e.code]) || 'Something went wrong. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      scroll
      footer={
        preview ? (
          <>
            <Button label={`Link with ${preview.inviter_name}`} onPress={link} loading={busy} />
            <Button kind="ghost" style={{ borderWidth: 0 }} label="That’s not them" onPress={() => { setPreview(null); setCode(''); }} />
          </>
        ) : (
          <Button label="Find my person" onPress={find} loading={busy} disabled={code.length !== 6} />
        )
      }
    >
      <View style={{ gap: 24 }}>
        <BackButton />
        <View style={{ gap: 10 }}>
          <Text variant="title">{preview ? `Is this ${preview.inviter_name}?` : 'Enter their code'}</Text>
          <Text tone="ink2">
            {preview ? 'Once you link, only the two of you can ever see your space.' : 'Your partner can find it on their Twofold invite screen.'}
          </Text>
        </View>

        {preview ? (
          <AvatarStage height={220} style={styles.stage}>
            <Avatar config={profile?.avatar_config} scale={1.5} />
            <Avatar config={preview.inviter_avatar} scale={1.5} />
          </AvatarStage>
        ) : (
          <CodeInput kind="code" value={code} onChange={setCode} autoFocus separatorAfter={3} />
        )}

        {error ? (
          <Text variant="caption" color={t.co} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 18 },
});
