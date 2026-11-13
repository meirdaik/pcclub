import { ApiError } from '@/api/client';
import { dateKey, formatTime, parseDateKey, toZoned, weekday } from '@/lib/time';

import { en } from './en';

/**
 * The app is English-only for now, because the display typefaces of the design (Big Shoulders
 * Display, Hanken Grotesk) have no Cyrillic. `ru.ts` is the earlier Russian copy and is not wired
 * in; this is the one place to switch languages later.
 */
export const t = en;

/** A message for any thrown value, localized by the API's error code. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return t.errors[error.code] ?? t.errors.UNKNOWN;
  return t.errors.UNKNOWN;
}

/** `10:00–23:00`, or "round the clock" when the club never closes. */
export function openingHoursLabel(club: { opens_at: string | null; closes_at: string | null }): string {
  if (club.opens_at === null || club.closes_at === null) return t.common.roundTheClock;
  return `${club.opens_at.slice(0, 5)}–${club.closes_at.slice(0, 5)}`;
}

const NARROW_SPACE = ' ';

/** Whole tenge, e.g. `1 500 ₸`. */
export function formatKzt(amount: number): string {
  return `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_SPACE)} ₸`;
}

/** `Mon, 1 Jun` for a `YYYY-MM-DD` calendar date. */
export function formatDay(key: string): string {
  const { month, day } = parseDateKey(key);
  return `${t.weekdays[weekday(key)]}, ${day} ${t.months[month - 1]}`;
}

/** `Mon, 1 Jun` for an instant, on the club's calendar. */
export function formatInstantDay(ms: number, timeZone: string): string {
  return formatDay(dateKey(toZoned(ms, timeZone)));
}

/** `Fri 13 Nov · live at 21:46` on the club's clock. */
export function formatStamp(ms: number, timeZone: string): string {
  const local = toZoned(ms, timeZone);
  const key = dateKey(local);
  return `${t.weekdays[weekday(key)]} ${local.day} ${t.months[local.month - 1]} · ${t.common.liveAt} ${formatTime(ms, timeZone)}`;
}

export function formatDuration(minutes: number): string {
  return t.hours(Math.floor(minutes / 60), minutes % 60);
}

/** `M:SS` countdown. */
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** `HH:MM` for the time left of a running session. */
export function formatHoursLeft(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
