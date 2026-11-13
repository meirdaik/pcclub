import { StyleSheet, View } from 'react-native';

import { listBookings, listClubs } from '@/api/endpoints';
import { formatDuration, formatInstantDay, formatKzt, t } from '@/i18n';
import { parseInstant } from '@/lib/time';
import { useLoad } from '@/lib/useLoad';
import { Loadable, Screen, SectionLabel, TicketFrame } from '@/ui/components';
import { Hatch } from '@/ui/icons';
import { GUTTER, colors } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

const FALLBACK_ZONE = 'Asia/Almaty';

/**
 * Wallet. The API has no wallet or balance yet (that arrives with the club desk client), so this
 * shows what is real: how much the user has paid for bookings, and which. Top-up is not offered.
 */
export default function WalletScreen() {
  const state = useLoad(async () => {
    const [page, clubs] = await Promise.all([listBookings(), listClubs()]);
    return { page, clubs: new Map((clubs ?? []).map((club) => [club.id, club])) };
  }, 'wallet');

  return (
    <Screen inTabs refreshing={state.loading && state.data !== null} onRefresh={state.reload}>
      <Loadable state={state}>
        {({ page, clubs }) => {
          const paid = page.items.filter((b) => b.status === 'confirmed' || b.status === 'completed');
          const total = paid.reduce((sum, b) => sum + b.price_kzt, 0);
          return (
            <>
              <View style={styles.head}>
                <T v="eyebrow">{t.wallet.spent}</T>
                <View style={{ marginTop: 4 }}>
                  <GradientText v="num">
                    {formatKzt(total).replace(/\s?₸$/, '')}
                    <T v="mono14" style={styles.tenge}>
                      {' ₸'}
                    </T>
                  </GradientText>
                </View>
              </View>
              <View style={{ marginHorizontal: GUTTER, marginTop: 16 }}>
                <TicketFrame dashed>
                  <View style={styles.soon}>
                    <Hatch />
                    <T v="eyebrow" color={colors.text}>
                      {t.wallet.soon}
                    </T>
                    <T v="body" color={colors.text}>
                      {t.wallet.soonText}
                    </T>
                  </View>
                </TicketFrame>
              </View>
              <SectionLabel left={t.wallet.recent} />
              {paid.length === 0 ? (
                <T v="body" color={colors.muted} style={{ paddingHorizontal: GUTTER }}>
                  {t.wallet.none}
                </T>
              ) : (
                <View style={{ borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  {paid.map((b) => {
                    const club = clubs.get(b.club_id);
                    const start = parseInstant(b.starts_at);
                    const minutes = Math.round((parseInstant(b.ends_at) - start) / 60_000);
                    return (
                      <View key={b.id} style={styles.row}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <T v="body" numberOfLines={1}>
                            {`${club?.name ?? '—'} · ${formatDuration(minutes)}`}
                          </T>
                          <T v="meta">
                            {formatInstantDay(start, club?.timezone ?? FALLBACK_ZONE)}
                          </T>
                        </View>
                        <T v="mono12">{`− ${formatKzt(b.price_kzt)}`}</T>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          );
        }}
      </Loadable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: GUTTER, paddingTop: 12 },
  tenge: { fontSize: 40, lineHeight: 44, marginLeft: 6 },
  soon: { padding: 16, gap: 8, overflow: 'hidden' },
  row: {
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
});
