import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// The root layout's gate redirects from here once the session has loaded.
export default function Index() {
  const { t } = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.hero }} />;
}
