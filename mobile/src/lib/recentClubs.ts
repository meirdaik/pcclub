/**
 * "My Club": the clubs a player has been to, most recent first, at most five. A visit is a
 * booking that was paid for; unpaid, cancelled, expired and no-show bookings are not visits.
 * Pure functions.
 */

import { parseInstant } from './time.ts';

export const MAX_RECENT_CLUBS = 5;

type BookingLike = { club_id: string; starts_at: string; status: string };

const VISIT_STATUSES = new Set(['confirmed', 'completed']);

export function recentClubIds(bookings: readonly BookingLike[], max = MAX_RECENT_CLUBS): string[] {
  const ordered = bookings
    .filter((booking) => VISIT_STATUSES.has(booking.status))
    .sort((a, b) => parseInstant(b.starts_at) - parseInstant(a.starts_at));
  const ids: string[] = [];
  for (const booking of ordered) {
    if (!ids.includes(booking.club_id)) ids.push(booking.club_id);
    if (ids.length === max) break;
  }
  return ids;
}
