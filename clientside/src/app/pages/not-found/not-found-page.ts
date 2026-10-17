import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * 404 page.
 *
 * Declaring a wildcard route keeps the client-side router in charge of every
 * URL, so an unknown address shows this friendly page instead of a blank
 * document.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html'
})
export class NotFoundPage {}