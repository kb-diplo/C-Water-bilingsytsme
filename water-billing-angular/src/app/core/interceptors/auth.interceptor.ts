import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle authentication errors
      if (error.status === 401) {
        // Token expired or invalid - logout will handle navigation
        authService.logout();
      }
      
      // Log errors only in development
      if (!environment.production) {
        console.error('HTTP Error:', error);
      }
      
      // Sanitize error for production
      if (environment.production) {
        const sanitizedError = new HttpErrorResponse({
          error: {
            message: getSanitizedErrorMessage(error.status)
          },
          status: error.status,
          statusText: error.statusText,
          url: error.url || undefined
        });
        return throwError(() => sanitizedError);
      }
      
      return throwError(() => error);
    })
  );
};

function getSanitizedErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
