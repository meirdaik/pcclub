/**
 * Seat states of the floor plan, derived from the API's live `available` flag.
 * Pure functions: the clock is always passed in.
 *
 * The API tells, for a time window, whether a PC is free. Two windows give the four states:
 * - free:   bookable for at least the shortest stay from the next slot
 * - busy:   taken right now ("in use")
 * - booked: free right now but reserved inside the stay window
 * - off:    the API gave no verdict for the seat
 */

import { MIN_BOOKING_MINUTES, SLOT_MINUTES } from './slots.ts';

export type SeatState = 'free' | 'busy' | 'booked' | 'off';

const MINUTE_MS = 60_000;
export const SLOT_MS = SLOT_MINUTES * MINUTE_MS;
export const MIN_STAY_MS = MIN_BOOKING_MINUTES * MINUTE_MS;
/** Length of the "is it taken right now" probe window. */
export const NOW_WINDOW_MS = MINUTE_MS;

/** The next 30-minute slot start that is at least a minute away: "starts now" on the server. */
export function nextSlotStart(now: number): number {
  const start = Math.ceil(now / SLOT_MS) * SLOT_MS;
  return start - now < MINUTE_MS ? start + SLOT_MS : start;
}

export function seatState(input: {
  bookable: boolean | null | undefined;
  occupiedNow: boolean | null | undefined;
}): SeatState {
  if (input.bookable === true) return 'free';
  if (input.bookable === null || input.bookable === undefined) return 'off';
  return input.occupiedNow ? 'busy' : 'booked';
}

export function countStates(states: readonly SeatState[]): Record<SeatState, number> {
  const counts: Record<SeatState, number> = { free: 0, busy: 0, booked: 0, off: 0 };
  for (const state of states) counts[state] += 1;
  return counts;
}

/**
 * When a seat that is taken right now is free again: the end of the booking covering `now`,
 * extended through bookings that start exactly where the previous one ends. `null` if it is
 * not taken now.
 */
export function freesAt(busy: readonly { start: number; end: number }[], now: number): number | null {
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  let until: number | null = null;
  for (const interval of sorted) {
    if (until === null) {
      if (interval.start <= now && now < interval.end) until = interval.end;
    } else if (interval.start <= until) {
      until = Math.max(until, interval.end);
    } else {
      break;
    }
  }
  return until;
}

/** What fits inside a seat cell: short labels as they are, long ones as their trailing number. */
export function seatCellLabel(label: string): string {
  if (label.length <= 4) return label;
  return /\d+$/.exec(label)?.[0] ?? label.slice(-4);
}
