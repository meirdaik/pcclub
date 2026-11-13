import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';

import { type Package, getClub, listPackages, listZones } from '@/api/endpoints';
import { useUser } from '@/auth/AuthContext';
import { formatDay, formatDuration, formatInstantDay, t } from '@/i18n';
import { isMinorOn } from '@/lib/age';
import { type PlanRow, packageTypeKey, planRows } from '@/lib/packageRows';
import {
  MAX_ADVANCE_DAYS,
  MAX_BOOKING_MINUTES,
  MIN_BOOKING_MINUTES,
  SLOT_MINUTES,
  daySlotStarts,
  openingHours,
} from '@/lib/slots';
import { addDays, dateKey, formatTime, toZoned, weekday } from '@/lib/time';
import { useLoad } from '@/lib/useLoad';
import { useNow } from '@/lib/useNow';
import { Button, Header, Loadable, Notice, Screen, Tag } from '@/ui/components';
import { Hatch, Lock } from '@/ui/icons';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

const ITEM = 44;
const DURATIONS = Array.from(
  { length: (MAX_BOOKING_MINUTES - MIN_BOOKING_MINUTES) / SLOT_MINUTES + 1 },
  (_, i) => MIN_BOOKING_MINUTES + i * SLOT_MINUTES,
);
const MINUTE_MS = 60_000;

