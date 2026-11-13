import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  type Booking,
  type Package,
  type Payment,
  type PaymentMethod,
  cancelBooking,
  createPayment,
  getBooking,
  getClub,
  listPackages,
  listPcs,
  simulateMockPayment,
} from '@/api/endpoints';
import {
  errorMessage,
  formatCountdown,
  formatDuration,
  formatInstantDay,
  formatKzt,
  t,
} from '@/i18n';
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
  TicketFrame,
} from '@/ui/components';
import { Hatch } from '@/ui/icons';
import { GUTTER, colors } from '@/ui/theme';
import { GradientText, T } from '@/ui/type';

const METHODS: PaymentMethod[] = ['kaspi', 'card'];

/** A seat code is as large as fits beside the zone column; long codes shrink. */
function seatFont(label: string) {
  const size = Math.max(40, Math.min(96, Math.floor(200 / (Math.max(label.length, 1) * 0.62))));
  return { fontSize: size, lineHeight: Math.round(size * 0.86) };
}

/**
 * The ticket: seat, time and price, then payment for a held booking.
 *
 * The app only starts the payment and (in development) tells the mock provider which webhook to
 * send. The booking becomes confirmed on the server when that webhook arrives; the app then
 * re-reads the booking and never marks it paid itself.
 */
export default function TicketScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('kaspi');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // One Idempotency-Key per payment attempt and method: a retry after a network error reuses
  // it and gets the original payment back instead of creating a second one.
  const keys = useRef(new Map<PaymentMethod, string>());

  const state = useLoad(async () => {
    const booking = await getBooking(bookingId);
    const [club, pcs, packages] = await Promise.all([
      getClub(booking.club_id),
      listPcs(booking.club_id).catch(() => []),
      booking.package_id
        ? listPackages(booking.club_id).catch((): Package[] => [])
        : Promise.resolve<Package[]>([]),
    ]);
    return {
      booking,
      club,
      pc: (pcs ?? []).find((pc) => pc.id === booking.pc_id) ?? null,
      packageName: (packages ?? []).find((item) => item.id === booking.package_id)?.name ?? null,
    };
  }, `booking:${bookingId}`);

  const data = state.data;
  const holdDeadline =
    data?.booking.status === 'pending_payment' && data.booking.hold_expires_at
      ? parseInstant(data.booking.hold_expires_at)
      : null;
  const now = useNow(1000);
  const holdLeft = holdDeadline === null ? null : Math.max(0, holdDeadline - now);
  const holdOver = holdLeft === 0;

  // When the hold runs out, ask the server: it expires unpaid holds lazily on read.
  const reload = state.reload;
  useEffect(() => {
    if (holdOver) reload();
  }, [holdOver, reload]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
      reload(); // e.g. the hold ran out: show the booking's real state
    } finally {
      setBusy(false);
    }
  }

  function pay(current: Booking) {
    void run(async () => {
      let key = keys.current.get(method);
      if (!key) {
        key = Crypto.randomUUID();
        keys.current.set(method, key);
      }
      const created = await createPayment(current.id, method, key);
      setPayment(created);
      if (created.redirect_url) void Linking.openURL(created.redirect_url);
    });
  }

  function simulate(outcome: 'complete' | 'fail') {
    if (!payment) return;
    void run(async () => {
      const result = await simulateMockPayment(payment.id, outcome);
      if (result.status === 'failed') {
        keys.current.delete(payment.method as PaymentMethod); // the next attempt is a new payment
        setPayment(null);
        setError(t.ticket.declined);
      }
      reload();
    });
  }

  function cancel() {
    void run(async () => {
      try {
        await cancelBooking(bookingId);
      } finally {
        setConfirmingCancel(false);
      }
      reload();
    });
  }

  const toBookings = () => router.replace('/bookings');

  let footer: ReactNode = undefined;
  if (data) {
    const current = data.booking;
    const payable = current.status === 'pending_payment' && holdLeft !== null && !holdOver;
    const cancellable =
      (current.status === 'pending_payment' || current.status === 'confirmed') &&
      parseInstant(current.starts_at) > now;
    if (payable && payment === null) {
      footer = (
        <Button
          title={t.ticket.pay}
          right={formatKzt(current.price_kzt)}
          arrow
          loading={busy}
          onPress={() => pay(current)}
        />
      );
    } else if (payable && payment !== null) {
      footer = (
        <View style={{ gap: 12 }}>
          <Button title={t.ticket.mockSucceed} arrow loading={busy} onPress={() => simulate('complete')} />
          <Button
            title={t.ticket.mockFail}
            variant="secondary"
            disabled={busy}
            onPress={() => simulate('fail')}
          />
        </View>
      );
    } else {
      footer = (
        <View style={{ gap: 4 }}>
          {cancellable ? (
            <Button
              title={confirmingCancel ? t.ticket.cancelConfirm : t.ticket.cancel}
              variant="danger"
              loading={busy}
              onPress={() => (confirmingCancel ? cancel() : setConfirmingCancel(true))}
            />
          ) : null}
          <Button title={t.ticket.toBookings} variant="link" onPress={toBookings} />
        </View>
      );
    }
  }

  return (
    <Screen footer={footer}>
      <Loadable state={state}>
        {({ booking: current, club, pc, packageName }) => {
          const zone = club.timezone;
          const start = parseInstant(current.starts_at);
          const end = parseInstant(current.ends_at);
          const pending = current.status === 'pending_payment';
          const label = pc?.label ?? '—';
          const specs = pc
            ? Object.values(pc.specs)
                .filter((value) => typeof value === 'string' || typeof value === 'number')
                .slice(0, 2)
            : [];
          const status =
            pending && holdLeft !== null && !holdOver
              ? t.ticket.held(label, formatCountdown(holdLeft))
              : `${label} · ${t.status[current.status] ?? current.status}`;
          return (
            <>
              <Header back={t.tabs.bookings} onBack={toBookings} right={status} />
              <View style={{ marginHorizontal: GUTTER }}>
                <TicketFrame>
                  <View style={styles.top}>
                    <View style={styles.spread}>
                      <T v="eyebrow" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {club.name}
                      </T>
                      <T v="eyebrow">{formatInstantDay(start, zone)}</T>
                    </View>
                    <View style={[styles.spread, { marginTop: 8, alignItems: 'flex-end' }]}>
                      <GradientText v="hero" numberOfLines={1} style={seatFont(label)}>
                        {label}
                      </GradientText>
                      <View style={styles.zoneCol}>
                        <T v="meta" color={colors.text}>
                          {(pc?.zone_name ?? '')}
                        </T>
                        {specs.map((value) => (
                          <T key={String(value)} v="meta">
                            {String(value)}
                          </T>
                        ))}
                      </View>
                    </View>
                    <View style={styles.facts}>
                      <Fact label={t.ticket.from} value={formatTime(start, zone)} />
                      <Fact label={t.ticket.until} value={formatTime(end, zone)} />
                      <Fact
                        label={t.ticket.pack}
                        value={packageName ?? formatDuration(Math.round((end - start) / 60_000))}
                      />
                      <Fact label={t.ticket.price} value={formatKzt(current.price_kzt)} />
                    </View>
                  </View>
                  <Perforation />
                  <View style={styles.bottom}>
                    <T v="body" color={colors.muted} style={{ flex: 1 }}>
                      {current.status === 'confirmed'
                        ? t.ticket.paidNote
                        : pending
                          ? t.ticket.entryPending
                          : (t.status[current.status] ?? current.status)}
                    </T>
                    <View style={styles.code}>
                      {current.status === 'confirmed' ? (
                        <T v="mono14" style={{ textAlign: 'center' }}>
                          {current.id.slice(-4)}
                        </T>
                      ) : (
                        <Hatch />
                      )}
                    </View>
                  </View>
                </TicketFrame>
              </View>

              {pending && holdLeft !== null && !holdOver ? (
                payment === null ? (
                  <>
                    <SectionLabel left={t.ticket.payWith} />
                    <View style={styles.methods}>
                      {METHODS.map((item) => {
                        const on = item === method;
                        return (
                          <Pressable
                            key={item}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            disabled={busy}
                            onPress={() => setMethod(item)}
                            style={[styles.method, on && { backgroundColor: colors.selected }]}
                          >
                            <View style={styles.radio}>{on ? <View style={styles.radioDot} /> : null}</View>
                            <T v="label" style={{ flex: 1 }}>
                              {t.ticket.method[item]}
                            </T>
                            <T v="mono12">{t.ticket.methodHint[item]}</T>
                          </Pressable>
                        );
                      })}
                    </View>
                    <T v="meta" style={styles.note}>
                      {t.ticket.freeCancel(formatTime(start, zone))}
                    </T>
                  </>
                ) : (
                  <View style={{ paddingHorizontal: GUTTER, marginTop: 16 }}>
                    <Notice tone="info">
                      {t.ticket.mockTitle}: {formatKzt(payment.amount_kzt)}. {t.ticket.mockHint}
                    </Notice>
                  </View>
                )
              ) : null}
              {pending && holdOver ? (
                <View style={{ paddingHorizontal: GUTTER, marginTop: 16 }}>
                  <Notice tone="warning">{t.ticket.holdExpired}</Notice>
                </View>
              ) : null}
              {error ? (
                <View style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
                  <Notice>{error}</Notice>
                </View>
              ) : null}
            </>
          );
        }}
      </Loadable>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <T v="eyebrow">{label}</T>
      <T v="mono14" numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12 },
  spread: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  zoneCol: { alignItems: 'flex-end', paddingBottom: 8 },
  facts: { marginTop: 8, flexDirection: 'row', gap: 8 },
  bottom: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  code: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  methods: { borderBottomWidth: 1, borderBottomColor: colors.line },
  method: {
    height: 56,
    paddingHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, backgroundColor: colors.text },
  note: { marginHorizontal: GUTTER, marginTop: 12 },
});
