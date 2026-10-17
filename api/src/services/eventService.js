'use strict';

/**
 * @file Business logic for charity events.
 *
 * The service layer sits between the routes and the database. It owns three
 * responsibilities and nothing else:
 *   1. turning database rows into the JSON shape the websites consume
 *      ({@link mapEvent} and {@link mapRegistration});
 *   2. keeping multi-table writes consistent by using transactions;
 *   3. protecting data integrity, for example by refusing to delete an event
 *      that already has registrations.
 */

const db = require('../../event_db');
const {
  EVENT_BY_ID_SQL,
  EVENT_HIGHLIGHTS_SQL,
  EVENT_INSERT_COLUMNS,
  EVENT_REGISTRATIONS_SQL,
  EVENT_SELECT_COLUMNS,
  buildEventListStatement,
  buildSearchStatement,
  toEventValues
} = require('../utils/eventSql');
const { HttpError } = require('../utils/http');

/**
 * Returns today's date in Sydney as `YYYY-MM-DD`.
 *
 * The case study is a Sydney charity, and the server may run in any time zone,
 * so "today" is always calculated in Australia/Sydney instead of using the
 * machine clock.
 *
 * @returns {string} ISO date such as `2026-10-16`.
 */
function sydneyToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Returns true when the event has already finished relative to the supplied
 * Sydney date, which is how the client labels each card as Past or Upcoming.
 */
function isPastEnd(endDateTime, today) {
  const value = endDateTime instanceof Date
    ? endDateTime.toISOString().slice(0, 10)
    : String(endDateTime || '').slice(0, 10);
  if (!value) return false;
  return value < (today || sydneyToday());
}

/**
 * Converts one `events` row (joined with category, organisation and venue) into
 * the nested object used by both Angular applications.
 *
 * @param {object} row Raw row returned by {@link EVENT_SELECT_COLUMNS}.
 * @param {string} [today] Sydney date used for the past/upcoming flag.
 * @returns {object} Event in the public API shape.
 */
function mapEvent(row, today) {
  const goal = Number(row.goal_amount);
  const raised = Number(row.raised_amount);
  const progressPercent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : 0;

  return {
    id: row.event_id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    purpose: row.purpose,
    description: row.description,
    startDateTime: row.start_datetime,
    endDateTime: row.end_datetime,
    timezone: row.timezone,
    ticket: {
      price: Number(row.ticket_price),
      currency: row.currency,
      isFree: Boolean(row.is_free)
    },
    fundraising: {
      goal: goal,
      raised: raised,
      progressPercent
    },
    capacity: row.capacity,
    heroImage: row.hero_image_key,
    status: row.status,
    featured: Boolean(row.is_featured),
    publishedAt: row.published_at,
    isPast: isPastEnd(row.end_datetime, today),
    registrationCount: row.registration_count === undefined ? undefined : Number(row.registration_count),
    ticketsSold: row.tickets_sold === undefined ? undefined : Number(row.tickets_sold),
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      accentColour: row.accent_colour,
      iconKey: row.icon_key
    },
    organisation: {
      id: row.organisation_id,
      name: row.organisation_name,
      slug: row.organisation_slug,
      tagline: row.organisation_tagline,
      mission: row.organisation_mission
    },
    venue: {
      id: row.venue_id,
      name: row.venue_name,
      addressLine1: row.address_line_1,
      suburb: row.suburb,
      stateCode: row.state_code,
      postcode: row.postcode,
      countryCode: row.country_code,
      latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
      longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude)
    }
  };
}

/**
 * Converts one `registrations` row into the JSON shape used by the event detail
 * page and the admin edit form.
 *
 * @param {object} row Raw registrations row.
 * @returns {object} Registration in the public API shape.
 */
function mapRegistration(row) {
  return {
    id: row.registration_id,
    referenceCode: row.reference_code,
    firstName: row.attendee_first_name,
    lastName: row.attendee_last_name,
    fullName: `${row.attendee_first_name} ${row.attendee_last_name}`.trim(),
    email: row.attendee_email,
    phone: row.attendee_phone,
    ticketQuantity: Number(row.ticket_quantity),
    registrationDate: row.registration_date,
    notes: row.notes,
    status: row.status
  };
}

/**
 * Loads the highlight list for a single event.
 *
 * @param {number} eventId Event primary key.
 * @returns {Promise<Array<{id:number,title:string,detail:string,displayOrder:number}>>}
 */
async function getEventHighlights(eventId) {
  const [rows] = await db.execute(EVENT_HIGHLIGHTS_SQL, [eventId]);
  return rows.map((row) => ({
    id: row.highlight_id,
    title: row.title,
    detail: row.detail,
    displayOrder: Number(row.display_order)
  }));
}

/**
 * Loads the registrations for a single event, newest purchase first.
 *
 * @param {number} eventId Event primary key.
 * @returns {Promise<Array<object>>} Mapped registrations.
 */
