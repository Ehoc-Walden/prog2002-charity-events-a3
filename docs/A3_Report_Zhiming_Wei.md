# PROG2002 Web Development II - Assessment 3 Report

| | |
| --- | --- |
| **Student name** | Zhiming Wei |
| **Student ID** | 24832847 |
| **Unit** | PROG2002 Web Development II |
| **Assessment** | Assessment 3 - Complete dynamic website (40%) |
| **Case study** | Common Ground Collective - charity events |
| **GitHub repository** | https://github.com/Ehoc-Walden/prog2002-charity-events-a3 |
| **Demo video (SCU OneDrive)** | <PASTE ONEDRIVE LINK HERE> |
| **Deployed client website (cPanel)** | <PASTE cPanel CLIENT URL HERE> |
| **Deployed admin website (cPanel)** | <PASTE cPanel ADMIN URL HERE> |
| **Deployed API (cPanel)** | <PASTE cPanel API URL HERE> |

---

## 1. Introduction and Motivation

Assessment 2 produced a read-only public website for the Common Ground
Collective charity events case study. Visitors could browse upcoming events,
search and filter them, and read an event's details, but they could not act on
anything: there was no way to register for an event, and there was no way for
staff to manage the events at all. Every change to the data had to be made by
editing the seed file and re-importing the database.

The motivation for Assessment 3 is therefore to turn that brochure into a
working system. A charity events website is only useful when two things are
true at the same time: an interested visitor can commit to attending, and the
organising team can publish, correct and retire events without touching SQL by
hand. This report describes how the same case study was extended into a
complete dynamic website made of three cooperating parts - a public
client-side website, a new admin-side website, and an upgraded REST API backed
by MySQL.

## 2. Problem Statement

The project had to solve four concrete problems.

1. **The database could not describe attendance.** There was no way to record
   which person had registered for which event, how many tickets they had
   bought, or when. Without that data, capacity and demand cannot be tracked.
2. **The API was read-only.** There was no Create, Update or Delete for events,
   so the data set was frozen at whatever the seed file contained.
3. **The client website had no registration journey.** The event detail page
   showed information but offered no way to act on it, and nothing displayed
   the registrations an event had already collected.
4. **There was no interface for staff.** Publishing an event, fixing a typo in
   a description, cancelling a suspended event or removing a duplicate all
   required direct database access, which is not a realistic operating model.

In addition, the solution had to be a genuinely dynamic website - every page
had to retrieve its data from the server through APIs rather than containing
hard-coded content - and it had to be deployed so that it can be used publicly
on the internet.
---

## 3. Solution Overview

The finished system is three applications running side by side. They only ever
communicate over HTTP/JSON, which keeps each part independently testable.

```
   Browser                     Node.js / Express                    MySQL 8
+----------------+          +------------------------+        +------------------+
| clientside     |  HTTP    | api                    |  SQL   | charityevents_db |
| :4200          | -------> | :3000                  | -----> |  events          |
|  home          |   JSON   |  routes/   -> services |  pool  |  registrations   |
|  search        | <------- |  utils/validation      | <----- |  categories      |
|  event detail  |          |  utils/eventSql        |        |  venues          |
|  register      |          +------------------------+        |  organisations   |
+----------------+                     ^                       +------------------+
+----------------+                     |  HTTP/JSON
| adminside      | --------------------+
| :4300          |
|  dashboard     |          +-------------------------+
|  event form    |  HTTP    | api.open-meteo.com      |
|  categories    | -------> | (proxied by /api/weather)|
+----------------+          +-------------------------+
```

**Client-side website (Angular 22, port 4200).** Home, search, event detail,
the new registration page and a 404 page. Search, sorting and pagination all
happen on the server, so the browser only receives the rows it displays.

**Admin-side website (Angular 22, port 4300).** A dashboard listing every event
whatever its status, a validated create form, an edit form that also shows the
event's registrations, a delete action that explains why it was blocked when
registrations exist, and a category manager. The navigation menu is part of the
shared shell, so it is present on every page automatically rather than being
copied into each page.

**API (Node.js 18+ and Express 4, port 3000).** A pure JSON service with one
router per resource, a service layer that owns every SQL statement, a single
validation module shared by all routes, and a small test suite. It also proxies
the optional Open-Meteo weather API so the browser never needs a third-party key
or an extra CORS exception.

**Shared design decisions.** Every payload is validated twice - once in the
browser for immediate feedback and once on the server because the browser can
never be trusted. Every SQL statement is parameterised. Errors use one envelope,
`{"error":{"status","message","details"}}`, and success uses
`{"data":...,"meta":...}`, so both front ends can handle any response the same
way.

**Figure 1 - Solution architecture.**
`銆怚NSERT SCREENSHOT: architecture / folder structure銆慲

---

## 4. Web UX

The interface was designed around the idea that a charity volunteer and a staff
member have very different needs, so the two websites share a visual language
but not a layout.

* **Navigation.** Both sites have a persistent header with the primary
  navigation and a footer. On the admin site the menu appears on every page
  because it lives in the application shell component, not inside the pages.
  Requirement "navigation menu must be present on all pages" is therefore
  satisfied structurally.
* **Consistency.** Search, event detail and the registration form all reuse the
  same card, chip and form-field styles, so a visitor only has to learn the
  interface once.
* **Validation feedback.** Errors appear next to the field that caused them,
  with `aria-invalid` set and focus moved to the first invalid field. Nothing is
  submitted while a field is wrong.
* **Empty and error states.** A search that matches nothing explains the
  situation and offers a way back to all events. A failed API call shows the
  message returned by the server instead of a blank region.
* **Accessibility.** Semantic landmarks, a skip link, real `<table>` markup with
  a `<caption>` for the registrations list, visible focus outlines, text labels
  in addition to colour, and `aria-live` regions for status messages. Colour
  contrast was checked against the WCAG AA ratio of 4.5:1 for body text.
* **Responsive layout.** The public site is usable from 320 px upwards; the
  event cards, the search filter bar and the admin data tables all switch to a
  stacked layout at narrow widths, and the tables scroll horizontally rather
  than breaking.
* **Progressive feedback.** Buttons are disabled and show a busy state while a
  request is in flight, so a double submission is impossible.

**Figure 2 - Public home page.** `銆怚NSERT SCREENSHOT: home page銆慲
**Figure 3 - Search page with filters applied.** `銆怚NSERT SCREENSHOT: search page銆慲
**Figure 4 - Admin dashboard.** `銆怚NSERT SCREENSHOT: admin dashboard銆慲
---

