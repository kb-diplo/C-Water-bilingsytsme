import { Injectable, ErrorHandler } from '@angular/core';
import { LoggerService } from './logger.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private logger: LoggerService) {}

  handleError(error: any): void {
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = error;

    if (error instanceof HttpErrorResponse) {
      errorMessage = this.getHttpErrorMessage(error);
    } else if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    }

    this.logger.error(errorMessage, errorDetails);
    
    // In production, you might want to show a user-friendly notification
    this.notifyUser(errorMessage);
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Network error - please check your connection';
      case 400:
        return 'Invalid request - please check your input';
      case 401:
        return 'Authentication required - please log in';
      case 403:
        return 'Access denied - insufficient permissions';
      case 404:
        return 'Resource not found';
      case 500:
        return 'Server error - please try again later';
      default:
        return `HTTP ${error.status}: ${error.message}`;
    }
  }

  private notifyUser(message: string): void {
    // You could integrate with a toast notification service here
    // For now, we'll just log it
    console.warn('User notification:', message);
  }

  // Helper method for handling HTTP errors in services
  static handleHttpError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
    }

    return throwError(() => new Error(errorMessage));
  }
}
