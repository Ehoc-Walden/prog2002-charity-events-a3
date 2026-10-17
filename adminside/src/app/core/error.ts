/**
 * @file A single, typed error class shared by every API call.
 *
 * Wrapping transport failures in one class means the components never have to
 * inspect an `HttpErrorResponse` themselves: they just read `message` and show
 * it to the user.
 */

/**
 * Error thrown when the charity events API cannot be reached or returns a
 * non-success status code.
 */
export class ApiError extends Error {
  /** HTTP status code, or 0 when the request never reached the server. */
  readonly status: number;

  /** Extra structured detail returned by the API, when present. */
  readonly details: unknown;

  /**
   * @param message Human readable message suitable for display.
   * @param status HTTP status code (0 for a network or timeout failure).
   * @param details Optional structured payload returned by the API.
   */
  constructor(message: string, status = 0, details: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/** Transport-independent message used when port 3000 is not answering. */
export const API_OFFLINE_MESSAGE =
  'The charity events service could not be reached. Start the Node API (npm start in the api folder) and try again.';

/** Message used when the request is aborted by the timeout guard. */
export const API_TIMEOUT_MESSAGE =
  'The charity events service took too long to respond. Check that the API is running and try again.';