import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// Google sign-in returns here; the session is picked up by the auth listener and the gate moves on.
export default function AuthCallback() {
  const { t } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
      <ActivityIndicator color={t.co} />
    </View>
  );
}
