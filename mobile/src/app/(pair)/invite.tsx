import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { api, ApiError, type Invite } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { formatCode } from '@/constants/links';
import { shareInvite, shareOnWhatsApp } from '@/lib/shareInvite';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

export default function InviteScreen() {
  const { t } = useTheme();
  const { profile, signOut } = useSession();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const open = await api.getOpenInvite();
        setInvite(open ?? (await api.createInvite()));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'We couldn’t make your code. Check your connection.');
      }
    })();
  }, []);

  async function copy() {
    if (!invite) return;
    await Clipboard.setStringAsync(invite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function send(how: 'whatsapp' | 'share') {
    if (!invite) return;
    await (how === 'whatsapp' ? shareOnWhatsApp(invite.code) : shareInvite(invite.code));
    router.push('/waiting');
  }

  return (
    <Screen
      scroll
      footer={
        <>
          <Button kind="whatsapp" label="Send on WhatsApp" onPress={() => send('whatsapp')} disabled={!invite} />
          <Button kind="secondary" label="Share invite link" onPress={() => send('share')} disabled={!invite} />
        </>
      }
    >
      <View style={{ gap: 24 }}>
        <View style={styles.top}>
          <Pressable onPress={signOut} accessibilityRole="button" hitSlop={10}>
            <Text variant="caption" tone="mu" style={{ fontSize: 15 }}>
              Sign out
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/join')} accessibilityRole="button" hitSlop={10}>
            <Text variant="caption" color={t.co} style={{ fontSize: 15, fontFamily: fonts.bodySemibold }}>
              I have a code
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="title">Invite your person</Text>
          <Text tone="ink2">Twofold only works with two. Send your partner your code or link. It expires in 24 hours.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: brand.wine }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
            <Avatar config={profile?.avatar_config} scale={1.2} />
            <View style={styles.empty}>
              <Text style={{ fontFamily: fonts.display, fontSize: 30 }} color={brand.cream}>
                ?
              </Text>
            </View>
          </View>
          <Text variant="caption" color={brand.rose} style={styles.eyebrow}>
            Your couple code
          </Text>
          {invite ? (
            <Text style={styles.code} color={brand.cream} accessibilityLabel={`Code ${invite.code.split('').join(' ')}`}>
              {formatCode(invite.code)}
            </Text>
          ) : error ? (
            <Text color={brand.rose} style={{ textAlign: 'center' }}>
              {error}
            </Text>
          ) : (
            <ActivityIndicator color={brand.cream} style={{ height: 40 }} />
          )}
          <Pressable onPress={copy} accessibilityRole="button" style={styles.copy} disabled={!invite}>
            <Text variant="caption" color={brand.cream} style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }}>
              {copied ? 'Copied' : 'Copy code'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  card: { borderRadius: 32, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 18 },
  empty: {
    width: 77,
    height: 115,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(251,243,236,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { letterSpacing: 1.3, textTransform: 'uppercase' },
  code: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: 4.8 },
  copy: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(251,243,236,0.14)' },
});
