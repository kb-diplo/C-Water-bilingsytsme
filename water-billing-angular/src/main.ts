import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

console.log('🚀 Starting Angular application...');
console.log('🌍 Environment:', window.location.hostname);
console.log('📍 Current URL:', window.location.href);
console.log('🔗 Current Path:', window.location.pathname);
console.log('🔧 Routes configured:', routes.length, 'routes');

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
  // Show a more user-friendly error message
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 20px;"></i>
        <h1 style="color: #dc3545; margin-bottom: 20px;">Application Loading Error</h1>
        <p style="color: #6c757d; margin-bottom: 20px;">We're experiencing technical difficulties. Please try refreshing the page.</p>
        <button onclick="window.location.reload()" style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">
          <i class="fas fa-refresh"></i> Refresh Page
        </button>
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 4px; text-align: left;">
          <strong>Error Details:</strong><br>
          <code style="color: #dc3545;">${err.message}</code>
        </div>
      </div>
    </div>
  `;
});
