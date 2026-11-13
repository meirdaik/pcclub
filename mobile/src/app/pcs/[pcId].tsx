import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import {
  type Package,
  createBooking,
  getClub,
  getPcAvailability,
  listPackages,
  listPcs,
} from '@/api/endpoints';
import { errorMessage, formatDay, formatDuration, formatKzt, t } from '@/i18n';
import { canStartPackage, packageEnd } from '@/lib/packages';
import {
  MAX_ADVANCE_DAYS,
  MAX_BOOKING_MINUTES,
  MIN_BOOKING_MINUTES,
  SLOT_MINUTES,
  clampDuration,
  daySlotStarts,
  estimatePriceKzt,
  openingHours,
  overlapsAny,
  slotEnd,
} from '@/lib/slots';
import { addDays, dateKey, formatTime, parseInstant, toZoned } from '@/lib/time';
import { useLoad } from '@/lib/useLoad';
import { useNow } from '@/lib/useNow';
import { Button, Chip, Header, Loadable, Notice, Screen } from '@/ui/components';
import { GUTTER, colors, space, type } from '@/ui/theme';

/** Text styles of this older picker, expressed in the new type scale. */
const font = {
  small: { ...type.body, color: colors.muted },
  heading: type.label,
  body: type.body,
};

/** What the package covers, e.g. "3 ч от выбранного начала." */
function describePackage(item: Package): string {
  if (item.duration_minutes !== null) {
    return t.booking.packageDuration(formatDuration(item.duration_minutes));
  }
  return t.booking.packageWindow(
    (item.window_start ?? '').slice(0, 5),
    (item.window_end ?? '').slice(0, 5),
  );
}

/**
 * Pick a day, a tariff (hourly, or one of the zone's packages) and a start on the club's clock,
 * then hold the PC. With a package the server decides the end time and the price.
 */