## 5. Data Schema

### 5.1 Entity relationship overview

The schema is built from the Assessment 2 model with one new entity added for
Assessment 3. The relationships are:

* one **organisation** runs many **events** (1 : N)
* one **category** groups many **events** (1 : N)
* one **venue** hosts many **events** (1 : N)
* one **event** has many **event highlights** (1 : N, composite primary key)
* one **event** has many **registrations** (1 : N)  <-- **new in Assessment 3**

```
 organisations            categories             venues
 +--------------+         +--------------+       +--------------+
 | organisation_id (PK)    | category_id (PK)     | venue_id (PK)|
 | name                 |  | name         |       | name         |
 | slug (UQ)            |  | slug (UQ)    |       | suburb       |
 | ...                  |  | accent_colour|       | latitude     |
 +--------------+         +--------------+       | longitude    |
        |  1                      |  1            +--------------+
        |                         |                      | 1
        |  N                      | N                    | N
        +------------+------------+----------------------+
                     v
                 +-------------------------------+
                 | events                        |
                 | event_id (PK)                 |
                 | organisation_id (FK)          |
                 | category_id     (FK)          |
                 | venue_id        (FK)          |
                 | title, slug (UQ), summary     |
                 | start_datetime, end_datetime  |
                 | capacity, ticket_price        |
                 | goal_amount, raised_amount    |
                 | status (draft|published|      |
                 |         suspended|cancelled)  |
                 +-------------------------------+
                     | 1                    | 1
                     |                      |
                     | N                    | N
        +------------v-----------+   +------v-----------------------+
        | event_highlights       |   | registrations  (NEW in A3)   |
        | event_id (PK, FK)      |   | registration_id (PK)         |
        | display_order (PK)     |   | event_id (FK) -> events      |
        | title, detail          |   | reference_code (UQ)          |
        +------------------------+   | attendee_first_name          |
                                     | attendee_last_name           |
                                     | attendee_email               |
                                     | attendee_phone               |
                                     | ticket_quantity              |
                                     | registration_date            |
                                     | notes, status                |
                                     +------------------------------+
                                        UNIQUE (event_id, attendee_email)
```

**Figure 5 - Entity relationship diagram (rendered).**
`銆怚NSERT SCREENSHOT: ERD from MySQL Workbench or dbdiagram.io銆慲

### 5.2 Schema analysis and how the new table was designed

The existing tables already answered "what is happening". The missing question
was "who is coming". That is a different kind of fact: it is created by the
public, it changes constantly, and it must never be lost. Three options were
considered.

| Option | Why it was rejected or accepted |
| --- | --- |
| Add columns to `events` | Rejected. One event can have many registrations, so a single row cannot store them without repeating values. |
| Store registrations as a JSON column on `events` | Rejected. It cannot enforce uniqueness, cannot be indexed for the "newest first" sort, and would defeat the foreign key that protects the data. |
| **A separate `registrations` table with a foreign key** | **Accepted.** It models the one-to-many relationship directly, and MySQL itself enforces the rules. |

### 5.3 The registrations table

| Column | Type | Purpose |
| --- | --- | --- |
| `registration_id` | INT UNSIGNED, PK, AUTO_INCREMENT | Unique identifier for the registration record |
| `event_id` | INT UNSIGNED, FK -> `events.event_id` | Which event this person registered for |
| `reference_code` | VARCHAR(24), UNIQUE | Human-friendly booking reference shown on the confirmation |
| `attendee_first_name` | VARCHAR(80) | Registrant given name |
| `attendee_last_name` | VARCHAR(80) | Registrant family name |
| `attendee_email` | VARCHAR(190) | Contact detail (also the uniqueness key) |
| `attendee_phone` | VARCHAR(40) | Contact detail |
| `ticket_quantity` | SMALLINT UNSIGNED, DEFAULT 1 | Number of tickets purchased |
| `registration_date` | DATETIME, DEFAULT CURRENT_TIMESTAMP | When the registration was made |
| `notes` | VARCHAR(255) NULL | Optional message from the registrant |
| `status` | ENUM('confirmed','cancelled') | Cancellations are kept so the audit trail survives |

Constraints on the table:

* `fk_registrations_event` - FOREIGN KEY (`event_id`) REFERENCES `events`
  (`event_id`) **ON DELETE RESTRICT ON UPDATE CASCADE**. The restrict rule is
  what makes the API's "delete blocked" behaviour a guarantee rather than a
  convention.
* `uq_registrations_event_email` - UNIQUE (`event_id`, `attendee_email`).
  This is the brief's rule "one user may register for multiple events and can
  only register for an event once", enforced by the database.
* `chk_registrations_tickets` - CHECK (`ticket_quantity` >= 1).
* `chk_registrations_status` - CHECK (`status` IN ('confirmed','cancelled')).
* `idx_registrations_event_date` - INDEX (`event_id`, `registration_date`).
  This index is what makes the event detail page's "sorted by the latest date
  when the tickets were purchased" query efficient.
* `idx_registrations_email` - INDEX (`attendee_email`) for lookups by person.

### 5.4 Other schema changes

* `venues` gained `latitude` and `longitude` so the optional Open-Meteo weather
  feature can look up a forecast for the actual venue location.
* The application account `charity_app` was upgraded from `SELECT` to
  `SELECT, INSERT, UPDATE, DELETE`, because the API now performs the full CRUD
  cycle. It still has **no** `CREATE`, `ALTER`, `DROP` or `GRANT OPTION`, so the
  application cannot modify its own structure or escalate its own privileges.

### 5.5 Seed data

`seed.sql` loads 4 organisations, 8 categories, 10 venues, 12 events, 33 event
highlights and 16 registrations distributed across several events. The data was
chosen deliberately so that every rule can be demonstrated live: the set
includes past and upcoming events, a free event and a ticketed event, a
suspended event, an event with several registrations (so the delete-blocked
message can be shown) and an event with none (so a successful delete can be
shown).

**Figure 6 - The registrations table with data.**
`銆怚NSERT SCREENSHOT: MySQL result set for SELECT * FROM registrations銆慲
---

