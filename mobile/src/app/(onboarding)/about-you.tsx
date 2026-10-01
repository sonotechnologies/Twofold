import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { router } from 'expo-router';

import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { StepDots } from '@/components/ui/StepDots';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useOnboardingDraft } from '@/state/onboardingDraft';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';

/** Returns an ISO date for a real calendar day, or null. */
function toDate(d: string, m: string, y: string) {
  const dd = Number(d), mm = Number(m), yy = Number(y);
  if (!dd || !mm || y.length !== 4) return null;
  const date = new Date(Date.UTC(yy, mm - 1, dd));
  if (date.getUTCFullYear() !== yy || date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd) return null;
  return date.toISOString().slice(0, 10);
}

function isAdult(iso: string) {
  const birth = new Date(iso + 'T00:00:00Z');
  const now = new Date();
  const eighteen = new Date(Date.UTC(birth.getUTCFullYear() + 18, birth.getUTCMonth(), birth.getUTCDate()));
  return eighteen <= now;
}

export default function AboutYou() {
  const { t } = useTheme();
  const { signOut } = useSession();
  const { draft, update } = useOnboardingDraft();
  const [name, setName] = useState(draft.name);
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [error, setError] = useState<string | null>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const birthdate = toDate(d, m, y);
  const ready = name.trim().length > 0 && !!birthdate;

  function next() {
    if (!birthdate) return setError('Enter your full date of birth.');
    if (!isAdult(birthdate)) return setError('Twofold is for adults 18 and over. Come back on your 18th birthday!');
    update({ name: name.trim(), birthdate });
    router.push('/avatar');
  }

  const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);

  return (
    <Screen scroll footer={<Button label="Continue" onPress={next} disabled={!ready} />}>
      <View style={{ gap: 28 }}>
        <View style={styles.top}>
          <BackButton onPress={signOut} />
          <StepDots count={3} active={1} />
          <View style={{ width: 44 }} />
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="title">About you</Text>
          <Text tone="ink2">Your partner sees your first name. Your birthday stays private.</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="caption" tone="mu" style={styles.label}>
            First name
          </Text>
          <TextField value={name} onChangeText={setName} placeholder="David" autoCapitalize="words" autoComplete="given-name" maxLength={40} autoFocus />
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="caption" tone="mu" style={styles.label}>
            Date of birth
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextField
              containerStyle={{ flex: 1 }}
              value={d}
              placeholder="DD"
              keyboardType="number-pad"
              accessibilityLabel="Day"
              onChangeText={(v) => {
                setD(digits(v, 2));
                if (v.length === 2) monthRef.current?.focus();
              }}
            />
            <TextField
              ref={monthRef}
              containerStyle={{ flex: 1 }}
              value={m}
              placeholder="MM"
              keyboardType="number-pad"
              accessibilityLabel="Month"
              onChangeText={(v) => {
                setM(digits(v, 2));
                if (v.length === 2) yearRef.current?.focus();
              }}
            />
            <TextField
              ref={yearRef}
              containerStyle={{ flex: 1.5 }}
              value={y}
              placeholder="YYYY"
              keyboardType="number-pad"
              accessibilityLabel="Year"
              onChangeText={(v) => setY(digits(v, 4))}
            />
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

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { letterSpacing: 0.8, textTransform: 'uppercase' },
});
