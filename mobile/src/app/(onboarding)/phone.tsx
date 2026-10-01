import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, ApiError } from '@/api';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { Screen } from '@/components/ui/Screen';
import { StepDots } from '@/components/ui/StepDots';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/theme/ThemeProvider';

const countries = [
  { dial: '234', iso: 'NG', name: 'Nigeria' },
  { dial: '233', iso: 'GH', name: 'Ghana' },
  { dial: '254', iso: 'KE', name: 'Kenya' },
  { dial: '27', iso: 'ZA', name: 'South Africa' },
  { dial: '44', iso: 'GB', name: 'United Kingdom' },
  { dial: '1', iso: 'US', name: 'United States' },
];

function toE164(dial: string, local: string) {
  const digits = local.replace(/\D/g, '').replace(/^0+/, ''); // 0803… → 803…
  return `+${dial}${digits}`;
}

function formatLocal(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/^(\d{3})(\d{0,3})(\d{0,5})$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
}

export default function Phone() {
  const { t } = useTheme();
  const [country, setCountry] = useState(countries[0]);
  const [picking, setPicking] = useState(false);
  const [number, setNumber] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'send' | 'verify' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const verifying = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const phone = toE164(country.dial, number);
  const validNumber = phone.length >= 11;

  async function send() {
    setError(null);
    setBusy('send');
    try {
      await api.sendOtp(phone);
      setSentTo(phone);
      setCode('');
      setResendIn(30);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We couldn’t send a code. Check your number and connection.');
    } finally {
      setBusy(null);
    }
  }

  async function verify(c = code) {
    if (!sentTo || c.length !== 6 || verifying.current) return;
    verifying.current = true;
    setError(null);
    setBusy('verify');
    try {
      await api.verifyOtp(sentTo, c);
      // The session gate takes it from here.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'That code didn’t work. Try again.');
      setCode('');
    } finally {
      verifying.current = false;
      setBusy(null);
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

  return (
    <Screen
      scroll
      footer={
        <>
          {sentTo ? (
            <Button label="Continue" onPress={() => verify()} loading={busy === 'verify'} disabled={code.length !== 6} />
          ) : (
            <Button label="Send code" onPress={send} loading={busy === 'send'} disabled={!validNumber} />
          )}
          <Button kind="secondary" label="Continue with Google" onPress={google} loading={busy === 'google'} />
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
          <Text variant="title">What’s your number?</Text>
          <Text tone="ink2">We’ll text you a 6-digit code. Your number stays between you and Twofold.</Text>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Country code +${country.dial}, ${country.name}`}
              onPress={() => setPicking((p) => !p)}
              style={[styles.country, { backgroundColor: t.sf }]}
            >
              {country.iso === 'NG' ? (
                <View style={styles.flag}>
                  <View style={{ flex: 1, backgroundColor: '#1F8A4C' }} />
                  <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
                  <View style={{ flex: 1, backgroundColor: '#1F8A4C' }} />
                </View>
              ) : (
                <Text variant="caption" tone="mu">
                  {country.iso}
                </Text>
              )}
              <Text variant="label">+{country.dial}</Text>
            </Pressable>
            <TextField
              containerStyle={{ flex: 1 }}
              large
              value={formatLocal(number)}
              onChangeText={(v) => {
                setNumber(v);
                if (sentTo) setSentTo(null);
              }}
              placeholder="803 412 7789"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
              accessibilityLabel="Phone number"
            />
          </View>
          {picking ? (
            <View style={[styles.picker, { backgroundColor: t.sf }]}>
              {countries.map((c) => (
                <Pressable
                  key={c.dial}
                  onPress={() => {
                    setCountry(c);
                    setPicking(false);
                  }}
                  style={styles.pickRow}
                >
                  <Text>{c.name}</Text>
                  <Text tone="mu">+{c.dial}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {sentTo ? (
          <View style={{ gap: 12 }}>
            <Text variant="eyebrow" tone="mu" style={{ fontFamily: 'Figtree_500Medium', fontSize: 13 }}>
              Enter code
            </Text>
            <CodeInput
              value={code}
              autoFocus
              onChange={(v) => {
                setCode(v);
                if (v.length === 6) verify(v);
              }}
            />
            {resendIn > 0 ? (
              <Text variant="caption" tone="ink2" style={{ fontSize: 14 }}>
                Resend in 0:{String(resendIn).padStart(2, '0')}
              </Text>
            ) : (
              <Pressable onPress={send} accessibilityRole="button">
                <Text variant="caption" color={t.co} style={{ fontSize: 14 }}>
                  Resend code
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}

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
  country: { height: 60, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag: { width: 22, height: 15, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  picker: { borderRadius: 20, paddingVertical: 6 },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
});
