import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

import { Text } from './Text';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  /** "number" for SMS codes, "code" for invite codes (letters + digits). */
  kind?: 'number' | 'code';
  autoFocus?: boolean;
  separatorAfter?: number;
};

// Row of boxes backed by one hidden input, so paste and SMS autofill work.
export function CodeInput({ value, onChange, length = 6, kind = 'number', autoFocus, separatorAfter }: Props) {
  const { t } = useTheme();
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const clean = (v: string) =>
    (kind === 'number' ? v.replace(/\D/g, '') : v.toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, length);

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={kind === 'number' ? 'Verification code' : 'Invite code'}>
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i];
          const isCursor = focused && i === Math.min(value.length, length - 1);
          return (
            <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={[
                  styles.box,
                  { backgroundColor: t.sf, borderColor: isCursor ? t.co : ch ? 'transparent' : t.ln, borderWidth: ch && !isCursor ? 0 : 2 },
                ]}
              >
                <Text style={{ fontFamily: fonts.display, fontSize: 24 }}>{ch ?? ''}</Text>
              </View>
              {separatorAfter === i + 1 ? <Text style={{ fontFamily: fonts.display, fontSize: 22 }} tone="mu">·</Text> : null}
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(clean(v))}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={kind === 'number' ? 'number-pad' : 'default'}
        autoCapitalize="characters"
        autoCorrect={false}
        textContentType={kind === 'number' ? 'oneTimeCode' : 'none'}
        autoComplete={kind === 'number' ? 'sms-otp' : 'off'}
        maxLength={length}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: { flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
