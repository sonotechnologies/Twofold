import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Rank } from '@/api/types';
import { Text } from '@/components/ui/Text';
import { rankName } from '@/constants/ranks';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

import { Flame } from './motion';

/** Flame + day count, e.g. on Home and the chat header. */
export function StreakChip({ days, size = 'md', style }: { days: number; size?: 'md' | 'sm'; style?: ViewStyle }) {
  const { t } = useTheme();
  const sm = size === 'sm';
  return (
    <View
      accessibilityLabel={`${days}-day flame`}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: sm ? 5 : 6, backgroundColor: t.sf, borderRadius: 999, paddingVertical: sm ? 7 : 9, paddingLeft: sm ? 9 : 12, paddingRight: sm ? 11 : 14 }, style]}
    >
      <Flame size={sm ? 13 : 16} still={days === 0} color={days === 0 ? t.mu : brand.coral} />
      <Text style={{ fontFamily: fonts.display, fontSize: sm ? 15 : 18, lineHeight: sm ? 18 : 21 }}>{days}</Text>
    </View>
  );
}

/** Rank pill. Each rank has its own treatment, gold reserved for higher ranks. */
export function RankChip({ rank, small }: { rank: Rank; small?: boolean }) {
  const pad = small ? { paddingVertical: 5, paddingHorizontal: 9 } : { paddingVertical: 7, paddingHorizontal: 12 };
  const fontSize = small ? 12 : 14;
  const styles: Record<Rank, { bg: string; ink: string; ring?: string; glow?: boolean; gradient?: boolean }> = {
    new_flame: { bg: brand.blush, ink: brand.wine },
    sweethearts: { bg: brand.gold, ink: brand.wineDeep },
    ride_or_die: { bg: brand.gold, ink: brand.wineDeep, ring: brand.wine },
    power_couple: { bg: brand.wineDeep, ink: brand.gold },
    soulmates: { bg: brand.gold, ink: brand.wineDeep, gradient: true, glow: true },
  };
  const s = styles[rank];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: s.bg,
        overflow: 'hidden',
        borderWidth: s.ring ? 2 : 0,
        borderColor: s.ring,
        ...pad,
      }}
    >
      {s.gradient ? <GoldGradient /> : null}
      <Text style={{ fontFamily: fonts.display, fontSize, lineHeight: fontSize + 2 }} color={s.ink}>
        {rankName(rank)}
      </Text>
    </View>
  );
}

/** The Premium/Soulmates gold sheen (#F6D27A → #E9B44C → #C8902C). */
export function GoldGradient() {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.goldLight} />
          <Stop offset="0.5" stopColor={brand.gold} />
          <Stop offset="1" stopColor={brand.goldDeep} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill="url(#gold)" />
    </Svg>
  );
}

export function ProgressBar({ value, height = 6, track, fill = brand.gold }: { value: number; height?: number; track: string; fill?: string }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: '100%', borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}
