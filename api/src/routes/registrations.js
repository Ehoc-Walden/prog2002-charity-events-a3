'use strict';

/**
 * @file Express router for the `/api/registrations` resource.
 *
 * Assessment 3 does not require registration endpoints, but they are small and
 * they make the admin site genuinely useful: staff can see all bookings across
 * every event and remove a wrong booking. Removing the last registration of an
 * event is also what unblocks that event's Delete button, so the two features
 * work together.
 *
 *  GET    /api/registrations                 All registrations, newest first.
 *  DELETE /api/registrations/:registrationId Remove one registration.
 */

const express = require('express');
const registrationService = require('../services/registrationService');
const { asyncHandler } = require('../utils/http');
const { toId, toPositiveInteger } = require('../utils/validation');

const router = express.Router();

/** GET /api/registrations - list bookings, optionally filtered by event. */
router.get('/', asyncHandler(async (req, res) => {
  const filters = {
    eventId: req.query.eventId ? toId(req.query.eventId, 'eventId') : undefined,
    limit: toPositiveInteger(req.query.limit, 100, 200)
  };
  const registrations = await registrationService.listRegistrations(filters);
  res.json({ data: registrations, meta: { count: registrations.length, filters } });
}));

/** DELETE /api/registrations/:registrationId - remove one booking. */
router.delete('/:registrationId', asyncHandler(async (req, res) => {
  const result = await registrationService.deleteRegistration(toId(req.params.registrationId, 'registrationId'));
  res.json({ data: result, meta: { message: 'Registration deleted.' } });
}));

module.exports = router;
