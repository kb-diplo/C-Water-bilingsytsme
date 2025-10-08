import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CookieConsentComponent],
  template: `
    <router-outlet></router-outlet>
    <app-cookie-consent></app-cookie-consent>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Water Billing System';
  
  ngOnInit() {}
}
