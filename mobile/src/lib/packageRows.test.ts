import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type PackageLike, packageTypeKey, planRows } from './packageRows.ts';

const ZONE = 'Asia/Almaty'; // UTC+5
const at = (iso: string) => Date.parse(iso);

const evening: PackageLike = {
  id: 'p3',
  name: 'Evening block',
  price_kzt: 3300,
  is_night: false,
  duration_minutes: 180,
  window_start: null,
  window_end: null,
};
const night: PackageLike = {
  id: 'pn',
  name: 'Night pass',
  price_kzt: 7500,
  is_night: true,
  duration_minutes: null,
  window_start: '22:00:00',
  window_end: '08:00:00',
};

// 21:30 club time on 1 June 2026.
const slotStart = at('2026-06-01T16:30:00Z');

test('hourly rows come first and cost the hourly price', () => {
  const rows = planRows({ packages: [], pricePerHourKzt: 1200, slotStart, timeZone: ZONE });
  assert.deepEqual(
    rows.map((row) => [row.packageId, row.minutes, row.priceKzt]),
    [
      [null, 60, 1200],
      [null, 120, 2400],
    ],
  );
});

test('a duration package starts at the slot and shows what it saves', () => {
  const rows = planRows({ packages: [evening], pricePerHourKzt: 1200, slotStart, timeZone: ZONE });
  const row = rows.find((item) => item.packageId === 'p3');
  assert.ok(row);
  assert.equal(row.startMs, slotStart);
  assert.equal(row.endMs, slotStart + 180 * 60_000);
  assert.equal(row.ratePerHourKzt, 1100);
  assert.equal(row.saveKzt, 300);
});

test('a night window package that has not opened yet starts when its window opens', () => {
  const rows = planRows({ packages: [night], pricePerHourKzt: 1200, slotStart, timeZone: ZONE });
  const row = rows.find((item) => item.packageId === 'pn');
  assert.ok(row);
  assert.equal(row.startMs, at('2026-06-01T17:00:00Z')); // 22:00 club time
  assert.equal(row.endMs, at('2026-06-02T03:00:00Z')); // 08:00 next day
  assert.equal(row.minutes, 600);
  assert.equal(row.night, true);
});

test('a window package already open starts at the slot and ends with the window', () => {
  const late = at('2026-06-01T18:00:00Z'); // 23:00 club time
  const row = planRows({
    packages: [night],
    pricePerHourKzt: 1200,
    slotStart: late,
    timeZone: ZONE,
  }).find((item) => item.packageId === 'pn');
  assert.ok(row);
  assert.equal(row.startMs, late);
  assert.equal(row.endMs, at('2026-06-02T03:00:00Z'));
});

test('rows are ordered by length', () => {
  const rows = planRows({
    packages: [night, evening],
    pricePerHourKzt: 1200,
    slotStart,
    timeZone: ZONE,
  });
  assert.deepEqual(
    rows.map((row) => row.minutes),
    [60, 120, 180, 600],
  );
});

test('the same package in two zones is one kind, whatever its price', () => {
  const otherZone = { ...evening, id: 'p3-vip', price_kzt: 4500 };
  assert.equal(packageTypeKey(evening), packageTypeKey(otherZone));
  assert.notEqual(packageTypeKey(evening), packageTypeKey(night));
});
