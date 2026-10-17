'use strict';

/**
 * @file Business logic for event registrations.
 *
 * This is the service behind the new client-side registration page and the
 * "list of tickets purchased" panel on the event detail page. It also enforces
 * the business rules that the database alone cannot express nicely, such as
 * "you cannot buy more tickets than the event has left".
 */

const crypto = require('node:crypto');
const db = require('../../event_db');
const { HttpError } = require('../utils/http');
const { mapRegistration, sydneyToday } = require('./eventService');

/**
 * Builds a human readable booking reference such as `REG-2026-4F8A2C`.
 *
 * A random suffix is used instead of the auto-increment id so the reference
 * does not leak how many registrations exist, and the collision chance is
 * negligible for a single event platform.
 *
 * @returns {string} Booking reference.
 */
function buildReferenceCode() {
  const year = sydneyToday().slice(0, 4);
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `REG-${year}-${suffix}`;
}

/**
 * Loads one event row together with the number of tickets already sold.
 *
 * @param {number} eventId Event primary key.
 * @returns {Promise<object>} `{ event_id, title, status, capacity, tickets_sold }`.
 * @throws {HttpError} 404 when the event does not exist.
 */
async function loadEventForRegistration(eventId) {
  const [rows] = await db.execute(
    `SELECT
       e.event_id,
       e.title,
       e.status,
       e.capacity,
       e.ticket_price,
       e.currency,
       (SELECT COALESCE(SUM(r.ticket_quantity), 0) FROM registrations r WHERE r.event_id = e.event_id AND r.status = 'confirmed') AS tickets_sold
     FROM events e
     WHERE e.event_id = ?
     LIMIT 1`,
    [eventId]
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, 'Event not found.');
  return {
    id: row.event_id,
    title: row.title,
    status: row.status,
    capacity: row.capacity === null ? null : Number(row.capacity),
    ticketPrice: Number(row.ticket_price),
    currency: row.currency,
    ticketsSold: Number(row.tickets_sold)
  };
}

/**
 * Creates a new registration for an event.
 *
 * Data integrity checks performed here:
 *   * the event must exist and must be published (a draft, suspended or
 *     cancelled event cannot be booked);
 *   * the same email address cannot register twice for the same event - this
 *     mirrors the `uq_registrations_event_email` unique key;
 *   * the requested number of tickets must still fit inside the event capacity.
 *
 * @param {number} eventId Event primary key taken from the URL.
 * @param {object} payload Output of `validateRegistrationPayload`.
 * @returns {Promise<{registration: object, event: object}>} Created record plus context.
 * @throws {HttpError} 404, 409 or 400 depending on the failed rule.
 */
async function createRegistration(eventId, payload) {
  const event = await loadEventForRegistration(eventId);

  if (event.status !== 'published') {
    throw new HttpError(409, `"${event.title}" is ${event.status} and is not accepting registrations right now.`);
  }

  const [duplicateRows] = await db.execute(
    'SELECT registration_id FROM registrations WHERE event_id = ? AND attendee_email = ? LIMIT 1',
    [eventId, payload.email]
  );
  if (duplicateRows.length > 0) {
    throw new HttpError(409, 'This email address has already registered for this event. Each person can only register once per event.');
  }

  if (event.capacity !== null && event.ticketsSold + payload.ticketQuantity > event.capacity) {
    const remaining = Math.max(0, event.capacity - event.ticketsSold);
    throw new HttpError(409, `Only ${remaining} ticket(s) remain for this event.`, { remaining });
  }

  const referenceCode = buildReferenceCode();
  try {
    const [result] = await db.execute(
      `INSERT INTO registrations
         (event_id, reference_code, attendee_first_name, attendee_last_name, attendee_email,
          attendee_phone, ticket_quantity, registration_date, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        eventId,
        referenceCode,
        payload.firstName,
        payload.lastName,
        payload.email,
        payload.phone,
        payload.ticketQuantity,
        payload.notes,
        payload.status
      ]
    );

    const [rows] = await db.execute(
      `SELECT registration_id, reference_code, attendee_first_name, attendee_last_name,
              attendee_email, attendee_phone, ticket_quantity, registration_date, notes, status
       FROM registrations WHERE registration_id = ?`,
      [result.insertId]
    );

    return {
      registration: mapRegistration(rows[0]),
      event: {
        id: event.id,
        title: event.title,
        ticketPrice: event.ticketPrice,
        currency: event.currency,
        totalCost: payload.ticketQuantity * event.ticketPrice
      }
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'That booking reference was already used. Please submit the form again.');
    }
    throw error;
  }
}

/**
 * Lists registrations across every event, newest first.
 *
 * Used by the admin dashboard so staff can see the booking activity without
 * opening each event one by one.
 *
 * @param {{ eventId?: number, limit?: number }} [filters] Optional filters.
 * @returns {Promise<Array<object>>} Mapped registrations with the event title.
 */
async function listRegistrations(filters = {}) {
  const params = [];
  let where = '';
  if (filters.eventId) {
    where = 'WHERE r.event_id = ?';
    params.push(filters.eventId);
  }
  params.push(filters.limit || 100);

  const [rows] = await db.execute(
    `SELECT
       r.registration_id, r.reference_code, r.attendee_first_name, r.attendee_last_name,
       r.attendee_email, r.attendee_phone, r.ticket_quantity, r.registration_date,
       r.notes, r.status, r.event_id, e.title AS event_title, e.status AS event_status
     FROM registrations r
     JOIN events e ON e.event_id = r.event_id
     ${where}
     ORDER BY r.registration_date DESC, r.registration_id DESC
     LIMIT ?`,
    params
  );

  return rows.map((row) => ({
    ...mapRegistration(row),
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventStatus: row.event_status
  }));
}

/**
 * Deletes a single registration.
 *
 * The brief does not require registration endpoints, but removing a wrong
 * booking is the only way to unlock a "delete blocked" event, so it is included
 * as an optional extra.
 *
 * @param {number} registrationId Registration primary key.
 * @returns {Promise<{id:number}>} The deleted id.
 * @throws {HttpError} 404 when the registration does not exist.
 */
async function deleteRegistration(registrationId) {
  const [result] = await db.execute('DELETE FROM registrations WHERE registration_id = ?', [registrationId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Registration not found.');
  }
  return { id: registrationId };
}

module.exports = {
  buildReferenceCode,
  createRegistration,
  deleteRegistration,
  listRegistrations,
  loadEventForRegistration
};
