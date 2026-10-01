import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { brand, fonts } from '@/theme/tokens';

// Two overlapping circles: one for each partner.
export function LogoMark({ size = 26, back = brand.cream, front = brand.coral }: { size?: number; back?: string; front?: string }) {
  const offset = size * 0.46;
  return (
    <View style={{ width: size + offset, height: size }}>
      <View style={{ position: 'absolute', left: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: back }} />
      <View style={{ position: 'absolute', left: offset, width: size, height: size, borderRadius: size / 2, backgroundColor: front, opacity: 0.92 }} />
    </View>
  );
}

export function Logo({ size = 26, color = brand.cream }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.38 }} accessibilityRole="header" accessibilityLabel="Twofold">
      <LogoMark size={size} back={color} />
      <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.1 }} color={color}>
        twofold
      </Text>
    </View>
  );
}
