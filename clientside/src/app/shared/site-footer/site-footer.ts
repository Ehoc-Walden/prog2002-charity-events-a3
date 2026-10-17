import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../../core/api-config';

/**
 * The shared footer, created once for every route.
 *
 * The copyright year is calculated in the component instead of being written by
 * hand, so it never goes stale.
 */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html'
})
export class SiteFooter {
  /** Display name of the case study charity. */
  protected readonly siteName = SITE_NAME;

  /** Current year, evaluated once when the component is created. */
  protected readonly year = new Date().getFullYear();
}