async function getEventRegistrations(eventId) {
  const [rows] = await db.execute(EVENT_REGISTRATIONS_SQL, [eventId]);
  return rows.map(mapRegistration);
}

/**
 * Home page query: the next published events, featured first.
 *
 * @param {number} limit Maximum number of cards to return.
 * @returns {Promise<{events: Array<object>, asOfDate: string}>}
 */
async function listUpcomingEvents(limit) {
  const today = sydneyToday();
  const [rows] = await db.execute(
    `SELECT ${EVENT_SELECT_COLUMNS}
     FROM events e
     JOIN categories c ON c.category_id = e.category_id
     JOIN organisations o ON o.organisation_id = e.organisation_id
     JOIN venues v ON v.venue_id = e.venue_id
     WHERE e.status = 'published' AND DATE(e.end_datetime) >= ?
     ORDER BY e.is_featured DESC, e.start_datetime ASC
     LIMIT ?`,
    [today, limit]
  );

  return { events: rows.map((row) => mapEvent(row, today)), asOfDate: today };
}

/**
 * Search page query: filtered, paginated and sorted published events.
 *
 * @param {object} filters Output of `validateSearchQuery`.
 * @returns {Promise<{events: Array<object>, pagination: object}>}
 */
async function searchEvents(filters) {
  const today = sydneyToday();
  const statement = buildSearchStatement({ ...filters, today });
  const [[countRows], [rows]] = await Promise.all([
    db.execute(statement.countSql, statement.countParams),
    db.execute(statement.rowsSql, statement.rowsParams)
  ]);
  const total = Number(countRows[0] ? countRows[0].total : 0);

  return {
    events: rows.map((row) => mapEvent(row, today)),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit))
    }
  };
}

/**
 * Admin list query: every event in every status.
 *
 * @param {object} filters Output of `validateEventListQuery`.
 * @returns {Promise<{events: Array<object>, pagination: object, summary: object}>}
 */
async function listEvents(filters) {
  const today = sydneyToday();
  const statement = buildEventListStatement({ ...filters, today });
  const [[countRows], [rows], [statusRows], [lifecycleRows]] = await Promise.all([
    db.execute(statement.countSql, statement.countParams),
    db.execute(statement.rowsSql, statement.rowsParams),
    db.execute('SELECT status, COUNT(*) AS total FROM events GROUP BY status'),
    // Derived counters for the dashboard tiles: Active and Past are calculated
    // from end_datetime because they are not stored as a status value.
    db.execute(
      `SELECT
         SUM(CASE WHEN status = 'published' AND DATE(end_datetime) >= ? THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN DATE(end_datetime) < ? THEN 1 ELSE 0 END) AS past
       FROM events`,
      [today, today]
    )
  ]);

  const total = Number(countRows[0] ? countRows[0].total : 0);
  const byStatus = { draft: 0, published: 0, suspended: 0, cancelled: 0 };
  statusRows.forEach((row) => {
    byStatus[row.status] = Number(row.total);
  });

  return {
    events: rows.map((row) => mapEvent(row, today)),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit))
    },
    summary: {
      byStatus,
      byLifecycle: {
        active: Number(lifecycleRows[0] ? lifecycleRows[0].active : 0) || 0,
        past: Number(lifecycleRows[0] ? lifecycleRows[0].past : 0) || 0
      },
      totalEvents: Object.values(byStatus).reduce((sum, value) => sum + value, 0)
    }
  };
}

/**
 * Loads one event together with its highlights and its registration list.
 *
 * Assessment 3 requirement: the single-event endpoint must return the complete
 * list of registrations so the event detail page can display them without a
 * second request.
 *
 * @param {number} eventId Event primary key.
 * @param {{ publishedOnly?: boolean }} [options] Public pages pass `true`.
 * @returns {Promise<object>} The event with `highlights` and `registrations`.
 * @throws {HttpError} 404 when the event does not exist (or is not published).
 */
async function getEventById(eventId, options = {}) {
  const [rows] = await db.execute(EVENT_BY_ID_SQL, [eventId]);
  const row = rows[0];

  if (!row || (options.publishedOnly && row.status !== 'published')) {
    throw new HttpError(404, 'Event not found.');
  }

  const today = sydneyToday();
  const event = mapEvent(row, today);
  const [highlights, registrations] = await Promise.all([
    getEventHighlights(eventId),
    getEventRegistrations(eventId)
  ]);

  event.highlights = highlights;
  event.registrations = registrations;
  event.registrationSummary = {
    totalRegistrations: registrations.length,
    ticketsSold: registrations.reduce((sum, item) => sum + item.ticketQuantity, 0),
    latestRegistrationDate: registrations.length > 0 ? registrations[0].registrationDate : null
  };

  return event;
}

/**
 * Inserts a new event and its highlight rows inside one transaction.
 *
 * @param {object} payload Output of `validateEventPayload`.
 * @returns {Promise<object>} The freshly created event (with registrations = []).
 * @throws {HttpError} 409 when the slug is already in use.
 * @throws {HttpError} 400 when a foreign key such as categoryId does not exist.
 */
