/**
 * @file Pure formatting helpers shared by every page of the client site.
 *
 * The database stores amounts as numbers and dates as `YYYY-MM-DD hh:mm:ss`
 * strings. These functions turn those raw values into the English text the
 * design system expects (for example "14 Oct 2026" and "$12,480"), and they are
 * pure so they are trivial to unit test.
 *
 * Nothing in this file touches the DOM: Angular templates render the returned
 * strings through interpolation (`{{ }}`), which escapes them automatically.
 */

/** Short English month names used in every date label. */
export const MONTHS: readonly string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** Full English day names used by the long date format. */
export const DAYS: readonly string[] = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

/** Full English month names used by the search page drop-down. */
export const FULL_MONTHS: readonly string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parses the MySQL / ISO date-time strings the API returns.
 *
 * MySQL sends `2026-10-14 18:30:00`, which `new Date()` cannot read in every
 * browser, so the space is normalised to `T` first.
 *
 * @param value Raw date string from the API.
 * @returns A `Date`, or `null` when the value is empty or invalid.
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalised = String(value).replace(' ', 'T');
  const date = new Date(normalised);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a currency amount using the symbol for the supplied ISO code.
 *
 * @param amount Numeric amount.
 * @param currency ISO currency code such as `AUD`.
 */
export function formatCurrency(amount: number | string | null | undefined, currency = 'AUD'): string {
  const symbols: Record<string, string> = { AUD: '$', USD: '$', NZD: '$', GBP: '£', EUR: '€' };
  const symbol = symbols[currency] ?? '$';
  const value = Number(amount) || 0;
  const decimals = value % 1 === 0 ? 0 : 2;
  return symbol + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats a currency amount in a compact form for progress headlines.
 *
 * @param amount Numeric amount.
 * @param currency ISO currency code such as `AUD`.
 */
export function formatCompactCurrency(amount: number | string | null | undefined, currency = 'AUD'): string {
  const value = Number(amount) || 0;
  if (value >= 1000000) return formatCurrency(Math.round(value / 100000) / 10, currency) + 'M';
  if (value >= 1000) return formatCurrency(Math.round(value / 100) / 10, currency) + 'k';
  return formatCurrency(value, currency);
}

/** Formats an integer with thousands separators. */
export function formatNumber(value: number | string | null | undefined): string {
  return String(Number(value) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats an event date.
 *
 * @param value Raw date string.
 * @param style `short` = "14 Oct", `medium` = "14 Oct 2026", `long` = "Wednesday, 14 Oct 2026".
 */
export function formatEventDate(value: string | null | undefined, style: 'short' | 'medium' | 'long' = 'short'): string {
  const date = parseDate(value);
  if (!date) return 'Date to be confirmed';
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  if (style === 'long') return `${DAYS[date.getDay()]}, ${day} ${month} ${year}`;
  if (style === 'medium') return `${day} ${month} ${year}`;
  return `${day} ${month}`;
}

/** Splits a date into the three pieces the event card date badge needs. */
export function formatDateParts(value: string | null | undefined): { day: string; month: string; year: string } {
  const date = parseDate(value);
  if (!date) return { day: '--', month: '---', year: '----' };
  return { day: String(date.getDate()), month: MONTHS[date.getMonth()], year: String(date.getFullYear()) };
}

/** Formats the time portion of a date-time string, for example "6:30 pm". */
export function formatTime(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'pm' : 'am';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${suffix}`;
}

/** Formats a start/end pair as "6:30 pm – 9:00 pm". */
export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const from = formatTime(start);
  const to = formatTime(end);
  if (!from) return 'Time to be confirmed';
  return to ? `${from} – ${to}` : from;
}

/** Formats a ticket price as "Free" or a currency amount. */
export function formatTicket(ticket: { price: number; currency: string; isFree: boolean } | null | undefined): string {
  if (!ticket) return 'See details';
  if (ticket.isFree || Number(ticket.price) === 0) return 'Free';
  return formatCurrency(ticket.price, ticket.currency);
}

/** Clamps the API progress percentage to a safe 0-100 value. */
export function progressPercent(fundraising: { goal: number; raised: number; progressPercent?: number } | null | undefined): number {
  if (!fundraising) return 0;
  let value = Number(fundraising.progressPercent);
  if (Number.isNaN(value)) {
    const goal = Number(fundraising.goal) || 0;
    const raised = Number(fundraising.raised) || 0;
    value = goal > 0 ? (raised / goal) * 100 : 0;
  }
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

/** Human readable label for a fundraising percentage. */
export function progressStatus(percent: number): string {
  if (percent >= 100) return 'Goal reached';
  if (percent >= 75) return 'Final stretch';
  if (percent >= 40) return 'Building momentum';
  if (percent > 0) return 'Just getting started';
  return 'Not started';
}

/**
 * Normalises a hero image key.
 *
 * The database stores keys such as `/assets/covers/coastline-walk.svg`, but the
 * Angular build serves the same files from the application root, so the leading
 * slash is removed.
 */
export function resolveAssetPath(path: string | null | undefined): string {
  if (!path) return 'assets/covers/twilight-harbour.svg';
  return String(path).replace(/^\//, '');
}

/** Builds the two-letter monogram shown on the organiser badge. */
export function initials(name: string | null | undefined): string {
  return String(name || 'CG')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/** Returns the local `YYYY-MM-DD` string for a date (no UTC shifting). */
export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Number of days in a month, used by the search page date selects. */
export function daysInMonth(year: string, month: string): number {
  if (!month) return 31;
  const y = year ? Number(year) : 2000;
  return new Date(y, Number(month), 0).getDate();
}