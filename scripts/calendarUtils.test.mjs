import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { canProjectRecurrence, computeUpcoming } from '../src/lib/calendarUtils.ts';

const iso = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
const firstMonday = { weekday: 'Monday', weeks: [1] };
const project = (rule, start, horizon = 75, extra = {}) => computeUpcoming(
  [{ name: 'Example venue', recurrence: [rule], ...extra }], horizon, start,
).map((event) => iso(event.date));

test('NHM production rule never becomes an out-of-season September booking', () => {
  const listings = JSON.parse(fs.readFileSync(new URL('../src/data/listings.json', import.meta.url), 'utf8'));
  const nhm = listings.find((listing) => listing.id === 'nhm-la-sensory-field-trip-la');
  assert.ok(nhm);
  const dates = computeUpcoming([{ name: nhm.name, recurrence: nhm.recurrence, scheduleText: nhm.schedule }], 75, new Date(2026, 8, 1));
  assert.deepEqual(dates, []);
});

test('bounds in schedule text are respected when the rule note omits them', () => {
  assert.deepEqual(project(firstMonday, new Date(2026, 8, 1), 75, {
    scheduleText: 'First Monday, October–June',
  }), []);
  assert.equal(canProjectRecurrence(firstMonday, 'Term-time Mondays'), false);
  assert.equal(canProjectRecurrence(firstMonday, 'On selected Mondays'), false);
  assert.equal(canProjectRecurrence(firstMonday, 'First Monday except holidays'), false);
});

test('explicit months include the opening month and exclude the preceding month', () => {
  const rule = { ...firstMonday, note: 'Oct–June', months: [10, 11, 12, 1, 2, 3, 4, 5, 6] };
  assert.deepEqual(project(rule, new Date(2026, 8, 1), 40), ['2026-10-05']);
  assert.deepEqual(project(rule, new Date(2027, 5, 1), 70), ['2027-06-07']);
});

test('winter season continues correctly across the year boundary', () => {
  const rule = { ...firstMonday, months: [12, 1], note: 'December–January' };
  assert.deepEqual(project(rule, new Date(2026, 11, 1), 75), ['2026-12-07', '2027-01-04']);
});

test('last weekday and inclusive horizon still work for year-round rules', () => {
  assert.deepEqual(project({ weekday: 'Sunday', weeks: [-1] }, new Date(2026, 8, 1), 60), ['2026-09-27', '2026-10-25']);
  assert.deepEqual(project(firstMonday, new Date(2026, 8, 7), 0), ['2026-09-07']);
});

test('explicit valid dates remain available when recurrence is withheld', () => {
  assert.deepEqual(project({ ...firstMonday, note: 'Oct–June' }, new Date(2026, 8, 1), 40, {
    dates: ['2026-09-21 (Officially announced extra event)'],
  }), ['2026-09-21']);
});

test('invalid months or impossible explicit dates cannot normalize into bookings', () => {
  assert.deepEqual(project({ ...firstMonday, months: [] }, new Date(2026, 8, 1)), []);
  assert.deepEqual(project({ ...firstMonday, months: [0, 13] }, new Date(2026, 8, 1)), []);
  assert.deepEqual(computeUpcoming([{ name: 'Example', dates: ['2027-02-30', '2027-02-28'] }], 40, new Date(2027, 1, 1)).map((event) => iso(event.date)), ['2027-02-28']);
});

test('negative horizons and invalid reference dates yield no occurrences', () => {
  assert.deepEqual(project(firstMonday, new Date(2026, 8, 1), -1), []);
  assert.deepEqual(project(firstMonday, new Date('invalid')), []);
});
