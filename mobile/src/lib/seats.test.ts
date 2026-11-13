import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countStates, freesAt, nextSlotStart, seatCellLabel, seatState } from './seats.ts';

const at = (iso: string) => Date.parse(iso);

test('next slot is the coming half hour', () => {
  assert.equal(nextSlotStart(at('2026-06-01T16:46:00Z')), at('2026-06-01T17:00:00Z'));
  assert.equal(nextSlotStart(at('2026-06-01T16:15:00Z')), at('2026-06-01T16:30:00Z'));
});

test('a slot less than a minute away is skipped, an exact boundary is not "now"', () => {
  assert.equal(nextSlotStart(at('2026-06-01T16:59:30Z')), at('2026-06-01T17:30:00Z'));
  assert.equal(nextSlotStart(at('2026-06-01T17:00:00Z')), at('2026-06-01T17:30:00Z'));
});

test('seat states from the two availability windows', () => {
  assert.equal(seatState({ bookable: true, occupiedNow: false }), 'free');
  assert.equal(seatState({ bookable: false, occupiedNow: true }), 'busy');
  assert.equal(seatState({ bookable: false, occupiedNow: false }), 'booked');
  assert.equal(seatState({ bookable: null, occupiedNow: null }), 'off');
  assert.equal(seatState({ bookable: undefined, occupiedNow: true }), 'off');
});

test('state counts', () => {
  assert.deepEqual(countStates(['free', 'free', 'busy', 'off']), {
    free: 2,
    busy: 1,
    booked: 0,
    off: 1,
  });
});

test('a taken seat frees at the end of the back-to-back run of bookings', () => {
  const now = at('2026-06-01T17:00:00Z');
  const h = (iso: string) => at(`2026-06-01T${iso}:00Z`);
  assert.equal(freesAt([], now), null);
  assert.equal(freesAt([{ start: h('18:00'), end: h('19:00') }], now), null); // only later
  assert.equal(freesAt([{ start: h('16:00'), end: h('17:40') }], now), h('17:40'));
  assert.equal(
    freesAt(
      [
        { start: h('17:40'), end: h('18:40') },
        { start: h('16:00'), end: h('17:40') },
        { start: h('19:00'), end: h('20:00') },
      ],
      now,
    ),
    h('18:40'),
  );
});

test('cell labels', () => {
  assert.equal(seatCellLabel('A09'), 'A09');
  assert.equal(seatCellLabel('PC-01'), '01');
  assert.equal(seatCellLabel('ARENA-12'), '12');
});
