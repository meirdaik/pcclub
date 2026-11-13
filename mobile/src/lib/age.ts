/**
 * Age from the birth date the server holds for an identity-verified user. This is only used to
 * show who the user is (age group, "you're 16" notice). Whether a booking breaks the
 * under-18 night rule is decided by the server (`MINOR_NIGHT_RESTRICTION`), never here.
 */

import { parseDateKey } from './time.ts';

export const ADULT_AGE = 18;

/** Whole years on a calendar day; both arguments are `YYYY-MM-DD`. */
export function ageOn(birthDate: string, day: string): number {
  const born = parseDateKey(birthDate);
  const on = parseDateKey(day);
  let age = on.year - born.year;
  if (on.month < born.month || (on.month === born.month && on.day < born.day)) age -= 1;
  return age;
}

export function isMinorOn(birthDate: string, day: string): boolean {
  return ageOn(birthDate, day) < ADULT_AGE;
}
