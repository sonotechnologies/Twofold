import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { api, ApiError } from '@/api';
import type { WhatsAppStart } from '@/api/backend';
import { Pulse } from '@/components/brand/motion';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { StepDots } from '@/components/ui/StepDots';
import { Text } from '@/components/ui/Text';
import { formatCode } from '@/constants/links';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

const POLL_MS = 2000;

// Sign in with WhatsApp (the person sends us a pre-filled message, so it costs nothing per code)
// or with Google. Either way the session gate moves on to "About you" afterwards.
export default function SignIn() {
  const { t } = useTheme();
  const [pending, setPending] = useState<WhatsAppStart | null>(null);
  const [busy, setBusy] = useState<'whatsapp' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const polling = useRef(false);

  // While waiting, check every couple of seconds whether the WhatsApp message has arrived.
  useEffect(() => {
    if (!pending) return;
    let stopped = false;
    const check = async () => {
      if (stopped || polling.current || AppState.currentState !== 'active') return;
      polling.current = true;
      try {
        const result = await api.completeWhatsApp(pending);
        if (stopped) return;
        if (result === 'expired') {
          setPending(null);
          setError('That code expired. Tap “Continue with WhatsApp” to get a new one.');
        }
        // 'signedIn': the auth listener updates the session and the gate navigates away.
      } catch {
        // Network hiccup: keep waiting and try again on the next tick.
      } finally {
        polling.current = false;
      }
    };
    const id = setInterval(check, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      stopped = true;
      clearInterval(id);
      sub.remove();
    };
  }, [pending]);

  async function whatsapp() {
    setError(null);
    setBusy('whatsapp');
    try {
      const start = await api.startWhatsApp();
      setPending(start);
      await openWhatsApp(start.waUrl);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t start WhatsApp sign-in. Check your connection.');
    } finally {
      setBusy(null);
    }
  }

  async function openWhatsApp(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      setError('We couldn’t open WhatsApp. Is it installed on this phone?');
    }
  }

  async function google() {
    setError(null);
    setBusy('google');
    try {
      await api.signInWithGoogle();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Google sign-in didn’t work. Try again.');
    } finally {
      setBusy(null);
    }
  }

  if (pending) {
    return (
      <Screen
        footer={
          <>
            <Button kind="whatsapp" label="Open WhatsApp again" onPress={() => openWhatsApp(pending.waUrl)} />
            <Button kind="ghost" style={{ borderWidth: 0 }} label="Cancel" onPress={() => setPending(null)} />
          </>
        }
      >
        <View style={{ gap: 28 }}>
          <View style={styles.top}>
            <BackButton onPress={() => setPending(null)} />
            <StepDots count={3} active={0} />
            <View style={{ width: 44 }} />
          </View>
          <View style={{ gap: 10 }}>
            <Text variant="title">Send the message in WhatsApp</Text>
            <Text tone="ink2">
              We’ve written it for you. Just tap send in WhatsApp, then come back here. That’s how we know this number is yours.
            </Text>
          </View>
          <View style={[styles.codeCard, { backgroundColor: brand.wine }]}>
            <Text variant="caption" color={brand.rose} style={styles.eyebrow}>
              Your code
            </Text>
            <Text style={styles.code} color={brand.cream} accessibilityLabel={`Code ${pending.token.split('').join(' ')}`}>
              {formatCode(pending.token)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pulse duration={1200}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: brand.coral }} />
              </Pulse>
              <Text variant="caption" color={brand.rose} style={{ fontSize: 14 }}>
                Waiting for your message…
              </Text>
            </View>
          </View>
          {error ? (
            <Text variant="caption" color={t.co} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button kind="whatsapp" label="Continue with WhatsApp" onPress={whatsapp} loading={busy === 'whatsapp'} disabled={busy === 'google'} />
          <Button kind="secondary" label="Continue with Google" onPress={google} loading={busy === 'google'} disabled={busy === 'whatsapp'} />
          <Text variant="caption" tone="mu" style={{ textAlign: 'center', fontSize: 13 }}>
            By continuing you agree to our Terms and Privacy Policy. Twofold is for adults 18 and over.
          </Text>
        </>
      }
    >
      <View style={{ gap: 28 }}>
        <View style={styles.top}>
          <BackButton />
          <StepDots count={3} active={0} />
          <View style={{ width: 44 }} />
        </View>
        <View style={{ gap: 10 }}>
          <Text variant="title">Let’s get you in</Text>
          <Text tone="ink2">
            Use the WhatsApp number your partner knows. You’ll send us one short message, and your number stays between you and Twofold.
          </Text>
        </View>
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
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeCard: { borderRadius: 32, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 16 },
  eyebrow: { letterSpacing: 1.3, textTransform: 'uppercase' },
  code: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: 4.8 },
});
