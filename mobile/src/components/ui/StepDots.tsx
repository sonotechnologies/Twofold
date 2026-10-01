import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Onboarding progress: the active step is a wide coral pill.
export function StepDots({ count, active }: { count: number; active: number }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: i === active ? 24 : 6, height: 6, borderRadius: 3, backgroundColor: i === active ? t.co : t.ln }} />
      ))}
    </View>
  );
}
