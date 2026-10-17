/**
 * @file Front-end configuration for the Common Ground Collective client site.
 *
 * Only the API base URL is configurable here. Every other value (events,
 * categories, venues, weather) is read from the REST API at run time so the
 * pages can never drift out of sync with the database.
 *
 * LOCAL DEVELOPMENT  -> http://localhost:3000/api
 * SCU cPanel         -> change to '/api' (or your deployed API URL) before
 *                       running `ng build` for the public deployment.
 */

/** Base URL of the charity events REST API. */
export const API_BASE_URL = 'http://localhost:3000/api';

/** Milliseconds before a browser request to the API is aborted. */
export const REQUEST_TIMEOUT_MS = 12000;

/** Origin used purely for display in the report and the footer. */
export const SITE_NAME = 'Common Ground Collective';