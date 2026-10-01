import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme/ThemeProvider';

type Props = {
  children: ReactNode;
  /** Wine-filled hero background (welcome, linked). */
  hero?: boolean;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
  footer?: ReactNode;
};

export function Screen({ children, hero, scroll, padded = true, edges = ['top', 'bottom'], style, footer }: Props) {
  const { t, isDark } = useTheme();
  const bg = hero ? t.hero : t.bg;
  const pad = padded ? styles.padded : undefined;

  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar style={hero || isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.grow, pad, style]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.root, pad, style]}>{children}</View>
        )}
        {footer ? <View style={[padded && styles.footer]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grow: { flexGrow: 1 },
  padded: { paddingHorizontal: 24, paddingTop: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 10 },
});
