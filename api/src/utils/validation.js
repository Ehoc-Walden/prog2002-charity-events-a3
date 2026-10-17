'use strict';

/**
 * @file Request validation helpers for the Charity Events REST API.
 *
 * Every value that arrives from the network passes through this module before
 * it reaches the database layer. Nothing is ever interpolated into SQL - the
 * validators only prove that a value is safe and well formed, and the SQL
 * builders then bind it as a parameter.
 *
 * The module is deliberately free of Express types so it can be unit tested in
 * isolation (see api/tests/validation.test.js).
 */

const { HttpError } = require('./http');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{6,20}$/;
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

const EVENT_STATUSES = Object.freeze(['draft', 'published', 'suspended', 'cancelled']);
const REGISTRATION_STATUSES = Object.freeze(['confirmed', 'cancelled']);
const CURRENCIES = Object.freeze(['AUD', 'NZD', 'USD', 'GBP', 'EUR']);

/** Maximum number of rows any single read endpoint may return. */
const MAX_PAGE_SIZE = 100;

function toPositiveInteger(value, fallback, maximum) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) {
    throw new HttpError(400, 'Expected a positive integer.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new HttpError(400, `Value must be between 1 and ${maximum}.`);
  }
  return parsed;
}

function toDateString(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!DATE_PATTERN.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new HttpError(400, `${fieldName} must use YYYY-MM-DD format.`);
  }
  return text;
}

function toStringArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Normalises a browser or API date-time value into a MySQL DATETIME literal.
 * `2026-11-07T18:30` (an HTML datetime-local control) and
 * `2026-11-07 18:30:00` are both accepted and both become `2026-11-07 18:30:00`.
 *
 * @param {*} value Raw value from the request body.
 * @param {string} fieldName Field name used in the error message.
 * @param {{ required?: boolean }} [options] Whether an empty value is allowed.
 * @returns {string|null} MySQL compatible DATETIME string, or null.
 */
function toDateTime(value, fieldName, options = {}) {
  if (value === undefined || value === null || value === '') {
    if (options.required) throw new HttpError(400, `${fieldName} is required.`);
    return null;
  }
  const text = String(value).trim();
  if (!DATETIME_PATTERN.test(text)) {
    throw new HttpError(400, `${fieldName} must be a date and time such as 2026-11-07 18:30.`);
  }
  const normalised = text.replace('T', ' ');
  const withSeconds = normalised.length === 16 ? `${normalised}:00` : normalised;
  if (Number.isNaN(Date.parse(withSeconds.replace(' ', 'T')))) {
    throw new HttpError(400, `${fieldName} is not a real date and time.`);
  }
  return withSeconds;
}

function toRequiredString(value, fieldName, maximumLength) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (!text) throw new HttpError(400, `${fieldName} is required.`);
  if (text.length > maximumLength) {
    throw new HttpError(400, `${fieldName} must be ${maximumLength} characters or fewer.`);
  }
  return text;
}

function toOptionalString(value, fieldName, maximumLength) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (!text) return null;
  if (text.length > maximumLength) {
    throw new HttpError(400, `${fieldName} must be ${maximumLength} characters or fewer.`);
  }
  return text;
}

function toSlug(value, fieldName) {
  const text = toRequiredString(value, fieldName, 200).toLowerCase();
  if (!SLUG_PATTERN.test(text)) {
    throw new HttpError(400, `${fieldName} must contain lower-case letters, numbers and single hyphens only.`);
  }
  return text;
}

