import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/state/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

export default function OnboardingLayout() {
  const { t } = useTheme();
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </OnboardingDraftProvider>
  );
}
