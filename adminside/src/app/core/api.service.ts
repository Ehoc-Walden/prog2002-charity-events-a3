import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, catchError, map, timeout } from 'rxjs';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './api-config';
import { API_OFFLINE_MESSAGE, API_TIMEOUT_MESSAGE, ApiError } from './error';
import {
  AdminListFilters,
  Category,
  CharityEvent,
  EventDetail,
  EventPayload,
  Organisation,
  Pagination,
  Registration,
  StatusSummary,
  Venue
} from './models';

/**
 * @file The only place in the staff console that talks to the REST API.
 *
 * Every method returns a typed `Observable`, applies a shared timeout and
 * converts any failure into an `ApiError`, so the pages never have to inspect
 * an `HttpErrorResponse` themselves. Nothing here is hard coded: each endpoint
 * mirrors a router in `api/src/routes`.
 *
 * The console deliberately only needs the administrative half of the API. The
 * public half (search, upcoming, registration) lives in the client website.
 */

/** Envelope every successful API response uses. */
interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Result of a paged list request, including the dashboard status summary. */
export interface PagedResult<T> {
  items: T[];
  pagination: Pagination;
  summary?: StatusSummary;
}

/** Result of a delete request. */
export interface DeleteResult {
  id: number;
  title?: string;
  name?: string;
  message: string;
}

