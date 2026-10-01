import { useEffect } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

// Shown in development when no Supabase keys are set and demo mode is off.
export function ConfigMissing({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Text variant="h1">Twofold isn’t connected yet</Text>
        <Text tone="ink2">
          Copy mobile/.env.example to mobile/.env.local and add your Supabase URL and anon key, or set EXPO_PUBLIC_DEMO=1 to try the
          app with a built-in demo partner.
        </Text>
      </View>
    </Screen>
  );
}
