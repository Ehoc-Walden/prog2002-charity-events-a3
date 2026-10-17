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
  LocationOption,
  Organisation,
  Pagination,
  Registration,
  RegistrationPayload,
  SearchFilters,
  StatusSummary,
  Venue
} from './models';

/**
 * @file The only place in the client application that talks to the REST API.
 *
 * Every method returns a typed `Observable`, applies a timeout and converts any
 * failure into an {@link ApiError}. Nothing here is hard coded: the endpoints
 * mirror the Express routers in `api/src/routes`.
 */

/** Envelope every successful API response uses. */
interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** Result of a paged list request. */
export interface PagedResult<T> {
  items: T[];
  pagination: Pagination;
  summary?: StatusSummary;
}

/** Result of a search request. */
export interface SearchResult {
  items: CharityEvent[];
  pagination: Pagination;
}

/** Result of a registration request. */
export interface RegistrationResult {
  registration: Registration;
  event: { id: number; title: string; ticketPrice: number; currency: string; totalCost: number };
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
 * injects the same instance into the home, search, detail, register and admin
 * pages.
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
   * Same as {@link request} but keeps the `meta` block, which the pages need
   * for pagination counters and the admin status summary.
   */
  private requestEnvelope<T>(source: Observable<ApiEnvelope<T>>): Observable<ApiEnvelope<T>> {
    return source.pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown) => { throw this.translateError(error); })
    );
  }

  /**
   * Converts any RxJS or HTTP failure into a single {@link ApiError}.
   *
   * @param error Error raised by `HttpClient` or by the timeout operator.
   * @returns An `ApiError` ready to be displayed.
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
   * GET /api/events/upcoming - next published events for the home page.
   *
   * @param limit How many events to return (the API caps this at 20).
   */
  getUpcomingEvents(limit = 6): Observable<CharityEvent[]> {
    const params = new HttpParams().set('limit', limit);
    return this.request<CharityEvent[]>(this.http.get<ApiEnvelope<CharityEvent[]>>(`${this.baseUrl}/events/upcoming`, { params }));
  }

  /**
   * GET /api/events/search - the search page query.
   *
   * @param filters Validated filter object (see {@link SearchFilters}).
   */
  searchEvents(filters: SearchFilters): Observable<SearchResult> {
    let params = new HttpParams();
    if (filters.date) params = params.set('date', filters.date);
    if (filters.location) params = params.set('location', filters.location);
    for (const category of filters.categories) params = params.append('category', category);
    if (filters.scope) params = params.set('scope', filters.scope);
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);

    return this.requestEnvelope(this.http.get<ApiEnvelope<CharityEvent[]>>(`${this.baseUrl}/events/search`, { params }))
      .pipe(map((body) => ({ items: body.data, pagination: body.meta?.['pagination'] as Pagination })));
  }

  /**
   * GET /api/events/:eventId - event detail plus registrations and highlights.
   *
   * @param eventId Event primary key taken from the route.
   */
  getEvent(eventId: number | string): Observable<EventDetail> {
    return this.request<EventDetail>(this.http.get<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events/${eventId}`));
  }

  /**
   * GET /api/events - the admin list, which includes every status.
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
   * @param eventId Event primary key.
   */
  getEventForAdmin(eventId: number | string): Observable<EventDetail> {
    return this.request<EventDetail>(this.http.get<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events/${eventId}`));
  }

  /**
   * POST /api/events - creates a charity event.
   *
   * @param payload Validated event payload built by the admin form.
   */
  createEvent(payload: EventPayload): Observable<EventDetail> {
    return this.request<EventDetail>(this.http.post<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events`, payload));
  }

  /**
   * PUT /api/events/:eventId - updates a charity event.
   *
   * @param eventId Event primary key.
   * @param payload Validated event payload built by the admin form.
   */
  updateEvent(eventId: number | string, payload: EventPayload): Observable<EventDetail> {
    return this.request<EventDetail>(this.http.put<ApiEnvelope<EventDetail>>(`${this.baseUrl}/events/${eventId}`, payload));
  }

  /**
   * DELETE /api/events/:eventId - blocked by the API with HTTP 409 when the
   * event already has registrations.
   *
   * @param eventId Event primary key.
   */
  deleteEvent(eventId: number | string): Observable<DeleteResult> {
    return this.requestEnvelope(this.http.delete<ApiEnvelope<Omit<DeleteResult, 'message'>>>(`${this.baseUrl}/events/${eventId}`))
      .pipe(map((body) => ({ ...body.data, message: String(body.meta?.['message'] ?? 'Event deleted.') })));
  }

  /**
   * GET /api/events/:eventId/registrations - registrations newest first.
   *
   * @param eventId Event primary key.
   */
  getEventRegistrations(eventId: number | string): Observable<Registration[]> {
    return this.request<Registration[]>(this.http.get<ApiEnvelope<Registration[]>>(`${this.baseUrl}/events/${eventId}/registrations`));
  }

  /**
   * POST /api/events/:eventId/registrations - the public registration page.
   *
   * @param eventId Event primary key.
   * @param payload Validated attendee details.
   */
  createRegistration(eventId: number | string, payload: RegistrationPayload): Observable<RegistrationResult> {
    return this.requestEnvelope(this.http.post<ApiEnvelope<Registration>>(`${this.baseUrl}/events/${eventId}/registrations`, payload))
      .pipe(map((body) => ({
        registration: body.data,
        event: body.meta?.['event'] as RegistrationResult['event']
      })));
  }

  /** GET /api/categories - categories used by the search filters. */
  getCategories(includeInactive = false): Observable<Category[]> {
    const params = includeInactive ? new HttpParams().set('includeInactive', '1') : undefined;
    return this.request<Category[]>(this.http.get<ApiEnvelope<Category[]>>(`${this.baseUrl}/categories`, { params }));
  }

  /** GET /api/locations - distinct Sydney suburbs used by the search filters. */
  getLocations(): Observable<LocationOption[]> {
    return this.request<LocationOption[]>(this.http.get<ApiEnvelope<LocationOption[]>>(`${this.baseUrl}/locations`));
  }

  /** GET /api/organisations - organisations used by the admin event form. */
  getOrganisations(): Observable<Organisation[]> {
    return this.request<Organisation[]>(this.http.get<ApiEnvelope<Organisation[]>>(`${this.baseUrl}/organisations`));
  }

  /** GET /api/venues - venues used by the admin event form. */
  getVenues(): Observable<Venue[]> {
    return this.request<Venue[]>(this.http.get<ApiEnvelope<Venue[]>>(`${this.baseUrl}/venues`));
  }

  /** POST /api/categories - admin category create. */
  createCategory(payload: Partial<Category>): Observable<Category> {
    return this.request<Category>(this.http.post<ApiEnvelope<Category>>(`${this.baseUrl}/categories`, payload));
  }

  /** PUT /api/categories/:categoryId - admin category update. */
  updateCategory(categoryId: number, payload: Partial<Category>): Observable<Category> {
    return this.request<Category>(this.http.put<ApiEnvelope<Category>>(`${this.baseUrl}/categories/${categoryId}`, payload));
  }

  /** DELETE /api/categories/:categoryId - blocked with 409 while in use. */
  deleteCategory(categoryId: number): Observable<DeleteResult> {
    return this.requestEnvelope(this.http.delete<ApiEnvelope<{ id: number; name: string }>>(`${this.baseUrl}/categories/${categoryId}`))
      .pipe(map((body) => ({ ...body.data, message: String(body.meta?.['message'] ?? 'Category deleted.') })));
  }
}