-- ===========================================================================
-- PROG2002 Assessment 3 - Charity Events database schema
-- Target: MySQL 8.0+  |  Case study: Common Ground Collective
-- Run this file FIRST (as an administrative MySQL user), then run seed.sql.
--
-- Assessment 3 change summary
-- ---------------------------------------------------------------------------
-- * NEW TABLE `registrations` - records who registered for which event. It has
--   a foreign key to `events`, so the two tables form a one-to-many
--   relationship (one event -> many registrations).
-- * The UNIQUE key `uq_registrations_event_email (event_id, attendee_email)`
--   enforces the business rule from the brief: "one user may register for
--   multiple events and can only register for an event once".
-- * The foreign key uses ON DELETE RESTRICT. Combined with the explicit check
--   in the API this guarantees data integrity: an event that already has
--   registrations can never be deleted.
-- * The `charity_app` application account is upgraded from SELECT to
--   SELECT, INSERT, UPDATE, DELETE because the API now performs full CRUD.
-- ===========================================================================

DROP DATABASE IF EXISTS charityevents_db;
CREATE DATABASE charityevents_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE charityevents_db;

CREATE TABLE organisations (
  organisation_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  tagline VARCHAR(220) NOT NULL,
  mission TEXT NOT NULL,
  description TEXT NOT NULL,
  contact_email VARCHAR(190) NOT NULL,
  contact_phone VARCHAR(40) NOT NULL,
  website_url VARCHAR(255) NULL,
  logo_key VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_organisations_active CHECK (is_active IN (0, 1))
) ENGINE=InnoDB;

CREATE TABLE categories (
  category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  accent_colour CHAR(7) NOT NULL DEFAULT '#17B7A5',
  icon_key VARCHAR(60) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_categories_active CHECK (is_active IN (0, 1)),
  CONSTRAINT chk_categories_colour CHECK (accent_colour REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB;

CREATE TABLE venues (
  venue_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address_line_1 VARCHAR(180) NOT NULL,
  suburb VARCHAR(100) NOT NULL,
  state_code CHAR(3) NOT NULL,
  postcode CHAR(4) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'AU',
  latitude DECIMAL(9, 6) NULL,
  longitude DECIMAL(9, 6) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_venues_location (suburb, state_code),
  CONSTRAINT chk_venues_postcode CHECK (postcode REGEXP '^[0-9]{4}$')
) ENGINE=InnoDB;

CREATE TABLE events (
  event_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  venue_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  summary VARCHAR(380) NOT NULL,
  purpose VARCHAR(260) NOT NULL,
  description TEXT NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Australia/Sydney',
  ticket_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'AUD',
  is_free TINYINT(1) NOT NULL DEFAULT 0,
  goal_amount DECIMAL(12, 2) NOT NULL,
  raised_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  capacity INT UNSIGNED NULL,
  hero_image_key VARCHAR(255) NOT NULL,
  status ENUM('draft', 'published', 'suspended', 'cancelled') NOT NULL DEFAULT 'draft',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_organisation FOREIGN KEY (organisation_id) REFERENCES organisations (organisation_id),
  CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories (category_id),
  CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues (venue_id),
  CONSTRAINT chk_events_dates CHECK (end_datetime > start_datetime),
  CONSTRAINT chk_events_price CHECK (ticket_price >= 0),
  CONSTRAINT chk_events_goal CHECK (goal_amount > 0),
  CONSTRAINT chk_events_raised CHECK (raised_amount >= 0),
  CONSTRAINT chk_events_free CHECK (is_free IN (0, 1)),
  CONSTRAINT chk_events_featured CHECK (is_featured IN (0, 1)),
  INDEX idx_events_start_status (start_datetime, status),
  INDEX idx_events_category (category_id),
  INDEX idx_events_organisation (organisation_id),
  INDEX idx_events_location (venue_id)
) ENGINE=InnoDB;

CREATE TABLE event_highlights (
  highlight_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 1,
  title VARCHAR(120) NOT NULL,
  detail VARCHAR(300) NOT NULL,
  CONSTRAINT fk_highlights_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE,
  CONSTRAINT uq_event_highlight_order UNIQUE (event_id, display_order)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- NEW IN ASSESSMENT 3: registrations
-- ---------------------------------------------------------------------------
-- Every row answers: "which event did this person register for?"
--   registration_id  - unique identifier (surrogate primary key)
--   event_id         - the foreign key that links the row to the event table
--   reference_code   - human friendly booking reference shown on the receipt
--   attendee_*       - user details + contact details
--   ticket_quantity  - how many tickets the user purchased
--   registration_date- the date the registration was created
--   status           - registrations are kept when cancelled so the audit
--                      trail survives; a cancelled row still blocks deletion
--                      of the event, which is the safe behaviour.
CREATE TABLE registrations (
  registration_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id INT UNSIGNED NOT NULL,
  reference_code VARCHAR(24) NOT NULL UNIQUE,
  attendee_first_name VARCHAR(80) NOT NULL,
  attendee_last_name VARCHAR(80) NOT NULL,
  attendee_email VARCHAR(190) NOT NULL,
  attendee_phone VARCHAR(40) NOT NULL,
  ticket_quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255) NULL,
  status ENUM('confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_registrations_event FOREIGN KEY (event_id)
    REFERENCES events (event_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_registrations_event_email UNIQUE (event_id, attendee_email),
  CONSTRAINT chk_registrations_tickets CHECK (ticket_quantity >= 1),
  CONSTRAINT chk_registrations_status CHECK (status IN ('confirmed', 'cancelled')),
  INDEX idx_registrations_event_date (event_id, registration_date),
  INDEX idx_registrations_email (attendee_email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Application account used by the API
-- ---------------------------------------------------------------------------
-- Assessment 2 used a read-only account because the API only issued SELECT
-- statements. Assessment 3 adds the full CRUD cycle (Create, Read, Update,
-- Delete), so this account now receives SELECT, INSERT, UPDATE and DELETE.
-- It still has no DDL rights (no CREATE/DROP/ALTER) and no GRANT OPTION.
--
-- These statements need CREATE USER, ALTER USER and GRANT privileges, so run
-- this file with an administrative MySQL user (the README uses root). If your
-- MySQL login is not allowed to manage users, skip this block and set
-- DB_USER=root plus your own DB_PASSWORD in api/.env instead.
CREATE USER IF NOT EXISTS 'charity_app'@'localhost' IDENTIFIED BY 'change_me';
CREATE USER IF NOT EXISTS 'charity_app'@'127.0.0.1' IDENTIFIED BY 'change_me';
CREATE USER IF NOT EXISTS 'charity_app'@'::1' IDENTIFIED BY 'change_me';

ALTER USER 'charity_app'@'localhost' IDENTIFIED BY 'change_me';
ALTER USER 'charity_app'@'127.0.0.1' IDENTIFIED BY 'change_me';
ALTER USER 'charity_app'@'::1' IDENTIFIED BY 'change_me';

GRANT SELECT, INSERT, UPDATE, DELETE ON charityevents_db.* TO 'charity_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON charityevents_db.* TO 'charity_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON charityevents_db.* TO 'charity_app'@'::1';
FLUSH PRIVILEGES;
