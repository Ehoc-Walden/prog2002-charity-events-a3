'use strict';

/**
 * @file Unit tests for the request validators.
 *
 * These tests run with the built-in Node test runner (`npm test`) and need no
 * database connection, so they can be executed on any machine that has Node
 * installed - including the marker's machine.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toBooleanFlag,
  toCapacity,
  toColour,
  toDateString,
  toDateTime,
  toEmail,
  toId,
  toPhone,
  toSlug,
  validateCategoryPayload,
  validateEventListQuery,
  validateEventPayload,
  validateRegistrationPayload,
  validateSearchQuery
} = require('../src/utils/validation');

test('validateSearchQuery applies safe defaults', () => {
  const result = validateSearchQuery({});
  assert.deepEqual(result, {
    date: null,
    location: '',
    categories: [],
    sort: 'date_asc',
    scope: 'upcoming',
    page: 1,
    limit: 12
  });
});

test('validateSearchQuery accepts explicit past and all scopes', () => {
  assert.equal(validateSearchQuery({ scope: 'past' }).scope, 'past');
  assert.equal(validateSearchQuery({ scope: 'all' }).scope, 'all');
});

test('validateSearchQuery accepts comma-separated category slugs', () => {
  const result = validateSearchQuery({ category: 'fun-run,community', location: 'Manly' });
  assert.deepEqual(result.categories, ['fun-run', 'community']);
  assert.equal(result.location, 'Manly');
});

test('validateSearchQuery rejects invalid dates and sort values', () => {
  assert.throws(() => validateSearchQuery({ date: '18/10/2026' }), /YYYY-MM-DD/);
  assert.throws(() => validateSearchQuery({ sort: 'random' }), /sort must be/);
  assert.throws(() => validateSearchQuery({ scope: 'everything' }), /scope must be/);
});

test('validateEventListQuery defaults to every status for the admin dashboard', () => {
  const result = validateEventListQuery({});
  assert.equal(result.status, 'all');
  assert.equal(result.search, '');
  assert.equal(result.sort, 'start_desc');
  assert.equal(result.page, 1);
  assert.equal(result.limit, 50);
});

test('validateEventListQuery accepts a status filter and free-text search', () => {
  const result = validateEventListQuery({ status: 'suspended', q: 'sleepout' });
  assert.equal(result.status, 'suspended');
  assert.equal(result.search, 'sleepout');
});

test('validateEventListQuery rejects unknown statuses and sorts', () => {
  assert.throws(() => validateEventListQuery({ status: 'archived' }), /status must be/);
  assert.throws(() => validateEventListQuery({ sort: 'random' }), /sort must be/);
});

test('validateRegistrationPayload normalises a valid registration', () => {
  const payload = validateRegistrationPayload({
    firstName: '  Zhiming ',
    lastName: 'Wei',
    email: 'ZHIMING.WEI@EXAMPLE.COM',
    phone: '+61 400 000 000',
    ticketQuantity: '3',
    notes: 'Wheelchair access please'
  });

  assert.equal(payload.firstName, 'Zhiming');
  assert.equal(payload.email, 'zhiming.wei@example.com');
  assert.equal(payload.ticketQuantity, 3);
  assert.equal(payload.status, 'confirmed');
  assert.equal(payload.notes, 'Wheelchair access please');
});

test('validateRegistrationPayload enforces the required fields', () => {
  assert.throws(() => validateRegistrationPayload({}), /firstName is required/);
  assert.throws(
    () => validateRegistrationPayload({ firstName: 'A', lastName: 'B', email: 'not-an-email', phone: '0400000000' }),
    /valid email address/
  );
  assert.throws(
    () => validateRegistrationPayload({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: 'abc' }),
    /may only contain digits/
  );
  assert.throws(
    () => validateRegistrationPayload({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '0400 000 000', ticketQuantity: '0' }),
    /between 1 and 100/
  );
});

test('validateEventPayload builds a complete insert payload', () => {
  const payload = validateEventPayload({
    organisationId: '1',
    categoryId: '2',
    venueId: '3',
    title: 'Twilight Harbour Run',
    slug: 'Twilight-Harbour-Run',
    summary: 'A 5 km run along the harbour foreshore.',
    purpose: 'Raise funds for emergency accommodation.',
    description: 'A friendly, flat course suitable for every pace.',
    startDateTime: '2026-11-07T18:30',
    endDateTime: '2026-11-07T21:00',
    isFree: 'false',
    ticketPrice: '45.50',
    goalAmount: '25000',
    raisedAmount: '1200',
    capacity: '400',
    heroImageKey: 'assets/covers/twilight-harbour.svg',
    status: 'published',
    currency: 'aud',
    isFeatured: 'yes',
    highlights: [{ title: 'Timed 5 km course', detail: 'Chip timing for every entrant.' }]
  });

  assert.equal(payload.slug, 'twilight-harbour-run');
  assert.equal(payload.startDateTime, '2026-11-07 18:30:00');
  assert.equal(payload.ticketPrice, 45.5);
  assert.equal(payload.currency, 'AUD');
  assert.equal(payload.isFeatured, true);
  assert.equal(payload.publishedAt, '2026-11-07 18:30:00');
  assert.deepEqual(payload.highlights, [
    { title: 'Timed 5 km course', detail: 'Chip timing for every entrant.', displayOrder: 1 }
  ]);
});

test('validateEventPayload forces a free event to cost nothing', () => {
  const payload = validateEventPayload({
    organisationId: 1,
    categoryId: 1,
    venueId: 1,
    title: 'Community picnic',
    slug: 'community-picnic',
    summary: 'Bring a plate.',
    purpose: 'Say thank you to volunteers.',
    description: 'An open afternoon in the park.',
    startDateTime: '2026-12-01 10:00',
    endDateTime: '2026-12-01 14:00',
    isFree: true,
    ticketPrice: 99,
    goalAmount: 500,
    heroImageKey: 'assets/covers/long-lunch.svg'
  });

  assert.equal(payload.ticketPrice, 0);
  assert.equal(payload.status, 'published');
});

test('validateEventPayload rejects impossible date ranges and amounts', () => {
  const base = {
    organisationId: 1,
    categoryId: 1,
    venueId: 1,
    title: 'Test event',
    slug: 'test-event',
    summary: 'Summary text.',
    purpose: 'Purpose text.',
    description: 'Description text.',
    goalAmount: 100,
    heroImageKey: 'assets/covers/river-cleanup.svg'
  };

  assert.throws(
    () => validateEventPayload({ ...base, startDateTime: '2026-12-01 14:00', endDateTime: '2026-12-01 10:00' }),
    /endDateTime must be later/
  );
  assert.throws(() => validateEventPayload({ ...base, startDateTime: '2026-12-01 10:00' }), /endDateTime is required/);
  assert.throws(
    () => validateEventPayload({ ...base, startDateTime: '2026-12-01 10:00', endDateTime: '2026-12-01 11:00', goalAmount: 0 }),
    /goalAmount/
  );
  assert.throws(
    () => validateEventPayload({ ...base, startDateTime: '2026-12-01 10:00', endDateTime: '2026-12-01 11:00', summary: '' }),
    /summary is required/
  );
});

test('validateCategoryPayload validates the accent colour', () => {
  const category = validateCategoryPayload({
    name: 'Coastal care',
    slug: 'coastal-care',
    description: 'Cleaner waterways and restored habitat.',
    accentColour: '#17b7a5',
    iconKey: 'coast'
  });

  assert.equal(category.accentColour, '#17B7A5');
  assert.equal(category.isActive, true);
  assert.throws(() => validateCategoryPayload({ name: 'x', slug: 'x', description: 'y', accentColour: 'teal', iconKey: 'z' }), /hex colour/);
});

test('primitive validators normalise and reject correctly', () => {
  assert.equal(toDateString('', 'date'), null);
  assert.equal(toDateString('2026-10-31', 'date'), '2026-10-31');
  assert.equal(toDateTime('2026-11-07T18:30', 'start'), '2026-11-07 18:30:00');
  assert.equal(toId('12', 'eventId'), 12);
  assert.equal(toSlug('Coastal-Care', 'slug'), 'coastal-care');
  assert.equal(toEmail('HELLO@Example.com'), 'hello@example.com');
  assert.equal(toPhone('+61 2 5550 0142'), '+61 2 5550 0142');
  assert.equal(toCapacity('', 'capacity'), null);
  assert.equal(toColour('#ff5a36'), '#FF5A36');
  assert.equal(toBooleanFlag('no', 'isFeatured', true), false);
  assert.equal(toBooleanFlag(undefined, 'isFeatured', true), true);
  assert.throws(() => toId('abc', 'eventId'), /positive integer/);
  assert.throws(() => toCapacity('0', 'capacity'), /whole number/);
});