export default function BookPcScreen() {
  const { pcId, clubId } = useLocalSearchParams<{ pcId: string; clubId: string }>();
  const router = useRouter();
  // Refreshed twice a minute, so past slots grey out while the screen stays open.
  const now = useNow(30_000);

  const [day, setDay] = useState<string | null>(null); // club-local YYYY-MM-DD; null = today
  const [start, setStart] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(MIN_BOOKING_MINUTES);
  const [packageId, setPackageId] = useState<string | null>(null); // null = hourly
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = useLoad(async () => {
    const [club, pcs] = await Promise.all([getClub(clubId), listPcs(clubId)]);
    const pc = pcs.find((item) => item.id === pcId);
    if (!pc) throw new ApiError('NOT_FOUND', 'PC is not bookable', 404);
    // Packages are an extra: if they fail to load, hourly booking still works.
    const packages = await listPackages(clubId, pc.zone_id).catch((): Package[] => []);
    return { club, pc, packages };
  }, `book:${clubId}:${pcId}`);

  const timeZone = base.data?.club.timezone ?? null;
  const today = timeZone ? dateKey(toZoned(now, timeZone)) : null;
  const selectedDay = day ?? today;

  const availability = useLoad(
    async () => (selectedDay ? getPcAvailability(pcId, selectedDay) : null),
    `availability:${pcId}:${selectedDay}`,
  );

  const busy = useMemo(
    () =>
      (availability.data?.busy ?? []).map((interval) => ({
        start: parseInstant(interval.starts_at),
        end: parseInstant(interval.ends_at),
      })),
    [availability.data],
  );

  async function submit(startMs: number) {
    setSubmitting(true);
    setError(null);
    try {
      const startsAt = new Date(startMs).toISOString();
      const booking = await createBooking(
        packageId !== null
          ? { pc_id: pcId, starts_at: startsAt, package_id: packageId }
          : {
              pc_id: pcId,
              starts_at: startsAt,
              ends_at: new Date(slotEnd(startMs, minutes)).toISOString(),
            },
      );
      router.replace({ pathname: '/bookings/[bookingId]', params: { bookingId: booking.id } });
    } catch (caught) {
      setError(errorMessage(caught));
      availability.reload(); // the slot may just have been taken
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Header back={t.packages.back} right={base.data ? t.booking.title(base.data.pc.label) : undefined} />
      <Loadable state={base}>
        {({ club, pc, packages }) => {
          const zone = club.timezone;
          const days = Array.from({ length: MAX_ADVANCE_DAYS + 1 }, (_, i) => addDays(today!, i));
          const starts = daySlotStarts(
            selectedDay!,
            zone,
            openingHours(club.opens_at, club.closes_at),
          );
          const chosen = packages.find((item) => item.id === packageId) ?? null;
          const isFree = (slot: number) =>
            slot > now &&
            !overlapsAny({ start: slot, end: slotEnd(slot, SLOT_MINUTES) }, busy) &&
            (chosen === null || canStartPackage(chosen, slot, zone));
          // A package decides the end; the server recomputes it and has the final word.
          const end =
            start === null
              ? null
              : chosen
                ? packageEnd(chosen, start, zone)
                : slotEnd(start, minutes);
          const selection = start === null || end === null ? null : { start, end };
          const pickTariff = (item: Package | null) => {
            setPackageId(item?.id ?? null);
            setError(null);
            // Keep the chosen start only if the new tariff can begin there.
            if (item && start !== null && !canStartPackage(item, start, zone)) setStart(null);
          };
          const conflict = selection !== null && overlapsAny(selection, busy);
          const inPast = selection !== null && selection.start <= now;

          return (
            <View style={styles.page}>
              <Text style={font.small}>
                {pc.zone_name} · {formatKzt(pc.price_per_hour_kzt)} {t.common.perHour}
              </Text>

              <Text style={font.heading}>{t.booking.day}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayRow}
              >
                {days.map((key, index) => (
                  <Chip
                    key={key}
                    label={
                      index === 0 ? t.booking.today : index === 1 ? t.booking.tomorrow : formatDay(key)
                    }
                    selected={key === selectedDay}
                    onPress={() => {
                      setDay(key);
                      setStart(null);
                      setError(null);
                    }}
                  />
                ))}
              </ScrollView>

              {packages.length > 0 ? (
                <>
                  <Text style={font.heading}>{t.booking.tariff}</Text>
                  <View style={styles.slotGrid}>
                    <Chip
                      label={t.booking.hourly}
                      sublabel={`${formatKzt(pc.price_per_hour_kzt)} ${t.common.perHour}`}
                      selected={chosen === null}
                      onPress={() => pickTariff(null)}
                    />
                    {packages.map((item) => (
                      <Chip
                        key={item.id}
                        label={
                          item.is_night ? `${item.name} · ${t.booking.adultsOnly}` : item.name
                        }
                        sublabel={formatKzt(item.price_kzt)}
                        selected={item.id === packageId}
                        onPress={() => pickTariff(item)}
                      />
                    ))}
                  </View>
                  {chosen ? <Text style={font.small}>{describePackage(chosen)}</Text> : null}
                  {chosen?.is_night ? (
                    <Notice tone="warning">{t.booking.nightPackage}</Notice>
                  ) : null}
                </>
              ) : null}

              <Text style={font.heading}>{t.booking.start}</Text>
              <Text style={font.small}>{t.booking.clubTime(zone)}</Text>
              {availability.error ? (
                <Notice>{errorMessage(availability.error)}</Notice>
              ) : availability.data === null ? (
                <Text style={font.small}>{t.common.loading}</Text>
              ) : starts.some(isFree) ? (
                <View style={styles.slotGrid}>
                  {starts.map((slot) => {
                    const inSelection =
                      selection !== null && slot >= selection.start && slot < selection.end;
                    return (
                      <View key={slot} style={inSelection && slot !== start ? styles.inRange : null}>
                        <Chip
                          label={formatTime(slot, zone)}
                          selected={slot === start}
                          disabled={!isFree(slot)}
                          onPress={() => {
                            setStart(slot);
                            setError(null);
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={font.small}>{t.booking.noSlots}</Text>
              )}

              {chosen === null ? (
                <>
                  <Text style={font.heading}>{t.booking.duration}</Text>
                  <View style={styles.stepper}>
                    <Button
                      title="−"
                      accessibilityLabel={t.booking.shorter}
                      variant="secondary"
                      disabled={minutes <= MIN_BOOKING_MINUTES}
                      onPress={() => setMinutes((value) => clampDuration(value - SLOT_MINUTES))}
                    />
                    <Text style={styles.duration}>{formatDuration(minutes)}</Text>
                    <Button
                      title="+"
                      accessibilityLabel={t.booking.longer}
                      variant="secondary"
                      disabled={minutes >= MAX_BOOKING_MINUTES}
                      onPress={() => setMinutes((value) => clampDuration(value + SLOT_MINUTES))}
                    />
                  </View>
                </>
              ) : null}

              <View style={styles.summary}>
                {selection === null ? (
                  <Text style={font.small}>{t.booking.pickStart}</Text>
                ) : (
                  <>
                    <Text style={font.body}>
                      {formatDay(dateKey(toZoned(selection.start, zone)))},{' '}
                      {formatTime(selection.start, zone)}–{formatTime(selection.end, zone)}
                    </Text>
                    <Text style={font.small}>
                      {chosen
                        ? `${t.booking.packagePrice} ${formatKzt(chosen.price_kzt)}`
                        : `${t.booking.estimate} ${formatKzt(
                            estimatePriceKzt(pc.price_per_hour_kzt, minutes),
                          )}`}
                    </Text>
                  </>
                )}
              </View>
              {conflict ? <Notice tone="warning">{t.booking.busyInRange}</Notice> : null}
              {error ? <Notice>{error}</Notice> : null}
              <Button
                title={t.booking.submit}
                disabled={selection === null || conflict || inPast}
                loading={submitting}
                onPress={() => {
                  if (selection) void submit(selection.start);
                }}
              />
            </View>
          );
        }}
      </Loadable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: GUTTER, gap: space.md },
  dayRow: { gap: space.sm, paddingVertical: space.xs },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  inRange: { backgroundColor: colors.selected },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  duration: { ...font.heading, minWidth: 110, textAlign: 'center' },
  summary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    padding: space.lg,
    gap: space.xs,
  },
});
