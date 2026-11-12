/**
 * Packages on the booking screen. Like slots.ts, this mirrors the server's rules only to draw
 * the picker and preview the end time; the server computes the real end and price.
 * Pure functions: everything is on the club's clock.
 */

import { MAX_BOOKING_MINUTES, MIN_BOOKING_MINUTES } from './slots.ts';
import { addDays, dateKey, fromZoned, parseDateKey, parseTimeOfDay, toZoned } from './time.ts';

const MINUTE_MS = 60_000;

/** The parts of the API's package that decide when a booking ends. */
export type PackageTerms = {
  duration_minutes: number | null;
  /** Club-local `HH:MM[:SS]`; an end that is not after the start means the window crosses midnight. */
  window_start: string | null;
  window_end: string | null;
};

/**
 * When a booking of this package ends if it starts at `start`: after its duration, or at the
 * end of its daily window. `null` if a window package cannot start at that time.
 */
export function packageEnd(terms: PackageTerms, start: number, timeZone: string): number | null {
  if (terms.duration_minutes !== null) return start + terms.duration_minutes * MINUTE_MS;
  if (terms.window_start === null || terms.window_end === null) return null;

  const opens = parseTimeOfDay(terms.window_start);
  const closes = parseTimeOfDay(terms.window_end);
  const overnight = closes <= opens;
  const today = dateKey(toZoned(start, timeZone));
  const instant = (day: string, minuteOfDay: number) =>
    fromZoned(
      { ...parseDateKey(day), hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 },
      timeZone,
    );
  // The start may fall in the window that opened today or, past midnight, yesterday.
  for (const day of [addDays(today, -1), today]) {
    const windowStart = instant(day, opens);
    const windowEnd = instant(overnight ? addDays(day, 1) : day, closes);
    if (windowStart <= start && start < windowEnd) return windowEnd;
  }
  return null;
}

/** Whether the picker should offer `start`: inside the window and a bookable length. */
export function canStartPackage(terms: PackageTerms, start: number, timeZone: string): boolean {
  const end = packageEnd(terms, start, timeZone);
  if (end === null) return false;
  const minutes = (end - start) / MINUTE_MS;
  return minutes >= MIN_BOOKING_MINUTES && minutes <= MAX_BOOKING_MINUTES;
}
