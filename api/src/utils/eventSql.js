'use strict';

/**
 * @file Parameterised SQL builders for the event resource.
 *
 * The builders never concatenate user input into the statement text. They only
 * decide *which* placeholders are needed and push the values into a parameter
 * array, so mysql2 sends the query and the data separately and SQL injection is
 * impossible. Keeping the SQL here (instead of inside the routes) means the
 * generated statements can be unit tested without a database connection.
 */

/** Whitelisted ORDER BY clauses for the public search page. */
const SORT_SQL = Object.freeze({
  date_asc: 'e.start_datetime ASC, e.event_id ASC',
  date_desc: 'e.start_datetime DESC, e.event_id DESC',
  raised_desc: 'e.raised_amount DESC, e.start_datetime ASC',
  goal_desc: 'e.goal_amount DESC, e.start_datetime ASC'
});

/** Whitelisted ORDER BY clauses for the admin dashboard. */
const ADMIN_SORT_SQL = Object.freeze({
  start_asc: 'e.start_datetime ASC, e.event_id ASC',
  start_desc: 'e.start_datetime DESC, e.event_id DESC',
  title_asc: 'e.title ASC, e.event_id ASC',
  id_desc: 'e.event_id DESC'
});

/** The column list every event query selects, shared so shapes never drift. */
const EVENT_SELECT_COLUMNS = `
  e.event_id,
  e.title,
  e.slug,
  e.summary,
  e.purpose,
  e.description,
  e.start_datetime,
  e.end_datetime,
  e.timezone,
  e.ticket_price,
  e.currency,
  e.is_free,
  e.goal_amount,
  e.raised_amount,
  e.capacity,
  e.hero_image_key,
  e.status,
  e.is_featured,
  e.published_at,
  c.category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.accent_colour,
  c.icon_key,
  o.organisation_id,
  o.name AS organisation_name,
  o.slug AS organisation_slug,
  o.tagline AS organisation_tagline,
  o.mission AS organisation_mission,
  v.venue_id,
  v.name AS venue_name,
  v.address_line_1,
  v.suburb,
  v.state_code,
  v.postcode,
  v.country_code,
  v.latitude,
  v.longitude,
  (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registration_count,
  (SELECT COALESCE(SUM(r.ticket_quantity), 0) FROM registrations r WHERE r.event_id = e.event_id) AS tickets_sold
`;

/** The FROM/JOIN block every event query uses. */
const EVENT_FROM = `
  FROM events e
  JOIN categories c ON c.category_id = e.category_id
  JOIN organisations o ON o.organisation_id = e.organisation_id
  JOIN venues v ON v.venue_id = e.venue_id
`;

/**
 * Builds the statement used by the public search endpoint.
 *
 * Only published events are ever exposed here, so draft, cancelled and
 * suspended listings never leak into the public website. The scope widens or
 * narrows the date window so one endpoint can serve upcoming, past and
 * all-events searches.
 *
 * @param {object} filters Output of `validateSearchQuery` plus `today`.
 * @returns {{ countSql: string, countParams: Array, rowsSql: string, rowsParams: Array }}
 */
function buildSearchStatement(filters) {
  const where = ["e.status = 'published'"];
  const params = [];

  if (filters.scope === 'past') {
    where.push('DATE(e.end_datetime) < ?');
    params.push(filters.today);
  } else if (filters.scope !== 'all') {
    where.push('DATE(e.end_datetime) >= ?');
    params.push(filters.today);
  }

  if (filters.date) {
    where.push('DATE(e.start_datetime) = ?');
    params.push(filters.date);
  }

  if (filters.location) {
    where.push("CONCAT(v.name, ' ', v.address_line_1, ' ', v.suburb, ' ', v.state_code, ' ', v.postcode) LIKE ?");
    params.push(`%${filters.location}%`);
  }

  if (filters.categories.length > 0) {
    const placeholders = filters.categories.map(() => '?').join(', ');
    where.push(`c.slug IN (${placeholders})`);
    params.push(...filters.categories);
  }

  const whereSql = where.join(' AND ');
  const orderSql = SORT_SQL[filters.sort] || SORT_SQL.date_asc;
  const offset = (filters.page - 1) * filters.limit;

  return {
    countSql: `SELECT COUNT(*) AS total ${EVENT_FROM} WHERE ${whereSql}`,
    countParams: params,
    rowsSql: `
      SELECT ${EVENT_SELECT_COLUMNS}
      ${EVENT_FROM}
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `,
    rowsParams: [...params, filters.limit, offset]
  };
}

