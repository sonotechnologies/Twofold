import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { router, type Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

// Floating pill tab bar from the design. Icons are simple outlined shapes, as in the mock.
const items: { key: string; label: string; icon: ViewStyle | 'pair'; route?: string }[] = [
  { key: 'home', label: 'Home', icon: { borderRadius: 10 } },
  { key: 'chat', label: 'Chat', icon: { borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomRightRadius: 8, borderBottomLeftRadius: 3 }, route: '/chat' },
  { key: 'rank', label: 'Rank', icon: { borderRadius: 3, transform: [{ rotate: '45deg' }, { scale: 0.85 }] } },
  { key: 'you', label: 'Us', icon: 'pair' },
];

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  return (
    <View style={[styles.bar, { backgroundColor: t.tab, bottom: Math.max(insets.bottom, 12) + 8 }]} accessibilityRole="tablist">
      {items.map((item) => {
        const active = item.key === current;
        const ink = active ? t.pbInk : t.mu;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => (item.route ? router.push(item.route as never) : navigation.navigate(item.key))}
            style={[styles.item, { backgroundColor: active ? t.pb : 'transparent', paddingHorizontal: active ? 18 : 15 }]}
          >
            {item.icon === 'pair' ? (
              <View style={{ width: 24, height: 20 }}>
                <View style={[styles.pairDot, { left: 0, borderColor: ink }]} />
                <View style={[styles.pairDot, { left: 8, borderColor: ink }]} />
              </View>
            ) : (
              <View style={[styles.icon, { borderColor: ink }, item.icon]} />
            )}
            {active ? (
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }} color={ink}>
                {item.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const TAB_BAR_SPACE = 110;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 66,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#2A0B1C',
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  item: { height: 50, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 20, height: 20, borderWidth: 2.5 },
  pairDot: { position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2.5 },
});