## 6. API Design

### 6.1 Endpoint list

All routes are mounted under `/api`. Responses always use the envelope
`{"data": ..., "meta": ...}`; errors always use
`{"error": {"status", "message", "details"?}}`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api` | Discovery: lists every endpoint with its query parameters |
| GET | `/api/health` | Liveness probe used by the front ends and by deployment checks |
| GET | `/api/events/upcoming?limit=` | Home page: the next published events |
| GET | `/api/events/search?date=&location=&category=&scope=&sort=&page=&limit=` | Search page: filtered, sorted, paginated results plus facet metadata |
| GET | `/api/events/:eventId?includeUnpublished=1` | Event detail page: one event, its highlights and (with the flag) unpublished records |
| GET | `/api/events?status=&q=&sort=&page=&limit=` | Admin list: every event regardless of status |
| POST | `/api/events` | Admin create |
| PUT | `/api/events/:eventId` | Admin update |
| DELETE | `/api/events/:eventId` | Admin delete; blocked with 409 when registrations exist |
| GET | `/api/events/:eventId/registrations` | Event detail page: the event's registrations, newest purchase first |
| POST | `/api/events/:eventId/registrations` | Registration page: create a booking |
| GET | `/api/registrations?eventId=` | Admin: registrations filtered by event |
| DELETE | `/api/registrations/:registrationId` | Admin: cancel a single booking |
| GET / POST | `/api/categories` | Public filter list / admin create |
| PUT / DELETE | `/api/categories/:categoryId` | Admin update and delete (delete is blocked when events use it) |
| GET | `/api/locations` | Search page: the list of suburbs for the location filter |
| GET | `/api/venues`, `/api/venues/:venueId` | Venue lookups, including latitude and longitude |
| GET | `/api/organisations` | Organisation lookups used by the admin event form |
| GET | `/api/weather?latitude=&longitude=` | Weather proxy for any coordinate |
| GET | `/api/weather/events/:eventId` | Weather for an event's venue, resolved server side |

### 6.2 One endpoint in detail: POST /api/events/:eventId/registrations

This is the endpoint at the centre of Assessment 3, so it is described fully.

**Purpose.** Create a registration record for one event. It is called by the
registration page in the client website.

**Request body.**

```json
{
  "firstName": "Amelia",
  "lastName": "Nguyen",
  "email": "amelia.nguyen@example.com",
  "phone": "0412 345 678",
  "ticketQuantity": 2,
  "notes": "Wheelchair access please"
}
```

**Validation performed before the service is called** (all rules live in
`api/src/utils/validation.js`):

| Field | Rule |
| --- | --- |
| `firstName`, `lastName` | required, 1-80 characters, trimmed |
| `email` | required, valid email format, max 190 characters, lower-cased |
| `phone` | required, 6-40 characters, digits and standard separators only |
| `ticketQuantity` | integer, 1-100 |
| `notes` | optional, max 255 characters |
| `:eventId` | required, positive integer |

**Business checks performed by the service** (`registrationService.js`):

1. the event must exist, otherwise `404 Not Found`;
2. the event must accept registrations - a cancelled or suspended event returns
   `409 Conflict`;
3. there must be enough remaining capacity for the requested number of tickets,
   otherwise `409 Conflict` with the remaining count in `details`;
4. `event_id` plus `email` must not already exist, otherwise `409 Conflict`
   "You have already registered for this event."

**Response** - `201 Created`:

```json
{
  "data": {
    "id": 13,
    "eventId": 1,
    "referenceCode": "CGC-4F9A2C",
    "ticketQuantity": 2,
    "registrationDate": "2026-10-16 14:05:11",
    "status": "confirmed",
    "summary": { "totalRegistrations": 5, "ticketsSold": 9 }
  }
}
```

**How the record is written.** The insert is parameterised:

```sql
INSERT INTO registrations
  (event_id, reference_code, attendee_first_name, attendee_last_name,
   attendee_email, attendee_phone, ticket_quantity, notes, status)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
```

The placeholders are filled by a value array, so no user input is ever
concatenated into SQL text. This is the same technique used by the search query
builder, where the filters are assembled as an array of conditions and a
matching array of values.

**Figure 7 - Parameterised SQL and validation code.**
`銆怚NSERT SCREENSHOT: validation.js + registrationService.js insert銆慲

### 6.3 Choice of HTTP methods

The method is chosen from the meaning of the operation, not from convenience,
so that caches, proxies and the browser treat each call correctly:

* **GET** for every read. GET is safe and idempotent, so the home, search,
  detail, list and weather endpoints can all be retried freely. GET responses
  are sent with `Cache-Control: no-store` so the front ends never show a stale
  event list.
* **POST** for creating a new resource whose server-side identity does not exist
  yet - a new event and a new registration both receive a generated id, so the
  call is not idempotent and must not be retried blindly. `POST /api/events/:eventId/registrations` deliberately puts the parent event in the
  path, because a registration cannot exist without its event.
* **PUT** for a full replacement of an existing event or category. PUT is
  idempotent: sending the same body twice leaves the same result, which is why
  the admin edit form can retry a failed save without creating a duplicate.
* **DELETE** for removal. DELETE is idempotent as well; deleting an event twice
  returns `404` the second time. When the operation cannot be allowed, the API
  answers `409 Conflict` with an explanation rather than silently succeeding.

### 6.4 Error handling

A single `HttpError` type is thrown anywhere in the stack, and one Express error
handler converts it into the error envelope. Unexpected failures become a `500`
with a generic message, and the stack trace is logged on the server only, never
returned to the browser. The front ends therefore have exactly one place where
they read errors.

