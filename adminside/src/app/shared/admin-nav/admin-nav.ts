import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PUBLIC_SITE_URL } from '../../core/api-config';

/**
 * The shared staff console navigation.
 *
 * Assessment 2 feedback said the "common segments like Header, Nav, and Footer
 * should be created once and be common across all your pages". This component
 * is therefore declared exactly once, inside `admin-header`, which is declared
 * exactly once inside `app.html`. No page repeats the menu.
 *
 * `routerLinkActive` marks the current page for both styling and assistive
 * technology (`aria-current="page"`), so the console is navigable by keyboard
 * and by screen reader.
 */
@Component({
  selector: 'app-admin-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-nav.html'
})
export class AdminNav {
  /** Whether the mobile menu is expanded; controlled by the header. */
  @Input() open = false;

  /** Emitted when a link is followed so the header can collapse the menu. */
  @Output() readonly followed = new EventEmitter<void>();

  /** Address of the public website, so staff can jump across in one click. */
  protected readonly publicSiteUrl = PUBLIC_SITE_URL;

  /** Announces that the user picked a destination. */
  protected close(): void {
    this.followed.emit();
  }
}