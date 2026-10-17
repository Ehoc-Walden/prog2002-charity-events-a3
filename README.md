# PROG2002 Assessment 3 - Charity Events (Common Ground Collective)

**Student:** Zhiming Wei
**Student ID:** 24832847
**Unit:** PROG2002 Web Development II - Assessment 3
**GitHub repository:** https://github.com/Ehoc-Walden/prog2002-charity-events-a3
**Demo video (SCU OneDrive):** <PASTE ONEDRIVE LINK HERE>

This repository contains the complete Assessment 3 solution for the *Common
Ground Collective* charity event case study. It is made of three parts that run
side by side:

| Folder | What it is | Technology | Default address |
| --- | --- | --- | --- |
| `clientside/` | Public website for visitors: home, event search, event detail and the **new registration page** | Angular 22 + TypeScript + CSS | http://localhost:4200 |
| `adminside/` | Staff console: dashboard, create event, edit event (with the event registrations), delete event, category manager | Angular 22 + TypeScript + CSS | http://localhost:4300 |
| `api/` | REST API + MySQL schema and seed data, including the Open-Meteo weather proxy | Node.js 18+ / Express 4 / mysql2 | http://localhost:3000 |

Both websites get **all** of their data through the API. Nothing is hard-coded
in the pages, so a change saved in the admin console is visible on the public
site after a refresh.

## Supporting documentation

| Document | What it covers |
| --- | --- |
| `docs/API_REFERENCE.md` | Endpoint list, response envelopes and error codes |
| `docs/TROUBLESHOOTING.md` | MySQL, ports, `.env`, CORS and cross-machine setup problems |
| `docs/TEST_EVIDENCE.md` | Verified test results, responsive sweep and final seed counts |
| `docs/SECURITY_AND_DATA.md` | Parameterised SQL, validation, secrets and relational integrity |
| `docs/DEVELOPMENT_WORKFLOW.md` | Team clone, commit, pull and review workflow |

---

## 1. What you need first

Install these two programs before you start. Both are free.

1. **Node.js 18.18 or newer** - <https://nodejs.org> (LTS installer).
   Use the default options. This also installs `npm`.
   Check it worked by opening a terminal and running `node -v` (for example
   `v22.23.2`) and `npm -v` (for example `10.9.8`).
2. **MySQL Server 8.0 or newer** - <https://dev.mysql.com/downloads/mysql/>.
   During setup, keep the default port **3306** and write down the **root
   password** you choose; every database command below asks for it.

You also need a modern browser (Edge, Chrome or Firefox).

> **Where do I type these commands?**
> Every command in this README is typed into a **terminal** (on Windows:
> PowerShell or the VS Code terminal), *except* the ones marked
> **"MySQL command line"**. The MySQL command line is the `mysql` client.

---

## 2. Step 1 - Make sure MySQL is running

Windows: open **Services** (`Win + R`, type `services.msc`) and check that
`MySQL80` (or `MySQL`) shows the status **Running**. If it does not, right-click
it and choose **Start**.

macOS/Linux: `brew services start mysql`, or `sudo systemctl start mysql`.
---

## 3. Step 2 - Create the database, tables and sample data

Open a terminal. Move into the `api/database` folder of this project and run the
two files there, **schema first, then seed**:

```powershell
cd <path-to-project>\api\database

# Windows, if the MySQL bin folder is on your PATH:
mysql -u root -p -e "SOURCE schema.sql;"
mysql -u root -p -e "SOURCE seed.sql;"
```

If `mysql` is not recognised, use the full path to the client instead. On
Windows with a default MySQL 8.0 install:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SOURCE schema.sql;"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SOURCE seed.sql;"
```

Enter the **root** password when prompted. No output means success.

`schema.sql` does four things:

* creates the `charityevents_db` database;
* creates all tables, including the **new `registrations` table** added in
  Assessment 3;
* creates the low-privilege application account `charity_app` (password
  `change_me`) that only has `SELECT, INSERT, UPDATE, DELETE` - no DDL and no
  `GRANT OPTION`;
* adds the `latitude`/`longitude` columns to `venues` so the weather API works.

`seed.sql` inserts the demonstration data: 4 organisations, 8 categories,
10 venues, 12 events, 33 event highlights and **16 sample registrations** spread
across several events, so every screen - including the "delete is blocked"
message - has something to show.

### Verify the import (optional)

```powershell
mysql -u root -p -e "USE charityevents_db; SELECT COUNT(*) AS events FROM events; SELECT COUNT(*) AS registrations FROM registrations;"
```

Expected: `events = 12`, `registrations = 16`.

---

## 4. Step 3 - Start the API (port 3000)

In a **new** terminal window:

```powershell
cd <path-to-project>\api
npm install
npm start
```

On the first run the API copies `api/.env.example` to `api/.env` automatically,
so there is no configuration step. You should see:

```
Created api/.env from api/.env.example (first run).
Charity Events API listening on http://localhost:3000
Discovery endpoint: http://localhost:3000/api
```

Leave this window open. Open <http://localhost:3000/api> in a browser to see the
self-documenting list of every endpoint.

If instead you see `Unable to connect to MySQL`, go to section 8
(Troubleshooting).
---

## 5. Step 4 - Start the public website (port 4200)

Open a **second** terminal window (leave the API running):

```powershell
cd <path-to-project>\clientside
npm install
npm start
```

Wait until it prints `Local: http://localhost:4200/`, then open that address.

---

## 6. Step 5 - Start the admin console (port 4300)

Open a **third** terminal window:

```powershell
cd <path-to-project>\adminside
npm install
npm start
```

Wait until it prints `Local: http://localhost:4300/`, then open that address.

