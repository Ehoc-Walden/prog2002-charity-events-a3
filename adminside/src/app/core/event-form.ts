import { COVER_IMAGES, CURRENCIES, EVENT_STATUSES } from './api-config';
import { EventDetail, EventPayload, EventStatus } from './models';

/**
 * @file Form model, validation and payload building for the event form.
 *
 * The create screen and the edit screen share this module, so the "New event"
 * and "Edit event" forms can never drift apart. Everything here is a pure
 * function, which means the rules can be reasoned about (and demonstrated in the
 * video) without a browser or a database.
 *
 * The validation below deliberately mirrors `validateEventPayload` in
 * `api/src/utils/validation.js` field for field. The browser check exists to
 * give immediate feedback; the Express check is still the authoritative one,
 * because a client can always be bypassed.
 */

/**
 * One editable event, held as strings so an `<input>` can bind to it directly.
 *
 * Numbers are kept as text on purpose: an empty number input produces `''`
 * rather than `0`, and turning that into a sentinel value too early is exactly
 * how a blank field silently becomes a real zero.
 */
export interface EventFormState {
  organisationId: string;
  categoryId: string;
  venueId: string;
  title: string;
  slug: string;
  summary: string;
  purpose: string;
  description: string;
  /** `datetime-local` value, for example `2026-11-07T18:30`. */
  startDateTime: string;
  /** `datetime-local` value, for example `2026-11-07T21:00`. */
  endDateTime: string;
  timezone: string;
  isFree: boolean;
  ticketPrice: string;
  currency: string;
  goalAmount: string;
  raisedAmount: string;
  /** Blank means "no capacity limit", which the API stores as NULL. */
  capacity: string;
  heroImageKey: string;
  status: EventStatus;
  isFeatured: boolean;
  highlights: HighlightForm[];
}

/** One "what to know" bullet on the event form. */
export interface HighlightForm {
  title: string;
  detail: string;
}

/** Field-keyed validation messages returned by `validateEventForm`. */
/** Positional key for a per-row highlight message, for example `highlight-0-title`. */
export type HighlightErrorKey = `highlight-${number}-${'title' | 'detail'}`;

/**
 * Field-keyed validation messages returned by `validateEventForm`.
 *
 * Highlight rows report under a positional key such as `highlight-2-detail`, so
 * a problem in the third bullet is shown next to that bullet instead of in one
 * lump at the top of the form.
 */
export type EventFormErrors = Partial<Record<keyof EventFormState | HighlightErrorKey, string>>;

/** Maximum lengths accepted by `validateEventPayload` on the server. */
export const EVENT_FIELD_LIMITS = Object.freeze({
  title: 180,
  slug: 200,
  summary: 380,
  purpose: 260,
  description: 4000,
  timezone: 50,
  heroImageKey: 255,
  highlightTitle: 120,
  highlightDetail: 300
});

/** Same slug rule as `SLUG_PATTERN` in the Express validation layer. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Same date-time shape as `DATETIME_PATTERN` on the server. */
export const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

/** Statuses accepted by `validateEventPayload` (derived views are not stored). */
export const FORM_STATUSES: readonly EventStatus[] = EVENT_STATUSES as readonly EventStatus[];

/** Cover images offered by the drop-down, re-exported for the template. */
export const FORM_COVER_IMAGES = COVER_IMAGES;
/**
 * Builds an empty form, optionally overriding a few fields (used to seed the
 * create screen with a sensible start date).
 *
 * @param overrides Fields to replace after the defaults are applied.
 * @returns A blank, valid-shaped form state.
 */
export function emptyEventForm(overrides: Partial<EventFormState> = {}): EventFormState {
  return {
    organisationId: '',
    categoryId: '',
    venueId: '',
    title: '',
    slug: '',
    summary: '',
    purpose: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    timezone: 'Australia/Sydney',
    isFree: false,
    ticketPrice: '0',
    currency: 'AUD',
    goalAmount: '',
    raisedAmount: '0',
    capacity: '',
    heroImageKey: FORM_COVER_IMAGES[0].key,
    status: 'draft',
    isFeatured: false,
    highlights: [],
    ...overrides
  };
}

/**
 * Converts a stored ISO date-time into the value a `datetime-local` input needs.
 *
 * The API returns MySQL `DATETIME` strings such as `2026-11-07 18:30:00`; the
 * control wants `2026-11-07T18:30`, so the space becomes a `T` and the seconds
 * are dropped.
 *
 * @param value Stored date-time, or null.
 * @returns A `datetime-local` value, or an empty string.
 */
