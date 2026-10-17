# PROG2002 Assessment 3 - Demo Video Script (English)

**Student:** Zhiming Wei (24832847) | **Hard limit: 15 minutes** | Target: 13-14 minutes

This script follows the three guiding questions in the Assessment 3 brief:
(1) database and API architecture, (2) data flow between the API and the
website, (3) live demonstration of the website functionality.

---

## 0. Before you press record

1. Start the three services and leave the windows open and visible:
   * API on <http://localhost:3000> (`cd api` then `npm start`)
   * Public site on <http://localhost:4200> (`cd clientside` then `npm start`)
   * Admin console on <http://localhost:4300> (`cd adminside` then `npm start`)
2. Pre-open these browser tabs, in this order, so you never hunt for a page:
   `localhost:3000/api`, `localhost:4200`, `localhost:4200/search`,
   `localhost:4200/events/1`, `localhost:4200/register?eventId=1`,
   `localhost:4300`, `localhost:4300/events/new`, `localhost:4300/events/5/edit`,
   `localhost:4300/categories`.
3. Open VS Code with these files, in tabs, so you can switch instantly:
   `api/database/schema.sql`, `api/src/routes/events.js`,
   `api/src/utils/validation.js`, `api/src/utils/eventSql.js`,
   `api/src/services/registrationService.js`,
   `clientside/src/app/core/api.service.ts`,
   `clientside/src/app/pages/register/register-page.ts`,
   `clientside/src/app/pages/event-detail/event-detail-page.html`,
   `adminside/src/app/pages/event-form/event-form-page.ts`.
4. Open a MySQL client showing `charityevents_db` (the `registrations` table
   helps in segment 3).
5. Turn off notifications, close chat apps, set the screen recorder to record
   the **whole screen** at 1080p.

---

## 1. Opening - who I am and what I built (0:00 - 1:10)

**Show on screen:** the GitHub repository page, then the three terminals.

> "Hello, my name is Zhiming Wei, student ID 24832847. This is my Assessment 3
> submission for PROG2002 Web Development II.
>
> The case study is the Common Ground Collective charity events website. For
> Assessment 3 I extended the client website from Assessment 2, I built a
> completely new admin website, and I upgraded the Node.js and Express API from
> read-only to full CRUD, including a new registration feature.
>
> The system has three parts that all run at the same time. The API on port 3000
> talks to MySQL and returns JSON. The public website on port 4200 is what a
> visitor uses. The admin console on port 4300 is what a staff member uses. Both
> websites are Angular 22 applications built with TypeScript, and they contain
> no business logic of their own - every piece of data comes from the API."
---

## 2. Database and API architecture (1:10 - 4:30) - ULO3

**Show on screen:** `api/database/schema.sql`, scrolling slowly from the top.

> "Let me start with the database, because everything else is built on it.
>
> The schema file is divided into two parts. The first part is the Assessment 2
> model that I kept: organisations, categories, venues, events and
> event highlights. An organisation runs many events, a category groups many
> events, and a venue hosts many events, so those are one-to-many relationships.
> An event has many highlight bullet points, which is a child table with a
> composite primary key of the event and the display order.
>
> The second part is new in Assessment 3: the registrations table. This is the
> table that answers the question 'who registered for which event'.
>
> I designed it like this. The primary key is a surrogate auto-increment
> `registration_id`, because a booking reference is something a human reads, not
> something the database should key on. It keeps the attendee's first name, last
> name, email and phone, the `ticket_quantity`, the `registration_date`, an
> optional note and a status of confirmed or cancelled.
>
> The crucial column is `event_id`, which is a foreign key to the events table
> with ON DELETE RESTRICT. That gives me two guarantees. First, the relationship
> is one event to many registrations. Second, an event that already has
> registrations can never be deleted by accident, not even by a direct SQL
> statement.
>
> The business rule from the brief - one person may register for many events but
> only once per event - is enforced by a unique key on the pair
> `event_id` plus `attendee_email`. If somebody tries to register twice for the
> same event with the same email, MySQL itself rejects it, and the API turns that
> into a friendly 409 message instead of a crash.
>
> There is also an index on `event_id` and `registration_date`, because the
> event detail page always asks for the registrations of one event sorted by the
> newest purchase date, and this index makes that query a straight index scan.
>
> Finally, at the bottom of the file, the application account is created. In
> Assessment 2 the API only read data, so the account only had SELECT. Now that
> the API creates, updates and deletes, the account is granted SELECT, INSERT,
> UPDATE and DELETE - but deliberately no CREATE, ALTER or DROP and no GRANT
> OPTION, so the application can never change its own structure."

**Show on screen:** `api/src/app.js`.

> "The Express application is deliberately thin. It sets security headers with
> Helmet, allows CORS from the two development origins, raises the JSON body
> limit, and then mounts one router per resource. Notice that there is no view
> engine and no template rendering anywhere. This is a pure JSON service, which
> is exactly what the brief asks for."

