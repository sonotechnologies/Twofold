import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

type Props = TextInputProps & { containerStyle?: ViewStyle; left?: React.ReactNode; large?: boolean };

export const TextField = forwardRef<TextInput, Props>(function TextField({ containerStyle, left, large, style, onFocus, onBlur, ...rest }, ref) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, { backgroundColor: t.sf, borderColor: focused ? t.co : 'transparent' }, containerStyle]}>
      {left}
      <TextInput
        ref={ref}
        placeholderTextColor={t.mu}
        selectionColor={t.co}
        cursorColor={t.co}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, { color: t.ink, fontSize: large ? 19 : 17 }, style]}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  box: { height: 60, borderRadius: 20, borderWidth: 2, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, height: '100%', fontFamily: fonts.bodyMedium, letterSpacing: 0.5, outlineWidth: 0 },
});
