import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { API_OFFLINE_MESSAGE } from '../../core/error';
import { Category, CharityEvent, LocationOption, Pagination } from '../../core/models';
import { EventCard } from '../../shared/event-card/event-card';
import { FULL_MONTHS, localDateString } from '../../core/format';

/** Time range the visitor is searching in. */
type Scope = 'upcoming' | 'past' | 'all';

/**
 * Search page of the client website.
 *
 * Data flow: the form is validated in the browser first (the same rules the
 * Express layer re-checks), the validated filters are serialised into the URL
 * query string so a search can be bookmarked or shared, and
 * `GET /api/events/search` returns the matching events plus a pagination block.
 *
 * Every value is written into the DOM through Angular interpolation or a
 * property binding, so the page never uses `innerHTML` and never trusts the
 * server payload as markup.
 */
@Component({
  selector: 'app-search-page',
  imports: [EventCard],
  templateUrl: './search-page.html'
})
export class SearchPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** English month names for the month drop-down. */
  protected readonly months = FULL_MONTHS;

  /** Categories loaded from `GET /api/categories`. */
  protected readonly categories = signal<Category[]>([]);

  /** Distinct Sydney suburbs loaded from `GET /api/locations`. */
  protected readonly locations = signal<LocationOption[]>([]);

  /** Matching events returned by the API. */
  protected readonly results = signal<CharityEvent[]>([]);

  /** Paging block returned in the response `meta`. */
  protected readonly pagination = signal<Pagination | null>(null);

  /** True while a search request is in flight. */
  protected readonly loading = signal(true);

  /** True once at least one search has completed, so the empty state can show. */
  protected readonly searched = signal(false);

  /** Transport or validation error shown above the results. */
  protected readonly error = signal<string | null>(null);

  /** The scope selector value. */
  protected readonly scope = signal<Scope>('upcoming');

  /** Selected day ("01".."31") or an empty string. */
  protected readonly day = signal('');

  /** Selected month ("01".."12") or an empty string. */
  protected readonly month = signal('');

  /** Selected year ("2026") or an empty string. */
  protected readonly year = signal('');

  /** Selected suburb, or an empty string for "anywhere". */
  protected readonly location = signal('');

  /** Ticked category slugs. */
  protected readonly selectedCategories = signal<string[]>([]);

  /** Sort key accepted by `validateSearchQuery`. */
  protected readonly sort = signal('date_asc');

  /** Inline validation message for the date fieldset. */
  protected readonly dateError = signal<string | null>(null);

  /** Human readable summary of the filters currently applied. */
  protected readonly activeFilters = computed(() => {
    const chips: Array<{ type: string; value: string; label: string }> = [];
    if (this.scope() !== 'upcoming') {
      chips.push({ type: 'scope', value: this.scope(), label: this.scope() === 'past' ? 'Past events' : 'All published events' });
    }
    const date = this.dateValue();
    if (date) chips.push({ type: 'date', value: date, label: `On ${this.prettyDate(date)}` });
    if (this.location()) chips.push({ type: 'location', value: this.location(), label: this.location() });
    for (const slug of this.selectedCategories()) {
      const match = this.categories().find((category) => category.slug === slug);
      chips.push({ type: 'category', value: slug, label: match?.name || slug });
    }
    return chips;
  });

  /** Heading shown above the results, mirroring A2's scope label. */
  protected readonly resultsTitle = computed(() => {
    switch (this.scope()) {
      case 'past': return 'Past events';
      case 'all': return 'Published events';
      default: return 'Upcoming events';
    }
  });

  /** Day numbers rebuilt whenever the chosen month or year changes. */
  protected readonly dayOptions = computed(() => {
    const month = this.month();
    const year = this.year();
    const days = month ? new Date(year ? Number(year) : 2000, Number(month), 0).getDate() : 31;
    return Array.from({ length: days }, (_, index) => index + 1);
  });

  /** Year choices covering five years back and two years forward. */
  protected readonly yearOptions = computed(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, index) => current - 5 + index);
  });

  /** Reads any filters that were placed in the URL, then runs the first search. */
  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.scope.set(this.readScope(params.get('scope')));
      this.location.set(params.get('location') ?? '');
      this.sort.set(params.get('sort') ?? 'date_asc');
      this.selectedCategories.set(params.getAll('category'));
      const date = params.get('date') ?? '';
      this.day.set(date ? date.slice(8, 10) : '');
      this.month.set(date ? date.slice(5, 7) : '');
      this.year.set(date ? date.slice(0, 4) : '');
      this.loadReferenceData();
      this.runSearch(1);
    });
  }

  /** Loads the category and location drop-downs once per navigation. */
  private loadReferenceData(): void {
    this.api.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([])
    });
    this.api.getLocations().subscribe({
      next: (locations) => this.locations.set(locations),
      error: () => this.locations.set([])
    });
  }

  /** Combines the three date selects into a single `YYYY-MM-DD` value. */
  protected dateValue(): string {
    const day = this.day();
    const month = this.month();
    const year = this.year();
    if (!day || !month || !year) return '';
    return `${year}-${month}-${day}`;
  }

  /** True when the visitor filled in only part of the date. */
  protected datePartial(): boolean {
    const parts = [this.day(), this.month(), this.year()].filter(Boolean).length;
    return parts > 0 && parts < 3;
  }

  /** Formats `YYYY-MM-DD` as "14 Oct 2026" for the filter chips. */
  private prettyDate(value: string): string {
    const found = this.findingDate(value);
    if (!found) return value;
    return `${Number(value.slice(8, 10))} ${FULL_MONTHS[found.getMonth()].slice(0, 3)} ${value.slice(0, 4)}`;
  }

  /** @returns A `Date` for a `YYYY-MM-DD` string, or null when it is invalid. */
  private findingDate(value: string): Date | null {
    const found = new Date(`${value}T00:00:00`);
    return Number.isNaN(found.getTime()) ? null : found;
  }

  /** @returns The scope value from the URL, defaulting to `upcoming`. */
  private readScope(value: string | null): Scope {
    return value === 'past' || value === 'all' ? value : 'upcoming';
  }

  /**
   * Client-side validation, mirroring the rules in
   * `api/src/utils/validation.js` so the visitor is told about a mistake before
   * a request is sent.
   *
   * @returns A list of problems, empty when the filters are valid.
   */
  private validate(): string[] {
    this.dateError.set(null);
    const problems: string[] = [];
    if (this.datePartial()) {
      this.dateError.set('Choose a day, month and year, or clear all three date fields.');
      problems.push('Event date is incomplete.');
      return problems;
    }
    const value = this.dateValue();
    if (!value) return problems;

    const chosen = this.findingDate(value);
    if (!chosen) {
      this.dateError.set('That date is not valid.');
      problems.push('Event date is not valid.');
      return problems;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (this.scope() === 'upcoming' && chosen < today) {
      this.dateError.set('Choose today or a future date, or switch the time range to past events.');
      problems.push('Event date cannot be in the past while searching upcoming events.');
    }
    const limit = new Date(today);
    limit.setMonth(limit.getMonth() + 24);
    if (chosen > limit) {
      this.dateError.set('Choose a date within the next 24 months.');
      problems.push('Event date is too far in the future.');
    }
    return problems;
  }

  /** Runs the search for a specific page and keeps the URL in sync. */
  protected runSearch(page: number, syncUrl = true): void {
    const problems = this.validate();
    if (problems.length) {
      this.error.set(null);
      this.results.set([]);
      this.pagination.set(null);
      this.loading.set(false);
      this.searched.set(true);
      return;
    }

    if (syncUrl) this.syncUrl(page);

    this.loading.set(true);
    this.error.set(null);
    this.api.searchEvents({
      date: this.dateValue(),
      location: this.location(),
      categories: this.selectedCategories(),
      sort: this.sort(),
      scope: this.scope(),
      page,
      limit: 9
    }).subscribe({
      next: (result) => {
        this.results.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
        this.searched.set(true);
      },
      error: (failure: Error) => {
        this.error.set(failure?.message || API_OFFLINE_MESSAGE);
        this.results.set([]);
        this.pagination.set(null);
        this.loading.set(false);
        this.searched.set(true);
      }
    });
  }

  /** Writes the current filters into the URL query string. */
  private syncUrl(page: number): void {
    const queryParams: Record<string, string | string[]> = {};
    if (this.scope() !== 'upcoming') queryParams['scope'] = this.scope();
    const date = this.dateValue();
    if (date) queryParams['date'] = date;
    if (this.location()) queryParams['location'] = this.location();
    if (this.selectedCategories().length) queryParams['category'] = this.selectedCategories();
    if (this.sort() !== 'date_asc') queryParams['sort'] = this.sort();
    if (page > 1) queryParams['page'] = String(page);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  /** Handles the scope drop-down changing. */
  protected onScopeChange(value: string): void {
    this.scope.set(this.readScope(value));
    this.runSearch(1);
  }

  /** Handles the location drop-down changing. */
  protected onLocationChange(value: string): void {
    this.location.set(value);
    this.runSearch(1);
  }

  /** Handles the sort drop-down changing. */
  protected onSortChange(value: string): void {
    this.sort.set(value);
    this.runSearch(1);
  }

  /** Handles one of the three date selects changing. */
  protected onDateChange(part: 'day' | 'month' | 'year', value: string): void {
    if (part === 'day') this.day.set(value);
    else if (part === 'month') this.month.set(value);
    else this.year.set(value);

    // Clamp the day when the month gets shorter (for example 31 -> February).
    const max = this.dayOptions().length;
    if (this.day() && Number(this.day()) > max) this.day.set(String(max).padStart(2, '0'));
  }

  /** Adds or removes a category from the search. */
  protected toggleCategory(slug: string, checked: boolean): void {
    const current = new Set(this.selectedCategories());
    if (checked) current.add(slug);
    else current.delete(slug);
    this.selectedCategories.set([...current]);
  }

  /** @returns True when a category is currently ticked. */
  protected isSelected(slug: string): boolean {
    return this.selectedCategories().includes(slug);
  }

  /** Submits the filter form. */
  protected onSubmit(): void {
    this.runSearch(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Clears every filter and reloads the default upcoming list. */
  protected clearAll(): void {
    this.scope.set('upcoming');
    this.day.set('');
    this.month.set('');
    this.year.set('');
    this.location.set('');
    this.selectedCategories.set([]);
    this.sort.set('date_asc');
    this.dateError.set(null);
    this.runSearch(1);
  }

  /** Removes one filter chip. */
  protected removeFilter(type: string, value: string): void {
    switch (type) {
      case 'date':
        this.day.set('');
        this.month.set('');
        this.year.set('');
        this.dateError.set(null);
        break;
      case 'location':
        this.location.set('');
        break;
      case 'scope':
        this.scope.set('upcoming');
        break;
      case 'category':
        this.selectedCategories.set(this.selectedCategories().filter((slug) => slug !== value));
        break;
    }
    this.runSearch(1);
  }

  /** True when a previous page exists. */
  protected hasPrevious(): boolean {
    return (this.pagination()?.page ?? 1) > 1;
  }

  /** True when a following page exists. */
  protected hasNext(): boolean {
    const paging = this.pagination();
    return !!paging && paging.page < paging.totalPages;
  }

  /** Moves to the previous result page. */
  protected previousPage(): void {
    const page = this.pagination()?.page ?? 1;
    if (page > 1) this.runSearch(page - 1);
  }

  /** Moves to the next result page. */
  protected nextPage(): void {
    const paging = this.pagination();
    if (paging && paging.page < paging.totalPages) this.runSearch(paging.page + 1);
  }

  /** Builds an array of page numbers for the pager, capped at seven links. */
  protected pageNumbers(): number[] {
    const paging = this.pagination();
    if (!paging) return [];
    const total = paging.totalPages;
    const current = paging.page;
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const start = Math.max(1, Math.min(current - 3, total - 6));
    return Array.from({ length: 7 }, (_, index) => start + index);
  }

  /** Resets the filters from the empty state button. */
  protected resetFromEmpty(): void {
    this.clearAll();
  }

  /** Exposes the local-date helper to the template for the "today" hint. */
  protected today(): string {
    return localDateString(new Date());
  }
}