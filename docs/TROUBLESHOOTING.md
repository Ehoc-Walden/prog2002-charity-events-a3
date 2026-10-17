# Troubleshooting Guide

This guide records the setup problems that are most likely to appear when the
project is downloaded onto a new Windows computer. Run all commands from the
folder stated for that step.

## 1. The API says `Access denied for user 'charity_app'`

The `charity_app` account is created by `api/database/schema.sql`. The seed file
then supplies the demonstration records.

From the project root, run both files in this order with the MySQL administrator
account:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SOURCE C:/path/to/charity-events-a3/api/database/schema.sql;"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SOURCE C:/path/to/charity-events-a3/api/database/seed.sql;"
```

Replace `C:/path/to/charity-events-a3` with the real project path. Use forward
slashes in the `SOURCE` command.

Then confirm `api/.env` exists and uses the same database settings as
`api/.env.example`. `api/.env` is deliberately excluded from GitHub because it
contains a password.

## 2. `api/.env` is missing after cloning

Create it from the example:

```powershell
cd api
Copy-Item .env.example .env
notepad .env
```

Set `DB_PASSWORD` to the password used by the local MySQL `charity_app` user.
Do not commit `.env` to GitHub.

## 3. Port 3000 is already in use

The complete error is similar to:

```text
Error: listen EADDRINUSE: address already in use :::3000
```

Find the process using the port:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Stop the old process after checking that it is the project API:

```powershell
Stop-Process -Id <PID>
```

Alternatively, start the API on another port:

```powershell
$env:PORT=3001
npm start
```

If the port changes, the two front-end API configuration files must use the
matching address.

## 4. The front-end pages do not load

Each website must be started from its own folder:

```powershell
cd clientside
npm install
npm start
```

and, in a second terminal:

```powershell
cd adminside
npm install
npm start
```

Do not start `python -m http.server` from the repository root. That server
serves files directly from disk and does not compile the TypeScript templates,
so `/search.html` and other application routes are not present as static files.

## 5. Browser shows a CORS error

The API permits only the origins listed in `CORS_ORIGINS` inside `api/.env`.
For local development, the list must include:

```text
http://localhost:4200
http://localhost:4300
```

When a different port is used, add that exact origin and restart the API.

## 6. `npm` cannot find `ng`

Run `npm install` inside the website folder that failed. The Angular CLI is a
local dependency, and `npm start` uses that local copy.

Check the current folder before installing; `clientside`, `adminside` and `api`
have separate dependency trees.

## 7. Git reports `dubious ownership`

Windows may refuse to use a repository whose folder was created by another
account. Git prints the exact path to trust. Add only that repository:

```powershell
git config --global --add safe.directory "C:/absolute/path/to/charity-events-a3"
```

Do not disable Git ownership checks globally.

## 8. Git warns `LF will be replaced by CRLF`

This is a line-ending notice, not an application error. The repository contains
a `.gitattributes` file so text files are stored consistently across Windows
and other operating systems.

## 9. Database has no demonstration records

Run the seed file after the schema file. To verify the result:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "USE charityevents_db; SELECT COUNT(*) AS events FROM events; SELECT COUNT(*) AS categories FROM categories; SELECT COUNT(*) AS registrations FROM registrations;"
```

The supplied seed produces 12 events, 8 categories and 16 registrations.

## 10. Weather is temporarily unavailable

The weather panel depends on the external Open-Meteo service. If that service
or the internet connection is unavailable, the API returns `503` and the rest
of the event page remains usable. Retry after the connection is restored.

## Final health check

With the API running, open:

```text
http://localhost:3000/api/health
```

A healthy response contains:

```json
{
  "data": {
    "status": "ok",
    "service": "charity-events-api",
    "version": "3.0.0"
  }
}
```
