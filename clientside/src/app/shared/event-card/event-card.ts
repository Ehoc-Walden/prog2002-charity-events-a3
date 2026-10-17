import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CharityEvent } from '../../core/models';
import {
  formatCompactCurrency,
  formatDateParts,
  formatEventDate,
  formatTicket,
  progressPercent,
  resolveAssetPath
} from '../../core/format';

/**
 * Reusable event card shared by the home page, the search results and the
 * "related events" strip on the detail page.
 *
 * The card is a plain Angular component: the values come from the `event` input
 * and are written into the template with interpolation, so Angular escapes
 * everything and the component never needs `innerHTML`.
 */
@Component({
  selector: 'app-event-card',
  imports: [RouterLink],
  templateUrl: './event-card.html'
})
export class EventCard {
  /** The event to render. Required - the card has no meaning without it. */
  @Input({ required: true }) event!: CharityEvent;

  /** Exposed to the template: the day/month badge values. */
  protected get dateParts(): { day: string; month: string; year: string } {
    return formatDateParts(this.event.startDateTime);
  }

  /** Exposed to the template: a 0-100 fundraising percentage. */
  protected get percent(): number {
    return progressPercent(this.event.fundraising);
  }

  /** Exposed to the template: "Free" or a formatted price. */
  protected get ticketLabel(): string {
    return formatTicket(this.event.ticket);
  }

  /** Exposed to the template: "Venue, Suburb" or a fallback. */
  protected get location(): string {
    const venue = this.event.venue;
    const text = [venue?.name, venue?.suburb].filter(Boolean).join(', ');
    return text || 'Sydney, NSW';
  }

  /** Exposed to the template: the status chip text. */
  protected get statusLabel(): string {
    return this.event.ticket?.isFree ? 'Free entry' : 'Ticketed';
  }

  /** Exposed to the template: path for the cover image. */
  protected get coverPath(): string {
    return resolveAssetPath(this.event.heroImage);
  }

  /** Exposed to the template: formatted "14 Oct 2026" label. */
  protected get mediumDate(): string {
    return formatEventDate(this.event.startDateTime, 'medium');
  }

  /** Exposed to the template: compact "raised" figure for the mini progress bar. */
  protected get raisedLabel(): string {
    return formatCompactCurrency(this.event.fundraising?.raised, this.event.ticket?.currency);
  }
}