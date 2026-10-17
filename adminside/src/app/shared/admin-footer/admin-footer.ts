import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONSOLE_NAME, SITE_NAME } from '../../core/api-config';

/**
 * The shared footer, created once for every console route.
 *
 * The copyright year is calculated instead of being written by hand, so it can
 * never go stale. The footer also restates the assessment context, which is what
 * the A2 feedback asked for on every page.
 */
@Component({
  selector: 'app-admin-footer',
  imports: [RouterLink],
  templateUrl: './admin-footer.html'
})
export class AdminFooter {
  /** Case study charity the console belongs to. */
  protected readonly siteName = SITE_NAME;

  /** Sub-title that marks this application as the internal tool. */
  protected readonly consoleName = CONSOLE_NAME;

  /** Current year, evaluated once when the component is created. */
  protected readonly year = new Date().getFullYear();
}