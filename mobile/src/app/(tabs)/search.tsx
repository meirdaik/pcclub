import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Polygon, Rect } from 'react-native-svg';

import { type ClubLive, loadClubsLive } from '@/api/live';
import { t } from '@/i18n';
import { useLoad } from '@/lib/useLoad';
import { usePoll } from '@/lib/usePoll';
import { Loadable, Screen } from '@/ui/components';
import { Icon } from '@/ui/navicons';
import { GUTTER, colors, gradient } from '@/ui/theme';
import { T } from '@/ui/type';

/**
 * Pin positions on the schematic plan, as fractions of the map. The API has no club
 * coordinates yet, so clubs take these spots in a fixed order; the plan is a layout, not a
 * geographic map.
 */
const ANCHORS = [
  { x: 0.42, y: 0.5 },
  { x: 0.68, y: 0.36 },
  { x: 0.2, y: 0.7 },
  { x: 0.74, y: 0.68 },
  { x: 0.3, y: 0.28 },
  { x: 0.55, y: 0.78 },
];
const BLOCKS = [3, 8, 10, 15, 17, 22, 26, 29, 31, 36, 40, 44, 47, 52];

function Plan({ width, height }: { width: number; height: number }) {
  const lines = [];
  for (let x = 28; x < width; x += 56) {
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={colors.grid} />);
  }
  for (let y = 22; y < height; y += 44) {
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={colors.grid} />);
  }
  const columns = Math.max(1, Math.floor(width / 56));
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {BLOCKS.map((n) => (
        <Rect
          key={n}
          x={(n % columns) * 56 + 30}
          y={Math.floor(n / columns) * 44 + 24}
          width={52}
          height={40}
          rx={6}
          fill={colors.surface}
        />
      ))}
      {lines}
      <Line x1={0} y1={height * 0.62} x2={width} y2={height * 0.62} stroke={colors.road} strokeWidth={3} />
      <Line x1={width * 0.55} y1={0} x2={width * 0.55} y2={height} stroke={colors.road} strokeWidth={3} />
    </Svg>
  );
}

const pinPoints = (w: number, h: number, inset: number) => {
  const mid = w / 2;
  const neck = h - 8 - inset;
  return `${inset},${inset} ${w - inset},${inset} ${w - inset},${neck} ${mid + 6 - inset},${neck} ${mid},${h - inset * 2} ${mid - 6 + inset},${neck} ${inset},${neck}`;
};

function Pin({ item, x, y, onPress }: { item: ClubLive; x: number; y: number; onPress: () => void }) {
  const full = item.total > 0 && item.free === 0;
  const w = 48;
  const h = 48;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.map.pinLabel(item.club.name, item.free, false)}
      onPress={onPress}
      style={{ position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h }}
    >
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="pinhatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={6} stroke={colors.hatch} strokeWidth={1.5} />
          </Pattern>
        </Defs>
        <Polygon points={pinPoints(w, h, 0)} fill={full ? colors.muted : colors.accent} />
        <Polygon points={pinPoints(w, h, 1.5)} fill={colors.background} />
        {full ? <Polygon points={pinPoints(w, h, 1.5)} fill="url(#pinhatch)" /> : null}
      </Svg>
      <View style={styles.pinNumber}>
        <T v="mono14">{item.free}</T>
      </View>
    </Pressable>
  );
}

