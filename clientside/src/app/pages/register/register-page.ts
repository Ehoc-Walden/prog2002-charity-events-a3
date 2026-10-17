import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { API_OFFLINE_MESSAGE } from '../../core/error';
import { EventDetail } from '../../core/models';
import { formatCurrency, formatEventDate, formatTicket, formatTimeRange, resolveAssetPath } from '../../core/format';

/** Key used to remember the last event the visitor opened. */
const LAST_EVENT_KEY = 'commonGround.lastEventId';

/** Maximum tickets a single registration may hold (matches the API rule). */
const MAX_TICKETS = 100;

/**
 * Registration page - new in Assessment 3.
 *
 * The visitor arrives from an event detail page, so the event id travels in the
 * URL query string (`/register?eventId=7`). If the query string is missing the
 * page falls back to `localStorage`, which is the other method the brief
 * suggests for passing the id between pages.
 *
 * Everything is validated locally before `POST /api/events/:id/registrations` is
 * called, and the API re-validates the same rules because the browser can never
 * be trusted.
 */
@Component({
  selector: 'app-register-page',
  imports: [RouterLink],
  templateUrl: './register-page.html'
})
export class RegisterPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  /** The event being registered for (detail shape, so the summary counters are available). */
  protected readonly event = signal<EventDetail | null>(null);

  /** Attendee first name. */
  protected readonly firstName = signal('');

  /** Attendee last name. */
  protected readonly lastName = signal('');

  /** Attendee email address. */
  protected readonly email = signal('');

  /** Optional contact phone number. */
  protected readonly phone = signal('');

  /** Number of tickets the visitor wants. */
  protected readonly ticketQuantity = signal(1);

  /** Optional note stored with the registration. */
  protected readonly notes = signal('');

  /** True while the event or the submission request is in flight. */
  protected readonly loading = signal(true);

  /** True while the POST request is in flight. */
  protected readonly submitting = signal(false);

  /** Blocking error (the event could not be loaded). */
  protected readonly error = signal<string | null>(null);

  /** Field level validation messages, keyed by field name. */
  protected readonly fieldErrors = signal<Record<string, string>>({});

  /** Set once the API accepts the registration. */
  protected readonly confirmation = signal<{ referenceCode: string; totalCost: number; currency: string } | null>(null);

  /** Total cost preview shown next to the ticket quantity. */
  protected readonly totalCost = computed(() => {
    const detail = this.event();
    if (!detail) return 0;
    if (detail.ticket?.isFree) return 0;
    return Number(detail.ticket?.price || 0) * this.ticketQuantity();
  });

  /** Formatted total cost. */
  protected readonly totalLabel = computed(() => {
    const detail = this.event();
    if (!detail) return '$0.00';
    if (detail.ticket?.isFree) return 'Free';
    return formatCurrency(this.totalCost(), detail.ticket?.currency);
  });

  /** Entry price label shown on the summary card. */
  protected readonly ticketLabel = computed(() => formatTicket(this.event()?.ticket));

  /** Long English date for the summary card. */
  protected readonly longDate = computed(() => formatEventDate(this.event()?.startDateTime, 'long'));

  /** Start and end time for the summary card. */
  protected readonly timeRange = computed(() => formatTimeRange(this.event()?.startDateTime, this.event()?.endDateTime));

  /** Currency formatter exposed to the template. */
  protected readonly formatCurrency = formatCurrency;

  /** Cover image for the summary card. */
  protected readonly coverPath = computed(() => resolveAssetPath(this.event()?.heroImage));

  /** Reads the event id and loads the event. */
  ngOnInit(): void {
    const eventId = this.route.snapshot.queryParamMap.get('eventId') || this.readStoredEventId();
    if (!eventId) {
      this.error.set('No event was selected. Open an event and choose "Register for this event".');
      this.loading.set(false);
      return;
    }
    this.loadEvent(eventId);
  }

  /** @returns The event id remembered from the last detail page visit. */
  private readStoredEventId(): string | null {
    try {
      return window.localStorage.getItem(LAST_EVENT_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Loads the event shown at the top of the page.
   *
   * @param eventId Event primary key.
   */
  private loadEvent(eventId: string): void {
    this.loading.set(true);
    this.api.getEvent(eventId).subscribe({
      next: (detail) => {
        this.event.set(detail);
        try {
          window.localStorage.setItem(LAST_EVENT_KEY, String(detail.id));
        } catch {
          // Private browsing modes can block storage; the page still works.
        }
        this.loading.set(false);
      },
      error: (failure: Error) => {
        this.error.set(failure?.message || API_OFFLINE_MESSAGE);
        this.loading.set(false);
      }
    });
  }

  /** Handles the first-name input. */
  protected onFirstName(value: string): void {
    this.firstName.set(value);
    this.clearField('firstName');
  }

  /** Handles the last-name input. */
  protected onLastName(value: string): void {
    this.lastName.set(value);
    this.clearField('lastName');
  }

  /** Handles the email input. */
  protected onEmail(value: string): void {
    this.email.set(value);
    this.clearField('email');
  }

  /** Handles the phone input. */
  protected onPhone(value: string): void {
    this.phone.set(value);
    this.clearField('phone');
  }

  /** Handles the ticket quantity input, clamped to 1-100. */
  protected onTickets(value: string): void {
    const parsed = Number.parseInt(value, 10);
    this.ticketQuantity.set(Number.isNaN(parsed) ? 1 : Math.min(MAX_TICKETS, Math.max(1, parsed)));
    this.clearField('ticketQuantity');
  }

  /** Handles the notes textarea. */
  protected onNotes(value: string): void {
    this.notes.set(value);
  }

  /** Removes a single field error. */
  private clearField(field: string): void {
    if (!this.fieldErrors()[field]) return;
    const next = { ...this.fieldErrors() };
    delete next[field];
    this.fieldErrors.set(next);
  }

  /** @returns True when a field has an error message. */
  protected hasError(field: string): boolean {
    return Boolean(this.fieldErrors()[field]);
  }

  /**
   * Client-side validation, mirroring `validateRegistrationPayload` in
   * `api/src/utils/validation.js`.
   *
   * @returns A map of field name to message; empty when the form is valid.
   */
  private validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!this.firstName().trim()) errors['firstName'] = 'Enter your first name.';
    else if (this.firstName().trim().length > 80) errors['firstName'] = 'First name must be 80 characters or fewer.';

    if (!this.lastName().trim()) errors['lastName'] = 'Enter your last name.';
    else if (this.lastName().trim().length > 80) errors['lastName'] = 'Last name must be 80 characters or fewer.';

    const email = this.email().trim();
    if (!email) errors['email'] = 'Enter your email address so we can send the tickets.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors['email'] = 'Enter a valid email address, for example name@example.com.';

    const phone = this.phone().replace(/[\s()-]/g, '');
    if (phone && !/^(\+?\d{8,15})$/.test(phone)) errors['phone'] = 'Enter a phone number between 8 and 15 digits, or leave it blank.';

    const tickets = this.ticketQuantity();
    if (!Number.isInteger(tickets) || tickets < 1 || tickets > MAX_TICKETS) {
      errors['ticketQuantity'] = `Choose between 1 and ${MAX_TICKETS} tickets.`;
    }

    if (this.notes().length > 255) errors['notes'] = 'Notes must be 255 characters or fewer.';

    const detail = this.event();
    if (detail && !detail.ticket?.isFree && detail.capacity) {
      const remaining = detail.capacity - Number(detail.registrationSummary?.ticketsSold || 0);
      if (remaining > 0 && tickets > remaining) {
        errors['ticketQuantity'] = `Only ${remaining} ticket${remaining === 1 ? '' : 's'} remain for this event.`;
      }
    }
    return errors;
  }

  /** Validates and submits the registration. */
  protected submit(): void {
    if (this.submitting()) return;
    const detail = this.event();
    if (!detail) return;

    const errors = this.validate();
    this.fieldErrors.set(errors);
    if (Object.keys(errors).length) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.api.createRegistration(detail.id, {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      ticketQuantity: this.ticketQuantity(),
      notes: this.notes().trim()
    }).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.confirmation.set({
          referenceCode: result.registration.referenceCode,
          totalCost: result.event?.totalCost ?? this.totalCost(),
          currency: detail.ticket?.currency || 'AUD'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (failure: Error & { status?: number }) => {
        this.submitting.set(false);
        this.error.set(failure?.message || 'The registration could not be saved. Please try again.');
      }
    });
  }

  /** Starts a fresh registration for the same event. */
  protected registerAnother(): void {
    this.confirmation.set(null);
    this.firstName.set('');
    this.lastName.set('');
    this.email.set('');
    this.phone.set('');
    this.ticketQuantity.set(1);
    this.notes.set('');
    this.fieldErrors.set({});
    this.error.set(null);
  }
}