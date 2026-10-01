import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme/ThemeProvider';

export default function MainLayout() {
  const { t } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="rank" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
