import { Component, HostListener, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteNav } from '../site-nav/site-nav';

/**
 * The shared site header: brand lock-up, the mobile "Menu" button and the
 * {@link SiteNav} element.
 *
 * The component owns two pieces of chrome behaviour that used to be duplicated
 * in every Assessment 2 page:
 *
 *   1. adding `is-scrolled` once the page is scrolled past 24px (sticky header),
 *   2. expanding and collapsing the accessible mobile menu, including closing it
 *      with the Escape key and when the viewport grows beyond 820px.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, SiteNav],
  templateUrl: './site-header.html'
})
export class SiteHeader {
  /** Pages with a dark hero pass `true` so the header starts in its solid state. */
  @Input() solid = false;

  /** True once the document has been scrolled, which switches the header style. */
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

  /** Sticky-header state and the 820px reset both react to window events. */
  @HostListener('window:scroll')
  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (window.innerWidth > 820) this.closeNav();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeNav();
  }
}