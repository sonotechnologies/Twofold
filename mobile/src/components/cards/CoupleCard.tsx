// Shareable Couple Card (standard), from TwofoldCard.dc.html: 9:16 story (360×640) or 1:1 (400×400).
// Rendered at design size and captured to an image at full resolution for sharing.
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Rank } from '@/api/types';
import { Avatar } from '@/components/avatar/Avatar';
import { LogoMark } from '@/components/brand/Logo';
import { Bob, Flame } from '@/components/brand/motion';
import { Text } from '@/components/ui/Text';
import { GET_TWOFOLD_URL } from '@/constants/links';
import { rankName } from '@/constants/ranks';
import { brand, fonts } from '@/theme/tokens';

export type CardFormat = 'story' | 'square';

export const cardSize = (f: CardFormat) => (f === 'square' ? { width: 400, height: 400 } : { width: 360, height: 640 });

type Props = {
  format: CardFormat;
  names: [string, string];
  avatars: [unknown, unknown];
  rank: Rank;
  streak: number;
  daysTogether: number;
  /** Captures render better without the idle animation mid-frame. */
  still?: boolean;
};

export const CoupleCard = forwardRef<View, Props>(function CoupleCard({ format, names, avatars, rank, streak, daysTogether, still }, ref) {
  const sq = format === 'square';
  const { width, height } = cardSize(format);
  const circ = sq ? 420 : 520;
  const av = sq ? 1.15 : 1.6;
  const f1 = sq ? 30 : 38;
  const f2 = sq ? 20 : 24;
  const pad = sq ? 28 : 30;

  const couple = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Avatar config={avatars[0]} scale={av} />
      <Avatar config={avatars[1]} scale={av} />
    </View>
  );

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, backgroundColor: brand.wine }]}>
      <View style={{ position: 'absolute', width: circ, height: circ, borderRadius: circ / 2, backgroundColor: brand.plum, left: width / 2 - circ / 2, top: sq ? 120 : 230 }} />
      <View style={[styles.content, { padding: pad, gap: sq ? 10 : 16 }]}>
        <Text style={styles.eyebrow} color={brand.coralSoft}>
          Our couple card
        </Text>
        {still ? couple : <Bob duration={3000} distance={5}>{couple}</Bob>}
        <Text style={{ fontFamily: fonts.display, fontSize: f1, lineHeight: f1 * 1.05, textAlign: 'center' }} color={brand.cream} numberOfLines={1} adjustsFontSizeToFit>
          {names[0]} & {names[1]}
        </Text>
        <View style={styles.rank}>
          <Text style={{ fontFamily: fonts.display, fontSize: 14, lineHeight: 16 }} color={brand.wineDeep}>
            {rankName(rank)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Flame size={20} still={still} />
          <Text style={{ fontFamily: fonts.display, fontSize: f2, lineHeight: f2 * 1.1 }} color={brand.cream}>
            {streak}-day flame
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15 }} color={brand.rose}>
          Day {daysTogether} together on Twofold
        </Text>
      </View>
      <View style={[styles.footer, { left: pad, right: pad, bottom: sq ? 22 : 28 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <LogoMark size={16} />
          <Text style={{ fontFamily: fonts.display, fontSize: 17 }} color={brand.cream}>
            twofold
          </Text>
        </View>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 12 }} color={brand.rose}>
          Get Twofold · {GET_TWOFOLD_URL.replace(/^https?:\/\//, '')}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 28, overflow: 'hidden' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.bodySemibold, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  rank: { backgroundColor: brand.gold, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  footer: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
