import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api';
import { Avatar } from '@/components/avatar/Avatar';
import { Heartbeat } from '@/components/brand/motion';
import { ProgressBar, RankChip, StreakChip } from '@/components/brand/chips';
import { MoodSheet } from '@/components/MoodSheet';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Text } from '@/components/ui/Text';
import { rankName, rankProgress } from '@/constants/ranks';
import { useHome, usePresence } from '@/state/useHome';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

export default function HomeScreen() {
  const { t } = useTheme();
  const { userId } = useSession();
  const { home, offline, reload } = useHome();
  const online = usePresence(home?.couple_id, userId);
  const [refreshing, setRefreshing] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);

  if (!home) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} />;

  const { partner, me, streak, bond, question } = home;
  const progress = rankProgress(bond.points, bond.rank_floor, bond.next_threshold);
  const partnerMood = partner.mood ? ` · ${partner.mood}` : '';
  const flameAtRisk = !streak.done_today && streak.current > 0;

  let qStatus = `${partner.name} hasn’t answered yet`;
  let qAction = 'Answer today’s question';
  if (question?.both_answered) {
    qStatus = 'You both answered';
    qAction = 'See both answers';
  } else if (question?.my_answer) {
    qStatus = `Waiting for ${partner.name}`;
    qAction = 'See your answer';
  } else if (question?.partner_answered) {
    qStatus = `${partner.name} answered`;
    qAction = `Answer to unlock ${partner.name}’s`;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={t.co}
            onRefresh={async () => {
              setRefreshing(true);
              await reload();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ gap: 4 }}>
            <Text variant="caption" tone="mu">
              {offline ? 'Offline · showing saved' : `Day ${home.days_together} together`}
            </Text>
            <Text variant="h1">Our Space</Text>
          </View>
          <StreakChip days={streak.current} />
        </View>

        <View style={[styles.room, { backgroundColor: t.room }]}>
          <View style={[styles.floor, { backgroundColor: t.floor }]} />
          <View style={[styles.window, { backgroundColor: t.roomItem }]} />
          <View style={styles.lamp} />
          <Pressable
            onPress={() => setMoodOpen(true)}
            accessibilityRole="button"
            accessibilityHint="Set your mood"
            style={styles.presence}
          >
            <Heartbeat active={online} />
            <Text style={styles.presenceText} color={brand.cream} numberOfLines={1}>
              {online ? `${partner.name} is here${partnerMood}` : `${partner.name}${partnerMood || ' · away'}`}
            </Text>
          </Pressable>
          <View style={[styles.avatar, { left: 62 }]}>
            <Avatar config={me.avatar} scale={1.3} />
          </View>
          <View style={[styles.avatar, { left: 142 }]}>
            <Avatar config={partner.avatar} scale={1.3} />
          </View>
          <Pressable onPress={() => setMoodOpen(true)} accessibilityRole="button" style={[styles.myMood, { backgroundColor: 'rgba(251,243,236,0.14)' }]}>
            <Text style={styles.presenceText} color={brand.cream}>
              {me.mood ? `You: ${me.mood}` : 'Set your mood'}
            </Text>
          </Pressable>
        </View>

        {flameAtRisk ? (
          <Pressable onPress={() => router.push('/chat')} accessibilityRole="button" style={[styles.nudge, { backgroundColor: t.softBg }]}>
            <Text variant="caption" color={t.softInk} style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }}>
              Don’t break the flame. {streak.me_active_today ? `Waiting on ${partner.name} today.` : `Say hi to ${partner.name} today.`}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.grid}>
          <Pressable onPress={() => router.push('/rank')} style={[styles.stat, { backgroundColor: t.sf }]} accessibilityRole="button">
            <Text variant="caption" tone="mu" style={{ fontSize: 12 }}>
              Bond score
            </Text>
            <Text variant="h1" style={{ lineHeight: 30 }}>
              {bond.points.toLocaleString()}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/rank')} style={[styles.stat, { backgroundColor: t.sf }]} accessibilityRole="button" accessibilityLabel={`Rank ${rankName(bond.rank)}`}>
            <Text variant="caption" tone="mu" style={{ fontSize: 12 }}>
              Rank
            </Text>
            <RankChip rank={bond.rank} small />
            <ProgressBar value={progress} track={t.sf2} />
          </Pressable>
        </View>

        {question ? (
          <Pressable onPress={() => router.push('/question')} accessibilityRole="button" style={[styles.question, { backgroundColor: t.qBg }]}>
            <View style={styles.qTop}>
              <Text variant="eyebrow" color={brand.coralSoft} style={{ letterSpacing: 1 }}>
                Today’s question
              </Text>
              <Text variant="caption" color={brand.rose} style={{ fontSize: 12 }}>
                {qStatus}
              </Text>
            </View>
            <Text variant="h2" color={brand.cream} style={{ fontSize: 20, lineHeight: 25 }}>
              {question.text}
            </Text>
            <View style={styles.qBtn}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15 }} color={brand.wineDeep}>
                {qAction}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable onPress={() => router.push('/couple-card')} accessibilityRole="button" style={[styles.share, { backgroundColor: t.sf }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="h3">Show off your couple card</Text>
            <Text variant="caption" tone="mu">
              Share to WhatsApp Status, Instagram or TikTok
            </Text>
          </View>
          <Text variant="h2" color={t.co}>
            ›
          </Text>
        </Pressable>
      </ScrollView>

      <MoodSheet
        visible={moodOpen}
        current={me.mood}
        onClose={() => setMoodOpen(false)}
        onPick={async (mood) => {
          setMoodOpen(false);
          await api.updateProfile({ mood });
          reload();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: TAB_BAR_SPACE, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  room: { height: 258, borderRadius: 32, overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74 },
  window: { position: 'absolute', right: 22, top: 22, width: 70, height: 52, borderRadius: 12 },
  lamp: { position: 'absolute', left: 22, top: 56, width: 40, height: 40, borderRadius: 20, backgroundColor: brand.gold, opacity: 0.85 },
  presence: {
    position: 'absolute',
    left: 14,
    top: 14,
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(251,243,236,0.14)',
  },
  presenceText: { fontFamily: fonts.bodySemibold, fontSize: 13, flexShrink: 1 },
  avatar: { position: 'absolute', bottom: 40 },
  myMood: { position: 'absolute', right: 14, bottom: 14, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999 },
  nudge: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  question: { borderRadius: 26, padding: 18, gap: 12 },
  qTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  qBtn: { alignSelf: 'flex-start', backgroundColor: brand.coral, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  share: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
