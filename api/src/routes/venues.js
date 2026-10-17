'use strict';

/**
 * @file Express router for the `/api/venues` resource.
 *
 *  GET /api/venues           Full venue list with coordinates.
 *  GET /api/venues/:venueId  A single venue.
 *
 * Assessment 3 adds the admin "New event" / "Edit event" forms, and a venue is
 * a required foreign key on every event row. Exposing a read-only venue list
 * means the admin form can populate its dropdown from the database instead of
 * hard coding the options in the browser, which keeps the two in step.
 */

const express = require('express');
const db = require('../../event_db');
const { asyncHandler, HttpError } = require('../utils/http');
const { toId } = require('../utils/validation');

const router = express.Router();

/** Column list shared by both queries so the JSON shape never drifts. */
const VENUE_COLUMNS = `
  v.venue_id, v.name, v.address_line_1, v.suburb, v.state_code,
  v.postcode, v.country_code, v.latitude, v.longitude
`;

/**
 * Converts one `venues` row into the JSON shape used by both Angular apps.
 *
 * @param {object} row Raw venues row.
 * @returns {object} Venue in the public API shape.
 */
function mapVenue(row) {
  return {
    id: row.venue_id,
    name: row.name,
    addressLine1: row.address_line_1,
    suburb: row.suburb,
    stateCode: row.state_code,
    postcode: row.postcode,
    countryCode: row.country_code,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude)
  };
}

/** GET /api/venues - every venue, ordered by suburb then name. */
router.get('/', asyncHandler(async (_req, res) => {
  const [rows] = await db.execute(`
    SELECT ${VENUE_COLUMNS}
    FROM venues v
    ORDER BY v.suburb ASC, v.name ASC
  `);
  const venues = rows.map(mapVenue);
  res.json({ data: venues, meta: { count: venues.length } });
}));

/** GET /api/venues/:venueId - a single venue. */
router.get('/:venueId', asyncHandler(async (req, res) => {
  if (!/^\d+$/.test(req.params.venueId)) {
    throw new HttpError(400, 'Venue ID must be a positive integer.');
  }
  const [rows] = await db.execute(`
    SELECT ${VENUE_COLUMNS}
    FROM venues v
    WHERE v.venue_id = ?
    LIMIT 1
  `, [toId(req.params.venueId, 'venueId')]);
  if (rows.length === 0) {
    throw new HttpError(404, 'Venue not found.');
  }
  res.json({ data: mapVenue(rows[0]) });
}));

module.exports = router;