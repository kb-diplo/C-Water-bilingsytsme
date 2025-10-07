import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div>
      <h1>Loading Water Billing System...</h1>
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Water Billing System';
  
  ngOnInit() {
    console.log('App Component Initialized');
    console.log('Current URL:', window.location.href);
  }
}