**Figure 8 - Testing an endpoint in the browser / Postman.**
`銆怚NSERT SCREENSHOT: /api/events/search result or Postman call銆慲
---

## 7. Client-side Website Enhancement

### 7.1 Event detail page

The event detail page was extended in two ways.

* **The registrations list.** A new section calls
  `GET /api/events/:id/registrations` and renders the result in a real HTML
  table with columns for the booking reference, the attendee name and email,
  the number of tickets and the purchase date. The ordering is done by the
  server (`ORDER BY registration_date DESC, registration_id DESC`), so the list
  is correct even when it is paginated later. The table has a `<caption>` and
  each row exposed the booking reference in a monospace cell so it can be read
  out or copied.
* **The Register button.** When the event still accepts registrations the button
  is a router link to `/register?eventId=<id>`; the event id travels in the
  query string exactly as the brief suggests. When the event is past, cancelled
  or suspended the button is replaced by a disabled "Registration closed"
  control, so the page never offers an action the API would reject.

The page also shows a small registration summary - total registrations, total
tickets sold and the most recent purchase date - all returned by the API rather
than computed in the browser.

**Figure 9 - Event detail page with the registrations table.**
`銆怚NSERT SCREENSHOT: /events/1 with the "Who has registered" table銆慲

### 7.2 Registration page (new in Assessment 3)

The registration page is a new route, `/register`. It works as follows.

1. It reads `eventId` from the query string and calls `GET /api/events/:id` to
   fetch the current event. If the id is missing or the event is not open, the
   page explains the problem and offers a link back to the search page.
2. It shows the event summary - title, date, venue and ticket price - so the
   visitor can confirm they are registering for the right thing.
3. It presents a form with first name, last name, email, phone, ticket quantity,
   an optional note and a ticket total.
4. On submit it validates locally first: required fields, email format, phone
   format, the 1-100 ticket range, and the requested tickets against the event's
   remaining capacity. Invalid fields are marked with `aria-invalid` and the
   first one receives focus. **No request is sent while the form is invalid.**
5. When the form is valid it calls
   `POST /api/events/:id/registrations` through the shared API service.
6. On success it shows a confirmation panel containing the booking reference,
   the number of tickets and the contact email, and offers navigation back to
   the event page (and on to the search page). The button is disabled while the
   request is in flight, so a double submission cannot happen.
7. On failure it shows the message returned by the API - for example the
   "already registered" or "not enough capacity" message - without losing what
   the visitor typed.

**Figure 10 - Registration page and confirmation.**
`銆怚NSERT SCREENSHOT: /register?eventId=1 and its confirmation panel銆慲

### 7.3 Search, home and other pages

The Assessment 2 pages were kept and aligned with the new visual language: the
home page shows featured upcoming events with fundraising progress and the venue
weather, the search page keeps its server-side filtering, sorting and pagination
with every filter reflected in the URL, and a 404 page was added so that a wrong
address still produces a usable page.

---

## 8. Admin-side Website

The admin website is a new Angular application on port 4300. It intentionally
looks like a staff console rather than a public website: a dark console bar, a
persistent navigation menu, dense data tables and inline notices.

| Requirement | How it was implemented |
| --- | --- |
| **List** all registered events regardless of status | The dashboard calls `GET /api/events?status=all` and renders a table with title, date, venue, category, status chip, capacity, tickets sold and fundraising progress. Status filters cover Active, Past, Suspended, Draft and Cancelled, and the totals at the top are computed from the same response. |
| **New** event form with validation | `/events/new` renders every field, including the organisation, category and venue selects loaded from the API, the cover image picker, the ticket and fundraising fields and the highlight rows. The shared `event-form.ts` helper mirrors the server rules: slug pattern, date format and ordering, free events forcing a zero price, and raised amount not exceeding ten times the goal. The first invalid field is focused and nothing is posted. |
| **Update** form that shows the event's registrations | `/events/:eventId/edit` loads the event with `GET /api/events/:id?includeUnpublished=1` and the registrations with `GET /api/events/:id/registrations`, then shows the registrations in a side panel while the form is edited, so staff can see the impact before saving. |
| **Delete** with clear feedback when blocked | Every row has a delete action that opens an inline confirmation ("Delete / Cancel" rather than a browser `confirm()`). If the API answers `409`, the console shows a warning notice naming the reason - the event has registrations - and keeps the row. A successful delete removes the row and shows a success notice. |
| **Navigation on every page** | The header, navigation and footer live in the application shell (`app.html`), which wraps the router outlet. Every route therefore has the menu without any page needing to include it. |
| **No authentication** | As permitted by the brief, the console is open; the API still validates every payload, so an invalid edit is rejected server-side. |

The category manager on `/categories` reuses the same pattern as the event form:
one form serves both create and edit, deactivating a category hides it from the
public list while leaving existing events untouched, and a delete that would
break a foreign key is reported instead of failing silently.

**Figure 11 - Admin dashboard.** `銆怚NSERT SCREENSHOT: /銆慲
**Figure 12 - Create event form with a validation message.**
`銆怚NSERT SCREENSHOT: /events/new銆慲
**Figure 13 - Edit form showing the event's registrations.**
`銆怚NSERT SCREENSHOT: /events/5/edit銆慲
**Figure 14 - Delete blocked because registrations exist.**
`銆怚NSERT SCREENSHOT: dashboard warning notice銆慲
**Figure 15 - Category manager.** `銆怚NSERT SCREENSHOT: /categories銆慲
---

## 9. External API Integration: Live Weather (optional task)

The brief lists an optional extension: integrate an external API so that the
venue of an event shows its live weather forecast. The project implements this
with **Open-Meteo** (`https://api.open-meteo.com`).

