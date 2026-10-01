import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from '@/components/avatar/Avatar';
import { Logo } from '@/components/brand/Logo';
import { Bob } from '@/components/brand/motion';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { bellaAvatar, davidAvatar } from '@/constants/sampleAvatars';
import { pairingIntent } from '@/state/intent';
import { useTheme } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export default function Welcome() {
  const { t } = useTheme();
  const start = (join: boolean) => {
    pairingIntent.setJoin(join);
    router.push('/phone');
  };

  return (
    <Screen hero style={styles.body}>
      <View style={[styles.glow, { backgroundColor: t.roomItem }]} />
      <Logo size={26} />
      <View style={styles.couple}>
        <Bob duration={3200}>
          <Avatar {...davidAvatar} scale={2} />
        </Bob>
        <Bob duration={3200} delay={400}>
          <Avatar {...bellaAvatar} scale={2} />
        </Bob>
      </View>
      <View style={{ gap: 12 }}>
        <Text variant="hero" color={brand.cream}>
          A little world{'\n'}for two.
        </Text>
        <Text variant="bodyLg" color={brand.rose}>
          Chat, a shared home, a pet to raise and a flame to keep alive. Just you and your person.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Button kind="coral" label="Get started" onPress={() => start(false)} />
        <Button kind="ghostOnWine" label="I have an invite code" onPress={() => start(true)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 20, gap: 24, overflow: 'hidden' },
  glow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, left: -15, top: 150 },
  couple: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
