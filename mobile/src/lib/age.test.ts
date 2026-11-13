import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ageOn, isMinorOn } from './age.ts';

test('age counts whole years and turns on the birthday', () => {
  assert.equal(ageOn('2010-06-02', '2026-06-01'), 15);
  assert.equal(ageOn('2010-06-02', '2026-06-02'), 16);
  assert.equal(ageOn('2008-11-13', '2026-11-12'), 17);
  assert.equal(ageOn('2008-11-13', '2026-11-13'), 18);
});

test('minor until the 18th birthday', () => {
  assert.equal(isMinorOn('2008-11-13', '2026-11-12'), true);
  assert.equal(isMinorOn('2008-11-13', '2026-11-13'), false);
});

test('a 29 February birthday turns adult on 1 March, like the server', () => {
  assert.equal(isMinorOn('2008-02-29', '2026-02-28'), true);
  assert.equal(isMinorOn('2008-02-29', '2026-03-01'), false);
});
