'use strict';

/**
 * @file Process entry point for the charity events API.
 *
 * Starting the server does three things:
 *   1. loads `api/.env` (creating it from `.env.example` on first run);
 *   2. proves the MySQL pool can reach the database with a throw-away
 *      `SELECT 1`, so a misconfigured database fails loudly and immediately
 *      instead of on the first browser request;
 *   3. opens the HTTP port and installs a graceful shutdown handler.
 *
 * Nothing in this file knows about the charity domain - all routing lives in
 * `src/app.js` and all business rules live in `src/services/*`.
 */

require('./src/config/loadEnv');

const app = require('./src/app');
const env = require('./src/config/env');
const db = require('./event_db');

/**
 * Boots the API and wires up graceful shutdown.
 *
 * @returns {Promise<void>} Resolves once the port is open.
 */
async function start() {
  try {
    await db.query('SELECT 1');

    const server = app.listen(env.port, () => {
      console.log(`Charity Events API listening on http://localhost:${env.port}`);
      console.log(`Discovery endpoint: http://localhost:${env.port}/api`);
    });

    /**
     * Closes the HTTP server and the MySQL pool before exiting.
     *
     * @param {string} signal Name of the received signal.
     * @returns {Promise<void>}
     */
    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing API server.`);
      server.close(async () => {
        await db.end();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Unable to connect to MySQL.');
    console.error(`Reason: ${error.message}`);
    console.error('');
    console.error('The connection settings come from api/.env (created automatically');
    console.error('from api/.env.example on the first run). To fix this:');
    console.error('  1. Start MySQL, then import the database as an administrative user:');
    console.error('       mysql -u root -p -e "SOURCE api/database/schema.sql;"');
    console.error('       mysql -u root -p -e "SOURCE api/database/seed.sql;"');
    console.error('     The schema file creates the charity_app account the API expects');
    console.error('     (SELECT, INSERT, UPDATE, DELETE on charityevents_db).');
    console.error('  2. Or set DB_USER and DB_PASSWORD in api/.env to your own MySQL login.');
    console.error('  3. If you already imported the schema, check that MySQL is running on');
    console.error('     the host and port in api/.env.');
    process.exit(1);
  }
}

start();
