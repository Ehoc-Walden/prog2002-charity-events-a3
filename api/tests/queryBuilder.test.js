'use strict';

/**
 * @file Unit tests for the parameterised SQL builders.
 *
 * The point of these tests is to prove that the generated statements contain
 * placeholders only, and that user supplied values always travel in the
 * parameter array - which is what makes SQL injection impossible.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EVENT_INSERT_COLUMNS,
  buildEventListStatement,
  buildSearchStatement,
  toEventValues
} = require('../src/utils/eventSql');

const baseFilters = {
  today: '2026-09-25',
  date: null,
  location: '',
  categories: [],
  sort: 'date_asc',
  scope: 'upcoming',
  page: 1,
  limit: 12
};

test('buildSearchStatement keeps all values parameterised', () => {
  const statement = buildSearchStatement({
    ...baseFilters,
    location: 'Bondi',
    categories: ['wellness', 'community'],
    page: 2,
    limit: 6
  });

  assert.match(statement.rowsSql, /c\.slug IN \(\?, \?\)/);
  assert.match(statement.rowsSql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(statement.rowsParams, ['2026-09-25', '%Bondi%', 'wellness', 'community', 6, 6]);
  assert.equal(statement.countParams.length, 4);
});

test('buildSearchStatement selects only published active events', () => {
  const statement = buildSearchStatement(baseFilters);
  assert.match(statement.rowsSql, /e\.status = 'published'/);
  assert.match(statement.rowsSql, /DATE\(e\.end_datetime\) >= \?/);
  assert.match(statement.rowsSql, /ORDER BY e\.start_datetime ASC/);
});

test('buildSearchStatement bounds past events when scope is past', () => {
  const statement = buildSearchStatement({ ...baseFilters, scope: 'past' });
  assert.match(statement.rowsSql, /DATE\(e\.end_datetime\) < \?/);
  assert.deepEqual(statement.countParams, ['2026-09-25']);
});

test('buildSearchStatement removes the date window when scope is all', () => {
  const statement = buildSearchStatement({ ...baseFilters, scope: 'all' });
  assert.doesNotMatch(statement.rowsSql, /DATE\(e\.end_datetime\)/);
  assert.deepEqual(statement.rowsParams, [12, 0]);
});

test('buildSearchStatement escapes nothing by concatenation', () => {
  const hostile = "Bondi'; DROP TABLE events; --";
  const statement = buildSearchStatement({ ...baseFilters, location: hostile, categories: ['fun-run'] });

  assert.doesNotMatch(statement.rowsSql, /DROP TABLE/);
  assert.ok(statement.rowsParams.includes(`%${hostile}%`));
});

test('buildSearchStatement counts registration totals for each card', () => {
  const statement = buildSearchStatement(baseFilters);
  assert.match(statement.rowsSql, /registration_count/);
  assert.match(statement.rowsSql, /tickets_sold/);
});

test('buildEventListStatement returns every status by default', () => {
  const filters = { status: 'all', search: '', sort: 'start_desc', page: 1, limit: 50 };
  const statement = buildEventListStatement(filters);

  assert.doesNotMatch(statement.rowsSql, /e\.status = \?/);
  // The only WHERE clauses left are the two correlated subqueries inside the
  // shared column list; the outer statement has no filter at all.
  assert.equal((statement.rowsSql.match(/WHERE/g) || []).length, 2);
  assert.deepEqual(statement.rowsParams, [50, 0]);
  assert.deepEqual(statement.countParams, []);
});

test('buildEventListStatement filters by status and search term', () => {
  const filters = { status: 'suspended', search: 'sleepout', sort: 'title_asc', page: 2, limit: 10 };
  const statement = buildEventListStatement(filters);

  assert.match(statement.rowsSql, /e\.status = \?/);
  assert.match(statement.rowsSql, /LIKE \?/);
  assert.match(statement.rowsSql, /ORDER BY e\.title ASC/);
  assert.deepEqual(statement.countParams, ['suspended', '%sleepout%']);
  assert.deepEqual(statement.rowsParams, ['suspended', '%sleepout%', 10, 10]);
});

test('buildEventListStatement falls back to the default sort', () => {
  const statement = buildEventListStatement({ status: 'all', search: '', sort: 'not-a-sort', page: 1, limit: 5 });
  assert.match(statement.rowsSql, /ORDER BY e\.start_datetime DESC/);
});

test('toEventValues matches the INSERT column order', () => {
  const payload = {
    organisationId: 1,
    categoryId: 2,
    venueId: 3,
    title: 'Title',
    slug: 'slug',
    summary: 'Summary',
    purpose: 'Purpose',
    description: 'Description',
    startDateTime: '2026-11-07 18:30:00',
    endDateTime: '2026-11-07 21:00:00',
    timezone: 'Australia/Sydney',
    ticketPrice: 45.5,
    currency: 'AUD',
    isFree: false,
    goalAmount: 25000,
    raisedAmount: 1200,
    capacity: 400,
    heroImageKey: 'assets/covers/twilight-harbour.svg',
    status: 'published',
    isFeatured: true,
    publishedAt: '2026-11-07 18:30:00'
  };

  const values = toEventValues(payload);
  assert.equal(values.length, EVENT_INSERT_COLUMNS.length);
  assert.equal(values[EVENT_INSERT_COLUMNS.indexOf('ticket_price')], 45.5);
  assert.equal(values[EVENT_INSERT_COLUMNS.indexOf('is_free')], 0);
  assert.equal(values[EVENT_INSERT_COLUMNS.indexOf('is_featured')], 1);
  assert.equal(values[EVENT_INSERT_COLUMNS.indexOf('status')], 'published');
});

