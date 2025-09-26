import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserDataService {

  constructor(private authService: AuthService) {}

  /**
   * Filter data based on user role and permissions
   * Only shows data that the current user is authorized to see
   */
  filterDataByRole<T>(data: T[], filterType: 'client' | 'bill' | 'payment' | 'reading'): T[] {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    // Admin can see all data
    if (user.role === 'Admin') {
      return data;
    }

    // MeterReader can see most operational data
    if (user.role === 'MeterReader') {
      return this.filterForMeterReader(data, filterType);
    }

    // Client can only see their own data
    if (user.role === 'Client') {
      return this.filterForClient(data, filterType, user.id);
    }

    return [];
  }

  /**
   * Filter sensitive information from objects before displaying to users
   */
  sanitizeForDisplay(obj: any): any {
    if (!obj) return obj;

    const sanitized = { ...obj };
    const user = this.authService.getCurrentUser();

    // Remove developer/debug information
    delete sanitized.debugInfo;
    delete sanitized.stackTrace;
    delete sanitized.internalId;
    delete sanitized.systemNotes;

    // Remove sensitive information based on role
    if (user?.role !== 'Admin') {
      delete sanitized.createdByUserId;
      delete sanitized.lastModifiedBy;
      delete sanitized.internalNotes;
      delete sanitized.systemFlags;
    }

    // For clients, remove even more sensitive data
    if (user?.role === 'Client') {
      delete sanitized.cost;
      delete sanitized.profit;
      delete sanitized.adminNotes;
      delete sanitized.processingDetails;
    }

    return sanitized;
  }

  /**
   * Check if user can access specific data
   */
  canAccessData(dataType: string, resourceId?: number): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    // Admin has access to everything
    if (user.role === 'Admin') return true;

    // MeterReader has access to operational data
    if (user.role === 'MeterReader') {
      return ['clients', 'readings', 'bills'].includes(dataType);
    }

    // Client can only access their own data
    if (user.role === 'Client') {
      return ['bills', 'payments'].includes(dataType) && 
             (resourceId === undefined || this.isUserOwnData(resourceId));
    }

    return false;
  }

  /**
   * Get user-appropriate error message
   */
  getUserFriendlyErrorMessage(error: any): string {
    if (environment.production) {
      // In production, show generic messages
      if (error.status === 403) {
        return 'You do not have permission to access this information.';
      }
      if (error.status === 404) {
        return 'The requested information was not found.';
      }
      if (error.status >= 500) {
        return 'A system error occurred. Please contact support if the problem persists.';
      }
      return 'An error occurred. Please try again.';
    } else {
      // In development, show more detailed messages
      return error.message || error.error?.message || 'An error occurred';
    }
  }

  /**
   * Log user actions (only in development or for audit purposes)
   */
  logUserAction(action: string, resource?: string, resourceId?: number): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      role: user.role,
      action,
      resource,
      resourceId
    };

    // Only log in development or if audit logging is enabled
    if (!environment.production) {
      console.log('User Action:', logEntry);
    }

    // In production, you might want to send this to an audit service
    // this.auditService.log(logEntry);
  }

  private filterForMeterReader<T>(data: T[], filterType: string): T[] {
    // MeterReader can see operational data but not financial details
    return data.map(item => this.sanitizeForMeterReader(item));
  }

  private filterForClient<T>(data: T[], filterType: string, userId: number): T[] {
    // Client can only see their own data
    return data.filter((item: any) => {
      return item.clientId === userId || item.userId === userId;
    }).map(item => this.sanitizeForClient(item));
  }

  private sanitizeForMeterReader(item: any): any {
    const sanitized = { ...item };
    // Remove financial details that meter readers shouldn't see
    delete sanitized.cost;
    delete sanitized.profit;
    delete sanitized.adminCommissions;
    return sanitized;
  }

  private sanitizeForClient(item: any): any {
    const sanitized = { ...item };
    // Remove internal system information
    delete sanitized.internalNotes;
    delete sanitized.systemFlags;
    delete sanitized.processingDetails;
    delete sanitized.adminNotes;
    return sanitized;
  }

  private isUserOwnData(resourceId: number): boolean {
    const user = this.authService.getCurrentUser();
    return user ? user.id === resourceId : false;
  }
}