**Show on screen:** `api/src/routes/events.js`, then `registrations.js`.

> "Every route file follows the same three-step pattern: validate the input,
> call the service, and send the response. The service layer is the only place
> that talks to MySQL, so a route file never contains a SQL string. Here you can
> see the delete route - it calls the service, the service checks whether the
> event still has registrations, and if it does, it throws a 409 Conflict with a
> message that explains why the delete was blocked."

**Show on screen:** browser at `localhost:3000/api`, then
`localhost:3000/api/events/search?location=Newcastle&sort=date`.

> "The API is self-documenting. If you open `/api` you get the full list of
> endpoints. And here is the search endpoint being tested straight in the
> browser - this is the same endpoint the search page uses."
---

## 3. Data flow - from a click to the screen (4:30 - 7:30) - ULO1

**Show on screen:** `clientside/src/app/core/api.service.ts`, then
`clientside/src/app/pages/register/register-page.ts`.

> "Now the second question: the data flow. I will follow one action all the way
> through the system - a visitor registering for an event.
>
> The visitor opens the event detail page and presses 'Register for this event'.
> The button is a router link that carries the event id in the query string, so
> the registration page reads `eventId` from the URL, exactly as the brief
> suggests. That page immediately calls the API to fetch the event, so the
> summary on the registration page is always the current data, never a copy.
>
> When the visitor fills in the form and presses Confirm, the page does not send
> anything yet. First it runs its own validation. It checks the first name,
> last name, email format, phone, the number of tickets, and it even compares
> the requested number of tickets with the remaining capacity of the event. If
> something is wrong, the field is marked and focused, and no network request is
> made at all. That is the same 'validate before you send' pattern used
> everywhere in this project.
>
> If the form is valid, the page calls the shared API service. That service is a
> single Angular service that every page uses - this is the one place where the
> API base address is configured, so changing the deployed address means
> changing one constant."

**Show on screen:** `api/src/utils/validation.js`, the registration section.

> "On the server the request is validated all over again, because a browser can
> never be trusted. The validation module holds every rule: the email pattern,
> the phone pattern, the ticket range of 1 to 100, and the name lengths. Then
> the service checks the remaining capacity in SQL before inserting."

**Show on screen:** `api/src/services/registrationService.js`.

> "The insert itself is a parameterised statement. The reference code, the
> attendee details and the ticket quantity are passed as placeholders - they are
> never concatenated into the SQL string. That is what protects the application
> against SQL injection, and you can see the same style in the event query
> builder where the search filters are assembled as an array of conditions and
> an array of values."

**Show on screen:** `clientside/src/app/pages/event-detail/event-detail-page.html`
around the registrations table.

> "When the response comes back, the page shows the confirmation and then
> follows the navigation the brief asks for - it takes the visitor to the event
> page so they can see their own booking appear in the list.
>
> And this is the other Assessment 3 addition on the event page: the
> registrations table. Notice three things. The data comes from a separate
> endpoint, `GET /api/events/:id/registrations`, sorted by the latest purchase
> date on the server side. It is rendered with Angular's `@for` block over the
> rows, so nothing is built with innerHTML. And the table is a real HTML table
> with a caption for screen readers, not a grid of divs."

**Show on screen:** the event detail page in the browser with the table visible.

> "So a complete round trip is: a click in the browser, a validated request,
> a parameterised SQL query, a JSON response, and then DOM elements that Angular
> builds from that data. At no point is any content hard-coded in the page."
---

## 4. Live demo - public website (7:30 - 11:30) - ULO3

**Show on screen:** `localhost:4200` (home page).

> "Let me demonstrate the public website. The home page shows the featured
> upcoming events and, for each one, the fundraising progress bar calculated
> from the raised amount against the goal, plus the weather forecast for the
> venue, which comes from the optional Open-Meteo external API through my own
> `/api/weather` proxy."

**Show on screen:** `localhost:4200/search`. Perform the search slowly.

> "This is the search page. I will filter by location, category and date range,
> and sort by date. Watch the URL - the filters are written into the query
> string, so this exact search can be bookmarked or shared with somebody else.
>
> Let me also show the validation. If I enter a date range that is incomplete,
> or I choose 'Upcoming' but set the date range in the past, the page stops me
> with a message next to the field and never sends the request. That is the
> same rule the API enforces, checked twice - once in the browser for a good
> experience, once on the server for security."

**Show on screen:** clear the filters to produce an empty result, or type a
suburb that has no events.

> "Here is the empty result state. Instead of showing a blank page, it explains
> what happened and offers a way back to all events, which is the UX pattern I
> chose for 'no matches'."

**Show on screen:** `localhost:4200/events/1`.

> "This is the event detail page. It shows the description, the highlight
> bullets, the venue, the ticket price and the registration table sorted by the
> newest purchase date. Because the event is still open, the Register button is
> enabled."

**Show on screen:** press Register, then complete the registration form on
`/register?eventId=1`.

