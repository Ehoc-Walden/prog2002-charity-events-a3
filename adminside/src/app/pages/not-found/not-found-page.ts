import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 404 screen of the staff console.
 *
 * The wildcard route `**` in `app.routes.ts` sends every unknown address here,
 * so a mistyped console URL shows a helpful page (with links back into the
 * console) instead of a blank document. The header, navigation and footer are
 * still drawn, because they belong to the application shell rather than to any
 * single route.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html'
})
export class NotFoundPage {}