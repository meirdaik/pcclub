import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors } from '@/ui/theme';
import { TabBar } from '@/ui/TabBar';

/** The five top-level destinations. Each draws its own header; the tab bar is the only chrome. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as unknown as ComponentProps<typeof TabBar>)} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="book" />
      <Tabs.Screen name="wallet" />
      <Tabs.Screen name="menu" />
    </Tabs>
  );
}
