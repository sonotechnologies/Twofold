import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { brand, fonts } from '@/theme/tokens';

import { Text } from './Text';

type Kind = 'primary' | 'coral' | 'secondary' | 'quiet' | 'ghost' | 'ghostOnWine' | 'whatsapp' | 'ink';

type Props = {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  size?: 'lg' | 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({ label, onPress, kind = 'primary', size = 'lg', loading, disabled, style, accessibilityHint }: Props) {
  const { t } = useTheme();
  const colors: Record<Kind, { bg: string; ink: string; border?: string }> = {
    primary: { bg: t.pb, ink: t.pbInk },
    coral: { bg: brand.coral, ink: brand.wineDeep },
    secondary: { bg: t.sf, ink: t.ink },
    quiet: { bg: t.sf2, ink: t.ink },
    ghost: { bg: 'transparent', ink: t.ink2, border: t.ln },
    ghostOnWine: { bg: 'transparent', ink: brand.cream, border: 'rgba(251,243,236,0.5)' },
    whatsapp: { bg: brand.whatsapp, ink: '#FFFFFF' },
    ink: { bg: t.ink, ink: t.bg },
  };
  const c = colors[kind];
  const height = size === 'lg' ? 56 : size === 'md' ? 50 : 38;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: c.bg,
          paddingHorizontal: size === 'sm' ? 14 : 24,
          borderWidth: c.border ? 1.5 : 0,
          borderColor: c.border,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !inactive ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.ink} />
      ) : (
        <Text
          variant="label"
          color={c.ink}
          style={size === 'sm' ? { fontFamily: fonts.bodySemibold, fontSize: 13 } : size === 'md' ? { fontSize: 15 } : undefined}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
