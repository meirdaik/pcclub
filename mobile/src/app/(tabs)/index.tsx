import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { type Booking, listBookings } from '@/api/endpoints';
import { type ClubLive, loadClubsLive } from '@/api/live';
import { useUser } from '@/auth/AuthContext';
import { formatInstantDay, formatKzt, t } from '@/i18n';
import { recentClubIds } from '@/lib/recentClubs';
import { formatTime, parseInstant } from '@/lib/time';
import { useLoad } from '@/lib/useLoad';
import { useNow } from '@/lib/useNow';
import { usePoll } from '@/lib/usePoll';
import { Button, Loadable, Screen } from '@/ui/components';
import { SAMPLE_RATING } from '@/lib/clubProfile';
import { FadeIn, PressableScale as Pressable } from '@/ui/motion';
import { Icon, Logo, Stars } from '@/ui/navicons';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

const FALLBACK_ZONE = 'Asia/Almaty';

const greeting = (now: number) => {
  const hour = new Date(now).getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

/** `*4567`: the last digits are enough to recognise the number. */
const maskPhone = (phone: string) => `*${phone.replace(/\D/g, '').slice(-4)}`;

/**
 * My Club. A returning player sees the club they were at last, and scrolls down through the
 * clubs before it, up to five. A new player sees the clubs, after being asked for location.
 */
export default function HomeScreen() {
  const router = useRouter();
  const user = useUser();
  const now = useNow(30_000);
  const [height, setHeight] = useState(0);
  const state = useLoad(async () => {
    const [page, live] = await Promise.all([listBookings(), loadClubsLive(Date.now())]);
    return { bookings: page.items, live };
  }, 'home');
  usePoll(state.reload, 20_000);

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Clutch';
  const initial = (user.first_name ?? name)[0]?.toUpperCase() ?? 'V';

  return (
    <Screen inTabs scroll={false}>
      <View style={styles.header}>
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            <T v="head" style={{ fontSize: 24, lineHeight: 26 }}>
              {initial}
            </T>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label" numberOfLines={1} style={{ fontSize: 22, lineHeight: 28 }}>
            {greeting(now)}
          </T>
          <T v="body" color={colors.muted} numberOfLines={1}>
            {`${name} · ${maskPhone(user.phone)}`}
          </T>
        </View>
        <Logo size={24} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.home.scan}
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.qr, pressed && { backgroundColor: colors.selected }]}
        >
          <Icon name="qr" size={28} filled />
        </Pressable>
      </View>

      <View style={{ flex: 1 }} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
        <Loadable state={state}>
          {({ bookings, live }) => {
            const ids = recentClubIds(bookings);
            const recent = ids.flatMap((id) => live.filter((item) => item.club.id === id));
            if (recent.length === 0) return <NearbyClubs clubs={live} />;
            return (
              <View style={{ flex: 1 }}>
                <ScrollView
                  pagingEnabled
                  bounces
                  alwaysBounceVertical
                  overScrollMode="always"
                  showsVerticalScrollIndicator={false}
                  decelerationRate="fast"
                  style={{ flex: 1 }}
                >
                  {recent.map((item, index) => (
                    <View key={item.club.id} style={{ height: Math.max(height, 420) }}>
                      <FadeIn delay={index * 80}>
                        <ClubPanel item={item} bookings={bookings} now={now} />
                      </FadeIn>
                      {recent.length > 1 ? (
                        <T v="meta" style={styles.pageHint}>
                          {t.home.page(index + 1, recent.length)}
                        </T>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          }}
        </Loadable>
      </View>
    </Screen>
  );
}

function ClubPanel({
  item,
  bookings,
  now,
}: {
  item: ClubLive;
  bookings: Booking[];
  now: number;
}) {
  const router = useRouter();
  const zone = item.club.timezone || FALLBACK_ZONE;
  const mine = bookings.filter((booking) => booking.club_id === item.club.id);
  const lastVisit = mine
    .filter((booking) => booking.status === 'confirmed' || booking.status === 'completed')
    .sort((a, b) => parseInstant(b.starts_at) - parseInstant(a.starts_at))[0];
  // The booking to show: the one running now, else the next one that is paid or awaiting payment.
  const live = mine
    .filter((booking) => {
      const end = parseInstant(booking.ends_at);
      const holding =
        booking.status === 'pending_payment' &&
        booking.hold_expires_at !== null &&
        parseInstant(booking.hold_expires_at) > now;
      return end > now && (booking.status === 'confirmed' || holding);
    })
    .sort((a, b) => parseInstant(a.starts_at) - parseInstant(b.starts_at))[0];
  const pcLabel = item.pcs.find((pc) => pc.id === live?.pc_id)?.label ?? '';

  return (
    <View style={styles.panel}>
      <View style={styles.panelTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="head" numberOfLines={2}>
            {item.club.name}
          </T>
          <T v="meta" style={{ marginTop: 4 }}>
            {`${item.club.city} · ${item.club.address}`}
          </T>
          {lastVisit ? (
            <T v="meta" style={{ marginTop: 4 }}>
              {t.home.lastVisit(formatInstantDay(parseInstant(lastVisit.starts_at), zone))}
            </T>
          ) : null}
        </View>
      </View>

      <View style={styles.free}>
        <GradientText v="title">{SAMPLE_RATING.value.toFixed(1)}</GradientText>
        <View style={{ paddingBottom: 10, gap: 4 }}>
          <Stars value={SAMPLE_RATING.value} />
          <T v="meta">{`${t.info.reviews(SAMPLE_RATING.count)} · ${t.info.source}`}</T>
        </View>
      </View>

      <Button
        title={t.home.book}
        arrow
        notchColor={colors.surface}
        onPress={() => router.push({ pathname: '/rules/[clubId]', params: { clubId: item.club.id } })}
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/bookings')}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.selected }]}
      >
        <View style={{ flex: 1 }}>
          <T v="eyebrow">{t.home.bookings}</T>
          <T v="label" color={live ? colors.text : colors.muted} style={{ marginTop: 4 }}>
            {live
              ? t.home.nextBooking(
                  pcLabel || '—',
                  `${formatInstantDay(parseInstant(live.starts_at), zone)} · ${formatTime(parseInstant(live.starts_at), zone)}–${formatTime(parseInstant(live.ends_at), zone)}`,
                )
              : t.home.noBookings}
          </T>
          {live ? (
            <T v="meta" style={{ marginTop: 2 }}>
              {formatKzt(live.price_kzt)}
            </T>
          ) : null}
        </View>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/clubs/[clubId]', params: { clubId: item.club.id } })}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.selected }]}
      >
        <T v="label" style={{ flex: 1 }}>
          {t.home.clubInfo}
        </T>
        <Icon name="chevronRight" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

/** First visit: ask for location, then list the clubs. */
function NearbyClubs({ clubs }: { clubs: ClubLive[] }) {
  const router = useRouter();
  const [permission, request] = Location.useForegroundPermissions();
  const granted = permission?.granted ?? false;
  return (
    <ScrollView
      bounces
      alwaysBounceVertical
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ paddingHorizontal: GUTTER, paddingTop: 8 }}>
        <T v="title" style={{ fontSize: 48, lineHeight: 44 }}>
          {t.home.welcome}
        </T>
        <T v="body" color={colors.muted} style={{ marginTop: 8 }}>
          {t.home.pickFirst}
        </T>
      </View>
      {!granted ? (
        <View style={styles.notice}>
          <T v="body">{permission && !permission.canAskAgain ? t.home.locationOff : t.home.nearNote}</T>
          {!permission || permission.canAskAgain ? (
            <View style={{ marginTop: 12 }}>
              <Button
                title={t.home.allowLocation}
                variant="secondary"
                onPress={() => void request()}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <T v="meta" style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
          {t.home.nearNote}
        </T>
      )}
      <T v="eyebrow" style={{ paddingHorizontal: GUTTER, marginTop: 20, marginBottom: 8 }}>
        {t.home.nearTitle}
      </T>
      {clubs.map((item) => (
        <Pressable
          key={item.club.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/clubs/[clubId]', params: { clubId: item.club.id } })}
          style={({ pressed }) => [styles.nearRow, pressed && { backgroundColor: colors.surface }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <T v="label" numberOfLines={1}>
              {item.club.name}
            </T>
            <T v="meta" numberOfLines={1}>
              {`${item.club.city} · ${item.club.address}`}
            </T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <T v="head">{item.free}</T>
            <T v="mono12">{`/${item.total}`}</T>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: { width: 56, height: 56, borderRadius: 28, padding: 2 },
  avatar: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qr: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    marginHorizontal: GUTTER,
    marginTop: 8,
    padding: 20,
    gap: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  panelTop: { flexDirection: 'row', gap: 12 },
  free: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  row: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    backgroundColor: colors.selected,
  },
  pageHint: { textAlign: 'center', marginTop: 12 },
  notice: {
    marginHorizontal: GUTTER,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  nearRow: {
    minHeight: 72,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
