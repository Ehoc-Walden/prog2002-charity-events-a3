'use strict';

/**
 * @file Express router for the weather feature (external Open-Meteo API).
 *
 *  GET /api/weather                       Forecast for any latitude/longitude.
 *  GET /api/weather/events/:eventId       Forecast for the venue of one event.
 *
 * The second endpoint is the one the websites use: it looks the coordinates up
 * from the `venues` table so the browser never has to know them, and it keeps
 * the upstream API key-free (Open-Meteo needs no registration).
 */

const express = require('express');
const db = require('../../event_db');
const weatherService = require('../services/weatherService');
const { asyncHandler, HttpError } = require('../utils/http');
const { toId, toPositiveInteger } = require('../utils/validation');

const router = express.Router();

/** Message shown when Open-Meteo cannot be reached or returns an error. */
const WEATHER_UNAVAILABLE_MESSAGE =
  'The weather forecast is temporarily unavailable. Please try again later.';

/**
 * Calls the weather service and converts transport/provider failures into a
 * deliberate 503 response. Without this wrapper an upstream outage becomes a
 * generic 500 and the visitor cannot tell that the rest of the event page still
 * works normally.
 *
 * @param {object} options Forecast query options.
 * @returns {Promise<object>} Normalised forecast.
 * @throws {HttpError} 503 when the external service is unavailable.
 */
async function loadForecast(options) {
  try {
    return await weatherService.getWeatherForecast(options);
  } catch (cause) {
    const unavailable = new HttpError(503, WEATHER_UNAVAILABLE_MESSAGE, null, true);
    unavailable.cause = cause;
    throw unavailable;
  }
}

/**
 * Validates a latitude/longitude pair supplied on the query string.
 *
 * @param {object} query Express `req.query`.
 * @returns {{latitude: number, longitude: number}} Coordinates.
 * @throws {HttpError} 400 when the values are missing or out of range.
 */
function readCoordinates(query) {
  const latitude = Number(query.latitude);
  const longitude = Number(query.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new HttpError(400, 'latitude must be a number between -90 and 90.');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new HttpError(400, 'longitude must be a number between -180 and 180.');
  }
  return { latitude, longitude };
}

/** GET /api/weather - forecast for an explicit coordinate pair. */
router.get('/', asyncHandler(async (req, res) => {
  const coordinates = readCoordinates(req.query);
  const forecast = await loadForecast({
    ...coordinates,
    timezone: req.query.timezone ? String(req.query.timezone).slice(0, 50) : 'Australia/Sydney',
    days: toPositiveInteger(req.query.days, 5, 7)
  });
  res.json({ data: forecast });
}));

/** GET /api/weather/events/:eventId - forecast for the venue hosting an event. */
router.get('/events/:eventId', asyncHandler(async (req, res) => {
  const eventId = toId(req.params.eventId, 'eventId');
  const [rows] = await db.execute(
    `SELECT e.event_id, e.title, e.timezone, v.name AS venue_name, v.suburb, v.state_code,
            v.latitude, v.longitude
     FROM events e
     JOIN venues v ON v.venue_id = e.venue_id
     WHERE e.event_id = ?
     LIMIT 1`,
    [eventId]
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, 'Event not found.');
  if (row.latitude === null || row.longitude === null) {
    throw new HttpError(404, 'This venue does not have coordinates, so no forecast is available.');
  }

  const forecast = await loadForecast({
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone || 'Australia/Sydney',
    days: toPositiveInteger(req.query.days, 5, 7)
  });

  res.json({
    data: {
      ...forecast,
      event: { id: row.event_id, title: row.title },
      venue: { name: row.venue_name, suburb: row.suburb, stateCode: row.state_code }
    }
  });
}));

module.exports = router;
