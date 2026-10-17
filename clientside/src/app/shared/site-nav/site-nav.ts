import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * The shared primary navigation.
 *
 * Assessment 2 feedback: "The common segments like Header, Nav, and Footer
 * should be created once and be common across all your pages." This component is
 * therefore declared once in the root shell (`app.html`) and is never repeated
 * inside a page, so every route renders exactly the same menu.
 */
@Component({
  selector: 'app-site-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-nav.html'
})
export class SiteNav {
  /** Whether the mobile menu is expanded; controlled by {@link SiteHeader}. */
  @Input() open = false;

  /** Emitted when a link is followed so the header can collapse the mobile menu. */
  @Output() readonly followed = new EventEmitter<void>();

  /** Announces that the user picked a destination. */
  protected close(): void {
    this.followed.emit();
  }
}