You now have all three parts running at the same time. **Every time you want to
use the project, start the API, then the public site, then the admin console -
in that order.**

---

## 7. Step 6 - Check that everything works

| Address | What you should see | How to prove the data is live |
| --- | --- | --- |
| http://localhost:3000/api | JSON list of all endpoints | - |
| http://localhost:4200 | Home page with featured upcoming events and fundraising progress | - |
| http://localhost:4200/search | Search page with date / location / category filters and sorting | Type a suburb in *Location* and press **Search**; the URL keeps your filters so the search can be shared |
| http://localhost:4200/events/1 | Event detail page, **plus the "Who has registered" table sorted by the latest purchase date** | The table lists the rows from the `registrations` table |
| http://localhost:4200/register?eventId=1 | Registration page: event summary, ticket quantity, validated form | Submit a registration, then refresh `/events/1` - the new row appears at the top |
| http://localhost:4300 | Admin dashboard: every event, any status, with totals | - |
| http://localhost:4300/events/new | Create-event form with full client-side validation | Save an event, then reload the public search page - it is there |
| http://localhost:4300/events/1/edit | Edit form **and the registrations attached to that event** | Change the title, save, refresh the public event page |
| http://localhost:4300/categories | Category manager (create, edit, deactivate) | Deactivate a category and see it disappear from the public filter list |
---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Unable to connect to MySQL.` / `Access denied for user 'charity_app'` | The database was never imported, or it was imported from an older version of `schema.sql` | Re-run **both** files from Step 2 (schema, then seed). They recreate the `charity_app` account with the password the API expects. |
| `Error: listen EADDRINUSE: address already in use :::3000` | Something is already using that port - usually an API window you left open | Close the old window, or start on another port: PowerShell `$env:PORT=3001; npm start` |
| `mysql` is not recognised | The MySQL `bin` folder is not on `PATH` | Use the full path shown in Step 2. |
| `npm install` fails behind a proxy | University or corporate network | Retry on another network, or set `npm config set proxy` / `npm config set https-proxy`. |
| The pages load but tables are empty | The API is not running, or CORS rejected the origin | Check the API window is alive and open <http://localhost:3000/api/health>; it must return `{"data":{"status":"ok",...}}` |
| `ng serve` prints a different port | Port 4200 / 4300 was busy | `npm start -- --port 4201` |

---

## 9. Running the automated tests

```powershell
cd <path-to-project>\api
npm test
```

This runs the Node test-runner suite that covers the parameterised query
builder, the payload validation rules and the weather service. All 29 tests must
pass.

---

## 10. Deploying to SCU cPanel

Both websites compile to static files, so they are deployed as ordinary files;
the API runs as a Node.js application.

1. **Build the two websites** (locally):

   ```powershell
   cd <path-to-project>\clientside
   npx ng build --configuration production --base-href /clientside/

   cd <path-to-project>\adminside
   npx ng build --configuration production --base-href /adminside/
   ```

   The output appears in `clientside/dist/clientside/browser/` and
   `adminside/dist/adminside/browser/`.

2. **Upload the files.** In cPanel open **File Manager**, go to `public_html`,
   create two folders, `clientside` and `adminside`, and upload the *contents*
   of each `browser/` folder into its matching folder.

3. **Make the Angular router work.** Add a `.htaccess` file inside each folder:

   ```apache
   RewriteEngine On
   RewriteBase /clientside/
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /clientside/index.html [L]
   ```

   In the second copy change both `/clientside/` values to `/adminside/`.

4. **Deploy the API.** Import `api/database/schema.sql` and
   `api/database/seed.sql` through cPanel **phpMyAdmin**, then open
   **Setup Node.js App**, create an application with application root `api` and
   start-up file `server.js`, and add `DB_HOST`, `DB_PORT`, `DB_NAME`,
   `DB_USER`, `DB_PASSWORD` and `CORS_ORIGINS` (your two cPanel site URLs) as
   environment variables.

5. **Point the websites at the deployed API.** Change `API_BASE_URL` in
   `clientside/src/app/core/api-config.ts` and
   `adminside/src/app/core/api-config.ts` to the deployed API URL, then rebuild
   and re-upload. The static fallback address for the case study is
   `https://<yourusername>.scu.edu.au/charity-api`.
---

## 11. How the code is organised

```
api/
  server.js                 process entry point (loads .env, checks MySQL, listens)
  event_db.js               the mysql2 connection pool
  src/app.js                Express app: middleware, CORS, route mounting
  src/routes/               one router per resource (events, registrations, ...)
  src/services/             business rules - the only place that talks to MySQL
  src/utils/validation.js   every payload and query rule, shared by all routes
  src/utils/eventSql.js     builds the parameterised SELECT statements
  src/utils/http.js         HttpError + asyncHandler helpers
  database/schema.sql       DDL, including the new registrations table
  database/seed.sql         demonstration data
  tests/                    Node test-runner suites (29 tests)

clientside/src/app/
  core/                     models, API service, weather service, formatting
  pages/                    home, search, event-detail, register, not-found
  shared/                   header, navigation, footer, event card

adminside/src/app/
  core/                     models, API service, event-form helper
  pages/                    dashboard, event-form, categories, not-found
  shared/                   admin header, navigation, footer
```

Every source file starts with a block comment that explains *why* the file
exists, and every exported class and function carries a TSDoc/JSDoc comment, so
the code can be read on its own.

---

## 12. GenAI acknowledgement

I acknowledge that I have used GenAI tools to complete this assessment. I used
ChatGPT/Codex to help structure the folder layout, to review my validation rules
against the assessment brief, and to improve the wording of this README within
the parameters outlined in the Assessment Brief and by the Unit Assessor.
