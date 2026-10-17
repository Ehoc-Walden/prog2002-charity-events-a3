import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

/**
 * Application-wide providers for the Common Ground staff console.
 *
 * `provideHttpClient` is the Angular 22 way of wiring the `HttpClient` service
 * that `ApiService` and `WeatherService` depend on. `withFetch` makes the client
 * use the browser Fetch API instead of the legacy XHR backend.
 *
 * `provideRouter` enables the client-side router. `withInMemoryScrolling`
 * restores the scroll position on back-navigation, which matters here because
 * the dashboard table is long.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled'
      })
    )
  ]
};