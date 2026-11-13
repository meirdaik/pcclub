/**
 * The rows of the package picker for one PC: pay-as-you-go hours plus the zone's packages, each
 * with the start, end and price it would have if booked at the next slot.
 *
 * Like packages.ts this only draws the picker: the server computes the real end and price, and
 * it alone decides whether the user may book (age rule included).
 * Pure functions: the clock is always passed in.
 */

import { type PackageTerms, canStartPackage, packageEnd } from './packages.ts';
import {
  addDays,
  dateKey,
  fromZoned,
  parseDateKey,
  parseTimeOfDay,
  toZoned,
} from './time.ts';

const MINUTE_MS = 60_000;
const HOURLY_CHOICES = [1, 2];

export type PackageLike = PackageTerms & {
  id: string;
  name: string;
  price_kzt: number;
  is_night: boolean;
};

/**
 * Identifies a kind of package across zones: a "3 hours" package exists once per zone with its
 * own price, and the player picks the kind first and the zone (so the price) afterwards.
 */
export function packageTypeKey(pkg: {
  name: string;
  duration_minutes: number | null;
  window_start: string | null;
  window_end: string | null;
}): string {
  return [
    pkg.name.trim().toLowerCase(),
    pkg.duration_minutes ?? '',
    pkg.window_start ?? '',
    pkg.window_end ?? '',
  ].join('|');
}

export type PlanRow = {
  /** `null` for pay-as-you-go hours. */
  packageId: string | null;
  name: string | null;
  startMs: number;
  endMs: number;
  minutes: number;
  priceKzt: number;
  ratePerHourKzt: number;
  /** How much cheaper than the same time at the hourly price, 0 if not cheaper. */
  saveKzt: number;
  /** The server marks packages that run into the night hours (18+). */
  night: boolean;
};

/** When a package can start, as early as possible from `slotStart`; `null` if it never can soon. */
function packageStart(pkg: PackageLike, slotStart: number, timeZone: string): number | null {
  if (canStartPackage(pkg, slotStart, timeZone)) return slotStart;
  if (pkg.window_start === null) return null;
  const opens = parseTimeOfDay(pkg.window_start);
  const today = dateKey(toZoned(slotStart, timeZone));
  for (const day of [today, addDays(today, 1)]) {
    const start = fromZoned(
      { ...parseDateKey(day), hour: Math.floor(opens / 60), minute: opens % 60 },
      timeZone,
    );
    if (start >= slotStart && canStartPackage(pkg, start, timeZone)) return start;
  }
  return null;
}

export function planRows(input: {
  packages: readonly PackageLike[];
  pricePerHourKzt: number;
  slotStart: number;
  timeZone: string;
}): PlanRow[] {
  const { packages, pricePerHourKzt, slotStart, timeZone } = input;
  const rows: PlanRow[] = HOURLY_CHOICES.map((hours) => ({
    packageId: null,
    name: null,
    startMs: slotStart,
    endMs: slotStart + hours * 60 * MINUTE_MS,
    minutes: hours * 60,
    priceKzt: pricePerHourKzt * hours,
    ratePerHourKzt: pricePerHourKzt,
    saveKzt: 0,
    night: false,
  }));

  for (const pkg of packages) {
    const startMs = packageStart(pkg, slotStart, timeZone);
    if (startMs === null) continue;
    const endMs = packageEnd(pkg, startMs, timeZone);
    if (endMs === null) continue;
    const minutes = Math.round((endMs - startMs) / MINUTE_MS);
    const atHourly = Math.round((pricePerHourKzt * minutes) / 60);
    rows.push({
      packageId: pkg.id,
      name: pkg.name,
      startMs,
      endMs,
      minutes,
      priceKzt: pkg.price_kzt,
      ratePerHourKzt: Math.round((pkg.price_kzt * 60) / minutes),
      saveKzt: Math.max(0, atHourly - pkg.price_kzt),
      night: pkg.is_night,
    });
  }
  return rows.sort((a, b) => a.minutes - b.minutes || a.startMs - b.startMs);
}
