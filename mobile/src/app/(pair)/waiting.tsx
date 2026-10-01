import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { api, type Invite } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { Pulse } from '@/components/brand/motion';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatCode } from '@/constants/links';
import { shareInvite } from '@/lib/shareInvite';
import { useSession } from '@/state/session';
import { usePartnerProfile } from '@/state/usePartner';
import { useTheme } from '@/theme/ThemeProvider';

// Two cases: I shared my code and wait for someone to enter it (no couple yet),
// or I entered their code and wait for them to confirm (pending couple).
export default function Waiting() {
  const { t } = useTheme();
  const { stage, profile, couple } = useSession();
  const partner = usePartnerProfile();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const joined = stage === 'awaitingPartner';

  useEffect(() => {
    if (!joined) api.getOpenInvite().then(setInvite).catch(() => {});
  }, [joined]);

  async function cancel() {
    setBusy(true);
    try {
      if (joined && couple) await api.declineCouple(couple.id);
      else {
        await api.revokeInvite();
        router.replace('/invite');
      }
    } finally {
      setBusy(false);
    }
  }

  const name = partner?.name;

  return (
    <Screen
      footer={
        <>
          {!joined && invite ? <Button label="Nudge again" onPress={() => shareInvite(invite.code)} /> : null}
          <Button kind="ghost" style={{ borderWidth: 0 }} label={joined ? 'Cancel' : 'Cancel invite'} onPress={cancel} loading={busy} />
        </>
      }
    >
      <View style={styles.center}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18 }}>
          <Avatar config={profile?.avatar_config} scale={1.7} />
          {joined && partner ? (
            <Pulse>
              <Avatar config={partner.avatar_config} scale={1.7} />
            </Pulse>
          ) : (
            <Pulse>
              <View style={[styles.slot, { borderColor: t.co }]} />
            </Pulse>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[0, 200, 400].map((d) => (
            <Pulse key={d} duration={1200} delay={d}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.co }} />
            </Pulse>
          ))}
        </View>
        <Text variant="title" style={{ fontSize: 32, textAlign: 'center' }}>
          {joined ? `Waiting for ${name ?? 'your partner'}` : 'Waiting for your person'}
        </Text>
        <Text tone="ink2" style={{ textAlign: 'center', maxWidth: 290 }}>
          {joined ? (
            `${name ?? 'They'} just needs to confirm it’s you. We’ll bring you both in the second they do.`
          ) : (
            <>
              We’ll ping you the second they join.
              {invite ? (
                <>
                  {' '}Your code: <Text style={{ fontFamily: 'Figtree_600SemiBold' }}>{formatCode(invite.code)}</Text>
                </>
              ) : null}
            </>
          )}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  slot: {
    width: 109,
    height: 163,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 2.5,
    borderStyle: 'dashed',
  },
});
