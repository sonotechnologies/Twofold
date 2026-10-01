// The small motion moments from the design: flame flicker, heartbeat pulse, idle bob, confetti.
import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type ViewStyle } from 'react-native';

import { brand } from '@/theme/tokens';

function useLoop(duration: number, delay = 0, easing = Easing.inOut(Easing.ease)) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let anim: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || cancelled) return;
      anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      anim.start();
    });
    return () => {
      cancelled = true;
      anim?.stop();
    };
  }, [v, duration, delay, easing]);
  return v;
}

/** Teardrop flame (a rotated square with one sharp corner) that flickers. */
export function Flame({ size = 16, color = brand.coral, still }: { size?: number; color?: string; still?: boolean }) {
  const loop = useLoop(1600);
  const rest = useRef(new Animated.Value(0)).current;
  const t = (still ? rest : loop).interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderTopLeftRadius: size / 2,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: size / 2,
        borderBottomRightRadius: size / 2,
        transform: [
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '-40deg'] }) },
          { scaleX: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
        ],
      }}
    />
  );
}

/** Coral dot that pulses like a heartbeat when a partner is online. */
export function Heartbeat({ size = 10, active = true }: { size?: number; active?: boolean }) {
  const v = useLoop(1400, 0, Easing.out(Easing.ease));
  const scale = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.15, 1] });
  const ring = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 2.2, 2.2] });
  const ringOpacity = v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0, 0] });
  if (!active) return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(251,243,236,0.35)' }} />;
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: brand.coral, opacity: ringOpacity, transform: [{ scale: ring }] }}
      />
      <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand.coral, transform: [{ scale }] }} />
    </View>
  );
}

/** Gentle up-and-down idle motion for avatars and the pet. */
export function Bob({ children, duration = 3200, delay = 0, distance = 6, style }: { children: ReactNode; duration?: number; delay?: number; distance?: number; style?: ViewStyle }) {
  const v = useLoop(duration, delay);
  const translateY = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -distance, 0] });
  return <Animated.View style={[style, { transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/** Fading pulse used for "waiting" states. */
export function Pulse({ children, duration = 1800, delay = 0, style }: { children: ReactNode; duration?: number; delay?: number; style?: ViewStyle }) {
  const v = useLoop(duration, delay);
  const opacity = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

const confettiColors = [brand.coral, brand.gold, brand.cream, brand.coralSoft, brand.goldLight];

function ConfettiPiece({ i, height }: { i: number; height: number }) {
  const duration = (3 + (i % 5) * 0.6) * 1000;
  const v = useLoop(duration, (i * 370) % 4000, Easing.linear);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-40, height] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${((i * 53) % 380) / 3.9}%`,
        width: i % 3 ? 8 : 12,
        height: i % 2 ? 14 : 8,
        borderRadius: i % 4 === 0 ? 7 : 3,
        backgroundColor: confettiColors[i % 5],
        transform: [{ translateY }, { rotate }],
      }}
    />
  );
}

/** Falling confetti for celebrations ("You're linked", rank-ups). */
export function Confetti({ count = 22, height = 860 }: { count?: number; height?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => (
        <ConfettiPiece key={i} i={i} height={height} />
      ))}
    </View>
  );
}
