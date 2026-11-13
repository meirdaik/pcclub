import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { ApiError } from '@/api/client';
import { type Pc, createBooking, listPackages } from '@/api/endpoints';
import { type FloorPlan, type Seat, loadFloorPlan } from '@/api/live';
import { errorMessage, formatInstantDay, formatKzt, t } from '@/i18n';
import { packageTypeKey } from '@/lib/packageRows';
import { countStates, seatCellLabel } from '@/lib/seats';
import { estimatePriceKzt } from '@/lib/slots';
import { formatTime } from '@/lib/time';
import { useLoad } from '@/lib/useLoad';
import { usePoll } from '@/lib/usePoll';
import { Button, Header, Notice, Screen } from '@/ui/components';
import { Icon } from '@/ui/navicons';
import { LegendItem, SeatCell } from '@/ui/seats';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

const specsLine = (specs: Pc['specs']) =>
  Object.values(specs)
    .filter((value) => typeof value === 'string' || typeof value === 'number')
    .join(' · ')
    ;

function chunk<Item>(items: Item[], size: number): Item[][] {
  const out: Item[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** A grey block that pulses while the floor plan loads. */
function Skeleton({ style, delay = 0 }: { style: ViewStyle; delay?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);
  return <Animated.View style={[{ backgroundColor: colors.line, opacity }, style]} />;
}

/** The floor plan while the request is in flight: the same frame, grey blocks for seats. */
function FloorSkeleton() {
  const room = (delay: number) => (
    <View style={[styles.room, { flex: 1 }]}>
      <Skeleton style={{ width: 80, height: 20 }} delay={delay} />
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} delay={delay} style={{ width: '30%', flexGrow: 1, height: 48, borderRadius: 10 }} />
        ))}
      </View>
    </View>
  );
  return (
    <View style={styles.frame} accessibilityLabel={t.seats.loadingPlan} accessibilityRole="progressbar">
      <View style={styles.roomsRow}>
        {room(0)}
        {room(150)}
      </View>
      {room(300)}
    </View>
  );
}

