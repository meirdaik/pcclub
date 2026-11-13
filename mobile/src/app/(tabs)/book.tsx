import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { type ClubLive, loadClubsLive } from '@/api/live';
import { formatKzt, t } from '@/i18n';
import { SAMPLE_RATING } from '@/lib/clubProfile';
import { useLoad } from '@/lib/useLoad';
import { usePoll } from '@/lib/usePoll';
import { Loadable, Screen, Strip } from '@/ui/components';
import { FadeIn, PressableScale as Pressable } from '@/ui/motion';
import { Logo, Stars } from '@/ui/navicons';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { T } from '@/ui/type';

/** Book: pick a club. Its row shows the address and rating; the rules come next. */
export default function BookScreen() {
  const router = useRouter();
  const state = useLoad(() => loadClubsLive(Date.now()), 'clubs-live');
  usePoll(state.reload, 20_000);

  return (
    <Screen inTabs refreshing={state.loading && state.data !== null} onRefresh={state.reload}>
      <View style={styles.top}>
        <Logo size={26} />
        <T v="wordmark">{t.clubs.wordmark}</T>
      </View>
      <T v="title" style={styles.title}>
        {t.tabs.book}
      </T>
      <Loadable state={state}>
        {(items) =>
          items.length === 0 ? (
            <T v="body" color={colors.muted} style={styles.empty}>
              {t.clubs.empty}
            </T>
          ) : (
            <View style={{ marginTop: 8 }}>
              {items.map((item, index) => (
                <FadeIn key={item.club.id} delay={index * 70}>
                  <ClubRow
                    item={item}
                    onPress={() =>
                      router.push({ pathname: '/rules/[clubId]', params: { clubId: item.club.id } })
                    }
                  />
                </FadeIn>
              ))}
            </View>
          )
        }
      </Loadable>
    </Screen>
  );
}

function ClubRow({ item, onPress }: { item: ClubLive; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.club.name}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
    >
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={styles.tile}
      >
        <T v="head" color={colors.onGradient}>
          {item.club.name[0]?.toUpperCase()}
        </T>
      </LinearGradient>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <T v="label" numberOfLines={1} style={{ fontSize: 17, lineHeight: 22 }}>
          {item.club.name}
        </T>
        <T v="meta" numberOfLines={1}>
          {`${item.club.city} · ${item.club.address}`}
        </T>
        <View style={styles.rating}>
          <Stars value={SAMPLE_RATING.value} size={14} />
          <T v="mono12" color={colors.text}>
            {SAMPLE_RATING.value.toFixed(1)}
          </T>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <T v="mono12">{item.fromPriceKzt === null ? '' : t.clubs.fromPrice(formatKzt(item.fromPriceKzt))}</T>
        <Strip total={item.total} free={item.free} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    height: 56,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { paddingHorizontal: GUTTER, marginTop: 4 },
  empty: { paddingHorizontal: GUTTER, paddingVertical: 16 },
  row: {
    minHeight: 84,
    paddingHorizontal: GUTTER,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tile: { width: 60, height: 60, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