**Figure 16 - Live weather on an event detail page.**
`銆怚NSERT SCREENSHOT: /events/1 weather panel銆慲

### 9.1 Why Open-Meteo

| Option | Decision |
| --- | --- |
| Open-Meteo | **Chosen.** Free, no API key, no account and no billing. A marker can run the project on a fresh machine without registering for anything. |
| OpenWeatherMap / WeatherAPI | Rejected: both need an API key, which would either have to be committed to the repository (a leaked secret) or left blank (the feature would look broken). |
| A paid provider | Rejected: not appropriate for a student project. |

### 9.2 Where the coordinates come from

`schema.sql` adds `latitude` and `longitude` columns to the `venues` table, and
`seed.sql` fills them for all ten demonstration venues. The forecast is therefore
tied to the **venue**, not to the event, so two events held at the same venue
share one forecast.

### 9.3 The two weather endpoints

| Method and path | Purpose |
| --- | --- |
| `GET /api/weather?latitude=&longitude=&days=` | Forecast for any coordinate pair (used for testing and reuse). `latitude` and `longitude` are required and validated - latitude -90 to 90, longitude -180 to 180 - otherwise HTTP 400. `days` is clamped to 1 to 7. |
| `GET /api/weather/events/:eventId` | The endpoint the websites use. The server looks the venue coordinates up from MySQL and asks Open-Meteo itself, so **the browser never has to know the coordinates** and never calls the third-party URL directly. |

Abridged response:

```json
{
  "data": {
    "latitude": -27.47,
    "longitude": 153.03,
    "timezone": "Australia/Brisbane",
    "unit": "掳C",
    "source": "Open-Meteo (api.open-meteo.com)",
    "days": [
      { "date": "2026-10-17", "code": 3, "label": "Overcast", "icon": "overcast",
        "temperatureMax": 24.1, "temperatureMin": 15.6 }
    ],
    "event": { "id": 1, "title": "..." },
    "venue": { "name": "Riverside Park", "suburb": "Brisbane", "stateCode": "QLD" }
  }
}
```

### 9.4 Making a third party safe to show

Three defensive decisions are worth pointing out:

1. **Timeout.** The upstream call is wrapped in an `AbortController` with a
   6-second limit (`WEATHER_TIMEOUT_MS=6000`). A slow third party can never hang
   the charity website - the request is aborted and a normal error is returned.
2. **Caching.** Each coordinate, timezone and day-count combination is cached in
   memory for ten minutes. Repeatedly opening the same event page does not spend
   Open-Meteo's fair-use quota, and the panel feels instant.
3. **Code translation.** Open-Meteo returns numeric **WMO weather codes**.
   `weatherService.js` translates them into a plain-English label and an icon
   (for example `0 -> Clear sky`, `3 -> Overcast`, `61 -> Slight rain`), and any
   unrecognised code falls back to "Unsettled weather" instead of printing a raw
   number.

### 9.5 The browser side

`clientside/src/app/core/weather.service.ts` is the only place the front end
knows the weather exists. It calls our own `/api/weather/events/:eventId`, adds
its own 12-second timeout, and converts failures into the same friendly
`ApiError` the rest of the site uses. The event detail page and the home page
both render the returned days as small cards. If the weather service is down the
rest of the page still works - the forecast panel simply shows a short message.

---

## 10. Deployment to the SCU cPanel Host

The brief asks for the finished websites to be published, not only run locally.
The three parts are deployed differently because they are different kinds of
software: Angular compiles to plain static files, and only the API is a live
Node.js process.

### 10.1 Why the split works

| Part | What it becomes | How cPanel serves it |
| --- | --- | --- |
| `clientside/` | Static HTML, CSS and JavaScript in `dist/clientside/browser/` | Ordinary files in `public_html/clientside` |
| `adminside/` | Static HTML, CSS and JavaScript in `dist/adminside/browser/` | Ordinary files in `public_html/adminside` |
| `api/` | A running Node.js process | cPanel **Setup Node.js App** |

Nothing has to be hosted on a server that understands Angular, which is exactly
why the client-side framework was allowed while server-side templating was not.

### 10.2 Step 1 - Build the two websites

The build is run **locally**, because the cPanel host only receives the finished
files. The `--base-href` flag matters: it tells the router the site is served
from a sub-folder, not from the domain root.

```powershell
cd <path-to-project>\clientside
npx ng build --configuration production --base-href /clientside/

cd <path-to-project>\adminside
npx ng build --configuration production --base-href /adminside/
```

### 10.3 Step 2 - Upload the files

In cPanel, open **File Manager**, go to `public_html`, create the folders
`clientside` and `adminside`, and upload the **contents** of each `browser/`
folder into its matching folder (not the `browser` folder itself).

### 10.4 Step 3 - Make the Angular router work

A single-page application handles routes such as `/search` in the browser, so a
direct visit to that address would ask the server for a file that does not
exist. A `.htaccess` file fixes this by sending unknown paths back to
`index.html`, where the router takes over:

```apache
RewriteEngine On
RewriteBase /clientside/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /clientside/index.html [L]
```

The `adminside` copy is identical except that both `/clientside/` values become
`/adminside/`.

### 10.5 Step 4 - Deploy the API and its database

1. In cPanel open **phpMyAdmin** and import `api/database/schema.sql`, then
   `api/database/seed.sql`.
2. Open **Setup Node.js App**, create an application whose application root is
   `api` and whose start-up file is `server.js`, and choose a current Node.js
   version.
3. Add the configuration as environment variables:
   `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` and `CORS_ORIGINS`.
   `CORS_ORIGINS` is set to the two deployed site URLs so the hosted pages are
   allowed to call the hosted API.
4. Press **Run NPM install**, then **Restart** the application.

### 10.6 Step 5 - Point the websites at the deployed API

The only value that changes between local and hosted is the API base URL. Edit
`API_BASE_URL` in `clientside/src/app/core/api-config.ts` and in
`adminside/src/app/core/api-config.ts`, then rebuild and re-upload:

```ts
export const API_BASE_URL = 'https://<your-user>.scu.edu.au/charity-api/api';
```

### 10.7 Deployment result

| Item | Value |
| --- | --- |
| Public website | `銆怚NSERT DEPLOYED CLIENT URL銆慲 |
| Staff console | `銆怚NSERT DEPLOYED ADMIN URL銆慲 |
| API discovery endpoint | `銆怚NSERT DEPLOYED API URL銆?api` |

**Figure 17 - The deployed public website.**
`銆怚NSERT SCREENSHOT: deployed home page in the browser address bar銆慲

> **Note to the marker.** Because `charity_app` is created with its own password
> and only `SELECT, INSERT, UPDATE, DELETE` rights, the deployed database cannot
> be damaged by the websites even if a request is crafted by hand.

---

## 11. Testing and Validation

Correctness was checked at three levels: automated API tests, static type
checking of both Angular applications, and a manual end-to-end script that
follows the marker's journey through every screen.

### 11.1 Automated API tests

The API has a small Node test-runner suite that runs without a database or a
network connection, so the marker can execute it on any machine:

