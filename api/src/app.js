'use strict';

/**
 * @file Builds and configures the Express application.
 *
 * The API is a pure JSON service: it never renders HTML and never uses a view
 * engine. The two Angular applications (clientside and adminside) are the only
 * front ends and they talk to these routes over HTTP.
 *
 * Keeping the app in its own module (instead of inside server.js) means the
 * router can be imported by a test harness or by an alternative entry point
 * without opening a network port.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const eventRoutes = require('./routes/events');
const categoryRoutes = require('./routes/categories');
const locationRoutes = require('./routes/locations');
const venueRoutes = require('./routes/venues');
const organisationRoutes = require('./routes/organisations');
const registrationRoutes = require('./routes/registrations');
const weatherRoutes = require('./routes/weather');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Assessment 3 adds Create, Update and Delete, so the browser must be allowed
// to send POST, PUT and DELETE - not just GET as in Assessment 2.
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  maxAge: 86400
}));

// Registration and event payloads are larger than a search query, so the JSON
// body limit is raised from 20kb to 64kb.
app.use(express.json({ limit: '64kb' }));

app.use((req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'no-store');
  next();
});

/**
 * Discovery endpoint. The browser is pointed here first when a developer wants
 * to check that the service is alive, and `/api` itself lists every route so
 * the API is self-documenting.
 */
app.get('/api', (_req, res) => {
  res.json({
    data: {
      service: 'charity-events-api',
      version: '3.0.0',
      caseStudy: 'PROG2002 Assessment 3 - Common Ground Collective charity events',
      endpoints: {
        health: 'GET /api/health',
        home: 'GET /api/events/upcoming?limit=6',
        search: 'GET /api/events/search?date=&location=&category=&scope=&sort=&page=&limit=',
        eventDetail: 'GET /api/events/:eventId',
        eventListAdmin: 'GET /api/events?status=all|draft|published|suspended|cancelled&q=&sort=&page=&limit=',
        createEvent: 'POST /api/events',
        updateEvent: 'PUT /api/events/:eventId',
        deleteEvent: 'DELETE /api/events/:eventId',
        eventRegistrations: 'GET /api/events/:eventId/registrations',
        register: 'POST /api/events/:eventId/registrations',
        registrations: 'GET /api/registrations?eventId=',
        deleteRegistration: 'DELETE /api/registrations/:registrationId',
        categories: 'GET|POST /api/categories, PUT|DELETE /api/categories/:categoryId',
        locations: 'GET /api/locations',
        venues: 'GET /api/venues, GET /api/venues/:venueId',
        organisations: 'GET /api/organisations',
        weather: 'GET /api/weather?latitude=&longitude=',
        eventWeather: 'GET /api/weather/events/:eventId'
      }
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok', service: 'charity-events-api', version: '3.0.0' } });
});

app.use('/api/events', eventRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/weather', weatherRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
