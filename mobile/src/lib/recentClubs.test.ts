import assert from 'node:assert/strict';
import { test } from 'node:test';

import { recentClubIds } from './recentClubs.ts';

const visit = (club: string, day: number, status = 'completed') => ({
  club_id: club,
  starts_at: `2026-06-${String(day).padStart(2, '0')}T10:00:00Z`,
  status,
});

test('the club visited last comes first, each club once', () => {
  const ids = recentClubIds([visit('a', 1), visit('b', 5), visit('a', 9), visit('c', 3)]);
  assert.deepEqual(ids, ['a', 'b', 'c']);
});

test('only paid visits count', () => {
  const ids = recentClubIds([
    visit('a', 1),
    visit('b', 5, 'cancelled'),
    visit('c', 6, 'pending_payment'),
    visit('d', 7, 'expired'),
    visit('e', 8, 'no_show'),
    visit('f', 2, 'confirmed'),
  ]);
  assert.deepEqual(ids, ['f', 'a']);
});

test('at most five clubs', () => {
  const ids = recentClubIds(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((club, i) => visit(club, i + 1)));
  assert.deepEqual(ids, ['g', 'f', 'e', 'd', 'c']);
});

test('no visits, no clubs', () => {
  assert.deepEqual(recentClubIds([]), []);
});
