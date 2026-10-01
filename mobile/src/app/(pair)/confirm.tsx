import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarStage } from '@/components/avatar/AvatarStage';
import { Heartbeat } from '@/components/brand/motion';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/state/session';
import { usePartnerProfile } from '@/state/usePartner';
import { useTheme } from '@/theme/ThemeProvider';

// Someone entered my code. Both partners confirm before a couple becomes active.
export default function Confirm() {
  const { t } = useTheme();
  const { couple, profile, refresh } = useSession();
  const partner = usePartnerProfile();
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = partner?.name ?? 'Someone';

  async function act(yes: boolean) {
    if (!couple) return;
    setBusy(yes ? 'yes' : 'no');
    setError(null);
    try {
      if (yes) await api.confirmCouple(couple.id);
      else await api.declineCouple(couple.id);
      await refresh();
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button label={`Yes, link with ${name}`} onPress={() => act(true)} loading={busy === 'yes'} disabled={!partner} />
          <Button kind="ghost" style={{ borderWidth: 0 }} label="That’s not my partner" onPress={() => act(false)} loading={busy === 'no'} />
        </>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <View style={[styles.pill, { backgroundColor: t.pb }]}>
          <Heartbeat />
          <Text variant="caption" color={t.pbInk} style={{ fontFamily: 'Figtree_600SemiBold', fontSize: 14 }}>
            {name} entered your code
          </Text>
        </View>
        <Text variant="title">Link with {name}?</Text>
        <Text tone="ink2">Once you’re linked, only the two of you can ever see your chat, your space and your memories.</Text>
        <AvatarStage height={220} style={styles.stage}>
          <Avatar config={profile?.avatar_config} scale={1.5} />
          {partner ? <Avatar config={partner.avatar_config} scale={1.5} /> : null}
        </AvatarStage>
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
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingLeft: 10, paddingRight: 14, borderRadius: 999 },
  stage: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 18 },
});
