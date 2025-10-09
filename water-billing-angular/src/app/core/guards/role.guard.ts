import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const RoleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const user = authService.getCurrentUser();
  if (!user) {
    authService.logout();
    return false;
  }

  const requiredRoles = route.data?.['roles'] as string[];
  
  if (requiredRoles && requiredRoles.length > 0) {
    // Normalize role checking to handle both Client and Customer
    const userRole = user.role.toLowerCase();
    const normalizedRequiredRoles = requiredRoles.map(role => role.toLowerCase());
    
    // Check if user role matches any required role, treating client/customer as same
    const hasAccess = normalizedRequiredRoles.some(role => {
      if ((role === 'client' || role === 'customer') && (userRole === 'client' || userRole === 'customer')) {
        return true;
      }
      return role === userRole;
    });
    
    if (!hasAccess) {
      // Log unauthorized access attempt (only in development)
      if (!environment.production) {
        console.warn(`Unauthorized access attempt: User ${user.username} (${user.role}) tried to access ${state.url} which requires roles: ${requiredRoles.join(', ')}`);
      }
      
      // Redirect to appropriate dashboard based on user role
      switch (user.role.toLowerCase()) {
        case 'admin':
          router.navigate(['/dashboard/admin']);
          break;
        case 'meterreader':
        case 'meter-reader':
          router.navigate(['/dashboard/meter-reader']);
          break;
        case 'client':
        case 'customer':
          router.navigate(['/dashboard/client']);
          break;
        default:
          authService.logout();
          return false;
      }
      return false;
    }
  }

  return true;
};
