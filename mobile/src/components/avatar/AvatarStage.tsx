import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// The wine "room" with a darker floor strip that avatars stand in.
export function AvatarStage({ height, floor = 44, children, style }: { height: number; floor?: number; children: ReactNode; style?: ViewStyle }) {
  const { t } = useTheme();
  return (
    <View style={[{ height, borderRadius: 32, backgroundColor: t.room, overflow: 'hidden' }, style]}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: floor, backgroundColor: t.floor }} />
      {children}
    </View>
  );
}
