'use strict';

/**
 * @file Express router for the `/api/events` resource.
 *
 * Endpoint map (Assessment 3)
 * ---------------------------------------------------------------------------
 *  GET    /api/events                        Admin list - every status.
 *  GET    /api/events/upcoming               Home page - next published events.
 *  GET    /api/events/search                 Search page - filtered + paginated.
 *  GET    /api/events/:eventId               Detail - event + highlights + registrations.
 *  POST   /api/events                        Create a new charity event.
 *  PUT    /api/events/:eventId               Update an existing event.
 *  DELETE /api/events/:eventId               Delete, blocked when registrations exist.
 *  GET    /api/events/:eventId/registrations List the tickets purchased for one event.
 *  POST   /api/events/:eventId/registrations Register a web user for an event.
 *
 * All request data is validated before it reaches the service layer, and the
 * service layer only ever uses parameterised statements, so no user supplied
 * text is ever concatenated into SQL.
 */

const express = require('express');
const eventService = require('../services/eventService');
const registrationService = require('../services/registrationService');
const { asyncHandler, HttpError } = require('../utils/http');
const {
  toId,
  toPositiveInteger,
  validateEventListQuery,
  validateEventPayload,
  validateRegistrationPayload,
  validateSearchQuery
} = require('../utils/validation');

const router = express.Router();

/**
 * Parses and validates an `:eventId` path parameter.
 *
 * @param {string} value Raw path parameter.
 * @returns {number} The validated event id.
 * @throws {HttpError} 400 when the value is not a positive integer.
 */
function eventIdParam(value) {
  if (!/^\d+$/.test(value)) {
    throw new HttpError(400, 'Event ID must be a positive integer.');
  }
  return toId(value, 'eventId');
}

/**
 * GET /api/events
 * Admin "List feature": returns every event regardless of status, with
 * pagination, free-text search and a status summary for the dashboard tiles.
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = validateEventListQuery(req.query);
  const result = await eventService.listEvents(filters);
  res.json({ data: result.events, meta: { filters, pagination: result.pagination, summary: result.summary } });
}));

/**
 * GET /api/events/upcoming
 * Home page: the next published events, featured first.
 */
router.get('/upcoming', asyncHandler(async (req, res) => {
  const limit = toPositiveInteger(req.query.limit, 6, 20);
  const result = await eventService.listUpcomingEvents(limit);
  res.json({ data: result.events, meta: { asOfDate: result.asOfDate, count: result.events.length } });
}));

/**
 * GET /api/events/search
 * Search page: date, location, category, scope, sort and pagination filters.
 */
router.get('/search', asyncHandler(async (req, res) => {
  const filters = validateSearchQuery(req.query);
  const result = await eventService.searchEvents(filters);
  res.json({ data: result.events, meta: { filters, pagination: result.pagination } });
}));

/**
 * POST /api/events
 * Creates a charity event from the admin "New event" form.
 * Responds 201 with the created resource, including its new id.
 */
router.post('/', asyncHandler(async (req, res) => {
  const payload = validateEventPayload(req.body);
  const event = await eventService.createEvent(payload);
  res.status(201).json({ data: event });
}));

/**
 * GET /api/events/:eventId
 * Public detail endpoint. Returns the event together with its highlights and
 * the complete list of registrations, newest purchase first.
 */
router.get('/:eventId', asyncHandler(async (req, res) => {
  // Public pages only ever see published events. The admin console adds
  // ?includeUnpublished=1 so staff can also open drafts, suspended and
  // cancelled records in the "Edit event" form.
  const includeUnpublished = ['1', 'true', 'yes'].includes(
    String(req.query.includeUnpublished || '').toLowerCase()
  );
  const event = await eventService.getEventById(eventIdParam(req.params.eventId), {
    publishedOnly: !includeUnpublished
  });
  res.json({ data: event });
}));

/**
 * PUT /api/events/:eventId
 * Updates an event from the admin "Edit event" form.
 */
router.put('/:eventId', asyncHandler(async (req, res) => {
  const eventId = eventIdParam(req.params.eventId);
  const payload = validateEventPayload(req.body);
  const event = await eventService.updateEvent(eventId, payload);
  res.json({ data: event });
}));

/**
 * DELETE /api/events/:eventId
 * Removes an event, but only when no registrations reference it.
 * Responds 409 with a readable explanation when the delete is blocked.
 */
router.delete('/:eventId', asyncHandler(async (req, res) => {
  const result = await eventService.deleteEvent(eventIdParam(req.params.eventId));
  res.json({ data: result, meta: { message: `"${result.title}" was deleted.` } });
}));

/**
 * GET /api/events/:eventId/registrations
 * Returns just the registration list for one event.
 */
router.get('/:eventId/registrations', asyncHandler(async (req, res) => {
  const eventId = eventIdParam(req.params.eventId);
  const registrations = await eventService.getEventRegistrations(eventId);
  res.json({ data: registrations, meta: { count: registrations.length } });
}));

/**
 * POST /api/events/:eventId/registrations
 * Public registration page: inserts a new registration record for the event.
 */
router.post('/:eventId/registrations', asyncHandler(async (req, res) => {
  const eventId = eventIdParam(req.params.eventId);
  const payload = validateRegistrationPayload(req.body);
  const result = await registrationService.createRegistration(eventId, payload);
  res.status(201).json({ data: result.registration, meta: { event: result.event } });
}));

module.exports = router;