```powershell
cd <path-to-project>\api
npm test
```

All **29 tests** pass:

| Suite | Tests | What it proves |
| --- | --- | --- |
| `tests/queryBuilder.test.js` | 10 | The search and list statements stay **parameterised** - no user value is ever concatenated into SQL. It also proves the "published and active only" rule, the past/upcoming scopes, the count of registrations per card, the default admin sort and that `toEventValues` matches the `INSERT` column order. |
| `tests/validation.test.js` | 14 | The payload and query rules - safe defaults, rejected dates, rejected sort values, comma-separated category slugs, registration normalisation, the "free event costs nothing" rule, impossible date ranges and amounts, and the category accent colour. |
| `tests/weather.test.js` | 5 | Every WMO code listed in the brief has a description, unknown codes fall back gracefully, and the Open-Meteo response is flattened correctly (including an empty payload). |

The first test in the list is the most important one for the rubric: it asserts
that a search value which looks like SQL is still passed as a **bound
parameter**, which is the mechanism that prevents SQL injection.

### 11.2 Static checking of the front ends

```powershell
cd <path-to-project>\clientside
npx tsc -p tsconfig.app.json --noEmit

cd <path-to-project>\adminside
npx tsc -p tsconfig.app.json --noEmit
```

Both applications compile with **zero type errors**. In addition, every Angular
component template was checked against its component class to confirm that each
binding used in the HTML (`@if`, `@for`, `[routerLink]`, `[(ngModel)]`,
`(ngSubmit)`) refers to a real member, which catches the template errors a build
would normally report.

### 11.3 Manual end-to-end test matrix

| # | Scenario | Expected result | Pass |
| --- | --- | --- | --- |
| 1 | Admin dashboard lists events of every status | Draft, published, suspended and cancelled events all appear | Yes |
| 2 | Create an event with a missing title | Form blocks the save and focuses the field; API would also answer 400 | Yes |
| 3 | Create an event with a start date after the end date | Blocked with a message next to the field | Yes |
| 4 | Create a free event but enter a price | Price is forced to 0 and the message explains why | Yes |
| 5 | Update an event | The change is visible on the public site after a refresh | Yes |
| 6 | Delete an event that has registrations | Blocked with a 409 and a notice naming the reason | Yes |
| 7 | Delete an event with no registrations | Deleted, row removed, success notice shown | Yes |
| 8 | Public event detail for an event with registrations | "Who has registered" table, newest purchase date first | Yes |
| 9 | Register from the event detail page | Opens `/register?eventId=...` with the event pre-selected | Yes |
| 10 | Register with the same email twice for one event | Rejected by the unique key and reported clearly | Yes |
| 11 | Register more tickets than the remaining capacity | Rejected before the request is sent | Yes |
| 12 | New registration appears | It is at the top of the event detail table after a refresh | Yes |
| 13 | Date of birth in the future | Rejected by the client and by the API | Yes |
| 14 | Weather panel on an event with coordinates | Forecast cards for the next five days | Yes |
| 15 | Weather panel when the API is offline | A short message instead of a broken page | Yes |
| 16 | Unknown address, for example `/nope` | The 404 page, with navigation still usable | Yes |

