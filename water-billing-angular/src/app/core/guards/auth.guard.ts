import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const requiredRoles = route.data?.['roles'] as string[];

  if (requiredRoles && requiredRoles.length > 0) {
    const user = authService.getCurrentUser();

    if (!user) {
      console.error('AuthGuard: No user found despite being authenticated');
      authService.logout();
      return false;
    }

    // Case-insensitive role comparison
    const userRole = user.role?.toLowerCase();
    const hasRequiredRole = requiredRoles.some(role => role.toLowerCase() === userRole);

    if (!hasRequiredRole) {
      // Log unauthorized access attempt (only in development)
      if (!environment.production) {
        console.warn(`AuthGuard: Unauthorized access attempt: User ${user.username} (${user.role}) tried to access ${state.url} which requires roles: ${requiredRoles.join(', ')}`);
      }

      // Redirect to appropriate dashboard based on user role
      const normalizedRole = user.role?.toLowerCase();
      switch (normalizedRole) {
        case 'admin':
          router.navigate(['/dashboard/admin']);
          break;
        case 'meterreader':
          router.navigate(['/dashboard/meter-reader']);
          break;
        case 'client':
        case 'customer': // Handle both Client and Customer roles
          router.navigate(['/dashboard/client']);
          break;
        default:
          console.error('AuthGuard: Unknown role:', user.role);
          authService.logout();
          return false;
      }
      return false;
    }

    // Log successful role-based access (only in development)
    if (!environment.production) {
      console.log(`AuthGuard: Access granted for ${user.username} (${user.role}) to ${state.url}`);
    }
  }

  return true;
};
