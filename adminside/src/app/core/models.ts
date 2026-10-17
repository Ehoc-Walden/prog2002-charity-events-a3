/**
 * @file TypeScript interfaces describing every JSON payload returned by the
 * charity events REST API.
 *
 * Declaring the shapes once means the compiler checks every template binding
 * and every service call, which is one of the main reasons the project uses
 * TypeScript instead of plain JavaScript.
 */

/** Event category such as "Food security" or "Coastal care". */
export interface Category {
  id: number;
  name: string;
  slug: string;
  accentColour: string;
  iconKey: string;
  description?: string;
  isActive?: boolean;
  /** Number of events that currently reference this category. */
  eventCount?: number;
}

/** Organisation that runs the event. */
export interface Organisation {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  mission: string;
}

/** Physical venue, including the coordinates used by the weather feature. */
export interface Venue {
  id: number;
  name: string;
  addressLine1: string;
  suburb: string;
  stateCode: string;
  postcode: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
}

/** Ticket information for one event. */
export interface Ticket {
  price: number;
  currency: string;
  isFree: boolean;
}

/** Fundraising progress for one event. */
export interface Fundraising {
  goal: number;
  raised: number;
  progressPercent: number;
}

/** Publication status of an event. */
export type EventStatus = 'draft' | 'published' | 'suspended' | 'cancelled';

/** A single charity event in the public API shape. */
export interface CharityEvent {
  id: number;
  title: string;
  slug: string;
  summary: string;
  purpose: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  ticket: Ticket;
  fundraising: Fundraising;
  capacity: number | null;
  heroImage: string;
  status: EventStatus;
  featured: boolean;
  publishedAt: string | null;
  isPast: boolean;
  registrationCount?: number;
  ticketsSold?: number;
  category: Category;
  organisation: Organisation;
  venue: Venue;
}

/** One row of the `GET /api/locations` response (a distinct Sydney suburb). */
export interface LocationOption {
  suburb: string;
  stateCode: string;
  label: string;
}
/** A "what to know" bullet shown on the event detail page. */
export interface Highlight {
  id: number;
  title: string;
  detail: string;
  displayOrder: number;
}

/** One purchased ticket record. */
export interface Registration {
  id: number;
  referenceCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  ticketQuantity: number;
  registrationDate: string;
  notes: string | null;
  status: string;
}

/** Summary counters returned next to the registration list. */
export interface RegistrationSummary {
  totalRegistrations: number;
  ticketsSold: number;
  latestRegistrationDate: string | null;
}

/** Event detail payload: the event plus its highlights and registrations. */
export interface EventDetail extends CharityEvent {
  highlights: Highlight[];
  registrations: Registration[];
  registrationSummary: RegistrationSummary;
}

/** One day of the Open-Meteo forecast. */
export interface WeatherDay {
  date: string;
  code: number;
  label: string;
  icon: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
}

/** Normalised Open-Meteo forecast. */
export interface Forecast {
  latitude: number;
  longitude: number;
  timezone: string;
  unit: string;
  source: string;
  generatedAt: string;
  days: WeatherDay[];
  cached?: boolean;
  event?: { id: number; title: string };
  venue?: { name: string; suburb: string; stateCode: string };
}

/** Pagination block returned by the list and search endpoints. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Counts of events per status, used by the admin dashboard tiles. */
export interface StatusSummary {
  byStatus: Record<string, number>;
  byLifecycle?: { active: number; past: number };
  totalEvents: number;
}

/** Filters accepted by the public search endpoint. */
export interface SearchFilters {
  date: string;
  location: string;
  categories: string[];
  sort: string;
  scope: string;
  page?: number;
  limit?: number;
}

/** Filters accepted by the admin event list endpoint. */
export interface AdminListFilters {
  status: string;
  search: string;
  sort: string;
  page?: number;
  limit?: number;
}

/** Payload sent to POST /api/events/:id/registrations. */
export interface RegistrationPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ticketQuantity: number;
  notes: string;
}

/** Payload sent to POST/PUT /api/events. */
export interface EventPayload {
  organisationId: number;
  categoryId: number;
  venueId: number;
  title: string;
  slug: string;
  summary: string;
  purpose: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  ticketPrice: number;
  currency: string;
  isFree: boolean;
  goalAmount: number;
  raisedAmount: number;
  capacity: number | null;
  heroImageKey: string;
  status: EventStatus;
  isFeatured: boolean;
  publishedAt: string | null;
  highlights: Array<{ title: string; detail: string; displayOrder: number }>;
}