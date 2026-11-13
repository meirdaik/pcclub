import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  type Booking,
  type Club,
  type Pc,
  createBooking,
  listBookings,
  listClubs,
  listPcs,
} from '@/api/endpoints';
import { errorMessage, formatDuration, formatHoursLeft, formatInstantDay, formatKzt, t } from '@/i18n';
import { formatTime, parseInstant } from '@/lib/time';
import { useLoad } from '@/lib/useLoad';
import { useNow } from '@/lib/useNow';
import {
  Button,
  Header,
  Loadable,
  Notice,
  Perforation,
  Screen,
  SectionLabel,
  Tag,
  TicketFrame,
} from '@/ui/components';
import { Hatch } from '@/ui/icons';
import { GUTTER, colors } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

const FALLBACK_ZONE = 'Asia/Almaty';

type Loaded = {
  page: { items: Booking[]; next_cursor: string | null };
  clubs: Map<string, Club>;
  pcs: Map<string, Pc>;
};

/** Sessions: the one being played, what is coming up, and history. All times are club time. */
export default function BookingsScreen() {
  const router = useRouter();
  const now = useNow(15_000);
  const [extra, setExtra] = useState<{ items: Booking[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = useLoad<Loaded>(async () => {
    const [page, clubs] = await Promise.all([listBookings(), listClubs()]);
    setExtra(null);
    const clubIds = [...new Set(page.items.map((item) => item.club_id))];
    const lists = await Promise.all(clubIds.map((id) => listPcs(id).catch((): Pc[] => [])));
    return {
      page,
      clubs: new Map((clubs ?? []).map((club) => [club.id, club])),
      pcs: new Map(lists.flatMap((list) => (list ?? []).map((pc) => [pc.id, pc] as const))),
    };
  }, 'bookings');

  async function loadMore(cursor: string) {
    setLoadingMore(true);
    setError(null);
    try {
      const page = await listBookings(cursor);
      setExtra((previous) => ({
        items: [...(previous?.items ?? []), ...page.items],
        cursor: page.next_cursor,
      }));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }

  /** "+1 hour" is a new booking that starts where this one ends; it is paid like any other. */
  async function addHour(booking: Booking) {
    setExtending(true);
    setError(null);
    try {
      const start = parseInstant(booking.ends_at);
      const created = await createBooking({
        pc_id: booking.pc_id,
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(start + 60 * 60_000).toISOString(),
      });
      router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: created.id } });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setExtending(false);
    }
  }

  const open = (id: string) =>
    router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: id } });

  return (
    <Screen refreshing={state.loading && state.data !== null} onRefresh={state.reload}>
      <Header back={t.tabs.myClub} onBack={() => router.back()} />
      <Loadable state={state}>
        {({ page, clubs, pcs }) => {
          const items = [...page.items, ...(extra?.items ?? [])];
          const cursor = extra ? extra.cursor : page.next_cursor;
          const zoneOf = (b: Booking) => clubs.get(b.club_id)?.timezone ?? FALLBACK_ZONE;
          const startOf = (b: Booking) => parseInstant(b.starts_at);
          const endOf = (b: Booking) => parseInstant(b.ends_at);
          const holdAlive = (b: Booking) =>
            b.status === 'pending_payment' && (b.hold_expires_at ? parseInstant(b.hold_expires_at) > now : false);

          const playing = items.filter((b) => b.status === 'confirmed' && startOf(b) <= now && now < endOf(b));
          const active = playing[0] ?? null;
          const upcoming = items
            .filter(
              (b) =>
                b !== active &&
                ((b.status === 'confirmed' && endOf(b) > now && startOf(b) > now) || holdAlive(b)),
            )
            .sort((a, b) => startOf(a) - startOf(b));
          const shown = new Set([active, ...upcoming]);
          const history = items.filter((b) => !shown.has(b));

          if (items.length === 0) return <EmptySessions clubCount={clubs.size} />;

          const rest = Math.max(0, playing.length - 1);
          return (
            <>
              <View style={styles.head}>
                <T v="eyebrow">{t.bookings.counts(active ? 1 : 0, upcoming.length + rest)}</T>
                <T v="title" style={{ marginTop: 4 }}>
                  {t.bookings.title}
                </T>
              </View>

              {active ? (
                <ActiveCard
                  booking={active}
                  now={now}
                  clubName={clubs.get(active.club_id)?.name ?? '—'}
                  pc={pcs.get(active.pc_id) ?? null}
                  zone={zoneOf(active)}
                  busy={extending}
                  onAdd={() => void addHour(active)}
                />
              ) : null}
              {error ? (
                <View style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
                  <Notice>{error}</Notice>
                </View>
              ) : null}

              {upcoming.length > 0 ? (
                <>
                  <SectionLabel left={t.bookings.upcoming} />
                  <View style={styles.list}>
                    {upcoming.map((b) => {
                      const zone = zoneOf(b);
                      const minutes = Math.round((endOf(b) - startOf(b)) / 60_000);
                      return (
                        <Pressable
                          key={b.id}
                          accessibilityRole="button"
                          onPress={() => open(b.id)}
                          style={({ pressed }) => [styles.upRow, pressed && { backgroundColor: colors.surface }]}
                        >
                          <View style={styles.upLeft}>
                            <T v="head">{pcs.get(b.pc_id)?.label ?? '—'}</T>
                            <View style={{ flexShrink: 1 }}>
                              <T v="label" numberOfLines={1}>
                                {`${clubs.get(b.club_id)?.name ?? '—'} · ${formatDuration(minutes)}`}
                              </T>
                              <T v="meta">
                                {`${formatInstantDay(startOf(b), zone)} · ${formatTime(startOf(b), zone)}–${formatTime(endOf(b), zone)}`}
                              </T>
                            </View>
                          </View>
                          <Tag
                            label={b.status === 'confirmed' ? t.bookings.paid : t.bookings.payNow}
                            tone={b.status === 'confirmed' ? 'plain' : 'accent'}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {history.length > 0 ? (
                <>
                  <SectionLabel left={t.bookings.history} top={16} />
                  {history.map((b) => {
                    const zone = zoneOf(b);
                    const minutes = Math.round((endOf(b) - startOf(b)) / 60_000);
                    return (
                      <Pressable
                        key={b.id}
                        accessibilityRole="button"
                        onPress={() => open(b.id)}
                        style={({ pressed }) => [styles.histRow, pressed && { backgroundColor: colors.surface }]}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T v="body" numberOfLines={1}>
                            {`${clubs.get(b.club_id)?.name ?? '—'} · ${formatDuration(minutes)}`}
                          </T>
                          {b.status !== 'confirmed' && b.status !== 'completed' ? (
                            <T v="meta">{(t.status[b.status] ?? b.status)}</T>
                          ) : null}
                        </View>
                        <T v="mono12">
                          {`${formatInstantDay(startOf(b), zone)} · ${formatKzt(b.price_kzt)}`}
                        </T>
                      </Pressable>
                    );
                  })}
                </>
              ) : null}
              {cursor ? (
                <View style={{ padding: GUTTER }}>
                  <Button
                    title={t.bookings.more}
                    variant="secondary"
                    loading={loadingMore}
                    onPress={() => void loadMore(cursor)}
                  />
                </View>
              ) : null}
            </>
          );
        }}
      </Loadable>
    </Screen>
  );
}

function ActiveCard({
  booking,
  now,
  clubName,
  pc,
  zone,
  busy,
  onAdd,
}: {
  booking: Booking;
  now: number;
  clubName: string;
  pc: Pc | null;
  zone: string;
  busy: boolean;
  onAdd: () => void;
}) {
  const start = parseInstant(booking.starts_at);
  const end = parseInstant(booking.ends_at);
  const done = Math.min(1, Math.max(0, (now - start) / (end - start)));
  const hourly = pc?.price_per_hour_kzt ?? null;
  return (
    <View style={{ marginHorizontal: GUTTER, marginTop: 16 }}>
      <TicketFrame>
        <View style={styles.activeTop}>
          <View style={styles.spread}>
            <T v="eyebrow">{t.bookings.playingNow}</T>
            <T v="eyebrow">{t.bookings.seat}</T>
          </View>
          <View style={[styles.spread, { marginTop: 8, alignItems: 'flex-end' }]}>
            <GradientText v="num">{formatHoursLeft(end - now)}</GradientText>
            <T v="head" style={{ paddingBottom: 4 }}>
              {pc?.label ?? '—'}
            </T>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(done * 100)}%` }]} />
          </View>
          <View style={[styles.spread, { marginTop: 8 }]}>
            <T v="mono12">{formatTime(start, zone)}</T>
            <T v="mono12" numberOfLines={1} style={{ flexShrink: 1 }}>
              {`${clubName} · ${pc?.zone_name ?? ''}`}
            </T>
            <T v="mono12">{formatTime(end, zone)}</T>
          </View>
        </View>
        <Perforation />
        <View style={styles.activeBottom}>
          <Button
            title={t.bookings.addHour}
            right={hourly === null ? undefined : formatKzt(hourly)}
            accessibilityLabel={hourly === null ? t.bookings.addHour : t.bookings.addHourLabel(formatKzt(hourly))}
            notchColor={colors.surface}
            loading={busy}
            disabled={hourly === null}
            onPress={onAdd}
          />
        </View>
      </TicketFrame>
    </View>
  );
}

function EmptySessions({ clubCount }: { clubCount: number }) {
  const router = useRouter();
  const steps: [string, string, string][] = [
    ['01', t.bookings.step1, t.bookings.clubsCount(clubCount)],
    ['02', t.bookings.step2, t.bookings.live],
    ['03', t.bookings.step3, t.bookings.minute],
  ];
  return (
    <>
      <View style={styles.head}>
        <T v="eyebrow">{t.bookings.nothing}</T>
        <T v="title" style={{ marginTop: 4 }}>
          {t.bookings.title}
        </T>
      </View>
      <View style={{ marginHorizontal: GUTTER, marginTop: 16 }}>
        <TicketFrame dashed>
          <View style={styles.activeTop}>
            <View style={styles.spread}>
              <T v="eyebrow">{t.bookings.nextSeat}</T>
              <T v="eyebrow">{t.bookings.notBooked}</T>
            </View>
            <T v="title" style={{ marginTop: 12 }}>
              {t.bookings.noSeat}
            </T>
            <T v="body" color={colors.muted} style={{ marginTop: 8 }}>
              {t.bookings.emptyHint}
            </T>
          </View>
          <Perforation edge={colors.muted} />
          <View style={[styles.activeBottom, styles.spread, { alignItems: 'center' }]}>
            <View>
              {[t.bookings.seatDash, t.bookings.fromDash, t.bookings.untilDash].map((line) => (
                <T key={line} v="meta">
                  {line}
                </T>
              ))}
            </View>
            <View style={styles.emptyCode}>
              <Hatch />
            </View>
          </View>
        </TicketFrame>
      </View>
      <View style={[styles.list, { marginTop: 16 }]}>
        {steps.map(([n, text, hint]) => (
          <View key={n} style={styles.step}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
              <T v="mono12">{n}</T>
              <T v="body">{text}</T>
            </View>
            <T v="meta">{hint}</T>
          </View>
        ))}
      </View>
      <View style={{ marginHorizontal: GUTTER, marginTop: 16 }}>
        <Button title={t.bookings.find} arrow onPress={() => router.navigate('/book')} />
      </View>
      <Button title={t.bookings.openMap} variant="link" onPress={() => router.navigate('/search')} />
    </>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 12 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  activeTop: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12 },
  activeBottom: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16 },
  track: { marginTop: 12, height: 4, backgroundColor: colors.line },
  fill: { height: 4, backgroundColor: colors.text },
  list: { borderBottomWidth: 1, borderBottomColor: colors.line },
  upRow: {
    minHeight: 64,
    paddingHorizontal: GUTTER,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  upLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
  histRow: {
    minHeight: 48,
    paddingHorizontal: GUTTER,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  step: {
    height: 48,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  emptyCode: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    overflow: 'hidden',
  },
});
