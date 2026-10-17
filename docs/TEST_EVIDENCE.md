# Verification and Test Evidence

Verification was performed on 17 October 2026 against the local development
build. The purpose was to confirm that the public website, staff console, API
and MySQL data work together as one system.

## Summary

| Check | Result |
| --- | --- |
| API unit and validation tests (`npm test`) | 29 / 29 passed |
| Live API CRUD smoke checks | 18 / 18 passed |
| Public and admin interaction checks | 10 / 10 passed |
| Focused search and form checks | 6 / 6 passed |
| Desktop and mobile page sweep | 144 / 144 passed |

The page sweep used desktop and mobile viewport sizes, covered both websites,
and checked for broken images, failed resource requests, uncaught browser
errors, unexpected HTTP errors and horizontal page overflow.

## Functional coverage

The following behaviour was exercised:

- home-page featured events and fundraising totals;
- event search by category, location and date;
- incomplete date and past-date validation on the public search form;
- event details and the event weather panel;
- public registration and the appearance of the new registration in MySQL;
- admin event create, read, update and delete operations;
- deletion protection for an event that still has registrations;
- category creation, update and deletion;
- API health, event, category, venue, organisation, location, registration and
  weather endpoints;
- desktop and mobile layouts for public and admin routes;
- deliberate 404 pages for missing events and unknown routes.

## Database state after testing

Temporary records created by smoke tests were removed. The final seed data was:

```text
events         = 12
categories     = 8
venues         = 10
highlights     = 33
registrations  = 16
```

## Re-running the automated tests

From the project root:

```powershell
cd api
npm test
```

A successful run ends with:

```text
# tests 29
# pass 29
# fail 0
```

The manual browser and CRUD checks require the API and both websites to be
running. Follow `README.md` for the start-up order and URLs.
