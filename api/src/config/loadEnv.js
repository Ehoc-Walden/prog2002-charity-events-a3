'use strict';

/**
 * Loads api/.env before any other module reads process.env.
 *
 * api/.env is deliberately ignored by Git, so a freshly downloaded copy does
 * not contain one. To keep the project runnable with no manual setup step,
 * this module copies api/.env.example to api/.env the first time the API
 * starts, then loads the result.
 *
 * The path is resolved from this file rather than from process.cwd(), so the
 * API behaves the same whether it is started from api/ or from the project
 * root.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const apiRoot = path.resolve(__dirname, '..', '..');
const envPath = path.join(apiRoot, '.env');
const examplePath = path.join(apiRoot, '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('Created api/.env from api/.env.example (first run).');
}

dotenv.config({ path: envPath });

module.exports = { apiRoot, envPath, examplePath };
