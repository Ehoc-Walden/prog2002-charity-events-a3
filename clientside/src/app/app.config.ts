import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

/**
 * Application-wide providers for the Common Ground client website.
 *
 * `provideHttpClient` is the Angular 22 way of wiring the `HttpClient` service
 * used by {@link ApiService} and {@link WeatherService}. `withFetch` makes the
 * client use the browser Fetch API instead of the legacy XHR backend.
 *
 * `provideRouter` enables the client-side router for the four pages of the
 * site. `withInMemoryScrolling` restores the scroll position when the user
 * navigates back and scrolls to an anchor (for example the `#impact` section on
 * the home page) when the URL contains a fragment.
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