import { Routes } from '@angular/router';

/**
 * Route table for the client website.
 *
 * Every page is a standalone component that is loaded lazily with `loadComponent`,
 * so the initial bundle only contains the shared shell (header, navigation and
 * footer) plus the home page. This mirrors the "common segments created once"
 * requirement: the shell lives in `app.html`, while each route provides only the
 * page body.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Common Ground Collective | Charity events with local impact',
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage)
  },
  {
    path: 'search',
    title: 'Find a charity event | Common Ground Collective',
    loadComponent: () => import('./pages/search/search-page').then((m) => m.SearchPage)
  },
  {
    path: 'events/:eventId',
    title: 'Event details | Common Ground Collective',
    loadComponent: () => import('./pages/event-detail/event-detail-page').then((m) => m.EventDetailPage)
  },
  {
    path: 'register',
    title: 'Register for an event | Common Ground Collective',
    loadComponent: () => import('./pages/register/register-page').then((m) => m.RegisterPage)
  },
  {
    path: '**',
    title: 'Page not found | Common Ground Collective',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage)
  }
];