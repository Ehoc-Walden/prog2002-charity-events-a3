'use strict';

/**
 * @file Runtime configuration for the API process.
 *
 * Everything configurable is read from the environment (`api/.env` locally, or
 * the cPanel Node.js application settings in production) with a sensible
 * default, so the project runs from a clean checkout without editing code.
 */

require('./loadEnv');

/** Origins allowed by default: the two Angular dev servers and the docs server. */
const DEFAULT_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:4300',
  'http://127.0.0.1:4300',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

/**
 * Splits a comma separated origin list, always keeping the built-in defaults so
 * a developer who adds one production domain cannot accidentally lock out the
 * local development servers.
 *
 * @param {string} [value] Raw `CORS_ORIGINS` value.
 * @returns {string[]} Unique list of allowed origins.
 */
function parseOrigins(value) {
  const extra = String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ORIGINS, ...extra]));
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  weatherTimeoutMs: Number(process.env.WEATHER_TIMEOUT_MS || 6000)
};
