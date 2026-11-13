import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getClub, listZones } from '@/api/endpoints';
import { formatKzt, openingHoursLabel, t } from '@/i18n';
import { SAMPLE_RATING, setupForZone } from '@/lib/clubProfile';
import { useLoad } from '@/lib/useLoad';
import { Button, Chip, Header, Loadable, Screen } from '@/ui/components';
import { Stars } from '@/ui/navicons';
import { GUTTER, colors } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

/**
 * Club info, in two branches: the rating first (sample numbers until 2GIS is connected), then
 * the PC setup of the zone the player picks.
 */
export default function ClubInfoScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<'rating' | 'setup'>('rating');
  const [zoneId, setZoneId] = useState<string | null>(null);
  const state = useLoad(async () => {
    const [club, zones] = await Promise.all([getClub(clubId), listZones(clubId)]);
    return { club, zones: zones ?? [] };
  }, `club-info:${clubId}`);

  return (
    <Screen
      footer={
        <Button
          title={t.info.book}
          arrow
          onPress={() => router.push({ pathname: '/rules/[clubId]', params: { clubId } })}
        />
      }
    >
      <Header back={t.common.back} />
      <Loadable state={state}>
        {({ club, zones }) => {
          const zone = zones.find((item) => item.id === zoneId) ?? zones[0] ?? null;
          const setup = zone ? setupForZone(zone.name) : null;
          const rows = setup
            ? {
                left: [
                  [t.info.cpu, setup.characteristics.cpu],
                  [t.info.gpu, setup.characteristics.gpu],
                  [t.info.ram, setup.characteristics.ram],
                ],
                right: [
                  [t.info.monitor, setup.peripherals.monitor],
                  [t.info.mouse, setup.peripherals.mouse],
                  [t.info.keyboard, setup.peripherals.keyboard],
                  [t.info.headphones, setup.peripherals.headphones],
                  [t.info.chair, setup.peripherals.chair],
                ],
              }
            : null;
          return (
            <>
              <View style={{ paddingHorizontal: GUTTER }}>
                <T v="title" numberOfLines={2}>
                  {club.name}
                </T>
                <T v="eyebrow" style={{ marginTop: 8 }}>
                  {`${club.city}, ${club.address} · ${openingHoursLabel(club)}`}
                </T>
              </View>

              <View style={styles.segment}>
                {(
                  [
                    ['rating', t.info.rating],
                    ['setup', t.info.setup],
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

              {tab === 'rating' ? (
                <>
                  <View style={styles.rating}>
                    <GradientText v="hero">{SAMPLE_RATING.value.toFixed(1)}</GradientText>
                    <View style={{ gap: 6, paddingBottom: 12 }}>
                      <Stars value={SAMPLE_RATING.value} size={22} />
                      <T v="body" color={colors.muted}>
                        {`${t.info.reviews(SAMPLE_RATING.count)} · ${t.info.source}`}
                      </T>
                    </View>
                  </View>
                  <T v="meta" style={{ paddingHorizontal: GUTTER, marginTop: 4 }}>
                    {t.info.sample}
                  </T>
                  <T v="eyebrow" style={styles.section}>
                    {t.info.comments}
                  </T>
                  {SAMPLE_RATING.reviews.map((review) => (
                    <View key={review.name} style={styles.review}>
                      <View style={styles.reviewHead}>
                        <T v="label">{review.name}</T>
                        <T v="meta">{review.when}</T>
                      </View>
                      <Stars value={review.stars} size={14} />
                      <T v="body" color={colors.muted} style={{ fontSize: 15, lineHeight: 22 }}>
                        {review.text}
                      </T>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <T v="eyebrow" style={styles.section}>
                    {t.info.zone}
                  </T>
                  <View style={styles.zones}>
                    {zones.map((item) => (
                      <Chip
                        key={item.id}
                        label={item.name}
                        selected={zone?.id === item.id}
                        onPress={() => setZoneId(item.id)}
                      />
                    ))}
                  </View>
                  {zone ? (
                    <T v="mono12" color={colors.text} style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
                      {`${formatKzt(zone.price_per_hour_kzt)}${t.common.perHour}`}
                    </T>
                  ) : null}
                  {rows ? (
                    <View style={styles.columns}>
                      <View style={styles.column}>
                        <T v="eyebrow" color={colors.text}>
                          {t.info.characteristics}
                        </T>
                        {rows.left.map(([label, value]) => (
                          <Spec key={label} label={label} value={value} />
                        ))}
                      </View>
                      <View style={styles.column}>
                        <T v="eyebrow" color={colors.text}>
                          {t.info.peripherals}
                        </T>
                        {rows.right.map(([label, value]) => (
                          <Spec key={label} label={label} value={value} />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </>
          );
        }}
      </Loadable>
    </Screen>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="meta">{label}</T>
      <T v="label" style={{ fontSize: 15, lineHeight: 20 }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    marginHorizontal: GUTTER,
    marginTop: 16,
    padding: 4,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  segmentItem: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentOn: { backgroundColor: colors.selected, borderWidth: 1, borderColor: colors.lineStrong },
  rating: { paddingHorizontal: GUTTER, marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  section: { paddingHorizontal: GUTTER, marginTop: 20, marginBottom: 8 },
  review: {
    marginHorizontal: GUTTER,
    marginBottom: 12,
    padding: 16,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  zones: { paddingHorizontal: GUTTER, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  columns: { marginHorizontal: GUTTER, marginTop: 16, flexDirection: 'row', gap: 12 },
  column: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
});
