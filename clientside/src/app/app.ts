import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SiteFooter } from './shared/site-footer/site-footer';
import { SiteHeader } from './shared/site-header/site-header';

/**
 * Root shell of the client website.
 *
 * Assessment 2 feedback required the Header, Nav and Footer to be "created once
 * and common across all your pages". That is exactly what this component does:
 * {@link SiteHeader} (which renders {@link SiteNav}) and {@link SiteFooter} are
 * declared a single time here, and every routed page is projected into the
 * `<router-outlet>` between them. No page repeats the chrome.
 *
 * The `solid` flag is derived from the current URL so the header starts
 * transparent on the home page hero and solid everywhere else.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  templateUrl: './app.html'
})
export class App {
  private readonly router = inject(Router);

  /**
   * True when the header should be rendered in its solid (opaque) state.
   *
   * The home page has a dark full-bleed hero that the transparent header sits
   * over, so it is the only route that starts transparent.
   */
  protected readonly solidHeader = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => !this.isHome(event.urlAfterRedirects)),
      startWith(!this.isHome(this.router.url))
    ),
    { initialValue: false }
  );

  /**
   * @param url Current router URL (may include a query string or fragment).
   * @returns True when the URL points at the home page.
   */
  private isHome(url: string): boolean {
    const path = url.split(/[?#]/)[0];
    return path === '/' || path === '';
  }
}