import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, timeout } from 'rxjs';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './api-config';
import { API_OFFLINE_MESSAGE, ApiError } from './error';
import { Forecast } from './models';

/**
 * @file Client-side wrapper for the external Open-Meteo weather feature.
 *
 * The browser never calls the upstream weather provider directly. It calls our
 * own `/api/weather` endpoints, which read the venue coordinates from MySQL,
 * add a 10 minute cache and hide the third-party URL from the page. That keeps
 * the front end simple and the upstream contract stable.
 *
 * The staff console uses both endpoints:
 *   - getEventForecast() for a saved event (the Edit event screen),
 *   - getForecast() for the venue currently chosen in the New event form, so
 *     staff can check the forecast before the event is even saved.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the forecast for the venue that hosts one event.
   *
   * @param eventId Event primary key.
   * @param days Number of forecast days (the API accepts 1-7).
   * @returns Normalised forecast, or a friendly `ApiError`.
   */
  getEventForecast(eventId: number | string, days = 5): Observable<Forecast> {
    return this.unwrap(
      this.http.get<{ data: Forecast }>(`${API_BASE_URL}/weather/events/${eventId}?days=${days}`)
    );
  }
  /**
   * Loads the forecast for an explicit coordinate pair.
   *
   * Used by the event form, where the staff member has picked a venue from the
   * drop-down but the event does not exist in the database yet.
   *
   * @param latitude Venue latitude (-90 to 90).
   * @param longitude Venue longitude (-180 to 180).
   * @param days Number of forecast days (the API accepts 1-7).
   */
  getForecast(latitude: number, longitude: number, days = 5): Observable<Forecast> {
    const params = new HttpParams()
      .set('latitude', latitude)
      .set('longitude', longitude)
      .set('days', days);
    return this.unwrap(this.http.get<{ data: Forecast }>(`${API_BASE_URL}/weather`, { params }));
  }

  /**
   * Applies the shared timeout and converts any failure into an `ApiError`.
   *
   * @param source Raw HttpClient observable.
   */
  private unwrap(source: Observable<{ data: Forecast }>): Observable<Forecast> {
    return source.pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((body) => body.data),
      catchError((error: unknown) => {
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new ApiError('The weather service took too long to respond.', 0);
        }
        const status = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 0;
        const body = (error as { error?: { error?: { message?: string } } }).error;
        const message = body?.error?.message ?? (status === 0 ? API_OFFLINE_MESSAGE : 'The weather forecast is unavailable right now.');
        throw new ApiError(message, status);
      })
    );
  }
}