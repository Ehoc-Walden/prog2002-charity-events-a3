import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { API_OFFLINE_MESSAGE } from '../../core/error';
import { EventCard } from '../../shared/event-card/event-card';
import { CharityEvent } from '../../core/models';
import { formatCompactCurrency, formatEventDate, formatTime } from '../../core/format';

/**
 * Home page of the Common Ground client website.
 *
 * The whole page is data driven: the "city thread", the impact counter and the
 * event grid are all rendered from the single `GET /api/events/upcoming` call,
 * so nothing on the page can fall out of sync with MySQL. No page markup is
 * duplicated between routes - this component only supplies the body.
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, EventCard],
  templateUrl: './home-page.html'
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService);

  /** Every upcoming event returned by the API (the page uses the first six). */
  protected readonly events = signal<CharityEvent[]>([]);

  /** True while the first API response is still in flight. */
  protected readonly loading = signal(true);

  /** Friendly error shown in place of the grid when the API is unreachable. */
  protected readonly error = signal<string | null>(null);

  /** The six events rendered in the main "upcoming with heart" grid. */
  protected readonly featured = computed(() => this.events().slice(0, 6));

  /** The first three events used by the live "city thread" timeline. */
  protected readonly thread = computed(() => this.events().slice(0, 3));

  /** Sum of the funds raised across every upcoming event. */
  protected readonly raisedTotal = computed(() =>
    this.events().reduce((total, event) => total + (Number(event.fundraising?.raised) || 0), 0)
  );

  /** Compact currency label for the impact strip, for example "$182.4k". */
  protected readonly raisedLabel = computed(() => formatCompactCurrency(this.raisedTotal(), 'AUD'));

  /** Number of upcoming events, shown in the hero proof list. */
  protected readonly upcomingCount = computed(() => this.events().length);

  /** Loads the upcoming events once the page is constructed. */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Calls the upcoming-events endpoint and stores the result.
   *
   * Extracted so the error banner's "Try again" button can re-run exactly the
   * same request without a page reload.
   */
  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getUpcomingEvents(12).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.error.set(error?.message || API_OFFLINE_MESSAGE);
        this.loading.set(false);
      }
    });
  }

  /** Formats a date for the city-thread markers. */
  protected threadDate(event: CharityEvent): string {
    return formatEventDate(event.startDateTime, 'medium');
  }

  /** Formats the start time for the city-thread markers. */
  protected threadTime(event: CharityEvent): string {
    return formatTime(event.startDateTime);
  }
}