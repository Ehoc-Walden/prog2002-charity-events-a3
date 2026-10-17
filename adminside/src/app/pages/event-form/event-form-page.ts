import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CURRENCIES, PUBLIC_SITE_URL, TIME_ZONES } from '../../core/api-config';
import { ApiService } from '../../core/api.service';
import { API_OFFLINE_MESSAGE, ApiError } from '../../core/error';
import { WeatherService } from '../../core/weather.service';
import { Category, CharityEvent, Forecast, Organisation, Registration, Venue } from '../../core/models';
import { formatCurrency, formatEventDate, formatTime, resolveAssetPath } from '../../core/format';
import {
  EVENT_FIELD_LIMITS,
  EventFormErrors,
  EventFormState,
  FORM_COVER_IMAGES,
  FORM_STATUSES,
  emptyEventForm,
  formFromEvent,
  toEventPayload,
  validateEventForm
} from '../../core/event-form';

/** A message shown above the form. */
interface ConsoleNotice {
  tone: 'success' | 'error' | 'warn';
  title: string;
  message: string;
}

/**
 * "New event" and "Edit event" - one screen, two modes.
 *
 * The route data decides which mode is active (`/events/new` sets
 * `mode: 'create'`, `/events/:eventId/edit` sets `mode: 'edit'`). Both modes
 * render the same template and run the same validation, so the create form can
 * never drift away from the edit form.
 *
 * Validation happens twice on purpose. {@link validateEventForm} runs in the
 * browser so a staff member is told about a mistake immediately, and
 * `validateEventPayload` runs again inside Express, because anything arriving
 * over HTTP has to be treated as untrusted.
 */