export function toInputDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const normalised = String(value).trim().replace(' ', 'T');
  return normalised.length >= 16 ? normalised.slice(0, 16) : normalised;
}

/**
 * Fills the form from an existing event returned by the API.
 *
 * @param event Event detail payload from `GET /api/events/:id`.
 * @returns Form state ready for two-way binding.
 */
export function formFromEvent(event: EventDetail): EventFormState {
  return {
    organisationId: String(event.organisation?.id ?? ''),
    categoryId: String(event.category?.id ?? ''),
    venueId: String(event.venue?.id ?? ''),
    title: event.title ?? '',
    slug: event.slug ?? '',
    summary: event.summary ?? '',
    purpose: event.purpose ?? '',
    description: event.description ?? '',
    startDateTime: toInputDateTime(event.startDateTime),
    endDateTime: toInputDateTime(event.endDateTime),
    timezone: event.timezone || 'Australia/Sydney',
    isFree: !!event.ticket?.isFree,
    ticketPrice: String(event.ticket?.price ?? 0),
    currency: event.ticket?.currency || 'AUD',
    goalAmount: String(event.fundraising?.goal ?? ''),
    raisedAmount: String(event.fundraising?.raised ?? 0),
    capacity: event.capacity === null || event.capacity === undefined ? '' : String(event.capacity),
    heroImageKey: event.heroImage || FORM_COVER_IMAGES[0].key,
    status: (event.status ?? 'draft') as EventStatus,
    isFeatured: !!event.featured,
    highlights: (event.highlights ?? []).map((highlight) => ({
      title: highlight.title,
      detail: highlight.detail
    }))
  };
}
/** Normalises a `datetime-local` value into `YYYY-MM-DD HH:mm:ss`. */
function normaliseDateTime(value: string): string {
  const text = String(value || '').trim().replace('T', ' ');
  return text.length === 16 ? `${text}:00` : text;
}

/** Parses a text field that must hold a number. */
function readNumber(value: string): number | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Checks the whole form in one pass and returns every problem it can find.
 *
 * The rules mirror `validateEventPayload` in `api/src/utils/validation.js` field
 * for field, so the browser and the server agree on what a valid event looks
 * like. Checking everything at once (rather than stopping at the first fault)
 * means a staff member sees all the mistakes in one go instead of fixing them
 * one at a time.
 *
 * @param state Form state straight from the template bindings.
 * @returns An object keyed by field name; empty when the form is valid.
 */
