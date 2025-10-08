import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from './shared/cookie-consent/cookie-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CookieConsentComponent],
  template: `
    <div>
      <div id="debug-info" style="position: fixed; top: 0; right: 0; background: red; color: white; padding: 5px; z-index: 10000; font-size: 12px;">
        Angular Loaded
      </div>
      <router-outlet></router-outlet>
      <app-cookie-consent></app-cookie-consent>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Water Billing System';
  
  ngOnInit() {}
}