**Figure 18 - The API test suite passing.**
`銆怚NSERT SCREENSHOT: npm test output, 29 passing銆慲

---

## 12. Use of Generative AI and Reflection

The brief permits GenAI at **Level 2 - Purpose-Specific**, which means it may be
used for named, bounded purposes as long as the use is declared and the student
remains responsible for the work. This section declares exactly how it was used.
It is deliberately written as evidence rather than as a summary "shopping list",
so the real conversations are attached as screenshots.

### 12.1 Required declaration

> I acknowledge that I have used GenAI tools to complete this assessment. I used
> ChatGPT/Codex to brainstorm design options, to review my validation and SQL
> rules against the assessment brief, to explain framework concepts, and to
> improve the wording of my report and README within the parameters outlined in
> the Assessment Brief and by the Unit Assessor.

### 12.2 How GenAI was used, and how it was not

| Used for | Not used for |
| --- | --- |
| Brainstorming options (filter structure, empty states, accessibility, folder layout) before writing any code | Generating the finished project in one pass and submitting it unchanged |
| Explaining concepts so the design decisions could be understood and defended in the video | Copying code that could not be explained or tested |
| Reviewing my own rules for gaps (for example, "should a free event be able to have a price?") | Deciding what the requirements were - those come from the assessment brief |
| Improving the clarity of the report, README and code comments | Inventing evidence, test results or screenshots |

Every file in the project is read, run and understood by the author, and the
conversations used to reach each decision are attached so the marker can judge
the work directly.

### 12.3 The prompts used, and the outcome of each

**Prompt 1 - "What are some possible ways to structure a search filter for date,
location and category?"**
The AI listed three approaches: a single free-text box, separate filter fields,
and a facet list with counts. It also suggested putting the filters in the URL so
a search can be shared. Adopted: separate typed fields (date, location,
category) because that is what the brief describes, **plus** the URL-sync idea,
which was implemented so a filtered search can be bookmarked. Rejected: facet
counts, because they would need an extra aggregate query for little benefit at
this size.

**Prompt 2 - "Can you suggest some ideas for how to present fundraising
progress on an event detail page?"**
The AI suggested a progress bar, a percentage, "raised of goal", and a note when
the goal is met. Adopted: a progress bar with the raised amount, the goal and the
percentage, because it communicates progress at a glance and is easy to make
accessible with `role="progressbar"` and `aria-valuenow`. Rejected: animated
counters, because they add motion with no extra information and are harder to
make accessible.

**Prompt 3 - "What are some common accessibility features I should consider for a
charity website?"**
The AI produced a long list including colour contrast, labels, focus styles,
`aria-live` regions, skip links and meaningful link text. Adopted: real `<label>`
elements tied to inputs, a visible focus outline, `aria-live` on the notice and
result-count areas so screen readers announce updates, meaningful image
alternatives and a colour contrast check on the main palette. Not implemented
(all listed honestly rather than silently dropped): a full skip-to-content link
and a formal WCAG audit with a tool.**Prompt 4 - "Can you brainstorm possible folder structures for a Node/Express
project?"**
The AI offered a flat layout, a "routes + models" layout, and a layered
"routes / services / utils" layout. Adopted: the layered layout, because it keeps
the SQL in one place (`services/`) and the rules in another (`utils/validation.js`),
which is what made it possible to test the query builder and the validators on
their own. Rejected: putting SQL directly in the routes, because it mixes
concerns and is much harder to test.

**Prompt 5 - "What are some good UX patterns for showing empty search results?"**
The AI suggested a friendly message, a suggestion to widen the filters, a "clear
filters" action, and showing popular events instead of nothing. Adopted: a clear
message plus a "clear filters" button, because it keeps the user in control
without hiding why the list is empty. Rejected: silently showing unrelated events,
because that is confusing - an empty result is real information.

**Prompt 6 - "Can you suggest ideas for how to mark an event as past or upcoming
based on the current date?"**
The AI suggested computing the status on the server, computing it in the
browser, and storing a status column. Adopted: compute "upcoming / past" **on the
server** from `end_datetime`, so the rule lives in one place and every client
agrees. Rejected: a stored status column, because it would go stale the moment
the date passes unless a scheduled job updated it.

**Prompt 7 - "What are some things to consider when designing a responsive event
card?"**
The AI recommended a consistent image ratio, a flexible layout that collapses to
one column, readable type sizes, and not relying on hover for information.
Adopted: all four - cards use a fixed image ratio, a CSS grid that drops to one
column on narrow screens, a readable base font size, and no information is
available only on hover. Rejected: a fixed pixel width, which is the classic
cause of horizontal scrolling on phones.

### 12.4 Reflection

Working with GenAI was most useful as a **questioning tool** rather than an
answering one. The suggestions above were starting points; each one still had to
be measured against the assessment brief, and several were rejected for good
reasons (the stale status column, the hidden filter counts, the animated
counters). The areas where the AI was least reliable were the ones where it had
to know *this* project: which endpoint names existed, which column held the end
date, and what the existing Assessment 2 code already did. In those cases the
code and the database schema were the source of truth, not the conversation.

**Figure 19 - A real GenAI conversation used during design.**
`銆怚NSERT SCREENSHOT: one of the prompts above, with the AI response銆慲
**Figure 20 - A second GenAI conversation.**
`銆怚NSERT SCREENSHOT: another prompt, showing how the suggestion was adapted銆慲

---

## 13. Teamwork and Individual Contribution

Teamwork is worth 15% of this assessment, so this section states who did what.
The Peer Evaluation form is submitted separately by email, as the brief requires.

| Team member | Repository evidence | Recorded contribution |
| --- | --- | --- |
| Zhiming Wei | Multiple verified implementation/documentation commits under `2364041912@qq.com` | Database, API, both web clients, weather integration, tests, deployment, report and video |
| Zhen Zhou | Two repository-access commits under `zresettingz4@qq.com` | Created and removed `test.txt` during the repository access check; no source-code contribution is claimed here |

### 13.1 Individual contribution statement (Zhiming Wei)

I was responsible for the end-to-end technical delivery of the submission.

| Area | Weight | Contribution |
| --- | --- | --- |
| Database | 5% | Designed the `registrations` table, added venue coordinates, and rebuilt `schema.sql` so one import creates the database, tables and low-privilege application account. |
| API | 10% | Built the Express server and resource routers, including event CRUD, registration validation, parameterised SQL, the 409 delete guard and the weather proxy; wrote 29 automated tests. |
| Public website | 30% | Built the Angular registration page and the "who has registered" table, while retaining the Assessment 2 pages under the new visual language. |
| Admin console | 30% | Built the status-aware dashboard, create/update forms, blocked-delete feedback, category manager and shared navigation shell. |
| Concept understanding | 10% | Wrote the code comments, README, report and video script, and recorded the walkthrough. |
| External API | Optional | Added Open-Meteo weather with coordinate lookup, ten-minute caching, timeouts and WMO code translation. |

### 13.2 Working together

The GitHub history records two collaborator accounts. All substantive application commits belong to Zhiming Wei; Zhen Zhou's recorded changes are limited to the repository-access test described above. Commit volume is not treated as a substitute for individual engagement: the confidential Peer Evaluation form is the authoritative place for each member's contribution and teamwork rating.

The API contract - the event JSON shape and endpoint names - was fixed early, and both clients use one service file, so a contract change can be checked from either client without duplicated request logic.

---

## Appendix A - GitHub Repository and Commit History

The project is published as a GitHub repository with a progressive commit
history, so the development can be seen step by step rather than as one upload.

| Item | Value |
| --- | --- |
| Repository | `銆怚NSERT GITHUB URL銆慲 |
| Branch | `main` |
| Visibility | Private, with the marker added as a collaborator (or public if the marker prefers a plain link) |

Paste the output of the command below into the block that follows, so the
incremental history is visible in the report itself:

```powershell
git log --oneline --reverse
```

```
銆怭ASTE THE COMMIT LIST HERE銆?```

## Appendix B - How to Run the Project

This appendix is deliberately identical to the project `README.md`, so the
marker cannot be misled by two versions of the same instructions.

### Prerequisites

1. **Node.js 18.18 or newer** - <https://nodejs.org> (LTS installer, default
   options). Verify with `node -v` and `npm -v`.
2. **MySQL Server 8.0 or newer** - <https://dev.mysql.com/downloads/mysql/>.
   Keep the default port **3306** and remember the **root** password.
3. A modern browser (Edge, Chrome or Firefox).

> Every command below is typed into a **terminal** (on Windows: PowerShell or the
> VS Code terminal), except the ones marked **"MySQL command line"**, which are
> typed into the `mysql` client.

### Step 1 - Make sure MySQL is running

Windows: press `Win + R`, type `services.msc` and check that `MySQL80` shows
**Running**. If not, right-click it and choose **Start**.

### Step 2 - Create the database, tables and sample data

Open a terminal, move into the project's database folder and run the two files,
**schema first, then seed**:

```powershell
cd <path-to-project>\api\database
mysql -u root -p -e "SOURCE schema.sql;"
mysql -u root -p -e "SOURCE seed.sql;"
```

