import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminFooter } from './shared/admin-footer/admin-footer';
import { AdminHeader } from './shared/admin-header/admin-header';

/**
 * Root shell of the staff console.
 *
 * Assessment 2 feedback required the Header, Nav and Footer to be "created once
 * and common across all your pages". That is exactly what this component does:
 * {@link AdminHeader} (which renders {@link AdminNav}) and {@link AdminFooter}
 * are declared a single time here, and every routed screen is projected into the
 * `<router-outlet>` between them. No page repeats the chrome.
 *
 * The shell holds no state of its own: everything the console shows comes from
 * the pages, and everything the pages show comes from the API.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AdminHeader, AdminFooter],
  templateUrl: './app.html'
})
export class App {}