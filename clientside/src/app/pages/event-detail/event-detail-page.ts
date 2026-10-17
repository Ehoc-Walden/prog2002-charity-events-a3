import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { WeatherService } from '../../core/weather.service';
import { API_OFFLINE_MESSAGE } from '../../core/error';
import { CharityEvent, EventDetail, Forecast } from '../../core/models';
import {
  formatCurrency,
  formatEventDate,
  formatNumber,
  formatTicket,
  formatTimeRange,
  initials,
  progressPercent,
  progressStatus,
  resolveAssetPath
} from '../../core/format';

/**
 * Event detail page.
 *
 * This is the page Assessment 2 already had, extended for Assessment 3 with two
 * new data sources:
 *
 *   1. the registration list (`GET /api/events/:id/registrations`, newest
 *      purchase first) plus the summary counters the API returns alongside it,
 *   2. the external weather forecast for the venue
 *      (`GET /api/weather/events/:id`, which proxies Open-Meteo).
 *
 * The "Register for this event" button routes to the new registration page and
 * passes the event id through the URL query string.
 */
@Component({
  selector: 'app-event-detail-page',
  imports: [RouterLink],
  templateUrl: './event-detail-page.html'
})
export class EventDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly weather = inject(WeatherService);

  /** The loaded event, or null while it is loading or missing. */
  protected readonly event = signal<EventDetail | null>(null);

  /** Forecast for the venue, when the venue has coordinates. */
  protected readonly forecast = signal<Forecast | null>(null);

  /** True while the event request is in flight. */
  protected readonly loading = signal(true);

  /** Message shown when the event cannot be loaded at all. */
  protected readonly error = signal<string | null>(null);

  /** Non-blocking note shown when only the weather call fails. */
  protected readonly weatherError = signal<string | null>(null);

  /** 0-100 fundraising percentage for the progress card. */
  protected readonly percent = computed(() => progressPercent(this.event()?.fundraising));

  /** Human readable label for the progress percentage. */
  protected readonly progressLabel = computed(() => progressStatus(this.percent()));

  /** Formatted price ("Free" or "$25.00"). */
  protected readonly ticketLabel = computed(() => formatTicket(this.event()?.ticket));

  /** Full-bleed cover image path. */
  protected readonly coverPath = computed(() => resolveAssetPath(this.event()?.heroImage));

  /** Long English date, for example "Wednesday, 14 Oct 2026". */
  protected readonly longDate = computed(() => formatEventDate(this.event()?.startDateTime, 'long'));

  /** "6:30 pm - 9:00 pm". */
  protected readonly timeRange = computed(() => formatTimeRange(this.event()?.startDateTime, this.event()?.endDateTime));

  /** Two-letter organiser monogram. */
  protected readonly organiserInitials = computed(() => initials(this.event()?.organisation?.name));

  /** Number formatted with thousands separators. */
  protected readonly formatNumber = formatNumber;

  /** Currency formatter exposed to the template. */
  protected readonly formatCurrency = formatCurrency;

  /** Loads the event as soon as the route parameter is known. */
  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const eventId = params.get('eventId');
      if (!eventId) {
        this.error.set('No event was requested.');
        this.loading.set(false);
        return;
      }
      this.load(eventId);
    });
  }

  /**
   * Loads the event and then the forecast for its venue.
   *
   * @param eventId Event primary key taken from the route.
   */
  private load(eventId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.forecast.set(null);
    this.weatherError.set(null);

    this.api.getEvent(eventId).subscribe({
      next: (detail) => {
        this.event.set(detail);
        this.loading.set(false);
        this.loadForecast(eventId);
      },
      error: (failure: Error) => {
        this.error.set(failure?.message || API_OFFLINE_MESSAGE);
        this.loading.set(false);
      }
    });
  }

  /** Loads the external forecast; a failure here never blocks the page. */
  private loadForecast(eventId: string): void {
    this.weather.getEventForecast(eventId, 5).subscribe({
      next: (forecast) => this.forecast.set(forecast),
      error: (failure: Error) => this.weatherError.set(failure?.message || 'The forecast is unavailable right now.')
    });
  }

  /** True when the event can still be registered for. */
  protected canRegister(): boolean {
    const detail = this.event();
    if (!detail) return false;
    return !detail.isPast && detail.status === 'published';
  }

  /** Human readable status shown in the hero meta strip. */
  protected statusLabel(): string {
    const detail = this.event();
    if (!detail) return '';
    if (detail.status === 'suspended') return 'Suspended';
    if (detail.status === 'cancelled') return 'Cancelled';
    if (detail.status === 'draft') return 'Draft';
    return detail.isPast ? 'Past event' : 'Upcoming event';
  }
}