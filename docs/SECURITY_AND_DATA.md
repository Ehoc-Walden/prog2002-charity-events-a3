# Security and Data Integrity Notes

The project uses a small, explicit security model rather than adding a second
framework. The rules below apply to the Express API and the two browser
applications.

## Secrets

`api/.env` contains local database credentials and allowed browser origins. It
is excluded by `api/.gitignore` and by the root `.gitignore`. The repository
contains `api/.env.example` with safe placeholder values only.

Never publish a real database password in a commit, README, report or screenshot.

## SQL injection protection

The service layer uses `mysql2` and sends every user-controlled value as a
parameter:

```js
await db.execute('SELECT * FROM events WHERE event_id = ?', [eventId]);
```

Values are never concatenated into SQL text. Sort fields are selected from a
fixed allow-list, and identifiers are checked as positive integers before being
used.

## Input validation

`api/src/utils/validation.js` validates:

- path identifiers and pagination values;
- search dates, scope, category slugs and sort order;
- event and category payloads;
- registration names, email addresses, quantities and totals;
- latitude, longitude and weather limits.

The browser validates the same forms for a quicker response, but the API never
trusts the browser. Invalid requests return a structured `400` response.

## Cross-origin access

The API uses an explicit CORS allow-list from `CORS_ORIGINS`. The default local
origins are the public site on port 4200 and the staff console on port 4300.
Requests from any other origin are rejected.

## Browser rendering

Angular builds DOM nodes from data rather than inserting an unstructured HTML
string into the page. User-entered event, category and registration text is
therefore rendered as text, not executable markup.

## HTTP and error handling

- Helmet sets standard security-related response headers.
- `x-powered-by` is disabled so the response does not advertise Express.
- JSON bodies are limited to 64 KB.
- GET responses are marked `no-store` so the API does not serve stale data.
- Internal errors return a generic message; detailed server errors are logged
  on the server rather than exposed to the visitor.

## Relational integrity

The database uses foreign keys between events, venues, organisations,
categories, highlights and registrations. In particular:

- an event cannot reference a missing category or venue;
- an event with registrations cannot be deleted through the API (`409`);
- a category still used by an event cannot be deleted (`409`);
- deleting a registration is an explicit staff action.

These rules keep the public pages and the staff console consistent with the
database.