export function validateEventForm(state: EventFormState): EventFormErrors {
  const errors: EventFormErrors = {};

  /** Requires a positive integer id. */
  const requireId = (field: 'organisationId' | 'categoryId' | 'venueId', label: string): void => {
    const text = String(state[field] ?? '').trim();
    if (!/^\d+$/.test(text) || Number(text) < 1) {
      errors[field] = `Choose a ${label}.`;
    }
  };

  requireId('organisationId', 'organiser');
  requireId('categoryId', 'category');
  requireId('venueId', 'venue');

  /** Requires a non-empty trimmed string within the server limit. */
  const requireText = (
    field: 'title' | 'summary' | 'purpose' | 'description',
    label: string,
    maximum: number
  ): void => {
    const text = String(state[field] ?? '').trim();
    if (!text) {
      errors[field] = `${label} is required.`;
    } else if (text.length > maximum) {
      errors[field] = `${label} must be ${maximum} characters or fewer.`;
    }
  };

  requireText('title', 'Title', EVENT_FIELD_LIMITS.title);
  requireText('summary', 'Summary', EVENT_FIELD_LIMITS.summary);
  requireText('purpose', 'Purpose', EVENT_FIELD_LIMITS.purpose);
  requireText('description', 'Description', EVENT_FIELD_LIMITS.description);

  const slug = String(state.slug ?? '').trim();
  if (!slug) {
    errors.slug = 'Slug is required.';
  } else if (slug.length > EVENT_FIELD_LIMITS.slug) {
    errors.slug = `Slug must be ${EVENT_FIELD_LIMITS.slug} characters or fewer.`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = 'Slug may only contain lower-case letters, numbers and single hyphens.';
  }

  const start = normaliseDateTime(state.startDateTime);
  const end = normaliseDateTime(state.endDateTime);
  if (!start) {
    errors.startDateTime = 'Start date and time is required.';
  } else if (!DATETIME_PATTERN.test(start)) {
    errors.startDateTime = 'Start date and time is not in the expected format.';
  }
  if (!end) {
    errors.endDateTime = 'End date and time is required.';
  } else if (!DATETIME_PATTERN.test(end)) {
    errors.endDateTime = 'End date and time is not in the expected format.';
  }
  if (!errors.startDateTime && !errors.endDateTime && end <= start) {
    errors.endDateTime = 'The end must come after the start.';
  }

  const goal = readNumber(state.goalAmount);
  if (goal === null) {
    errors.goalAmount = 'Fundraising goal is required.';
  } else if (goal < 0.01) {
    errors.goalAmount = 'Fundraising goal must be at least 0.01.';
  }

  const raised = readNumber(state.raisedAmount);
  if (raised === null) {
    errors.raisedAmount = 'Enter an amount already raised (use 0 if none).';
  } else if (raised < 0) {
    errors.raisedAmount = 'Amount raised cannot be negative.';
  } else if (goal !== null && goal >= 0.01 && raised > goal * 10) {
    errors.raisedAmount = 'Amount raised looks unrealistic next to the goal.';
  }

  if (!state.isFree) {
    const price = readNumber(state.ticketPrice);
    if (price === null) {
      errors.ticketPrice = 'Ticket price is required for a paid event.';
    } else if (price < 0 || price > 100000) {
      errors.ticketPrice = 'Ticket price must be between 0 and 100000.';
    }
  }

  const capacity = String(state.capacity ?? '').trim();
  if (capacity) {
    const parsed = Number(capacity);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 1000000) {
      errors.capacity = 'Capacity must be a whole number between 1 and 1000000, or left blank.';
    }
  }

  if (!state.heroImageKey) {
    errors.heroImageKey = 'Choose a cover image.';
  }

  if (String(state.timezone ?? '').length > EVENT_FIELD_LIMITS.timezone) {
    errors.timezone = `Time zone must be ${EVENT_FIELD_LIMITS.timezone} characters or fewer.`;
  }

  if (!CURRENCIES.includes(state.currency)) {
    errors.currency = 'Choose one of the listed currencies.';
  }

  if (!FORM_STATUSES.includes(state.status)) {
    errors.status = 'Choose one of the listed statuses.';
  }

  state.highlights.forEach((highlight, index) => {
    const title = String(highlight.title ?? '').trim();
    const detail = String(highlight.detail ?? '').trim();
    if (!title || title.length > EVENT_FIELD_LIMITS.highlightTitle) {
      errors[`highlight-${index}-title`] =
        `Highlight ${index + 1} needs a title of ${EVENT_FIELD_LIMITS.highlightTitle} characters or fewer.`;
    }
    if (!detail || detail.length > EVENT_FIELD_LIMITS.highlightDetail) {
      errors[`highlight-${index}-detail`] =
        `Highlight ${index + 1} needs a detail of ${EVENT_FIELD_LIMITS.highlightDetail} characters or fewer.`;
    }
  });

  return errors;
}

/**
 * Converts a valid form into the JSON body `POST /api/events` expects.
 *
 * Only run this once {@link validateEventForm} has returned no errors: it
 * assumes every required text field is filled in and every number parses.
 *
 * @param state Form state straight from the template bindings.
 * @returns Payload ready to hand to {@link ApiService.createEvent} or
 *   {@link ApiService.updateEvent}.
 */
export function toEventPayload(state: EventFormState): EventPayload {
  const startDateTime = normaliseDateTime(state.startDateTime);
  const status = state.status;

  return {
    organisationId: Number(state.organisationId),
    categoryId: Number(state.categoryId),
    venueId: Number(state.venueId),
    title: state.title.trim(),
    slug: state.slug.trim(),
    summary: state.summary.trim(),
    purpose: state.purpose.trim(),
    description: state.description.trim(),
    startDateTime,
    endDateTime: normaliseDateTime(state.endDateTime),
    timezone: state.timezone || 'Australia/Sydney',
    isFree: state.isFree,
    ticketPrice: state.isFree ? 0 : Number(state.ticketPrice || 0),
    currency: state.currency,
    goalAmount: Number(state.goalAmount),
    raisedAmount: Number(state.raisedAmount || 0),
    capacity: String(state.capacity ?? '').trim() ? Number(state.capacity) : null,
    heroImageKey: state.heroImageKey,
    status,
    isFeatured: state.isFeatured,
    // A published event records when it went live; anything else stays null.
    publishedAt: status === 'published' ? startDateTime : null,
    highlights: state.highlights
      .map((highlight, index) => ({
        title: String(highlight.title ?? '').trim(),
        detail: String(highlight.detail ?? '').trim(),
        displayOrder: index + 1
      }))
      .filter((highlight) => highlight.title && highlight.detail)
  };
}
