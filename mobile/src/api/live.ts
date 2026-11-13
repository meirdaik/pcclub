/**
 * Live views of the catalog: clubs with their free-seat counts, and a club's floor plan.
 * Both are built from the API's `available` flag for a time window; nothing is guessed here.
 */

import { type SeatState, MIN_STAY_MS, NOW_WINDOW_MS, nextSlotStart, seatState } from '@/lib/seats';

import { type Club, type Pc, type Zone, getClub, listClubs, listPcs, listZones } from './endpoints';

export type ClubLive = {
  club: Club;
  pcs: Pc[];
  free: number;
  total: number;
  /** Cheapest hourly price in the club, if it has any PC. */
  fromPriceKzt: number | null;
  hasVip: boolean;
  open24: boolean;
};

export function summarizeClub(club: Club, pcs: Pc[]): ClubLive {
  return {
    club,
    pcs,
    free: pcs.filter((pc) => pc.available === true).length,
    total: pcs.length,
    fromPriceKzt: pcs.length ? Math.min(...pcs.map((pc) => pc.price_per_hour_kzt)) : null,
    hasVip: pcs.some((pc) => /vip/i.test(pc.zone_name)),
    open24: club.opens_at === null || club.closes_at === null,
  };
}

/** Every club with how many of its seats can be booked for at least the shortest stay. */
export async function loadClubsLive(now: number): Promise<ClubLive[]> {
  const clubs = (await listClubs()) ?? [];
  const from = nextSlotStart(now);
  return Promise.all(
    clubs.map(async (club) => {
      // One club failing to answer must not hide the others.
      const pcs = await listPcs(club.id, { from, to: from + MIN_STAY_MS }).catch((): Pc[] => []);
      return summarizeClub(club, pcs ?? []);
    }),
  );
}

export type Seat = { pc: Pc; state: SeatState };

export type FloorPlan = {
  club: Club;
  zones: Zone[];
  seats: Seat[];
  /** Start of the stay the "free" state is about. */
  slotStart: number;
};

/**
 * The floor plan of a club. Two windows are asked: the next slot for the shortest stay (is the
 * seat bookable?) and the present minute (is it taken right now, or only reserved later?).
 */
export async function loadFloorPlan(
  clubId: string,
  now: number,
  /** The stay being booked; without it, the shortest stay from the next slot. */
  stay?: { from: number; to: number },
): Promise<FloorPlan> {
  const slotStart = stay?.from ?? nextSlotStart(now);
  const probeFrom = stay ? Math.max(now, stay.from) : now;
  const [club, zones, bookable, occupied] = await Promise.all([
    getClub(clubId),
    listZones(clubId),
    listPcs(clubId, { from: slotStart, to: stay?.to ?? slotStart + MIN_STAY_MS }),
    listPcs(clubId, { from: probeFrom, to: probeFrom + NOW_WINDOW_MS }),
  ]);
  const takenNow = new Map((occupied ?? []).map((pc) => [pc.id, pc.available === false]));
  const seats = (bookable ?? []).map((pc) => ({
    pc,
    state: seatState({ bookable: pc.available, occupiedNow: takenNow.get(pc.id) }),
  }));
  return { club, zones: zones ?? [], seats, slotStart };
}