/** Search: a plan with a cluster of clubs, zoomed into pins, and a "found N clubs" sheet. */
export default function SearchScreen() {
  const router = useRouter();
  const state = useLoad(() => loadClubsLive(Date.now()), 'clubs-live');
  usePoll(state.reload, 20_000);
  const [online, setOnline] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const open = (item: ClubLive) =>
    router.push({ pathname: '/clubs/[clubId]', params: { clubId: item.club.id } });

  return (
    <Screen inTabs scroll={false}>
      <Loadable state={state}>
        {(all) => {
          const clubs = (online ? all.filter((item) => item.total > 0) : all).sort((a, b) =>
            a.club.name.localeCompare(b.club.name),
          );
          const city = all[0]?.club.city ?? '';
          return (
            <View style={{ flex: 1 }}>
              <View style={styles.city}>
                <Icon name="pin" size={20} color={colors.muted} />
                <T v="label" style={{ flex: 1, fontSize: 20, lineHeight: 24 }} numberOfLines={1}>
                  {city || t.search.city}
                </T>
                <Icon name="locate" size={20} color={colors.muted} />
              </View>
              <View style={styles.segment}>
                {[
                  [true, t.search.online],
                  [false, t.search.all],
                ].map(([value, label]) => {
                  const on = online === value;
                  return (
                    <Pressable
                      key={String(label)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setOnline(value as boolean)}
                      style={[styles.segmentItem, on && styles.segmentOn]}
                    >
                      <T v="label" color={on ? colors.text : colors.muted}>
                        {label as string}
                      </T>
                    </Pressable>
                  );
                })}
              </View>
              <View
                style={styles.map}
                onLayout={(event) =>
                  setSize({
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                  })
                }
              >
                {size.width > 0 ? <Plan width={size.width} height={size.height} /> : null}
                {size.width > 0 && !zoomed && clubs.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.search.found(clubs.length)}
                    onPress={() => setZoomed(true)}
                    style={{ position: 'absolute', left: size.width / 2 - 34, top: size.height * 0.45 }}
                  >
                    <LinearGradient
                      colors={gradient.colors}
                      start={gradient.start}
                      end={gradient.end}
                      style={styles.clusterRing}
                    >
                      <View style={styles.cluster}>
                        <T v="head" style={{ fontSize: 28, lineHeight: 30 }}>
                          {clubs.length}
                        </T>
                      </View>
                    </LinearGradient>
                  </Pressable>
                ) : null}
                {size.width > 0 && zoomed
                  ? clubs.map((item, index) => {
                      const spot = ANCHORS[index % ANCHORS.length];
                      return (
                        <Pin
                          key={item.club.id}
                          item={item}
                          x={spot.x * size.width}
                          y={spot.y * size.height}
                          onPress={() => open(item)}
                        />
                      );
                    })
                  : null}
                <View style={styles.zoom}>
                  <Pressable accessibilityLabel="Zoom in" onPress={() => setZoomed(true)} style={styles.zoomButton}>
                    <Icon name="plus" size={22} />
                  </Pressable>
                  <Pressable accessibilityLabel="Zoom out" onPress={() => setZoomed(false)} style={styles.zoomButton}>
                    <Icon name="minus" size={22} />
                  </Pressable>
                </View>
              </View>
              <View style={[styles.sheet, sheetOpen && { height: 320 }]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSheetOpen((value) => !value)}
                  style={styles.sheetHead}
                >
                  <View style={styles.handle} />
                  <T v="label" style={{ fontSize: 20, lineHeight: 24 }}>
                    {clubs.length ? t.search.found(clubs.length) : t.search.none}
                  </T>
                </Pressable>
                {sheetOpen ? (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {clubs.map((item) => (
                      <Pressable
                        key={item.club.id}
                        accessibilityRole="button"
                        onPress={() => open(item)}
                        style={({ pressed }) => [styles.clubRow, pressed && { backgroundColor: colors.selected }]}
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
                          <T v="head" style={{ fontSize: 30, lineHeight: 30 }}>
                            {item.free}
                          </T>
                          <T v="mono12">{`/${item.total}`}</T>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            </View>
          );
        }}
      </Loadable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  city: {
    marginHorizontal: GUTTER,
    marginTop: 12,
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  segment: {
    marginHorizontal: GUTTER,
    marginTop: 12,
    marginBottom: 12,
    padding: 4,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  segmentItem: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentOn: { backgroundColor: colors.selected, borderWidth: 1, borderColor: colors.lineStrong },
  map: { flex: 1, overflow: 'hidden', backgroundColor: colors.background },
  clusterRing: { width: 68, height: 68, borderRadius: 34, padding: 3 },
  cluster: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinNumber: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 8, alignItems: 'center', justifyContent: 'center' },
  zoom: { position: 'absolute', right: 16, top: 16, gap: 8 },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    height: 96,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
  },
  sheetHead: { height: 96, alignItems: 'center', paddingTop: 10, gap: 14 },
  handle: { width: 56, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong },
  clubRow: {
    minHeight: 64,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
