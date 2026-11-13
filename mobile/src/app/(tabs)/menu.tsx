import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { Screen } from '@/ui/components';
import { FadeIn, PressableScale as Pressable } from '@/ui/motion';
import { Icon, type IconName } from '@/ui/navicons';
import { GUTTER, colors } from '@/ui/theme';
import { T } from '@/ui/type';

/**
 * Menu. Every entry is drawn; only Settings does anything yet, the rest are dimmed placeholders
 * that are not pressable.
 */
export default function MenuScreen() {
  const router = useRouter();
  const items: { icon: IconName; label: string; ready?: boolean }[] = [
    { icon: 'user', label: t.menu.account },
    { icon: 'promo', label: t.menu.promo },
    { icon: 'bookmark', label: t.menu.favorites },
    { icon: 'review', label: t.menu.reviews },
    { icon: 'gear', label: t.menu.settings, ready: true },
    { icon: 'doc', label: t.menu.privacy },
  ];
  return (
    <Screen inTabs>
      <View style={styles.title}>
        <T v="label" style={{ fontSize: 22, lineHeight: 28 }}>
          {t.menu.title}
        </T>
      </View>
      {items.map((item, index) => (
        <FadeIn key={item.label} delay={index * 50}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !item.ready }}
          disabled={!item.ready}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
        >
          <View style={[styles.icon, !item.ready && { opacity: 0.5 }]}>
            <Icon name={item.icon} size={26} filled />
          </View>
          <View style={styles.label}>
            <T v="label" color={item.ready ? colors.text : colors.muted} style={{ fontSize: 18, lineHeight: 24 }}>
              {item.label}
            </T>
          </View>
        </Pressable>
        </FadeIn>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { height: 56, alignItems: 'center', justifyContent: 'center' },
  row: { height: 64, paddingLeft: GUTTER, flexDirection: 'row', alignItems: 'center' },
  icon: { width: 56, alignItems: 'flex-start', justifyContent: 'center' },
  label: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    marginRight: GUTTER,
  },
});
