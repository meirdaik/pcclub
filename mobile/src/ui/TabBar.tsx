import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';

import { PressableScale as Pressable } from './motion';
import { Icon, type IconName, Logo } from './navicons';
import { GUTTER, colors } from './theme';
import { GradientText, T } from './type';

type TabRoute = { key: string; name: string };

/** The parts of the tab navigator's props that this bar uses (as the router hands them over). */
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  emitter: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
  };
  navigateToTab: (routeKey: string) => void;
};

const TABS: Record<string, { label: string; icon: IconName | 'logo' }> = {
  index: { label: t.tabs.myClub, icon: 'club' },
  search: { label: t.tabs.search, icon: 'search' },
  book: { label: t.tabs.book, icon: 'logo' },
  wallet: { label: t.tabs.wallet, icon: 'wallet' },
  menu: { label: t.tabs.menu, icon: 'menu' },
};

/** Five tabs: icon over a label. The active one is drawn in the brand gradient. */
export function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const tab = TABS[route.name];
        if (!tab) return null;
        const press = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={press}
            scaleTo={0.9}
            wrapperStyle={styles.tab}
            style={styles.tabInner}
          >
            <View style={styles.icon}>
              {tab.icon === 'logo' ? (
                <View style={{ opacity: focused ? 1 : 0.6 }}>
                  <Logo size={22} />
                </View>
              ) : (
                <Icon name={tab.icon} size={26} filled={focused} color={colors.muted} />
              )}
            </View>
            {focused ? (
              <GradientText v="meta" style={styles.label}>
                {tab.label}
              </GradientText>
            ) : (
              <T v="meta" color={colors.muted} style={styles.label}>
                {tab.label}
              </T>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: GUTTER / 2,
    backgroundColor: colors.background,
  },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', gap: 2 },
  icon: { height: 34, justifyContent: 'center' },
  label: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    fontFamily: 'HankenGrotesk_600SemiBold',
    alignSelf: 'center',
  },
});
