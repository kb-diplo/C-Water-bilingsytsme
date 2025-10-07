import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

console.log('Starting Angular application...');

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      ReactiveFormsModule,
      FormsModule,
      BrowserAnimationsModule
    )
  ]
}).then(() => {
  console.log('Angular application started successfully');
}).catch(err => {
  console.error('Failed to start Angular application:', err);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: red;">Application Failed to Load</h1>
      <p>Error: ${err.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${err.stack}</pre>
    </div>
  `;
});
