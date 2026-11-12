import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canStartPackage, packageEnd } from './packages.ts';
import { fromZoned } from './time.ts';

const ALMATY = 'Asia/Almaty'; // UTC+5, no DST

/** A club-local time in June 2026. */
const at = (day: number, hour: number, minute = 0) =>
  fromZoned({ year: 2026, month: 6, day, hour, minute }, ALMATY);

const lasting = (minutes: number) => ({
  duration_minutes: minutes,
  window_start: null,
  window_end: null,
});
const daily = (from: string, to: string) => ({
  duration_minutes: null,
  window_start: from,
  window_end: to,
});

const DAY = daily('13:00:00', '18:00:00');
const NIGHT = daily('22:00:00', '08:00:00');

test('a duration package ends after its length, at any time of day', () => {
  assert.equal(packageEnd(lasting(180), at(1, 18), ALMATY), at(1, 21));
  assert.equal(packageEnd(lasting(180), at(1, 23), ALMATY), at(2, 2));
  assert.equal(packageEnd(lasting(90), at(1, 3, 30), ALMATY), at(1, 5));
});

test('a day window runs until its end, wherever inside it the booking starts', () => {
  assert.equal(packageEnd(DAY, at(1, 13), ALMATY), at(1, 18));
  assert.equal(packageEnd(DAY, at(1, 15, 30), ALMATY), at(1, 18));
  assert.equal(packageEnd(DAY, at(1, 17, 30), ALMATY), at(1, 18));
});

test('a day window cannot start outside it; its end is exclusive', () => {
  assert.equal(packageEnd(DAY, at(1, 12, 30), ALMATY), null);
  assert.equal(packageEnd(DAY, at(1, 18), ALMATY), null);
  assert.equal(packageEnd(DAY, at(1, 23), ALMATY), null);
});

test('an overnight window covers the evening and the morning after', () => {
  assert.equal(packageEnd(NIGHT, at(1, 22), ALMATY), at(2, 8));
  assert.equal(packageEnd(NIGHT, at(1, 23, 30), ALMATY), at(2, 8));
  assert.equal(packageEnd(NIGHT, at(2, 0), ALMATY), at(2, 8));
  assert.equal(packageEnd(NIGHT, at(2, 7, 30), ALMATY), at(2, 8));

  assert.equal(packageEnd(NIGHT, at(1, 21, 30), ALMATY), null);
  assert.equal(packageEnd(NIGHT, at(2, 8), ALMATY), null);
  assert.equal(packageEnd(NIGHT, at(2, 12), ALMATY), null);
});

test('the window is on the club clock, not UTC', () => {
  // 13:00 in Almaty is 08:00 UTC; 13:00 UTC is already 18:00 there.
  assert.equal(packageEnd(DAY, Date.UTC(2026, 5, 1, 8, 0), ALMATY), Date.UTC(2026, 5, 1, 13, 0));
  assert.equal(packageEnd(DAY, Date.UTC(2026, 5, 1, 13, 0), ALMATY), null);
  // The same package in a Tokyo club (UTC+9) opens at 04:00 UTC.
  assert.equal(
    packageEnd(DAY, Date.UTC(2026, 5, 1, 4, 0), 'Asia/Tokyo'),
    Date.UTC(2026, 5, 1, 9, 0),
  );
});

test('a package without terms never starts', () => {
  const broken = { duration_minutes: null, window_start: '13:00:00', window_end: null };
  assert.equal(packageEnd(broken, at(1, 14), ALMATY), null);
  assert.equal(canStartPackage(broken, at(1, 14), ALMATY), false);
});

test('the picker offers only starts that make a bookable length', () => {
  assert.equal(canStartPackage(DAY, at(1, 13), ALMATY), true);
  assert.equal(canStartPackage(DAY, at(1, 17), ALMATY), true); // exactly one hour left
  assert.equal(canStartPackage(DAY, at(1, 17, 30), ALMATY), false); // only 30 minutes left
  assert.equal(canStartPackage(DAY, at(1, 19), ALMATY), false); // outside the window

  assert.equal(canStartPackage(lasting(180), at(1, 3), ALMATY), true);
  assert.equal(canStartPackage(lasting(30), at(1, 3), ALMATY), false); // under the minimum
  assert.equal(canStartPackage(lasting(13 * 60), at(1, 3), ALMATY), false); // over 12 hours

  const allDay = daily('08:00:00', '22:00:00'); // 14 hours
  assert.equal(canStartPackage(allDay, at(1, 8), ALMATY), false);
  assert.equal(canStartPackage(allDay, at(1, 10), ALMATY), true); // 12 hours left
});
