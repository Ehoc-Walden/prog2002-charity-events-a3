import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVENT_STATUS_FILTERS, LIST_SORTS, PAGE_SIZES } from '../../core/api-config';
import { ApiService } from '../../core/api.service';
import { API_OFFLINE_MESSAGE, ApiError } from '../../core/error';
import { CharityEvent, Pagination, StatusSummary } from '../../core/models';
import { formatCurrency, formatEventDate, formatTime } from '../../core/format';

/** One tile in the summary strip at the top of the dashboard. */
interface StatTile {
  /** Value sent to `GET /api/events?status=` when the tile is clicked. */
  filter: string;
  label: string;
  value: number;
}

/** A message shown to the staff member above the table. */
interface ConsoleNotice {
  tone: 'success' | 'error' | 'warn';
  title: string;
  message: string;
}

/**
 * Staff console dashboard - the "list feature" of the admin site.
 *
 * The page drives `GET /api/events`, which is the administrative list endpoint:
 * unlike the public search it returns every status (draft, published, suspended
 * and cancelled) and it understands two derived views, "active" and "past",
 * that the API works out from the end date.
 *
 * Filtering, searching, sorting and paging are all performed by the API, so the
 * browser only ever receives the rows it is about to draw. The tiles at the top
 * come from the `meta.summary` block the same response carries, which is why the
 * counters can never disagree with the rows underneath them.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard-page.html'
})
export class DashboardPage implements OnInit {
  private readonly api = inject(ApiService);

  /** Status choices offered by the filter drop-down. */
  protected readonly statusFilters = EVENT_STATUS_FILTERS;

  /** Sort choices offered by the filter drop-down. */
  protected readonly sortOptions = LIST_SORTS;

  /** Page sizes offered by the footer of the table. */
  protected readonly pageSizes = PAGE_SIZES;

  /** The rows currently on screen. */
  protected readonly events = signal<CharityEvent[]>([]);

  /** Pagination block returned next to the rows. */
  protected readonly pagination = signal<Pagination | null>(null);

  /** Status counters returned next to the rows. */
  protected readonly summary = signal<StatusSummary | null>(null);

  /** True while a list request is in flight. */
  protected readonly loading = signal(true);

  /** Id of the event whose delete request is in flight. */
  protected readonly busyId = signal<number | null>(null);

  /** The event the staff member has asked to delete, pending confirmation. */
  protected readonly pendingDelete = signal<CharityEvent | null>(null);

  /** Id of an event the API refused to delete, so the row can be highlighted. */
  protected readonly blockedId = signal<number | null>(null);

  /** Blocking failure, for example the API not running. */
  protected readonly error = signal<string | null>(null);

  /** Success or refusal message shown above the table. */
  protected readonly notice = signal<ConsoleNotice | null>(null);

  /** Value of the status filter control. */
  protected readonly statusFilter = signal('all');

  /** Value of the free-text search control. */
  protected readonly searchTerm = signal('');

  /** Value of the sort control. */
  protected readonly sortOrder = signal('start_desc');

  /** Rows requested per page. */
  protected readonly pageSize = signal(50);

  /** One-based page number currently requested. */
  protected readonly currentPage = signal(1);

  /**
   * The summary strip.
   *
   * "All", "Active" and "Past" are derived views; the remaining tiles are the
   * stored statuses. Each tile doubles as a filter button.
   */
  protected readonly tiles = computed<StatTile[]>(() => {
    const data = this.summary();
    if (!data) return [];
    const byStatus = data.byStatus || {};
    return [
      { filter: 'all', label: 'All events', value: Number(data.totalEvents) || 0 },
      { filter: 'active', label: 'Active', value: Number(data.byLifecycle?.active) || 0 },
      { filter: 'past', label: 'Past', value: Number(data.byLifecycle?.past) || 0 },
      { filter: 'published', label: 'Published', value: Number(byStatus['published']) || 0 },
      { filter: 'draft', label: 'Draft', value: Number(byStatus['draft']) || 0 },
      { filter: 'suspended', label: 'Suspended', value: Number(byStatus['suspended']) || 0 },
      { filter: 'cancelled', label: 'Cancelled', value: Number(byStatus['cancelled']) || 0 }
    ];
  });

  /** Total number of pages reported by the API. */
  protected readonly totalPages = computed(() => this.pagination()?.totalPages ?? 1);

  /** Human readable "showing x-y of n" label. */
  protected readonly rangeLabel = computed(() => {
    const page = this.pagination();
    if (!page || page.total === 0) return 'No events to show';
    const first = (page.page - 1) * page.limit + 1;
    const last = Math.min(page.page * page.limit, page.total);
    return `Showing ${first}-${last} of ${page.total} events`;
  });

  /** Up to five page numbers centred on the current page. */
  protected readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 2, Math.max(1, total - 4)));
    const numbers: number[] = [];
    for (let page = start; page <= Math.min(total, start + 4); page += 1) numbers.push(page);
    return numbers;
  });

  /** True when a filter is narrowing the list, so "Clear" makes sense. */
  protected readonly hasFilters = computed(
    () => this.statusFilter() !== 'all' || Boolean(this.searchTerm().trim())
  );

  /** Loads the first page as soon as the route is opened. */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Requests the current page from the API.
   *
   * Every control on the page funnels through here, so there is exactly one
   * place that knows how a filter becomes a query string.
   */
  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listEvents({
        status: this.statusFilter(),
        search: this.searchTerm().trim(),
        sort: this.sortOrder(),
        page: this.currentPage(),
        limit: this.pageSize()
      })
      .subscribe({
        next: (result) => {
          this.events.set(result.items);
          this.pagination.set(result.pagination);
          this.summary.set(result.summary ?? null);
          this.loading.set(false);
        },
        error: (error: Error) => {
          this.events.set([]);
          this.pagination.set(null);
          this.error.set(error?.message || API_OFFLINE_MESSAGE);
          this.loading.set(false);
        }
      });
  }

  /**
   * Handles the filter form submit.
   *
   * @param event The DOM submit event, cancelled so the browser does not reload.
   */
  protected applyFilters(event: Event): void {
    event.preventDefault();
    this.currentPage.set(1);
    this.load();
  }

  /** Clears the search box and the status filter and reloads page one. */
  protected clearFilters(): void {
    this.statusFilter.set('all');
    this.searchTerm.set('');
    this.sortOrder.set('start_desc');
    this.currentPage.set(1);
    this.load();
  }

  /**
   * Filters the list by a status tile or drop-down value.
   *
   * @param status One of the values accepted by `validateEventListQuery`.
   */
  protected selectStatus(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.load();
  }

  /**
   * Jumps to a page, ignoring clicks on the page already shown.
   *
   * @param page One-based page number.
   */
  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.load();
  }

  /**
   * Changes the page size and returns to the first page.
   *
   * @param value Raw value from the page size control.
   */
  protected changePageSize(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    this.pageSize.set(parsed);
    this.currentPage.set(1);
    this.load();
  }

  /**
   * Asks the staff member to confirm a delete.
   *
   * @param event The row being removed.
   */
  protected askToDelete(event: CharityEvent): void {
    this.notice.set(null);
    this.pendingDelete.set(event);
  }

  /** Abandons a pending delete. */
  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  /**
   * Deletes the confirmed event.
   *
   * The API answers 409 when the event already has registrations. That refusal
   * is shown as a warning rather than an error, because nothing has gone wrong:
   * the rule protecting the attendee records has simply done its job.
   */
  protected confirmDelete(): void {
    const event = this.pendingDelete();
    if (!event) return;

    this.busyId.set(event.id);
    this.notice.set(null);
    this.api.deleteEvent(event.id).subscribe({
      next: (result) => {
        this.busyId.set(null);
        this.pendingDelete.set(null);
        this.blockedId.set(null);
        this.notice.set({
          tone: 'success',
          title: 'Event deleted',
          message: `${result.message} The list has been refreshed.`
        });
        // Deleting the last row of a page would leave it empty, so step back.
        if (this.events().length === 1 && this.currentPage() > 1) {
          this.currentPage.set(this.currentPage() - 1);
        }
        this.load();
      },
      error: (error: ApiError) => {
        this.busyId.set(null);
        this.pendingDelete.set(null);
        this.blockedId.set(error?.status === 409 ? event.id : null);
        this.notice.set({
          tone: error?.status === 409 ? 'warn' : 'error',
          title: error?.status === 409 ? 'Delete blocked' : 'Could not delete the event',
          message: error?.message || API_OFFLINE_MESSAGE
        });
      }
    });
  }

  /**
   * Applies a new sort order and reloads the first page.
   *
   * @param value Raw value from the sort control.
   */
  protected applySort(value: string): void {
    this.sortOrder.set(value);
    this.currentPage.set(1);
    this.load();
  }

  /**
   * Formats the ticket price column.
   *
   * @param event The row being drawn.
   */
  protected priceLabel(event: CharityEvent): string {
    if (event.ticket?.isFree) return 'Free';
    return formatCurrency(Number(event.ticket?.price) || 0, event.ticket?.currency);
  }

  /**
   * Formats an event date for the table.
   *
   * @param value Stored start date-time.
   */
  protected dateLabel(value: string): string {
    return formatEventDate(value, 'medium');
  }

  /**
   * Formats an event time for the table.
   *
   * @param event The row being drawn.
   */
  protected timeLabel(event: CharityEvent): string {
    return `${formatTime(event.startDateTime)} - ${formatTime(event.endDateTime)}`;
  }

  /**
   * Formats the fundraising figure for the table.
   *
   * @param event The row being drawn.
   */
  protected moneyLabel(event: CharityEvent): string {
    const raised = Number(event.fundraising?.raised) || 0;
    const goal = Number(event.fundraising?.goal) || 0;
    return `${formatCurrency(raised, event.ticket?.currency)} of ${formatCurrency(goal, event.ticket?.currency)}`;
  }

  /**
   * Chooses the CSS class for a status chip.
   *
   * A published event whose end date has passed is drawn as "Past", because
   * that is the more useful of the two facts for a staff member scanning a list.
   *
   * @param event The row being drawn.
   */
  protected statusClass(event: CharityEvent): string {
    const status = this.isPast(event) ? 'past' : String(event.status || 'draft');
    return `status-chip status-${status}`;
  }

  /**
   * Chooses the text for a status chip.
   *
   * @param event The row being drawn.
   */
  protected statusLabel(event: CharityEvent): string {
    return this.isPast(event) ? 'Past' : String(event.status || 'draft');
  }

  /**
   * True when the event has finished.
   *
   * @param event The row being drawn.
   */
  protected isPast(event: CharityEvent): boolean {
    return Boolean(event.isPast) || String(event.status) === 'past';
  }
}