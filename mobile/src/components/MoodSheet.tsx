import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

const moods = ['feeling cozy', 'missing you', 'busy day', 'tired', 'happy', 'hungry', 'stressed', 'in my feelings', 'playful'];

export function MoodSheet({ visible, current, onPick, onClose }: { visible: boolean; current: string | null; onPick: (m: string | null) => void; onClose: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: t.sheet, paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.handle, { backgroundColor: t.ln }]} />
        <Text variant="h2">How are you feeling?</Text>
        <Text tone="ink2" variant="caption" style={{ fontSize: 14 }}>
          Your partner sees this in your shared room.
        </Text>
        <View style={styles.wrap}>
          {moods.map((m) => {
            const on = m === current;
            return (
              <Pressable key={m} onPress={() => onPick(m)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, { backgroundColor: on ? t.pb : t.sf }]}>
                <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }} color={on ? t.pbInk : t.ink}>
                  {m}
                </Text>
              </Pressable>
            );
          })}
          {current ? (
            <Pressable onPress={() => onPick(null)} accessibilityRole="button" style={[styles.chip, { borderWidth: 1.5, borderColor: t.ln }]}>
              <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 14 }} tone="mu">
                Clear
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 14, paddingHorizontal: 24, gap: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
});
