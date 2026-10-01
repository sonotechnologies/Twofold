import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/brand/Logo';
import { ProgressBar } from '@/components/brand/chips';
import { TAB_BAR_SPACE } from '@/components/TabBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { rankName, rankProgress, ranks } from '@/constants/ranks';
import { useHome } from '@/state/useHome';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

const earn = [
  { what: 'You both answer the daily question', pts: '+15' },
  { what: 'Chat with each other (each, per day)', pts: 'up to +20' },
  { what: '7-day flame', pts: '+50' },
  { what: '30-day flame', pts: '+150' },
  { what: '100-day flame', pts: '+500' },
  { what: '365-day flame', pts: '+1,500' },
];

export default function RankScreen() {
  const { t } = useTheme();
  const { home } = useHome();
  if (!home) return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} />;
  const { bond } = home;
  const currentIndex = ranks.findIndex((r) => r.id === bond.rank);
  const toNext = bond.next_threshold != null ? bond.next_threshold - bond.points : 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="h1">Rank</Text>

        <View style={[styles.hero, { backgroundColor: t.qBg }]}>
          <View style={[styles.glow, { backgroundColor: t.roomItem }]} />
          <View style={styles.emblem}>
            <LogoMark size={30} back={brand.wine} />
          </View>
          <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36 }} color={brand.cream}>
            {rankName(bond.rank)}
          </Text>
          <View style={{ width: '100%', gap: 8 }}>
            <ProgressBar value={rankProgress(bond.points, bond.rank_floor, bond.next_threshold)} height={12} track="rgba(251,243,236,0.15)" />
            <View style={styles.between}>
              <Text variant="caption" color={brand.rose}>
                {bond.points.toLocaleString()}
              </Text>
              <Text variant="caption" color={brand.rose}>
                {bond.next_rank ? `${toNext.toLocaleString()} to ${rankName(bond.next_rank)}` : 'Top rank. Legends.'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          {ranks.map((r, i) => {
            const reached = i <= currentIndex;
            const current = i === currentIndex;
            return (
              <View key={r.id} style={[styles.rankRow, { backgroundColor: current ? t.sf : 'transparent' }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: reached ? brand.gold : t.ln }} />
                <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 15 }} tone={reached ? 'ink' : 'mu'}>
                  {r.name}
                </Text>
                <Text variant="caption" tone="mu">
                  {r.points.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>

        <Text variant="eyebrow" tone="mu" style={{ fontSize: 13 }}>
          How you earn bond points
        </Text>
        <View style={[styles.card, { backgroundColor: t.sf }]}>
          {earn.map((e, i) => (
            <View key={e.what} style={[styles.earnRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.ln }]}>
              <Text style={{ flex: 1, fontSize: 15 }}>{e.what}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 15 }} color={t.co}>
                {e.pts}
              </Text>
            </View>
          ))}
        </View>

        <Button label="Share our couple card" onPress={() => router.push('/couple-card')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: TAB_BAR_SPACE, gap: 16 },
  hero: { borderRadius: 30, padding: 22, alignItems: 'center', gap: 12, overflow: 'hidden' },
  glow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -120 },
  emblem: { width: 84, height: 84, borderRadius: 42, backgroundColor: brand.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: 'rgba(233,180,76,0.25)' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  card: { borderRadius: 24, paddingHorizontal: 16 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingVertical: 10 },
});