/** A snapping list of times; the one in the middle is the choice. */
function Wheel({
  items,
  selected,
  onSelect,
  label,
}: {
  items: string[];
  selected: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    ref.current?.scrollTo({ y: selected * ITEM, animated: false });
    // Only when the list itself changes (another day); scrolling by hand sets `selected`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
  return (
    <View style={styles.wheel} accessibilityLabel={label}>
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        snapToInterval={ITEM}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingVertical: ITEM * 2 }}
        onScroll={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / ITEM);
          if (index !== selected && index >= 0 && index < items.length) onSelect(index);
        }}
      >
        {items.map((text, index) => (
          <Pressable
            key={`${index}-${text}`}
            accessibilityRole="button"
            onPress={() => {
              ref.current?.scrollTo({ y: index * ITEM, animated: true });
              onSelect(index);
            }}
            style={styles.wheelItem}
          >
            <T
              v="head"
              color={index === selected ? colors.text : colors.muted}
              style={{ fontSize: index === selected ? 30 : 22, lineHeight: 34 }}
            >
              {text}
            </T>
          </Pressable>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={styles.band} />
    </View>
  );
}

/**
 * Date and time. Pick a day, then either a custom stay (a start and how long) or one of the
 * club's packages. The seat is chosen next, so the floor plan shows what is free for exactly
 * this stay.
 */
export default function ReserveScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const user = useUser();
  const now = useNow(30_000);
  const [day, setDay] = useState<string | null>(null);
  const [tab, setTab] = useState<'custom' | 'packages'>('custom');
  const [startMs, setStartMs] = useState<number | null>(null);
  const [duration, setDuration] = useState(MIN_BOOKING_MINUTES);
  const [chosen, setChosen] = useState<string | null>(null);

  const base = useLoad(async () => {
    const [club, zones, packages] = await Promise.all([
      getClub(clubId),
      listZones(clubId),
      listPackages(clubId).catch((): Package[] => []),
    ]);
    return { club, zones: zones ?? [], packages: packages ?? [] };
  }, `reserve:${clubId}`);
  const data = base.data;
  const zone = data?.club.timezone ?? 'Asia/Almaty';
  const today = dateKey(toZoned(now, zone));
  const selectedDay = day ?? today;

  const slots = useMemo(
    () =>
      data
        ? daySlotStarts(selectedDay, zone, openingHours(data.club.opens_at, data.club.closes_at)).filter(
            (slot) => slot > now,
          )
        : [],
    [data, selectedDay, zone, now],
  );
  const start = startMs !== null && slots.includes(startMs) ? startMs : (slots[0] ?? null);
  const startIndex = start === null ? 0 : Math.max(0, slots.indexOf(start));
  const end = start === null ? null : start + duration * MINUTE_MS;
  const minor = user.birth_date ? isMinorOn(user.birth_date, selectedDay) : false;

  const rows = useMemo(() => {
    if (!data || start === null) return [];
    // One card per kind of package. The price depends on the zone, so it is shown after the seat.
    const seen = new Set<string>();
    return data.packages.flatMap((pkg) => {
      const typeKey = packageTypeKey(pkg);
      if (seen.has(typeKey)) return [];
      seen.add(typeKey);
      return planRows({ packages: [pkg], pricePerHourKzt: 0, slotStart: start, timeZone: zone })
        .filter((row) => row.packageId !== null)
        .map((row) => ({ row, typeKey }));
    });
  }, [data, start, zone]);
  // Only a package the player tapped counts; tapping it again clears the choice.
  const picked = rows.find((item) => item.row.packageId === chosen && !(minor && item.row.night)) ?? null;

  const days = Array.from({ length: MAX_ADVANCE_DAYS + 1 }, (_, i) => addDays(today, i));
  const canContinue = tab === 'custom' ? start !== null : picked !== null;

  function next() {
    if (tab === 'custom' && start !== null && end !== null) {
      router.push({
        pathname: '/seats/[clubId]',
        params: { clubId, start: String(start), end: String(end) },
      });
    } else if (picked) {
      router.push({
        pathname: '/seats/[clubId]',
        params: {
          clubId,
          start: String(picked.row.startMs),
          end: String(picked.row.endMs),
          pkg: picked.typeKey,
        },
      });
    }
  }

  const stamp = (ms: number) => `${formatInstantDay(ms, zone)} ${formatTime(ms, zone)}`;

  return (
    <Screen
      footer={<Button title={t.reserve.selectSeat} arrow disabled={!canContinue} onPress={next} />}
    >
      <Header back={t.tabs.book} onBack={() => router.back()} />
      <Loadable state={base}>
        {({ club }) => (
          <>
            <View style={styles.club}>
              <LinearGradient
                colors={gradient.colors}
                start={gradient.start}
                end={gradient.end}
                style={styles.tile}
              >
                <T v="head" color={colors.onGradient}>
                  {club.name[0]?.toUpperCase()}
                </T>
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="label" numberOfLines={1} style={{ fontSize: 20, lineHeight: 24 }}>
                  {club.name}
                </T>
                <T v="meta" numberOfLines={1}>
                  {`${club.city} · ${club.address}`}
                </T>
              </View>
            </View>

            <View style={styles.dateHead}>
              <T v="label" style={{ fontSize: 18 }}>
                {t.reserve.date}
              </T>
              <T v="label" style={{ fontSize: 18 }}>
                {selectedDay === today ? t.reserve.today : formatDay(selectedDay)}
              </T>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.days}
            >
              {days.map((key) => {
                const on = key === selectedDay;
                const inner = (
                  <>
                    <T v="body" color={on ? colors.onGradient : colors.muted}>
                      {t.weekdays[weekday(key)]}
                    </T>
                    <T v="label" color={on ? colors.onGradient : colors.text} style={{ fontSize: 20 }}>
                      {Number(key.slice(8))}
                    </T>
                  </>
                );
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setDay(key);
                      setStartMs(null);
                      setChosen(null);
                    }}
                  >
                    {on ? (
                      <LinearGradient
                        colors={gradient.colors}
                        start={gradient.start}
                        end={gradient.end}
                        style={styles.day}
                      >
                        {inner}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.day, { backgroundColor: colors.surface }]}>{inner}</View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.segment}>
              {(
                [
                  ['custom', t.reserve.custom],
                  ['packages', t.reserve.packages],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tab === key }}
                  onPress={() => setTab(key)}
                  style={[styles.segmentItem, tab === key && styles.segmentOn]}
                >
                  <T v="label" color={tab === key ? colors.text : colors.muted}>
                    {label}
                  </T>
                </Pressable>
              ))}
            </View>

            {slots.length === 0 ? (
              <View style={{ paddingHorizontal: GUTTER, marginTop: 16 }}>
                <Notice tone="warning">{t.booking.noSlots}</Notice>
              </View>
            ) : tab === 'custom' ? (
              <>
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <T v="label" style={{ fontSize: 18 }}>
                    {t.reserve.pick}
                  </T>
                  <T v="body" color={colors.muted}>
                    {t.reserve.duration(formatDuration(duration))}
                  </T>
                </View>
                <View style={styles.range}>
                  <View style={styles.rangeSide}>
                    <T v="body">{start === null ? '' : formatInstantDay(start, zone)}</T>
                    <GradientText v="head" style={{ alignSelf: 'center' }}>
                      {start === null ? '--:--' : formatTime(start, zone)}
                    </GradientText>
                  </View>
                  <T v="label" color={colors.muted} style={{ fontSize: 18 }}>
                    {t.reserve.until}
                  </T>
                  <View style={styles.rangeSide}>
                    <T v="body">{end === null ? '' : formatInstantDay(end, zone)}</T>
                    <T v="head">{end === null ? '--:--' : formatTime(end, zone)}</T>
                  </View>
                </View>
                <View style={styles.wheels}>
                  <Wheel
                    label={t.booking.start}
                    items={slots.map((slot) => formatTime(slot, zone))}
                    selected={startIndex}
                    onSelect={(index) => setStartMs(slots[index])}
                  />
                  <Wheel
                    label={t.booking.duration}
                    items={DURATIONS.map((minutes) =>
                      start === null ? '' : formatTime(start + minutes * MINUTE_MS, zone),
                    )}
                    selected={DURATIONS.indexOf(duration)}
                    onSelect={(index) => setDuration(DURATIONS[index])}
                  />
                </View>
              </>
            ) : (
              <View style={{ marginTop: 16 }}>
                {rows.length === 0 ? (
                  <View style={{ paddingHorizontal: GUTTER }}>
                    <Notice tone="info">{t.reserve.noPackages}</Notice>
                  </View>
                ) : null}
                <View style={styles.startRow}>
                  <T v="eyebrow">{t.booking.start}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.booking.shorter}
                      disabled={startIndex === 0}
                      onPress={() => setStartMs(slots[startIndex - 1])}
                      style={[styles.step, startIndex === 0 && { opacity: 0.4 }]}
                    >
                      <T v="head">‹</T>
                    </Pressable>
                    <T v="mono14">{start === null ? '--:--' : stamp(start)}</T>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t.booking.longer}
                      disabled={startIndex >= slots.length - 1}
                      onPress={() => setStartMs(slots[startIndex + 1])}
                      style={[styles.step, startIndex >= slots.length - 1 && { opacity: 0.4 }]}
                    >
                      <T v="head">›</T>
                    </Pressable>
                  </View>
                </View>
                {rows.length > 0 ? (
                  <PackageStrip
                    items={rows}
                    zone={zone}
                    minor={minor}
                    selectedId={chosen}
                    onSelect={setChosen}
                  />
                ) : null}
              </View>
            )}
          </>
        )}
      </Loadable>
    </Screen>
  );
}

