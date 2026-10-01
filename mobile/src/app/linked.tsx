import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from '@/components/avatar/Avatar';
import { Confetti, Flame } from '@/components/brand/motion';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSession } from '@/state/session';
import { usePartnerProfile } from '@/state/usePartner';
import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

export default function Linked() {
  const { t } = useTheme();
  const { profile } = useSession();
  const partner = usePartnerProfile();

  return (
    <Screen hero style={styles.body} footer={<Button kind="coral" label="Enter Our Space" onPress={() => router.replace('/home')} />}>
      <Confetti />
      <View style={[styles.circle, { backgroundColor: t.roomItem }]}>
        <Avatar config={profile?.avatar_config} scale={1.7} />
        {partner ? <Avatar config={partner.avatar_config} scale={1.7} /> : null}
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 46, lineHeight: 48, textAlign: 'center' }} color={brand.cream}>
        You’re linked.
      </Text>
      <Text variant="bodyLg" color={brand.rose} style={{ textAlign: 'center' }}>
        {profile?.name} & {partner?.name ?? 'your partner'}, Day 1 together on Twofold. Your flame starts now.
      </Text>
      <View style={styles.chip}>
        <Flame />
        <Text style={{ fontFamily: fonts.display, fontSize: 16 }} color={brand.cream}>
          New Flame
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 28 },
  circle: { width: 280, height: 280, borderRadius: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 40 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(251,243,236,0.12)' },
});
