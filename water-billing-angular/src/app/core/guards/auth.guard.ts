import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRoles = route.data?.['roles'] as string[];
    if (requiredRoles) {
      const userRole = authService.getCurrentUser()?.role;
      if (userRole && requiredRoles.includes(userRole)) {
        return true;
      } else {
        router.navigate(['/dashboard']);
        return false;
      }
    }
    return true;
  }
  
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
