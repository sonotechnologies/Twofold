import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { api, ApiError, type QuestionState } from '@/api';
import { AvatarBadge } from '@/components/avatar/Avatar';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { newId } from '@/lib/ids';
import { useSession } from '@/state/session';
import { usePartnerProfile } from '@/state/usePartner';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

const MAX = 200;

function useCountdown(to: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!to) return '';
  const s = Math.max(0, Math.floor((new Date(to).getTime() - now) / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function Question() {
  const { t } = useTheme();
  const { profile } = useSession();
  const partner = usePartnerProfile();
  const [q, setQ] = useState<QuestionState | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countdown = useCountdown(q?.next_at);
  const name = partner?.name ?? 'your partner';

  useFocusEffect(
    useCallback(() => {
      api.getQuestion().then(setQ).catch(() => setError('You’re offline. Today’s question will load when you reconnect.'));
    }, []),
  );

  async function lockIn() {
    setBusy(true);
    setError(null);
    try {
      setQ(await api.submitAnswer(draft));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We couldn’t save your answer. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  async function react(text: string) {
    const home = await api.getHome();
    if (!home) return;
    await api.sendMessage({ couple_id: home.couple_id, type: 'text', body: `${text} (re: “${q?.text}”)`, client_id: newId() });
    router.push('/chat');
  }

  const header = (
    <View style={styles.top}>
      <BackButton plain />
      <Text variant="caption" tone="mu" style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }}>
        Daily question{q ? ` · Day ${q.day_number}` : ''}
      </Text>
      <View style={{ width: 44 }} />
    </View>
  );

  if (!q) {
    return (
      <Screen>
        {header}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {error ? <Text tone="mu">{error}</Text> : <ActivityIndicator color={t.co} />}
        </View>
      </Screen>
    );
  }

  // ---------- reveal: both answered
  if (q.both_answered) {
    return (
      <Screen
        scroll
        footer={
          <>
            <Text variant="caption" tone="mu" style={{ textAlign: 'center', fontSize: 14 }}>
              Next question in {countdown}
            </Text>
            <Button label="Talk about it in chat" onPress={() => router.push('/chat')} />
          </>
        }
      >
        <View style={{ gap: 16 }}>
          {header}
          <Text variant="title" style={{ fontSize: 26, lineHeight: 30 }}>
            {q.text}
          </Text>
          <View style={styles.bothChip}>
            <Text style={{ fontFamily: fonts.display, fontSize: 14 }} color={brand.wineDeep}>
              You both answered · +15 bond
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
            <AvatarBadge config={partner?.avatar_config} background={t.room} />
            <View style={[styles.answer, styles.theirs, { backgroundColor: t.themBub }]}>
              <Text color={t.themInk} style={{ lineHeight: 23 }}>
                {q.partner_answer}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-end' }}>
            <AvatarBadge config={profile?.avatar_config} background={t.room} />
            <View style={[styles.answer, styles.mine, { backgroundColor: t.meBub }]}>
              <Text color={t.meInk} style={{ lineHeight: 23 }}>
                {q.my_answer}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['So true', 'Lol', 'Aww', 'Again tonight'].map((r) => (
              <Button key={r} kind="secondary" size="sm" label={r} onPress={() => react(r)} style={{ height: 38 }} />
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  // ---------- answer (or waiting for partner)
  const answered = !!q.my_answer;
  return (
    <Screen
      scroll
      footer={
        answered ? (
          <Button kind="quiet" label="Back to Our Space" onPress={() => router.back()} />
        ) : (
          <Button label="Lock in my answer" onPress={lockIn} loading={busy} disabled={!draft.trim()} />
        )
      }
    >
      <View style={{ gap: 18 }}>
        {header}
        <Text variant="title" style={{ fontSize: 30, lineHeight: 34 }}>
          {q.text}
        </Text>

        <View style={[styles.card, { backgroundColor: t.sf, borderColor: t.co }]}>
          <Text variant="eyebrow" tone="mu">
            Your answer
          </Text>
          {answered ? (
            <Text variant="bodyLg">{q.my_answer}</Text>
          ) : (
            <TextInput
              value={draft}
              onChangeText={(v) => setDraft(v.slice(0, MAX))}
              placeholder="Be honest, be sweet…"
              placeholderTextColor={t.mu}
              selectionColor={t.co}
              multiline
              autoFocus
              style={[styles.input, { color: t.ink }]}
              accessibilityLabel="Your answer"
            />
          )}
          {!answered ? (
            <Text variant="caption" tone="mu" style={{ textAlign: 'right', fontSize: 12 }}>
              {draft.length} / {MAX}
            </Text>
          ) : null}
        </View>

        <View style={[styles.locked, { backgroundColor: t.qBg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AvatarBadge config={partner?.avatar_config} size={36} background={t.roomItem} />
            <Text style={{ fontFamily: fonts.display, fontSize: 16 }} color={brand.cream}>
              {partner?.name ?? 'Partner'}’s answer
            </Text>
          </View>
          <View style={{ gap: 8, opacity: 0.6 }}>
            {[0.92, 0.78, 0.56].map((w) => (
              <View key={w} style={{ height: 12, borderRadius: 6, width: `${w * 100}%`, backgroundColor: 'rgba(251,243,236,0.35)' }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Lock />
            <Text variant="caption" color={brand.rose} style={{ fontSize: 14, flex: 1 }}>
              {answered
                ? `Locked until ${name} answers. We’ll show you both answers then.`
                : q.partner_answered
                  ? `Locked. Answer yours to see ${name}’s.`
                  : `${name} hasn’t answered yet. Answers unlock when you both have.`}
            </Text>
          </View>
        </View>

        {error ? (
          <Text variant="caption" color={t.co}>
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function Lock() {
  return (
    <View style={{ width: 18, height: 22 }}>
      <View style={{ position: 'absolute', left: 3, top: 0, width: 12, height: 12, borderWidth: 2.5, borderBottomWidth: 0, borderColor: brand.coralSoft, borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
      <View style={{ position: 'absolute', left: 0, top: 9, width: 18, height: 13, borderRadius: 4, backgroundColor: brand.coralSoft }} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { borderRadius: 26, padding: 18, gap: 12, borderWidth: 2 },
  input: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, minHeight: 76, textAlignVertical: 'top', padding: 0, outlineWidth: 0 },
  locked: { borderRadius: 26, padding: 18, gap: 14 },
  bothChip: { alignSelf: 'flex-start', backgroundColor: brand.gold, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  answer: { flexShrink: 1, paddingVertical: 14, paddingHorizontal: 16 },
  theirs: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, borderBottomLeftRadius: 8 },
  mine: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 8 },
});