/**
 * Typed HTTP client for the charity events API.
 *
 * Provided once at the application root (`providedIn: 'root'`), so Angular
 * injects the same instance into the dashboard, event form and category pages.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  /**
   * Wraps one HTTP call with the shared timeout and error translation.
   *
   * @param source Observable returned by `HttpClient`.
   * @returns The `data` member of the API envelope, strongly typed.
   */
  private request<T>(source: Observable<ApiEnvelope<T>>): Observable<T> {
    return source.pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((body) => body.data),
      catchError((error: unknown) => { throw this.translateError(error); })
    );
  }

  /**
   * Same as `request` but keeps the `meta` block, which the dashboard needs for
   * its pagination counters and its status summary tiles.
   *
   * @param source Observable returned by `HttpClient`.
   * @returns The full API envelope including `meta`.
   */
  private requestEnvelope<T>(source: Observable<ApiEnvelope<T>>): Observable<ApiEnvelope<T>> {
    return source.pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown) => { throw this.translateError(error); })
    );
  }

  /**
   * Converts any RxJS or HTTP failure into a single `ApiError`.
   *
   * @param error Error raised by `HttpClient` or by the timeout operator.
   * @returns An `ApiError` whose message is safe to show to a staff member.
   */
  private translateError(error: unknown): ApiError {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as { error?: { message?: string } | string; message?: string } | null;
      let message = '';
      if (payload && typeof payload === 'object') {
        if (typeof payload.error === 'string') message = payload.error;
        else if (payload.error && typeof payload.error.message === 'string') message = payload.error.message;
        else if (typeof payload.message === 'string') message = payload.message;
      }
      if (!message) {
        message = error.status === 0 ? API_OFFLINE_MESSAGE : `The API request failed with status ${error.status}.`;
      }
      return new ApiError(message, error.status, error.error);
    }
    if (error instanceof TimeoutError) return new ApiError(API_TIMEOUT_MESSAGE, 0);
    return new ApiError(error instanceof Error ? error.message : 'Unexpected error.', 0);
  }
  /**
   * GET /api/events - the admin list feature.
   *
   * Returns every event regardless of status, so the dashboard can also show
   * drafts, suspended and cancelled records. The response also carries the
   * pagination block and the status summary used by the tiles.
   *
   * @param filters Status filter, free-text search, sort and paging.
   */
  listEvents(filters: AdminListFilters): Observable<PagedResult<CharityEvent>> {
    let params = new HttpParams().set('status', filters.status).set('sort', filters.sort);
    if (filters.search) params = params.set('q', filters.search);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);

    return this.requestEnvelope(this.http.get<ApiEnvelope<CharityEvent[]>>(`${this.baseUrl}/events`, { params }))
      .pipe(map((body) => ({
        items: body.data,
        pagination: body.meta?.['pagination'] as Pagination,
        summary: body.meta?.['summary'] as StatusSummary
      })));
  }

  /**
   * GET /api/events/:eventId - admin read, including unpublished events.
   *
   * The `includeUnpublished=1` flag is what lets the console open a draft,
   * suspended or cancelled record; without it the API answers 404 by design.
   *
   * @param eventId Event primary key.
   */
  getEventForAdmin(eventId: number | string): Observable<EventDetail> {
    const params = new HttpParams().set('includeUnpublished', '1');
    return this.request<EventDetail>(
      this.http.get<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events/${eventId}`, { params })
    );
  }

  /**
   * POST /api/events - creates a charity event.
   *
   * @param payload Validated event payload built by the event form.
   */
  createEvent(payload: EventPayload): Observable<EventDetail> {
    return this.request<EventDetail>(this.http.post<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events`, payload));
  }

  /**
   * PUT /api/events/:eventId - updates a charity event.
   *
   * @param eventId Event primary key.
   * @param payload Validated event payload built by the event form.
   */
  updateEvent(eventId: number | string, payload: EventPayload): Observable<EventDetail> {
    return this.request<EventDetail>(this.http.put<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events/${eventId}`, payload));
  }

  /**
   * DELETE /api/events/:eventId - the API answers 409 when the event already
   * has registrations, which the dashboard shows as a friendly explanation
   * instead of a generic failure.
   *
   * @param eventId Event primary key.
   */
  deleteEvent(eventId: number | string): Observable<DeleteResult> {
    return this.requestEnvelope(this.http.delete<ApiEnvelope<Omit<DeleteResult, 'message'>>>(`${this.baseUrl}/events/${eventId}`))
      .pipe(map((body) => ({ ...body.data, message: String(body.meta?.['message'] ?? 'Event deleted.') })));
  }
  /**
   * GET /api/events/:eventId/registrations - the tickets sold for one event,
   * newest purchase first, used by the Edit event screen.
   *
   * @param eventId Event primary key.
   */
  getEventRegistrations(eventId: number | string): Observable<Registration[]> {
    return this.request<Registration[]>(this.http.get<ApiEnvelope<Registration[]>>(`${this.baseUrl}/events/${eventId}/registrations`));
  }

  /**
   * GET /api/categories - the categories used by the event form and the
   * category manager.
   *
   * @param includeInactive Pass true on the admin site so retired categories
   *   are still listed and can be switched back on.
   */
  getCategories(includeInactive = false): Observable<Category[]> {
    const params = includeInactive ? new HttpParams().set('includeInactive', '1') : undefined;
    return this.request<Category[]>(this.http.get<ApiEnvelope<Category[]>>(`${this.baseUrl}/categories`, { params }));
  }

  /** GET /api/organisations - organisations offered by the event form. */
  getOrganisations(): Observable<Organisation[]> {
    return this.request<Organisation[]>(this.http.get<ApiEnvelope<Organisation[]>>(`${this.baseUrl}/organisations`));
  }

  /**
   * GET /api/venues - venues offered by the event form.
   *
   * The venue row carries the latitude and longitude that the weather feature
   * uses, so the form can request a forecast without a second lookup.
   */
  getVenues(): Observable<Venue[]> {
    return this.request<Venue[]>(this.http.get<ApiEnvelope<Venue[]>>(`${this.baseUrl}/venues`));
  }
  /**
   * POST /api/categories - creates a category.
   *
   * @param payload Category fields; the API validates name, slug and colour.
   */
  createCategory(payload: Partial<Category>): Observable<Category> {
    return this.request<Category>(this.http.post<ApiEnvelope<Category>>(`${this.baseUrl}/categories`, payload));
  }

  /**
   * PUT /api/categories/:categoryId - updates a category.
   *
   * @param categoryId Category primary key.
   * @param payload Category fields; the API validates name, slug and colour.
   */
  updateCategory(categoryId: number, payload: Partial<Category>): Observable<Category> {
    return this.request<Category>(this.http.put<ApiEnvelope<Category>>(`${this.baseUrl}/categories/${categoryId}`, payload));
  }

  /**
   * DELETE /api/categories/:categoryId - refused by the API with HTTP 409 while
   * any event still references the category.
   *
   * @param categoryId Category primary key.
   */
  deleteCategory(categoryId: number): Observable<DeleteResult> {
    return this.requestEnvelope(this.http.delete<ApiEnvelope<{ id: number; name: string }>>(`${this.baseUrl}/categories/${categoryId}`))
      .pipe(map((body) => ({ ...body.data, message: String(body.meta?.['message'] ?? 'Category deleted.') })));
  }
}