/** Seat map: tap a free seat. Seat status is live from the API and refreshes while open. */
export default function SeatsScreen() {
  const { clubId, start, end, pkg } = useLocalSearchParams<{
    clubId: string;
    start?: string;
    end?: string;
    /** The kind of package chosen before the seat (see `packageTypeKey`), if any. */
    pkg?: string;
  }>();
  const router = useRouter();
  const stay = start && end ? { from: Number(start), to: Number(end) } : undefined;
  const state = useLoad(
    () => loadFloorPlan(clubId, Date.now(), stay),
    `seats:${clubId}:${start}:${end}`,
  );
  usePoll(state.reload, 15_000);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const packagesState = useLoad(
    async () => (pkg ? ((await listPackages(clubId).catch(() => [])) ?? []) : []),
    `seat-packages:${clubId}:${pkg ?? ''}`,
  );
  const plan = state.data;
  const packages = packagesState.data;
  const loading = (plan === null || packages === null) && !state.error;
  // A package costs something different in every zone: the seat's zone decides which one
  // applies, and a zone that does not sell the package cannot be picked.
  const packageFor = (zoneId: string) =>
    pkg
      ? (packages?.find((item) => item.zone_id === zoneId && packageTypeKey(item) === pkg) ?? null)
      : null;
  const seats: Seat[] = (plan && packages ? plan.seats : []).map((seat) =>
    pkg && !packageFor(seat.pc.zone_id) ? { ...seat, state: 'off' } : seat,
  );
  const picked = seats.find((seat) => seat.pc.id === pickedId && seat.state === 'free') ?? null;
  const minutes = stay ? Math.round((stay.to - stay.from) / 60_000) : 0;
  // The price shows only now: a package's price in the seat's zone, or the custom time worked
  // out at that zone's hourly rate.
  const total = picked
    ? pkg
      ? (packageFor(picked.pc.zone_id)?.price_kzt ?? null)
      : estimatePriceKzt(picked.pc.price_per_hour_kzt, minutes)
    : null;
  const counts = countStates(seats.map((seat) => seat.state));
  const zone = plan?.club.timezone ?? 'Asia/Almaty';

  async function submit(seat: Seat) {
    if (!stay) return;
    const match = pkg ? packageFor(seat.pc.zone_id) : null;
    if (pkg && !match) return;
    setSubmitting(true);
    setError(null);
    try {
      const startsAt = new Date(stay.from).toISOString();
      const booking = await createBooking(
        match
          ? { pc_id: seat.pc.id, starts_at: startsAt, package_id: match.id }
          : { pc_id: seat.pc.id, starts_at: startsAt, ends_at: new Date(stay.to).toISOString() },
      );
      router.replace({ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } });
    } catch (caught) {
      setError(errorMessage(caught));
      if (!(caught instanceof ApiError && caught.code === 'MINOR_NIGHT_RESTRICTION')) state.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <View style={{ gap: 4 }}>
            <T v="label" style={{ fontSize: 18 }}>
              {stay
                ? `${formatTime(stay.from, zone)} – ${formatTime(stay.to, zone)}`
                : t.floor.title}
              {stay ? (
                <T v="label" color={colors.muted} style={{ fontSize: 18 }}>
                  {`  ${formatInstantDay(stay.from, zone)}`}
                </T>
              ) : null}
            </T>
            <T v="body" color={colors.muted} style={{ fontSize: 16 }}>
              {picked
                ? `${t.floor.selected(1)} · ${picked.pc.label}`
                : t.floor.selected(0)}
            </T>
          </View>
          {picked && total !== null ? (
            <View style={styles.totalRow}>
              <View>
                <T v="eyebrow">{t.packages.total}</T>
                <GradientText v="head">{formatKzt(total)}</GradientText>
              </View>
              <T v="meta" style={{ flexShrink: 1, textAlign: 'right' }}>
                {pkg ? t.floor.packagePrice : t.floor.calculated}
              </T>
            </View>
          ) : null}
          {error ? (
            <View style={{ marginTop: 12 }}>
              <Notice>{error}</Notice>
            </View>
          ) : null}
          <View style={{ marginTop: 16 }}>
            <Button
              title={loading ? t.seats.loadingSeats : t.packages.continue}
              arrow
              disabled={!picked || !stay}
              loading={submitting}
              onPress={() => {
                if (picked) void submit(picked);
              }}
            />
          </View>
        </>
      }
    >
      <Header back={t.reserve.title} onBack={() => router.back()} />
      <View style={styles.club}>
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={styles.tile}
        >
          <T v="head" color={colors.onGradient}>
            {plan?.club.name[0]?.toUpperCase() ?? ''}
          </T>
        </LinearGradient>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label" numberOfLines={1} style={{ fontSize: 20, lineHeight: 24 }}>
            {plan?.club.name ?? ' '}
          </T>
          <T v="meta" numberOfLines={1}>
            {plan ? `${plan.club.city} · ${plan.club.address}` : t.seats.loadingPlan}
          </T>
        </View>
      </View>

      <View style={styles.legend}>
        <LegendItem state="free" label={plan ? `${t.seats.free} ${counts.free}` : t.seats.free} />
        <LegendItem state="busy" label={plan ? `${t.seats.inUse} ${counts.busy}` : t.seats.inUse} />
        <LegendItem state="booked" label={plan ? `${t.seats.booked} ${counts.booked}` : t.seats.booked} />
        <LegendItem state="off" label={plan ? `${t.seats.off} ${counts.off}` : t.seats.off} />
      </View>

      {state.error && !plan ? (
        <View style={{ padding: GUTTER, gap: 12 }}>
          <Notice>{errorMessage(state.error)}</Notice>
          <Button title={t.common.retry} variant="secondary" onPress={state.reload} />
        </View>
      ) : plan && packages ? (
        <Floor
          plan={plan}
          seats={seats}
          pickedId={picked?.pc.id ?? null}
          onPick={(id) => setPickedId((current) => (current === id ? null : id))}
          roomPrice={(zoneId, pc) => {
            if (!pkg) return `${formatKzt(pc.price_per_hour_kzt)}${t.common.perHour}`;
            const match = packageFor(zoneId);
            return match ? formatKzt(match.price_kzt) : t.floor.notSold;
          }}
        />
      ) : (
        <FloorSkeleton />
      )}
      <View style={styles.entrance}>
        <Icon name="chevronRight" size={16} color={colors.muted} />
        <T v="eyebrow">{t.floor.entrance}</T>
      </View>
    </Screen>
  );
}