/**
 * Builds the statement used by the admin event list.
 *
 * This is the "List feature" required by Assessment 3: it deliberately ignores
 * the publication date and returns events in every status so an administrator
 * can also see Active, Past and Suspended records.
 *
 * @param {object} filters Output of `validateEventListQuery`.
 * @returns {{ countSql: string, countParams: Array, rowsSql: string, rowsParams: Array }}
 */
function buildEventListStatement(filters) {
  const where = [];
  const params = [];

  if (filters.status === 'active') {
    // Derived view: a published event that has not finished yet.
    where.push("e.status = 'published' AND DATE(e.end_datetime) >= ?");
    params.push(filters.today);
  } else if (filters.status === 'past') {
    // Derived view: any event whose end date is already behind us.
    where.push('DATE(e.end_datetime) < ?');
    params.push(filters.today);
  } else if (filters.status && filters.status !== 'all') {
    where.push('e.status = ?');
    params.push(filters.status);
  }

  if (filters.search) {
    where.push("CONCAT(e.title, ' ', e.slug, ' ', c.name, ' ', o.name, ' ', v.suburb) LIKE ?");
    params.push(`%${filters.search}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = ADMIN_SORT_SQL[filters.sort] || ADMIN_SORT_SQL.start_desc;
  const offset = (filters.page - 1) * filters.limit;

  return {
    countSql: `SELECT COUNT(*) AS total ${EVENT_FROM} ${whereSql}`,
    countParams: params,
    rowsSql: `
      SELECT ${EVENT_SELECT_COLUMNS}
      ${EVENT_FROM}
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ? OFFSET ?
    `,
    rowsParams: [...params, filters.limit, offset]
  };
}

/** Statement used by the public event detail page and the admin edit form. */
const EVENT_BY_ID_SQL = `
  SELECT ${EVENT_SELECT_COLUMNS}
  ${EVENT_FROM}
  WHERE e.event_id = ?
  LIMIT 1
`;

/** Registrations for one event, newest purchase first, as the brief requires. */
const EVENT_REGISTRATIONS_SQL = `
  SELECT
    registration_id,
    reference_code,
    attendee_first_name,
    attendee_last_name,
    attendee_email,
    attendee_phone,
    ticket_quantity,
    registration_date,
    notes,
    status
  FROM registrations
  WHERE event_id = ?
  ORDER BY registration_date DESC, registration_id DESC
`;

/** Highlights for one or more events, used to enrich detail responses. */
const EVENT_HIGHLIGHTS_SQL = `
  SELECT highlight_id, event_id, title, detail, display_order
  FROM event_highlights
  WHERE event_id = ?
  ORDER BY display_order ASC
`;

/** Column list for the INSERT event statement, in binding order. */
const EVENT_INSERT_COLUMNS = Object.freeze([
  'organisation_id',
  'category_id',
  'venue_id',
  'title',
  'slug',
  'summary',
  'purpose',
  'description',
  'start_datetime',
  'end_datetime',
  'timezone',
  'ticket_price',
  'currency',
  'is_free',
  'goal_amount',
  'raised_amount',
  'capacity',
  'hero_image_key',
  'status',
  'is_featured',
  'published_at'
]);

/**
 * Turns a validated event object into the ordered parameter array that matches
 * {@link EVENT_INSERT_COLUMNS}.
 *
 * @param {object} event Validated event payload.
 * @returns {Array} Values in INSERT column order.
 */
function toEventValues(event) {
  return [
    event.organisationId,
    event.categoryId,
    event.venueId,
    event.title,
    event.slug,
    event.summary,
    event.purpose,
    event.description,
    event.startDateTime,
    event.endDateTime,
    event.timezone,
    event.ticketPrice,
    event.currency,
    event.isFree ? 1 : 0,
    event.goalAmount,
    event.raisedAmount,
    event.capacity,
    event.heroImageKey,
    event.status,
    event.isFeatured ? 1 : 0,
    event.publishedAt
  ];
}

module.exports = {
  ADMIN_SORT_SQL,
  EVENT_BY_ID_SQL,
  EVENT_HIGHLIGHTS_SQL,
  EVENT_INSERT_COLUMNS,
  EVENT_REGISTRATIONS_SQL,
  EVENT_SELECT_COLUMNS,
  SORT_SQL,
  buildEventListStatement,
  buildSearchStatement,
  toEventValues
};
