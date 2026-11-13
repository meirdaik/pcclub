import { Pressable, StyleSheet, View } from 'react-native';

import type { SeatState } from '@/lib/seats';

import { Hatch } from './icons';
import { colors } from './theme';
import { T } from './type';

/**
 * Seat states are told apart by shape, not by colour alone:
 * free = outlined square, in use = solid block, booked = dashed and hatched, off = crossed.
 */

type SeatCellProps = {
  state: SeatState;
  label: string;
  selected?: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
};

export function SeatCell({ state, label, selected, accessibilityLabel, onPress }: SeatCellProps) {
  const free = state === 'free';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !free, selected: !!selected }}
      disabled={!free}
      onPress={onPress}
      style={[
        styles.cell,
        state === 'free' && { borderWidth: 1.5, borderColor: colors.accent },
        state === 'busy' && { backgroundColor: colors.used },
        state === 'booked' && { borderWidth: 1.5, borderColor: colors.muted, borderStyle: 'dashed' },
        state === 'off' && { borderWidth: 1, borderColor: colors.line },
        selected && { backgroundColor: colors.text, borderColor: colors.text },
      ]}
    >
      {state === 'booked' && !selected ? <Hatch /> : null}
      <T
        v="mono12"
        color={
          selected
            ? colors.onGradient
            : state === 'free'
              ? colors.accent
              : state === 'booked'
                ? colors.text
                : colors.muted
        }
        style={selected ? { fontFamily: 'HankenGrotesk_700Bold' } : undefined}
      >
        {state === 'off' ? '×' : label}
      </T>
    </Pressable>
  );
}

/** A 16px square of the mini floor plans. */
export function MiniSeat({ state }: { state: SeatState }) {
  return (
    <View
      style={[
        styles.mini,
        state === 'free' && { borderWidth: 1, borderColor: colors.accent },
        state === 'busy' && { backgroundColor: colors.used },
        state === 'booked' && { borderWidth: 1, borderColor: colors.muted, borderStyle: 'dashed' },
        state === 'off' && { borderWidth: 1, borderColor: colors.line },
      ]}
    >
      {state === 'booked' ? <Hatch /> : null}
    </View>
  );
}

/** One legend entry: the state's shape and its name with a count. */
export function LegendItem({ state, label }: { state: SeatState; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendBox,
          state === 'free' && { borderWidth: 1.5, borderColor: colors.accent },
          state === 'busy' && { backgroundColor: colors.used },
          state === 'booked' && { borderWidth: 1, borderColor: colors.muted, borderStyle: 'dashed' },
          state === 'off' && { borderWidth: 1, borderColor: colors.lineStrong },
        ]}
      >
        {state === 'booked' ? <Hatch /> : null}
        {state === 'off' ? (
          <T v="meta" style={{ lineHeight: 10, fontSize: 11 }}>
            ×
          </T>
        ) : null}
      </View>
      <T v="meta" style={{ letterSpacing: 0 }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mini: { width: 16, height: 16, borderRadius: 4, overflow: 'hidden' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
