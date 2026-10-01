import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

type Variant =
  | 'hero' // 44 / Fredoka
  | 'title' // 34
  | 'h1' // 28
  | 'h2' // 22
  | 'h3' // 18
  | 'body' // 16 / Figtree
  | 'bodyLg' // 17
  | 'label' // 17 semibold (buttons)
  | 'caption' // 13 medium
  | 'eyebrow'; // 12 uppercase

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 45 },
  title: { fontFamily: fonts.display, fontSize: 34, lineHeight: 37 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 31 },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  h3: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyLg: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 17, lineHeight: 22 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.bodySemibold, fontSize: 12, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' },
};

type Props = TextProps & { variant?: Variant; color?: string; tone?: 'ink' | 'ink2' | 'mu' };

export function Text({ variant = 'body', color, tone = 'ink', style, ...rest }: Props) {
  const { t } = useTheme();
  return <RNText {...rest} style={[variants[variant], { color: color ?? t[tone] }, style]} />;
}
