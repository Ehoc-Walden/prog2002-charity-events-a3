# API Reference

The API is an Express 5 JSON service. It never renders HTML and never uses a
view engine. The public website and the staff console both call the same API.

## Base URL

Local development:

```text
http://localhost:3000/api
```

The discovery endpoint at `/api` lists the routes, and `/api/health` confirms
that the service and database are available.

## Response format

Successful responses use a consistent envelope:

```json
{
  "data": {},
  "meta": {}
}
```

Errors use:

```json
{
  "error": {
    "status": 400,
    "message": "A readable explanation.",
    "details": {}
  }
}
```

`details` is only present when a validation error needs to identify individual
fields.

## Events

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/events` | Admin event list. Supports `status`, `q`, `sort`, `page` and `limit`. |
| `GET` | `/api/events/upcoming` | Published events used by the home page. Supports `limit`. |
| `GET` | `/api/events/search` | Public search. Supports `date`, `location`, `category`, `scope`, `sort`, `page` and `limit`. |
| `GET` | `/api/events/:eventId` | Event detail, highlights and registrations. Admin requests may add `includeUnpublished=1`. |
| `POST` | `/api/events` | Create an event. Returns `201 Created`. |
| `PUT` | `/api/events/:eventId` | Replace the editable fields of an event. |
| `DELETE` | `/api/events/:eventId` | Delete an event when it has no registrations. |
| `GET` | `/api/events/:eventId/registrations` | Registrations for one event, newest first. |
| `POST` | `/api/events/:eventId/registrations` | Create a public registration. Returns `201 Created`. |

A delete attempt is rejected with `409 Conflict` when registrations still
reference the event. This protects the foreign-key relationship and prevents
staff from accidentally losing booking records.

## Categories

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/categories` | Active categories used by public filters. Add `includeInactive=1` for the admin list. |
| `GET` | `/api/categories/:categoryId` | Read one category. |
| `POST` | `/api/categories` | Create a category. |
| `PUT` | `/api/categories/:categoryId` | Update a category. |
| `DELETE` | `/api/categories/:categoryId` | Delete an unused category. A category in use returns `409 Conflict`. |

## Venues, locations and organisations

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/venues` | Every venue, including coordinates for weather. |
| `GET` | `/api/venues/:venueId` | One venue. |
| `GET` | `/api/locations` | Distinct published-event suburbs used by the search filter. |
| `GET` | `/api/organisations` | Active organisations. |
| `GET` | `/api/organisations/:organisationId` | One active organisation. |

## Registrations

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/registrations` | All registrations, newest first. Supports `eventId` and `limit`. |
| `DELETE` | `/api/registrations/:registrationId` | Remove one registration. |

## Weather

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/weather?latitude=...&longitude=...` | Forecast for explicit coordinates. |
| `GET` | `/api/weather/events/:eventId` | Forecast for the venue of one event. |

The weather service uses Open-Meteo and requires no API key. If the upstream
service is unavailable, the API returns `503 Service Unavailable` while the
rest of the event page remains usable.

## Validation and SQL safety

Every path parameter, query string and JSON body is validated before the
service layer is called. SQL values are supplied through `mysql2` placeholders
(`?`); user input is never concatenated into SQL text. Invalid values produce
`400 Bad Request`, missing resources produce `404 Not Found`, and unexpected
server failures produce a safe generic `500` response.