> "I will register for this event now. Note the event summary at the top comes
> from the API, the ticket quantity is validated against the remaining capacity,
> and the Confirm button is disabled while the request is in flight so I cannot
> submit twice.
>
> There is the confirmation with my booking reference. Now, if I go back to the
> event detail page and refresh, my registration is at the top of the list,
> because the newest purchase date sorts first."

**Show on screen:** refresh `/events/1` and highlight the new top row.

> "That proves the whole chain: browser, API, MySQL, and back to the browser."

---

## 5. Live demo - admin console (11:30 - 13:45) - ULO3

**Show on screen:** `localhost:4300` (admin dashboard).

> "Now the admin console. The dashboard lists every event regardless of status -
> active, past and suspended - which is what the brief requires. The status
> chips and the totals are all computed from the API response. Notice the
> navigation bar is present on every page of this site, as required."

**Show on screen:** `localhost:4300/events/new`. Submit with a blank required
field first, then fill it in properly.

> "This is the create form. I will try to save it with the title missing - the
> form refuses and focuses the first invalid field, without calling the API.
> Now I fill everything in and save. The event is created through
> `POST /api/events` and I am taken back to the list."

**Show on screen:** open an event that already has registrations in the edit
form, e.g. `localhost:4300/events/5/edit`.

> "This is the update form. Below the fields it also shows the registrations
> that belong to this event, so a staff member can see the impact before
> changing anything. I will change the status to Suspended and save."

**Show on screen:** back on the dashboard, press Delete on the event that has
registrations.

> "Now the delete feature. This event has registrations, so watch what happens
> when I press Delete. The API returns 409 Conflict and the console shows a
> clear explanation: the event cannot be deleted while registrations exist,
> because the foreign key uses ON DELETE RESTRICT. That is the safe behaviour -
> I would not want to silently lose booking records.
>
> If I now try to delete an event that has no registrations, it succeeds and the
> row disappears from the list."

**Show on screen:** `localhost:4300/categories`.

> "Finally the category manager. It has the same pattern: create, edit,
> deactivate. Deactivating a category hides it from the public filter list but
> keeps the events that use it intact."
---

## 6. Concept understanding, GenAI use and teamwork (13:45 - 14:30) - ULO2

**Show on screen:** the GitHub commit history, then the GenAI chat log
screenshots in the report.

> "A few closing points on how I worked.
>
> First, the repository. I committed progressively rather than in one block at
> the end - you can see the commits for the database design, for the API routes,
> for the client pages, for the admin console, and for the documentation. Each
> commit message says what changed and why, which is how the brief asks me to
> demonstrate my work progress.
>
> Second, the use of GenAI. I declare it openly. I used ChatGPT and Codex as a
> study and review tool. The prompt log is attached to my report and shows what
> I asked: how to structure a search filter, how to present fundraising
> progress, accessibility features for a charity site, folder structures for a
> Node and Express project, UX patterns for empty search results, how to mark an
> event as past or upcoming, and how to design a responsive event card. In every
> case I took the ideas, chose between them, and then wrote and tested the code
> myself. The declaration required by the brief is included in my report.
>
> Third, the automated tests. The API ships with a Node test suite covering the
> query builder, the validation rules and the weather service, and all of them
> pass.
>
> And finally, my own contribution to the team. I designed and implemented the
> database changes, the whole API layer, the admin console, and the
> registration and event detail pages on the client side, and I deployed both
> websites to my own SCU cPanel account."

**Show on screen:** the deployed cPanel URLs.

> "Both websites are live on the SCU cPanel server, and the addresses are in my
> report and in the README.
>
> That is the end of my demonstration. Thank you for watching."

---

## 7. Recording checklist - do not forget these

- [ ] Say your **name and student ID** at the start.
- [ ] Show the **database schema file** and explain the `registrations` table
      and its foreign key.
- [ ] Show **Express route code** and the **validation** code.
- [ ] Show at least one **API endpoint being tested** in the browser or Postman.
- [ ] Demonstrate **home, search and event detail** on the public site.
- [ ] Demonstrate **registration**: form, validation, confirmation, and the
      new row appearing in the event's registration list.
- [ ] Demonstrate **all four admin features**: list, create, update (with
      registrations), delete (including the blocked case).
- [ ] Show that the **navigation menu is on every admin page**.
- [ ] Show the **GitHub commit history**.
- [ ] Show the **GenAI prompt log** and read the declaration.
- [ ] Keep it under **15 minutes**.
- [ ] Upload to **SCU OneDrive** and create a share link for the submission.

## 8. If something breaks while recording

| Problem | Quick fix |
| --- | --- |
| Page shows "cannot reach API" | Check the API terminal is still running on port 3000 |
| Empty tables | The API restarted and lost the MySQL connection - restart `npm start` in `api` |
| Port already in use | Close the old terminal window for that port |
| You go over time | Cut segment 6 short; the demo in segments 4 and 5 matters most |