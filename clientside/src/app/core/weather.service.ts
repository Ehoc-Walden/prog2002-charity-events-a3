import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, timeout } from 'rxjs';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './api-config';
import { API_OFFLINE_MESSAGE, ApiError } from './error';
import { Forecast } from './models';

/**
 * @file Client-side wrapper for the external Open-Meteo weather feature.
 *
 * The browser never calls api.open-meteo.com directly. It calls our own
 * `/api/weather/events/:eventId` endpoint, which reads the venue coordinates
 * from MySQL, adds a 10 minute cache and hides the third-party URL from the
 * page. That keeps the front end simple and the upstream contract stable.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the forecast for the venue that hosts one event.
   *
   * @param eventId Event primary key.
   * @param days Number of forecast days (the API accepts 1-7).
   * @returns Normalised forecast, or a friendly {@link ApiError}.
   */
  getEventForecast(eventId: number | string, days = 5): Observable<Forecast> {
    return this.http
      .get<{ data: Forecast }>(`${API_BASE_URL}/weather/events/${eventId}?days=${days}`)
      .pipe(
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