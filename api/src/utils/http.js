'use strict';

class HttpError extends Error {
  /**
   * @param {number} status HTTP status code.
   * @param {string} message Safe message that may be shown to the caller.
   * @param {unknown} details Optional structured details.
   * @param {boolean} expose Set true to allow a 5xx message through the generic
   *   safety filter. Use this only for deliberate, user-facing messages such as
   *   a third-party service being temporarily unavailable.
   */
  constructor(status, message, details = null, expose = status < 500) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
    this.expose = Boolean(expose);
  }
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = { HttpError, asyncHandler };