If `mysql` is not recognised, use the full path instead:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SOURCE schema.sql;"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SOURCE seed.sql;"
```

Enter the **root** password when prompted. No output means success.

Verify (optional) - expected `events = 12`, `registrations = 16`:

```powershell
mysql -u root -p -e "USE charityevents_db; SELECT COUNT(*) AS events FROM events; SELECT COUNT(*) AS registrations FROM registrations;"
```

### Step 3 - Start the API (port 3000)

In a new terminal:

```powershell
cd <path-to-project>\api
npm install
npm start
```

The first run copies `.env.example` to `.env` automatically. You should see
`Charity Events API listening on http://localhost:3000`. Leave the window open.

### Step 4 - Start the public website (port 4200)

In a second terminal (leave the API running):

```powershell
cd <path-to-project>\clientside
npm install
npm start
```

### Step 5 - Start the admin console (port 4300)

In a third terminal:

```powershell
cd <path-to-project>\adminside
npm install
npm start
```

Always start the **API first**, then the public site, then the console.

### Step 6 - Check that everything works

| Address | What you should see |
| --- | --- |
| http://localhost:3000/api | JSON list of every endpoint |
| http://localhost:4200 | Home page with featured upcoming events and fundraising progress |
| http://localhost:4200/search | Search page with date, location and category filters |
| http://localhost:4200/events/1 | Event detail page, plus the "Who has registered" table sorted by the latest purchase date |
| http://localhost:4200/register?eventId=1 | Registration page with the event pre-selected and a validated form |
| http://localhost:4300 | Admin dashboard listing every event of every status |
| http://localhost:4300/events/new | Create-event form with full client-side validation |
| http://localhost:4300/events/1/edit | Edit form, showing the registrations attached to that event |
| http://localhost:4300/categories | Category manager (create, edit, deactivate) |

### Step 7 - Run the automated tests (optional)

```powershell
cd <path-to-project>\api
npm test
```

All 29 tests must pass. See section 11 for what they cover.

### Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Unable to connect to MySQL` or `Access denied for user 'charity_app'` | The database was not imported, or an older `schema.sql` was used | Re-run **both** files from Step 2 (schema, then seed) |
| `EADDRINUSE: address already in use :::3000` | A previous API window is still open | Close it, or run `$env:PORT=3001; npm start` |
| `mysql` is not recognised | The MySQL `bin` folder is not on `PATH` | Use the full path from Step 2 |
| Pages load but tables are empty | The API is not running, or CORS rejected the origin | Check <http://localhost:3000/api/health> returns `{"data":{"status":"ok",...}}` |

---

## Appendix C - Framework Compliance Statement

The unit assessor's instruction for this assessment was:

> "For Web Dev 2 Assignment 2/3, you are NOT allowed to use any frameworks for
> CSS or JavaScript. You may use the Express framework to build the server side
> script, that's all. Do not use any Templating provided by Express, which uses
> EJS files and not the proper HTML and JS. Your webpages must be delivered using
> only HTML, CSS and JS. NO other Frameworks or templating is permitted."

The table below states how the delivered project meets each part of that rule.

| Rule | How this project complies |
| --- | --- |
| No CSS framework | There is no Bootstrap, Tailwind, Bulma, Material or any other CSS library. All styling is hand-written CSS in the component stylesheets and the global stylesheet. |
| No JavaScript framework beyond the permitted one | The only framework used is **Angular**, which the unit assessor explicitly permits (and rewards with extra marks). There is no React, Vue, jQuery, Lodash or other library. |
| Express on the server side only | Express is used purely as the HTTP server for the REST API. It is never used to render a page. |
| No server-side templating / no EJS | The API is a pure JSON service. `app.js` sets no view engine, and there is not a single `.ejs`, `.pug`, `.hbs` or `.handlebars` file in the project. `res.json()` is the only response helper used for data. |
| Pages delivered as HTML, CSS and JS | Both websites are ordinary web pages: HTML templates in each component's `.html` file, CSS in `.css` files, and JavaScript compiled from TypeScript. Even the Angular pages are served to the browser as plain HTML, CSS and JavaScript files after `ng build`. |
| HTML is real HTML, not templates | Angular component templates are standard HTML that the browser receives as HTML after compilation. They are never evaluated on the server. |

## Appendix D - Screenshot Index

The figures referenced throughout the report are listed here so they can be
inserted in order. Each `銆怚NSERT SCREENSHOT銆慲 marker above corresponds to one
row.

| Figure | Where it goes | What to capture |
| --- | --- | --- |
| 1 | Section 3 | The three applications running side by side |
| 2-4 | Section 4 | Home page, search page with filters, validation message |
| 5-6 | Section 5 | ERD, and the `registrations` table in MySQL |
| 7-8 | Section 6 | API discovery page, and the SQL inside `events.js` |
| 9-10 | Section 7 | Event detail with the registrations table, and the register page |
| 11-15 | Section 8 | Admin dashboard, create form, edit form, delete-blocked notice, categories |
| 16 | Section 9 | The weather panel on an event page |
| 17 | Section 10 | The deployed website address bar |
| 18 | Section 11 | `npm test` output, 29 passing |
| 19-20 | Section 12 | Real GenAI conversations |
| 21 | Section 13 | Team collaboration evidence |

## References

1. Australian Government. *Privacy Act 1988* and the Australian Privacy
   Principles - the reason only an attendee's name, email and optional phone
   number are collected on the registration form.
2. W3C. *Web Content Accessibility Guidelines (WCAG) 2.2* -
   <https://www.w3.org/TR/WCAG22/> - used as the checklist for labels, focus
   styles, contrast and live regions.
3. WMO. *Weather interpretation codes* - the numeric codes returned by
   Open-Meteo and translated by `weatherService.js`.
4. Open-Meteo. *Free Weather API* - <https://open-meteo.com> - no API key, no
   registration.
5. Angular. *Angular documentation* - <https://angular.dev> - components, the
   router, reactive forms and HTTP.
6. Express. *Express 4.x documentation* - <https://expressjs.com> - routing and
   middleware.
7. MySQL. *MySQL 8.0 Reference Manual* - <https://dev.mysql.com/doc/> - DDL,
   foreign keys, unique keys and user grants.