type Room = { id: string; name: string; seats: Seat[] };

/**
 * The club drawn as a floor plan: rooms for the zones, the admin desk and toilets in the
 * corridor, and a gap in the wall for the entrance. The first two zones share the top row;
 * any others get a full-width room below.
 */
function Floor({
  plan,
  seats,
  pickedId,
  onPick,
  roomPrice,
}: {
  plan: FloorPlan;
  seats: Seat[];
  pickedId: string | null;
  onPick: (id: string) => void;
  roomPrice: (zoneId: string, pc: Pc) => string;
}) {
  const rooms: Room[] = plan.zones
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      seats: seats.filter((seat) => seat.pc.zone_id === zone.id),
    }))
    .filter((room) => room.seats.length > 0);
  const top = rooms.slice(0, 2);
  const rest = rooms.slice(2);

  const renderRoom = (room: Room, columns: number) => {
    const first = room.seats[0].pc;
    return (
      <View key={room.id} style={[styles.room, columns > 3 ? null : { flex: 1 }]}>
        <T v="zone" numberOfLines={1}>
          {room.name}
        </T>
        <T v="meta" numberOfLines={1} style={{ letterSpacing: 0.3 }}>
          {[specsLine(first.specs), roomPrice(room.id, first)]
            .filter(Boolean)
            .join(' · ')}
        </T>
        <View style={{ marginTop: 10, gap: 6 }}>
          {chunk(room.seats, columns).map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 6 }}>
              {row.map((seat) => (
                <View key={seat.pc.id} style={{ flex: 1 }}>
                  <SeatCell
                    state={seat.state}
                    label={seatCellLabel(seat.pc.label)}
                    selected={seat.pc.id === pickedId}
                    accessibilityLabel={t.seats.cellLabel(
                      seat.pc.label,
                      seat.pc.id === pickedId ? 'selected' : seat.state,
                    )}
                    onPress={() => onPick(seat.pc.id)}
                  />
                </View>
              ))}
              {Array.from({ length: columns - row.length }, (_, k) => (
                <View key={`pad${k}`} style={{ flex: 1 }} />
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.frame}>
      <View style={styles.roomsRow}>{top.map((room) => renderRoom(room, 3))}</View>
      <View style={styles.corridor}>
        <View style={styles.tag}>
          <Icon name="user" size={16} color={colors.muted} />
          <T v="meta">{t.floor.desk}</T>
        </View>
        <View style={styles.tag}>
          <T v="meta">{t.floor.wc}</T>
        </View>
      </View>
      {rest.map((room) => renderRoom(room, Math.min(5, room.seats.length)))}
      <View style={styles.door} />
    </View>
  );
}

const styles = StyleSheet.create({
  club: {
    paddingHorizontal: GUTTER,
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tile: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  legend: {
    marginHorizontal: GUTTER,
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: 8,
    rowGap: 6,
  },
  frame: {
    marginHorizontal: GUTTER,
    marginTop: 12,
    padding: 10,
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  roomsRow: { flexDirection: 'row', gap: 10 },
  room: {
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  corridor: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  tag: {
    height: 32,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  door: {
    position: 'absolute',
    left: '50%',
    marginLeft: -40,
    bottom: -2,
    width: 80,
    height: 2,
    backgroundColor: colors.background,
  },
  totalRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  entrance: { marginTop: 8, flexDirection: 'row', justifyContent: 'center', gap: 6, alignItems: 'center' },
});