function toEnum(value, allowedValues, fieldName) {
  const text = toRequiredString(value, fieldName, 40).toLowerCase();
  const canonical = allowedValues.find((candidate) => String(candidate).toLowerCase() === text);
  if (!canonical) {
    throw new HttpError(400, `${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }
  return canonical;
}

function toId(value, fieldName) {
  if (!/^\d+$/.test(String(value))) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function toAmount(value, fieldName, options = {}) {
  const minimum = options.minimum === undefined ? 0 : options.minimum;
  const maximum = options.maximum === undefined ? 100000000 : options.maximum;
  if (value === undefined || value === null || value === '') {
    if (options.required) throw new HttpError(400, `${fieldName} is required.`);
    return options.fallback === undefined ? 0 : options.fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `${fieldName} must be a number.`);
  }
  if (parsed < minimum || parsed > maximum) {
    throw new HttpError(400, `${fieldName} must be between ${minimum} and ${maximum}.`);
  }
  return Math.round(parsed * 100) / 100;
}

function toBooleanFlag(value, fieldName, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'off'].includes(text)) return false;
  throw new HttpError(400, `${fieldName} must be true or false.`);
}

function toCapacity(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 1000000) {
    throw new HttpError(400, `${fieldName} must be a whole number between 1 and 1000000.`);
  }
  return parsed;
}

/** @returns {string} The supplied email lower-cased, or throws a 400 error. */
function toEmail(value, fieldName = 'email') {
  const text = toRequiredString(value, fieldName, 190).toLowerCase();
  if (!EMAIL_PATTERN.test(text)) {
    throw new HttpError(400, `${fieldName} must be a valid email address.`);
  }
  return text;
}

/** @returns {string} The supplied phone number, or throws a 400 error. */
function toPhone(value, fieldName = 'contact phone') {
  const text = toRequiredString(value, fieldName, 40);
  if (!PHONE_PATTERN.test(text)) {
    throw new HttpError(400, `${fieldName} may only contain digits, spaces and the symbols + ( ) -.`);
  }
  return text;
}

function toColour(value, fieldName = 'accentColour') {
  const text = toRequiredString(value, fieldName, 7);
  if (!COLOUR_PATTERN.test(text)) {
    throw new HttpError(400, `${fieldName} must be a hex colour such as #17B7A5.`);
  }
  return text.toUpperCase();
}

/**
 * Validates a single event highlight.
 *
 * @param {{ title?: string, detail?: string }} highlight Raw highlight object.
 * @param {number} index Zero-based position, used to build a readable message.
 * @returns {{ title: string, detail: string, displayOrder: number }}
 */
function toHighlight(highlight, index) {
  if (!highlight || typeof highlight !== 'object') {
    throw new HttpError(400, `Highlight ${index + 1} must be an object with a title and a detail.`);
  }
  return {
    title: toRequiredString(highlight.title, `Highlight ${index + 1} title`, 120),
    detail: toRequiredString(highlight.detail, `Highlight ${index + 1} detail`, 300),
    displayOrder: Math.min(255, index + 1)
  };
}

function validateSearchQuery(query = {}) {
  const categories = toStringArray(query.category);
  if (categories.some((slug) => !SLUG_PATTERN.test(slug))) {
    throw new HttpError(400, 'Each category must be a valid slug.');
  }

  const location = query.location ? String(query.location).trim() : '';
  if (location.length > 80) {
    throw new HttpError(400, 'Location must be 80 characters or fewer.');
  }

  const allowedSorts = new Set(['date_asc', 'date_desc', 'raised_desc', 'goal_desc']);
  const sort = query.sort ? String(query.sort) : 'date_asc';
  if (!allowedSorts.has(sort)) {
    throw new HttpError(400, 'sort must be date_asc, date_desc, raised_desc or goal_desc.');
  }

  // scope lets the client ask for upcoming, past or all published events so the
  // website can label each card as past or upcoming using the same endpoint.
  const allowedScopes = new Set(['upcoming', 'past', 'all']);
  const scope = query.scope ? String(query.scope) : 'upcoming';
  if (!allowedScopes.has(scope)) {
    throw new HttpError(400, 'scope must be upcoming, past or all.');
  }

  return {
    date: toDateString(query.date, 'date'),
    location,
    categories,
    sort,
    scope,
    page: toPositiveInteger(query.page, 1, 10000),
    limit: toPositiveInteger(query.limit, 12, 50)
  };
}

/**
 * Validates the query string used by the admin event list.
 *
 * Unlike the public search this endpoint returns every status, including
 * drafts, suspended and cancelled events, because administrators have to see
 * and manage the complete catalogue.
 *
 * @param {object} query Express `req.query` object.
 * @returns {{ status: string, search: string, sort: string, page: number, limit: number }}
 */
function validateEventListQuery(query = {}) {
  // 'active' and 'past' are derived views of the status column: the admin list
  // has to be able to show "Active, Past and Suspended" events, and only
  // 'suspended' is a stored status. The other two are worked out from the end
  // date, so they are validated here but translated to SQL in eventSql.js.
  const status = query.status ? String(query.status).trim().toLowerCase() : 'all';
  const allowedStatuses = new Set(['all', 'active', 'past', ...EVENT_STATUSES]);
  if (!allowedStatuses.has(status)) {
    throw new HttpError(
      400,
      `status must be all, active, past or one of: ${EVENT_STATUSES.join(', ')}.`
    );
  }

  const search = query.q ? String(query.q).trim() : '';
  if (search.length > 80) {
    throw new HttpError(400, 'q must be 80 characters or fewer.');
  }

  const allowedSorts = new Set(['start_asc', 'start_desc', 'title_asc', 'id_desc']);
  const sort = query.sort ? String(query.sort) : 'start_desc';
  if (!allowedSorts.has(sort)) {
    throw new HttpError(400, 'sort must be start_asc, start_desc, title_asc or id_desc.');
  }

  return {
    status,
    search,
    sort,
    page: toPositiveInteger(query.page, 1, 10000),
    limit: toPositiveInteger(query.limit, 50, MAX_PAGE_SIZE)
  };
}

/**
 * Validates the JSON body used to create a new charity event.
 *
 * @param {object} body Raw `req.body`.
 * @returns {object} A normalised event object ready for the service layer.
 */
function validateEventPayload(body = {}) {
  const startDateTime = toDateTime(body.startDateTime, 'startDateTime', { required: true });
  const endDateTime = toDateTime(body.endDateTime, 'endDateTime', { required: true });
  if (endDateTime <= startDateTime) {
    throw new HttpError(400, 'endDateTime must be later than startDateTime.');
  }

  const isFree = toBooleanFlag(body.isFree, 'isFree', false);
  const ticketPrice = isFree
    ? 0
    : toAmount(body.ticketPrice, 'ticketPrice', { minimum: 0, maximum: 100000 });

  const goalAmount = toAmount(body.goalAmount, 'goalAmount', { required: true, minimum: 0.01 });
  const raisedAmount = toAmount(body.raisedAmount, 'raisedAmount', { minimum: 0 });
  if (raisedAmount > goalAmount * 10) {
    throw new HttpError(400, 'raisedAmount looks unrealistic next to goalAmount.');
  }

  const highlights = Array.isArray(body.highlights)
    ? body.highlights.map(toHighlight)
    : [];

  const status = body.status === undefined || body.status === ''
    ? 'published'
    : toEnum(body.status, EVENT_STATUSES, 'status');

  return {
    organisationId: toId(body.organisationId, 'organisationId'),
    categoryId: toId(body.categoryId, 'categoryId'),
    venueId: toId(body.venueId, 'venueId'),
    title: toRequiredString(body.title, 'title', 180),
    slug: toSlug(body.slug, 'slug'),
    summary: toRequiredString(body.summary, 'summary', 380),
    purpose: toRequiredString(body.purpose, 'purpose', 260),
    description: toRequiredString(body.description, 'description', 4000),
    startDateTime,
    endDateTime,
    timezone: toOptionalString(body.timezone, 'timezone', 50) || 'Australia/Sydney',
    ticketPrice,
    currency: body.currency === undefined || body.currency === ''
      ? 'AUD'
      : toEnum(body.currency, CURRENCIES, 'currency').toUpperCase(),
    isFree,
    goalAmount,
    raisedAmount,
    capacity: toCapacity(body.capacity, 'capacity'),
    heroImageKey: toRequiredString(body.heroImageKey, 'heroImageKey', 255),
    status,
    isFeatured: toBooleanFlag(body.isFeatured, 'isFeatured', false),
    publishedAt: status === 'published'
      ? toDateTime(body.publishedAt, 'publishedAt') || startDateTime
      : toDateTime(body.publishedAt, 'publishedAt'),
    highlights
  };
}

/**
 * Validates the JSON body used by the public registration page.
 *
 * @param {object} body Raw `req.body`.
 * @returns {object} A normalised registration object.
 */
function validateRegistrationPayload(body = {}) {
  return {
    firstName: toRequiredString(body.firstName, 'firstName', 80),
    lastName: toRequiredString(body.lastName, 'lastName', 80),
    email: toEmail(body.email),
    phone: toPhone(body.phone),
    ticketQuantity: toPositiveInteger(body.ticketQuantity, 1, 100),
    notes: toOptionalString(body.notes, 'notes', 255),
    status: body.status === undefined || body.status === ''
      ? 'confirmed'
      : toEnum(body.status, REGISTRATION_STATUSES, 'status')
  };
}

/**
 * Validates the JSON body used to create or update an event category.
 *
 * @param {object} body Raw `req.body`.
 * @param {{ requireSlug?: boolean }} [options] Create requires a slug.
 * @returns {object} A normalised category object.
 */
function validateCategoryPayload(body = {}) {
  return {
    name: toRequiredString(body.name, 'name', 80),
    slug: toSlug(body.slug, 'slug'),
    description: toRequiredString(body.description, 'description', 255),
    accentColour: toColour(body.accentColour, 'accentColour'),
    iconKey: toRequiredString(body.iconKey, 'iconKey', 60),
    isActive: toBooleanFlag(body.isActive, 'isActive', true)
  };
}

module.exports = {
  CURRENCIES,
  EVENT_STATUSES,
  MAX_PAGE_SIZE,
  REGISTRATION_STATUSES,
  toAmount,
  toBooleanFlag,
  toCapacity,
  toColour,
  toDateString,
  toDateTime,
  toEmail,
  toEnum,
  toHighlight,
  toId,
  toOptionalString,
  toPhone,
  toPositiveInteger,
  toRequiredString,
  toSlug,
  toStringArray,
  validateCategoryPayload,
  validateEventListQuery,
  validateEventPayload,
  validateRegistrationPayload,
  validateSearchQuery
};
