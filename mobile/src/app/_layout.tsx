import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from '@expo-google-fonts/figtree';

import { ConfigMissing } from '@/components/ConfigMissing';
import { isConfigured } from '@/lib/supabase';
import { pairingIntent } from '@/state/intent';
import { SessionProvider, useSession, type Stage } from '@/state/session';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

/** Where each stage lives. The first entry is the default screen for that stage. */
const allowed: Record<Exclude<Stage, 'loading'>, string[]> = {
  signedOut: ['(onboarding)/welcome', '(onboarding)/sign-in'],
  needsProfile: ['(onboarding)/about-you', '(onboarding)/avatar'],
  unpaired: ['(pair)/invite', '(pair)/join', '(pair)/waiting'],
  awaitingPartner: ['(pair)/waiting'],
  needsMyConfirm: ['(pair)/confirm'],
  active: ['(main)', 'linked', 'chat', 'question', 'couple-card', 'edit-avatar'],
};

const defaults: Record<Exclude<Stage, 'loading'>, string> = {
  signedOut: '/welcome',
  needsProfile: '/about-you',
  unpaired: '/invite',
  awaitingPartner: '/waiting',
  needsMyConfirm: '/confirm',
  active: '/home',
};

function Gate() {
  const { stage } = useSession();
  const segments = useSegments() as string[];
  const { t } = useTheme();

  useEffect(() => {
    if (stage === 'loading') return;
    SplashScreen.hideAsync();
    const here = segments.slice(0, 2).join('/');
    const ok = allowed[stage].some((p) => here === p || segments[0] === p);
    if (ok) return;
    // Just finished pairing: celebrate first.
    if (stage === 'active' && segments[0] === '(pair)') router.replace('/linked');
    else if (stage === 'unpaired' && pairingIntent.join) router.replace('/join');
    else router.replace(defaults[stage] as never);
  }, [stage, segments]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="linked" options={{ animation: 'fade' }} />
        <Stack.Screen name="question" options={{ presentation: 'card' }} />
        <Stack.Screen name="couple-card" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {isConfigured ? (
          <SessionProvider>
            <Gate />
          </SessionProvider>
        ) : (
          <ConfigMissing onReady={() => SplashScreen.hideAsync()} />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