@Component({
  selector: 'app-event-form-page',
  imports: [RouterLink],
  templateUrl: './event-form-page.html'
})
export class EventFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly weather = inject(WeatherService);

  /** Currency choices, shared with the API's allow-list. */
  protected readonly currencies = CURRENCIES;

  /** Time zone choices. */
  protected readonly timeZones = TIME_ZONES;

  /** Statuses that can actually be stored. */
  protected readonly statuses = FORM_STATUSES;

  /** Cover images offered by the drop-down. */
  protected readonly coverImages = FORM_COVER_IMAGES;

  /** Field limits, exposed so the template can show a live counter. */
  protected readonly limits = EVENT_FIELD_LIMITS;

  /** Address of the public website, linked once an event is published. */
  protected readonly publicSiteUrl = PUBLIC_SITE_URL;

  /** Every editable value, held as strings so inputs can bind straight to it. */
  protected readonly form = signal<EventFormState>(emptyEventForm());

  /** Validation messages, keyed by field. */
  protected readonly errors = signal<EventFormErrors>({});

  /** Organisations offered by the API. */
  protected readonly organisations = signal<Organisation[]>([]);

  /** Categories offered by the API, including retired ones. */
  protected readonly categories = signal<Category[]>([]);

  /** Venues offered by the API, carrying the coordinates the weather uses. */
  protected readonly venues = signal<Venue[]>([]);

  /** Tickets sold for the event being edited. */
  protected readonly registrations = signal<Registration[]>([]);

  /** True while the drop-downs and (in edit mode) the event are loading. */
  protected readonly loading = signal(true);

  /** True while a create or update request is in flight. */
  protected readonly saving = signal(false);

  /** Blocking load failure. */
  protected readonly error = signal<string | null>(null);

  /** Result message shown above the form. */
  protected readonly notice = signal<ConsoleNotice | null>(null);

  /** Open-Meteo forecast for the selected venue. */
  protected readonly forecast = signal<Forecast | null>(null);

  /** True while the forecast request is in flight. */
  protected readonly forecastLoading = signal(false);

  /** Forecast failure message, kept separate from the form's own error. */
  protected readonly forecastError = signal<string | null>(null);

  /** 'create' for `/events/new`, 'edit' for `/events/:eventId/edit`. */
  protected readonly mode = signal<'create' | 'edit'>('create');

  /** Primary key of the event being edited, or null in create mode. */
  protected readonly eventId = signal<string | null>(null);

  /** True when the form is editing an event that already exists. */
  protected readonly isEdit = computed(() => this.mode() === 'edit' && Boolean(this.eventId()));

  /** Preview path for the chosen cover image. */
  protected readonly coverPreview = computed(() => resolveAssetPath(this.form().heroImageKey));

  /** Heading shown at the top of the page. */
  protected readonly heading = computed(() =>
    this.isEdit() ? 'Edit event' : 'Create an event'
  );

  /** Sub-heading shown under the heading. */
  protected readonly lede = computed(() =>
    this.isEdit()
      ? 'Change any field and save. The public website reads the same record, so the edit appears there immediately.'
      : 'Fill in the details below. The event is created in MySQL through POST /api/events and can be published straight away.'
  );

  /** Total number of tickets sold, shown next to the registration table. */
  protected readonly ticketsSold = computed(() =>
    this.registrations().reduce((total, row) => total + (Number(row.ticketQuantity) || 0), 0)
  );

  /**
   * Loads the lookup lists, and in edit mode the event itself.
   *
   * The route is read here rather than in the constructor because Angular
   * resolves route data and parameters before `ngOnInit` runs.
   */
  ngOnInit(): void {
    const routeMode = (this.route.snapshot.data['mode'] as 'create' | 'edit') || 'create';
    const eventId = this.route.snapshot.paramMap.get('eventId');
    this.mode.set(routeMode);
    this.eventId.set(eventId);

    // A create or update that navigated here can hand over a result message.
    const handedOver = (window.history.state as { notice?: ConsoleNotice } | null)?.notice;
    if (handedOver) {
      this.notice.set(handedOver);
      // Clear it so a browser refresh does not replay the message.
      window.history.replaceState({ ...(window.history.state as object) }, '');
    }

    if (routeMode === 'create') {
      this.form.set(emptyEventForm(this.defaultSchedule()));
    }

    this.loadLookups();
    if (routeMode === 'edit' && eventId) {
      this.loadEvent(eventId);
    } else {
      this.loading.set(false);
    }
  }

  /**
   * Suggests a start date for a brand new event: a week from today at 6pm.
   *
   * @returns Overrides for {@link emptyEventForm}.
   */
  private defaultSchedule(): Partial<EventFormState> {
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(21, 0, 0, 0);
    return { startDateTime: toInput(start), endDateTime: toInput(end) };
  }

  /**
   * Loads the organisations, categories and venues used by the drop-downs.
   *
   * All three requests run in parallel; the page waits for the slowest.
   */
  private loadLookups(): void {
    this.api.getOrganisations().subscribe({
      next: (organisations) => this.organisations.set(organisations),
      error: (error: ApiError) => this.error.set(error?.message || API_OFFLINE_MESSAGE)
    });
    this.api.getCategories(true).subscribe({
      next: (categories) => this.categories.set(categories),
      error: (error: ApiError) => this.error.set(error?.message || API_OFFLINE_MESSAGE)
    });
    this.api.getVenues().subscribe({
      next: (venues) => this.venues.set(venues),
      error: (error: ApiError) => this.error.set(error?.message || API_OFFLINE_MESSAGE)
    });
  }

  /**
   * Loads the event being edited, its tickets and its forecast.
   *
   * @param eventId Event primary key taken from the URL.
   */
  private loadEvent(eventId: string): void {
    this.loading.set(true);
    this.error.set(null);
    // `includeUnpublished=1` lets a draft or suspended event open in the form.
    this.api.getEventForAdmin(eventId).subscribe({
      next: (event) => {
        this.form.set(formFromEvent(event));
        this.loading.set(false);
        this.loadRegistrations(eventId);
        this.loadForecast();
      },
      error: (error: ApiError) => {
        this.error.set(error?.message || API_OFFLINE_MESSAGE);
        this.loading.set(false);
      }
    });
  }

  /**
   * Loads the tickets sold for the event being edited.
   *
   * @param eventId Event primary key.
   */
  private loadRegistrations(eventId: string): void {
    this.api.getEventRegistrations(eventId).subscribe({
      next: (registrations) => this.registrations.set(registrations),
      error: () => this.registrations.set([])
    });
  }

  /**
   * Writes one field back into the form state.
   *
   * A single generic setter keeps the template honest: `setField('title', ...)`
   * is checked against `EventFormState` by the compiler, so a typo in a field
   * name is a build error rather than a silently ignored edit.
   *
   * @param field Field being changed.
   * @param value New value.
   */
  protected setField<K extends keyof EventFormState>(field: K, value: EventFormState[K]): void {
    this.form.update((state) => ({ ...state, [field]: value } as EventFormState));
    if (this.errors()[field as keyof EventFormErrors]) {
      this.errors.update((current) => {
        const next = { ...current };
        delete next[field as keyof EventFormErrors];
        return next;
      });
    }
    // Choosing a venue is the moment a create-mode forecast becomes possible.
    if (field === 'venueId' && !this.isEdit()) {
      this.loadForecast();
    }
  }

  /**
   * Reads the message shown next to one highlight row.
   *
   * @param index Row position.
   * @param field Which half of the row is being checked.
   */
  protected highlightError(index: number, field: 'title' | 'detail'): string | undefined {
    return this.errors()[`highlight-${index}-${field}`];
  }

  /** Adds an empty highlight row. */
  protected addHighlight(): void {
    this.form.update((state) => ({
      ...state,
      highlights: [...state.highlights, { title: '', detail: '' }]
    }));
  }

  /**
   * Removes a highlight row and re-runs validation keys.
   *
   * @param index Row position.
   */
  protected removeHighlight(index: number): void {
    this.form.update((state) => ({
      ...state,
      highlights: state.highlights.filter((_, position) => position !== index)
    }));
    this.errors.set({});
  }

  /**
   * Writes one half of a highlight row.
   *
   * @param index Row position.
   * @param field Which half is being changed.
   * @param value New text.
   */
  protected setHighlight(index: number, field: 'title' | 'detail', value: string): void {
    this.form.update((state) => ({
      ...state,
      highlights: state.highlights.map((highlight, position) =>
        position === index ? { ...highlight, [field]: value } : highlight
      )
    }));
  }

  /**
   * Fills the slug from the title.
   *
   * Lower-cases, drops punctuation and joins the words with single hyphens,
   * which is exactly the shape `SLUG_PATTERN` accepts on the server.
   */
  protected suggestSlug(): void {
    const suggestion = slugify(this.form().title);
    if (suggestion) this.setField('slug', suggestion);
  }

  /**
   * Requests the Open-Meteo forecast for the chosen venue.
   *
   * In edit mode the saved event is asked for its forecast, which proves the
   * coordinates really came out of MySQL. In create mode the venue the staff
   * member just picked supplies the coordinates, so the forecast can be checked
   * before the event is saved.
   */
  protected loadForecast(): void {
    this.forecastError.set(null);

    if (this.isEdit() && this.eventId()) {
      this.forecastLoading.set(true);
      this.weather.getEventForecast(this.eventId() as string, 5).subscribe({
        next: (forecast) => {
          this.forecast.set(forecast);
          this.forecastLoading.set(false);
        },
        error: (error: ApiError) => {
          this.forecast.set(null);
          this.forecastError.set(error?.message || 'The forecast is unavailable.');
          this.forecastLoading.set(false);
        }
      });
      return;
    }

    const venue = this.selectedVenue();
    if (!venue) {
      this.forecast.set(null);
      return;
    }
    if (venue.latitude === null || venue.longitude === null) {
      this.forecast.set(null);
      this.forecastError.set(`${venue.name} has no coordinates recorded, so no forecast can be requested.`);
      return;
    }

    this.forecastLoading.set(true);
    this.weather.getForecast(Number(venue.latitude), Number(venue.longitude), 5).subscribe({
      next: (forecast) => {
        this.forecast.set(forecast);
        this.forecastLoading.set(false);
      },
      error: (error: ApiError) => {
        this.forecast.set(null);
        this.forecastError.set(error?.message || 'The forecast is unavailable.');
        this.forecastLoading.set(false);
      }
    });
  }

  /** The venue currently selected in the drop-down, if any. */
  private selectedVenue(): Venue | null {
    const id = String(this.form().venueId || '');
    return this.venues().find((venue) => String(venue.id) === id) ?? null;
  }

  /** The venue row shown next to the forecast panel. */
  protected readonly forecastVenue = computed(() => this.selectedVenue());

  /**
   * Validates the form and sends it to the API.
   *
   * @param event The DOM submit event, cancelled to stop a page reload.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    const state = this.form();
    const errors = validateEventForm(state);
    this.errors.set(errors);

    const invalid = Object.keys(errors).length;
    if (invalid > 0) {
      this.notice.set({
        tone: 'error',
        title: 'Nothing was sent',
        message: `${invalid} field${invalid === 1 ? '' : 's'} still need attention. The browser blocked the request before it left the page.`
      });
      // Move the caret to the first problem so the fix is one click away.
      const firstKey = Object.keys(errors)[0];
      const target = document.getElementById(firstKey) || document.querySelector('[aria-invalid="true"]');
      if (target instanceof HTMLElement) target.focus();
      return;
    }

    const payload = toEventPayload(state);
    this.saving.set(true);
    this.notice.set(null);

    const request = this.isEdit()
      ? this.api.updateEvent(this.eventId() as string, payload)
      : this.api.createEvent(payload);

    request.subscribe({
      next: (saved: CharityEvent) => {
        this.saving.set(false);
        if (this.isEdit()) {
          this.notice.set({
            tone: 'success',
            title: 'Changes saved',
            message: `"${saved.title}" was updated through PUT /api/events/${saved.id}.`
          });
          this.loadEvent(String(saved.id));
          return;
        }
        // Switch the page into edit mode for the new record, carrying the
        // confirmation through the router so the message survives the move.
        this.router.navigate(['/events', saved.id, 'edit'], {
          state: {
            notice: {
              tone: 'success',
              title: 'Event created',
              message: `"${saved.title}" was created through POST /api/events with id ${saved.id}.`
            }
          }
        });
      },
      error: (error: ApiError) => {
        this.saving.set(false);
        this.notice.set({
          tone: 'error',
          title: error?.status === 400 ? 'The API rejected the form' : 'Could not save the event',
          message: error?.message || API_OFFLINE_MESSAGE
        });
      }
    });
  }

  /** Discards local changes and reloads the stored event (edit mode only). */
  protected resetForm(): void {
    this.errors.set({});
    this.notice.set(null);
    if (this.isEdit() && this.eventId()) {
      this.loadEvent(this.eventId() as string);
      return;
    }
    this.form.set(emptyEventForm(this.defaultSchedule()));
  }

  /**
   * Formats the start of the event for the summary line.
   *
   * @param value Stored date-time.
   */
  protected dateLabel(value: string): string {
    return formatEventDate(value, 'medium');
  }

  /**
   * Formats one time for the summary line.
   *
   * @param value Stored date-time.
   */
  protected timeLabel(value: string): string {
    return formatTime(value);
  }

  /**
   * Formats a registration's purchase time.
   *
   * @param value Stored date-time.
   */
  protected registrationDate(value: string): string {
    return `${formatEventDate(value, 'medium')} ${formatTime(value)}`;
  }

  /**
   * Formats a money amount for the summary line.
   *
   * @param amount Number to format.
   */
  protected money(amount: number | string | null | undefined): string {
    return formatCurrency(amount, this.form().currency);
  }

}


/**
 * Converts a `Date` into the local `YYYY-MM-DDTHH:mm` a `datetime-local` wants.
 *
 * @param value Date to convert.
 */
function toInput(value: Date): string {
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/**
 * Turns a title into a slug that matches the server's `SLUG_PATTERN`.
 *
 * @param value Free text, typically the event title.
 */
function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}