async function createEvent(payload) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const columns = EVENT_INSERT_COLUMNS.join(', ');
    const placeholders = EVENT_INSERT_COLUMNS.map(() => '?').join(', ');
    const [result] = await connection.execute(
      `INSERT INTO events (${columns}) VALUES (${placeholders})`,
      toEventValues(payload)
    );
    const eventId = result.insertId;
    await replaceHighlights(connection, eventId, payload.highlights);
    await connection.commit();
    return getEventById(eventId, { publishedOnly: false });
  } catch (error) {
    await connection.rollback();
    throw translateWriteError(error);
  } finally {
    connection.release();
  }
}

/**
 * Updates an existing event and replaces its highlight rows.
 *
 * @param {number} eventId Event primary key.
 * @param {object} payload Output of `validateEventPayload`.
 * @returns {Promise<object>} The updated event.
 * @throws {HttpError} 404 when the event does not exist.
 */
async function updateEvent(eventId, payload) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const assignments = EVENT_INSERT_COLUMNS.map((column) => `${column} = ?`).join(', ');
    const [result] = await connection.execute(
      `UPDATE events SET ${assignments} WHERE event_id = ?`,
      [...toEventValues(payload), eventId]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Event not found.');
    }
    await replaceHighlights(connection, eventId, payload.highlights);
    await connection.commit();
    return getEventById(eventId, { publishedOnly: false });
  } catch (error) {
    await connection.rollback();
    throw translateWriteError(error);
  } finally {
    connection.release();
  }
}

/**
 * Deletes an event only when it has no registrations.
 *
 * Data integrity rule from the brief: "the event can only be deleted if it has
 * not yet received any registrations. If registrations exist, the deletion
 * attempt should be blocked, and an appropriate error response should be
 * returned to the user."
 *
 * Two independent guards are used: an explicit COUNT here (so the caller gets a
 * helpful message) and the ON DELETE RESTRICT foreign key (so the rule still
 * holds if the code is ever changed).
 *
 * @param {number} eventId Event primary key.
 * @returns {Promise<{id:number, title:string, deletedRegistrations:number, affectedRows:number}>}
 * @throws {HttpError} 404 when missing, 409 when registrations exist.
 */
async function deleteEvent(eventId) {
  const [rows] = await db.execute(
    'SELECT e.event_id, e.title, (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registration_count FROM events e WHERE e.event_id = ? LIMIT 1',
    [eventId]
  );
  const row = rows[0];
  if (!row) {
    throw new HttpError(404, 'Event not found.');
  }

  const registrationCount = Number(row.registration_count);
  if (registrationCount > 0) {
    throw new HttpError(
      409,
      `"${row.title}" cannot be deleted because it already has ${registrationCount} registration(s). Remove the registrations first or suspend the event instead.`,
      { registrationCount }
    );
  }

  const [result] = await db.execute('DELETE FROM events WHERE event_id = ?', [eventId]);
  return { id: row.event_id, title: row.title, deletedRegistrations: 0, affectedRows: result.affectedRows };
}

/**
 * Deletes and re-inserts the highlight rows for an event.
 *
 * @param {import('mysql2/promise').PoolConnection} connection Transaction connection.
 * @param {number} eventId Event primary key.
 * @param {Array<{title:string,detail:string,displayOrder:number}>} highlights Validated highlights.
 * @returns {Promise<void>}
 */
async function replaceHighlights(connection, eventId, highlights) {
  await connection.execute('DELETE FROM event_highlights WHERE event_id = ?', [eventId]);
  for (const highlight of highlights) {
    await connection.execute(
      'INSERT INTO event_highlights (event_id, display_order, title, detail) VALUES (?, ?, ?, ?)',
      [eventId, highlight.displayOrder, highlight.title, highlight.detail]
    );
  }
}

/**
 * Converts low level MySQL errors into HTTP errors a client can understand.
 *
 * @param {Error & {code?: string}} error Error thrown by mysql2.
 * @returns {Error} Either the original error or a translated HttpError.
 */
function translateWriteError(error) {
  if (error instanceof HttpError) return error;
  if (error.code === 'ER_DUP_ENTRY') {
    return new HttpError(409, 'A record with the same unique value already exists (check the slug).', { field: 'slug' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return new HttpError(400, 'One of the selected category, organisation or venue values does not exist.');
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return new HttpError(409, 'This event still has related records, so it cannot be deleted.');
  }
  if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return new HttpError(400, `A database rule rejected the values: ${error.message}`);
  }
  return error;
}

module.exports = {
  createEvent,
  deleteEvent,
  getEventById,
  getEventHighlights,
  getEventRegistrations,
  isPastEnd,
  listEvents,
  listUpcomingEvents,
  mapEvent,
  mapRegistration,
  searchEvents,
  sydneyToday,
  translateWriteError,
  updateEvent
};
