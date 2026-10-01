import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { Text } from './Text';

export function BackButton({ onPress, plain }: { onPress?: () => void; plain?: boolean }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={10}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={[styles.btn, !plain && { backgroundColor: t.sf }]}
    >
      <Text style={styles.chev}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chev: { fontFamily: fonts.bodyMedium, fontSize: 30, lineHeight: 34, marginTop: -3 },
});
