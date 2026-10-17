/**
 * @file Front-end configuration for the Common Ground Collective staff console.
 *
 * Only the API base URL is configurable here. Every event, category, venue and
 * forecast the console shows is read from the REST API at run time, so the
 * administration screens can never drift out of sync with the database.
 *
 * LOCAL DEVELOPMENT = http://localhost:3000/api
 * SCU cPanel        = "/api" (or the deployed API URL) before building.
 */

/** Base URL of the charity events REST API. */
export const API_BASE_URL = 'http://localhost:3000/api';

/** Milliseconds before a browser request to the API is aborted. */
export const REQUEST_TIMEOUT_MS = 12000;

/** Site name shown in the console header, footer and document titles. */
export const SITE_NAME = 'Common Ground Collective';

/** Sub-title that distinguishes the staff console from the public website. */
export const CONSOLE_NAME = 'Staff Console';

/** URL of the public website, linked from the console bar. */
export const PUBLIC_SITE_URL = 'http://localhost:4200/';

/**
 * Cover images that exist in `public/assets/covers`.
 *
 * The "New event" and "Edit event" forms offer these as a drop-down instead of
 * a free-text file name, which removes a whole class of broken-image mistakes
 * for the staff member creating the event.
 */
export const COVER_IMAGES: readonly { key: string; label: string }[] = [
  { key: '/assets/covers/art-with-heart.svg', label: 'Art with heart' },
  { key: '/assets/covers/beats-for-belonging.svg', label: 'Beats for belonging' },
  { key: '/assets/covers/coastline-walk.svg', label: 'Coastline walk' },
  { key: '/assets/covers/fundraising-masterclass.svg', label: 'Fundraising masterclass' },
  { key: '/assets/covers/long-lunch.svg', label: 'Long lunch' },
  { key: '/assets/covers/river-cleanup.svg', label: 'River cleanup' },
  { key: '/assets/covers/spring-pantry.svg', label: 'Spring pantry' },
  { key: '/assets/covers/sunrise-yoga.svg', label: 'Sunrise yoga' },
  { key: '/assets/covers/table-of-one-hundred.svg', label: 'Table of one hundred' },
  { key: '/assets/covers/trivia-tomorrow.svg', label: 'Trivia tomorrow' },
  { key: '/assets/covers/twilight-harbour.svg', label: 'Twilight harbour' },
  { key: '/assets/covers/winter-sleepout.svg', label: 'Winter sleepout' }
];
/**
 * Values actually stored in `events.status`.
 *
 * These match `EVENT_STATUSES` in `api/src/utils/validation.js` exactly, which
 * is what `validateEventPayload` accepts on the create and update endpoints.
 * "Active" and "Past" are NOT stored values - they are derived from
 * `end_datetime` - so they only appear in EVENT_STATUS_FILTERS below.
 */
export const EVENT_STATUSES: readonly string[] = ['draft', 'published', 'suspended', 'cancelled'];

/**
 * Options for the dashboard status filter.
 *
 * "all", "active" and "past" are accepted by `validateEventListQuery`; the rest
 * are the stored statuses. Keeping this list next to the API base URL means the
 * drop-down can never offer a value the API would reject with HTTP 400.
 */
export const EVENT_STATUS_FILTERS: readonly { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active (published, not yet finished)' },
  { value: 'past', label: 'Past (end date has passed)' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' }
];

/** Sort options accepted by `validateEventListQuery` for the admin list. */
export const LIST_SORTS: readonly { value: string; label: string }[] = [
  { value: 'start_desc', label: 'Newest start date first' },
  { value: 'start_asc', label: 'Oldest start date first' },
  { value: 'title_asc', label: 'Title (A to Z)' },
  { value: 'id_desc', label: 'Most recently created first' }
];

/**
 * Currency choices offered by the event form.
 *
 * The list matches `CURRENCIES` in `api/src/utils/validation.js` exactly, so
 * the drop-down can never offer a value the API would reject.
 */
export const CURRENCIES: readonly string[] = ['AUD', 'NZD', 'USD', 'GBP', 'EUR'];

/** Time zones accepted by the event form (the API stores the string as given). */
export const TIME_ZONES: readonly string[] = ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane'];

/** Page sizes offered by the dashboard pager. */
export const PAGE_SIZES: readonly number[] = [10, 25, 50];
