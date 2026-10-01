import { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '@/api';
import { AvatarBadge } from '@/components/avatar/Avatar';
import { MoodSheet } from '@/components/MoodSheet';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useHome } from '@/state/useHome';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const fmt = (iso?: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function You() {
  const { t } = useTheme();
  const { signOut } = useSession();
  const { home, reload } = useHome();
  const [moodOpen, setMoodOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!home) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} />;

  function confirmDelete() {
    const run = async () => {
      setDeleting(true);
      try {
        await api.deleteAccount();
        await signOut();
      } catch (e) {
        Alert.alert('Couldn’t delete your account', e instanceof ApiError ? e.message : 'Check your connection and try again.');
      } finally {
        setDeleting(false);
      }
    };
    const msg = `This permanently deletes your Twofold account. Your space with ${home!.partner.name} ends, and they keep read-only access for 30 days.`;
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) run();
      return;
    }
    Alert.alert('Delete your account?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="h1">Us</Text>

        <View style={[styles.coupleCard, { backgroundColor: t.sf }]}>
          <View style={{ flexDirection: 'row' }}>
            <AvatarBadge config={home.me.avatar} background={t.room} />
            <View style={{ marginLeft: -12 }}>
              <AvatarBadge config={home.partner.avatar} background={t.room} ring={t.sf} />
            </View>
          </View>
          <View style={{ gap: 4, flex: 1 }}>
            <Text variant="h3">
              {home.me.name} & {home.partner.name}
            </Text>
            <Text variant="caption" tone="mu">
              Linked since {new Date(home.linked_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>

        <Section title="You">
          <Row label="Your avatar" value="Edit" onPress={() => router.push('/edit-avatar')} first />
          <Row label="Your mood" value={home.me.mood ?? 'Not set'} onPress={() => setMoodOpen(true)} />
        </Section>

        <Section title="Relationship">
          <Row label="Together since" value={fmt(home.started_on)} onPress={() => setDateOpen(true)} first />
          <Row label="Couple card" value="Share" onPress={() => router.push('/couple-card')} />
        </Section>

        <Section title="Account">
          <Row label="Sign out" onPress={signOut} first />
          <Row label={deleting ? 'Deleting…' : 'Delete account'} onPress={confirmDelete} muted />
        </Section>
      </ScrollView>

      <MoodSheet
        visible={moodOpen}
        current={home.me.mood}
        onClose={() => setMoodOpen(false)}
        onPick={async (mood) => {
          setMoodOpen(false);
          await api.updateProfile({ mood });
          reload();
        }}
      />
      <AnniversarySheet
        visible={dateOpen}
        onClose={() => setDateOpen(false)}
        onSaved={() => {
          setDateOpen(false);
          reload();
        }}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text variant="eyebrow" tone="mu" style={{ fontSize: 13 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: t.sf, borderRadius: 24, paddingHorizontal: 16 }}>{children}</View>
    </View>
  );
}

function Row({ label, value, onPress, first, muted }: { label: string; value?: string; onPress: () => void; first?: boolean; muted?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.row, !first && { borderTopWidth: 1, borderTopColor: t.ln }]}>
      <Text style={{ flex: 1, fontFamily: fonts.bodyMedium }} tone={muted ? 'ink2' : 'ink'}>
        {label}
      </Text>
      {value ? (
        <Text variant="caption" tone="mu" style={{ fontSize: 14 }}>
          {value}
        </Text>
      ) : null}
      <Text tone="mu">›</Text>
    </Pressable>
  );
}

function AnniversarySheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsed = new Date(iso + 'T00:00:00Z');
    if (y.length !== 4 || isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) return setError('Enter a real date.');
    setSaving(true);
    setError(null);
    try {
      await api.setStartedOn(iso);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Couldn’t save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const digits = (v: string, n: number) => v.replace(/\D/g, '').slice(0, n);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: t.sheet, paddingBottom: insets.bottom + 20 }]}>
        <Text variant="h2">When did you get together?</Text>
        <Text variant="caption" tone="ink2" style={{ fontSize: 14 }}>
          We count your days together and anniversaries from this date.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextField containerStyle={{ flex: 1 }} value={d} onChangeText={(v) => setD(digits(v, 2))} placeholder="DD" keyboardType="number-pad" accessibilityLabel="Day" />
          <TextField containerStyle={{ flex: 1 }} value={m} onChangeText={(v) => setM(digits(v, 2))} placeholder="MM" keyboardType="number-pad" accessibilityLabel="Month" />
          <TextField containerStyle={{ flex: 1.5 }} value={y} onChangeText={(v) => setY(digits(v, 4))} placeholder="YYYY" keyboardType="number-pad" accessibilityLabel="Year" />
        </View>
        {error ? (
          <Text variant="caption" color={t.co}>
            {error}
          </Text>
        ) : null}
        <Button label="Save" onPress={save} loading={saving} disabled={!d || !m || y.length !== 4} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: TAB_BAR_SPACE, gap: 18 },
  coupleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, gap: 14 },
});
