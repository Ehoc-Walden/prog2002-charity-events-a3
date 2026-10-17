import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONSOLE_NAME, PUBLIC_SITE_URL, SITE_NAME } from '../../core/api-config';
import { AdminNav } from '../admin-nav/admin-nav';

/**
 * The shared staff console header: the console bar, the brand lock-up, the
 * mobile "Menu" button and the {@link AdminNav} element.
 *
 * The component owns the chrome behaviour that used to be duplicated in every
 * Assessment 2 page:
 *
 *   1. adding `is-scrolled` once the page is scrolled past 24px,
 *   2. expanding and collapsing the accessible mobile menu, including closing
 *      it with the Escape key and when the viewport grows beyond 820px.
 *
 * The header is always rendered in its solid state, because every console page
 * sits on the light background rather than over a dark hero image.
 */
@Component({
  selector: 'app-admin-header',
  imports: [RouterLink, AdminNav],
  templateUrl: './admin-header.html'
})
export class AdminHeader {
  /** Case study charity the console belongs to. */
  protected readonly siteName = SITE_NAME;

  /** Sub-title that marks this application as the internal tool. */
  protected readonly consoleName = CONSOLE_NAME;

  /** Address of the public website, shown in the console bar. */
  protected readonly publicSiteUrl = PUBLIC_SITE_URL;

  /** True once the document has been scrolled, which deepens the shadow. */
  protected readonly scrolled = signal(false);

  /** True while the mobile menu is expanded. */
  protected readonly navOpen = signal(false);

  /** Toggles the mobile menu. */
  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  /** Collapses the mobile menu (used after following a link). */
  protected closeNav(): void {
    this.navOpen.set(false);
  }

  /** Sticky-header state reacts to window scroll events. */
  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  /** The 820px reset closes the mobile menu when the layout switches. */
  @HostListener('window:resize')
  protected onResize(): void {
    if (window.innerWidth > 820) this.closeNav();
  }

  /** Escape closes the mobile menu, as expected of a disclosure widget. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeNav();
  }
}