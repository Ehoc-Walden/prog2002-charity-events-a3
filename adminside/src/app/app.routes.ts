import { Routes } from '@angular/router';

/**
 * Route table for the staff console.
 *
 * Every screen is a standalone component that is loaded lazily with
 * `loadComponent`, so the initial bundle contains only the shared shell (header,
 * navigation and footer) plus the dashboard. Each route sets its own document
 * title, which keeps the browser history readable.
 *
 * The create and edit screens share ONE component (`EventFormPage`); the `mode`
 * route data tells it which of `createEvent` and `updateEvent` to call. That is
 * deliberate reuse rather than two near-identical pages.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Dashboard | Common Ground Staff Console',
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage)
  },
  {
    path: 'events/new',
    title: 'New event | Common Ground Staff Console',
    data: { mode: 'create' },
    loadComponent: () => import('./pages/event-form/event-form-page').then((m) => m.EventFormPage)
  },
  {
    path: 'events/:eventId/edit',
    title: 'Edit event | Common Ground Staff Console',
    data: { mode: 'edit' },
    loadComponent: () => import('./pages/event-form/event-form-page').then((m) => m.EventFormPage)
  },
  {
    path: 'categories',
    title: 'Categories | Common Ground Staff Console',
    loadComponent: () => import('./pages/categories/categories-page').then((m) => m.CategoriesPage)
  },
  {
    path: '**',
    title: 'Page not found | Common Ground Staff Console',
    loadComponent: () => import('./pages/not-found/not-found-page').then((m) => m.NotFoundPage)
  }
];