type PackageItem = { row: PlanRow; typeKey: string };

/** Packages as a row of small chips: free scrolling, no snapping, bounce at both ends. */
function PackageStrip({
  items,
  zone,
  minor,
  selectedId,
  onSelect,
}: {
  items: PackageItem[];
  zone: string;
  minor: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      alwaysBounceHorizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {items.map((item) => {
        const locked = minor && item.row.night;
        const id = item.row.packageId;
        return (
          <PackageRow
            key={id}
            row={item.row}
            zone={zone}
            locked={locked}
            on={id === selectedId && !locked}
            onPress={() => onSelect(id === selectedId ? null : id)}
          />
        );
      })}
    </ScrollView>
  );
}

function PackageRow({
  row,
  zone,
  locked,
  on,
  onPress,
}: {
  row: PlanRow;
  zone: string;
  locked: boolean;
  on: boolean;
  onPress: () => void;
}) {
  const hours = String(Math.round((row.minutes / 60) * 10) / 10);
  const ink = on ? colors.onGradient : colors.text;
  const soft = on ? colors.onGradient : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked, selected: on }}
      accessibilityLabel={t.packages.rowLabel(hours, locked, on)}
      disabled={locked}
      onPress={onPress}
      style={[styles.chip, on && { borderColor: 'transparent' }]}
    >
      {on ? (
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {locked ? <Hatch /> : null}
      <View style={styles.chipTop}>
        <T v="eyebrow" color={soft}>
          {`${hours} ${Number(hours) === 1 ? t.packages.hour : t.packages.hours}`}
        </T>
        {locked ? <Lock /> : null}
      </View>
      <View style={{ gap: 2 }}>
        <T v="label" color={locked ? colors.muted : ink} numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>
          {row.name}
        </T>
        <T v="mono12" color={soft}>{`${formatTime(row.startMs, zone)}–${formatTime(row.endMs, zone)}`}</T>
      </View>
      {locked ? (
        <Tag label={t.packages.adultsOnly} tone="hatched" />
      ) : row.night ? (
        <Tag label={t.packages.adultTag} />
      ) : null}
    </Pressable>
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
  tile: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateHead: {
    paddingHorizontal: GUTTER,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  days: { paddingHorizontal: GUTTER, paddingVertical: 12, gap: 10 },
  day: { width: 60, height: 68, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  segment: {
    marginHorizontal: GUTTER,
    marginTop: 8,
    padding: 4,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  segmentItem: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentOn: { backgroundColor: colors.selected, borderWidth: 1, borderColor: colors.lineStrong },
  range: {
    marginHorizontal: GUTTER,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeSide: { alignItems: 'center', gap: 4, flex: 1 },
  wheels: { marginHorizontal: GUTTER, marginTop: 8, flexDirection: 'row', gap: 12 },
  wheel: { flex: 1, height: ITEM * 5, overflow: 'hidden' },
  wheelItem: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM * 2,
    height: ITEM,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  startRow: {
    paddingHorizontal: GUTTER,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  strip: { paddingHorizontal: GUTTER, paddingVertical: 12, gap: 10 },
  chip: {
    width: 158,
    minHeight: 112,
    padding: 12,
    gap: 8,
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  chipTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stub: {
    width: 104,
    alignSelf: 'stretch',
    paddingLeft: GUTTER,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.lineStrong,
    borderStyle: 'dashed',
  },
  middle: { flex: 1, minWidth: 0, paddingLeft: 14, gap: 4 },
  mark: { width: 20, height: 20, marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  markOn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  markOff: { width: 20, height: 20, borderWidth: 1, borderColor: colors.muted },
});
