import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoginDto, RegisterDto, UserResponse, UserDto } from '../models/api.models';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

export interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  username: string;
  role: string;
  token: string;
  dashboardData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private logger: LoggerService
  ) {
    this.loadUserFromStorage();
  }

  login(credentials: LoginDto): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {

          if (response.token) {
            this.setToken(response.token);
            const user: User = {
              id: this.extractUserIdFromToken(response.token),
              username: response.username,
              role: response.role,
              email: response.email
            };

            if (environment.features.enableLogging) {
              console.log('👤 Creating user object:', user);
            }

            this.setCurrentUser(user);

            if (environment.features.enableLogging) {
              console.log('✅ User set in AuthService, current user:', this.getCurrentUser());
            }
          }
        }),
        catchError(error => {
          // Only log when logging is enabled
          if (environment.features.enableLogging) {
            console.error('❌ Login error:', error);
            console.error('❌ Error details:', {
              status: error.status,
              statusText: error.statusText,
              url: error.url,
              message: error.message
            });
          }
          throw error;
        })
      );
  }

  register(userData: RegisterDto): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${this.apiUrl}/auth/register`, userData);
  }

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/auth/users`);
  }

  deleteUser(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/auth/users/${username}`);
  }

  logout(redirectToLogin: boolean = true): void {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.clear(); // Clear any session data
    this.currentUserSubject.next(null);
    
    // Only navigate to login if explicitly requested
    if (redirectToLogin) {
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    if (environment.features.enableLogging && user) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) {
        console.log('👤 AuthService.getCurrentUser() called:', user);
      }
    }
    return user;
  }

  setCurrentUser(user: User): void {
    if (environment.features.enableLogging) {
      console.log('💾 AuthService.setCurrentUser() called with:', user);
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);

    if (environment.features.enableLogging) {
      console.log('💾 AuthService.setCurrentUser() - stored in localStorage and updated subject');
      console.log('💾 Current user after setting:', this.getCurrentUser());
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'Admin';
  }

  isMeterReader(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'MeterReader';
  }

  isClient(): boolean {
    const user = this.getCurrentUser();
    const role = user?.role?.toLowerCase();
    return role === 'client' || role === 'customer';
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Verify token is still valid
        if (this.isAuthenticated()) {
          this.currentUserSubject.next(user);
        } else {
          // Clear expired token without redirecting to login
          this.logout(false);
        }
      } catch {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
      }
    }
  }

  private extractUserIdFromToken(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || 0;
    } catch {
      return 0;
    }
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  getRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }

  getDashboardRoute(): string {
    const user = this.getCurrentUser();
    if (!user) {
      if (environment.features.enableLogging) {
        console.warn('⚠️ No user found in getDashboardRoute()');
      }
      return '/login';
    }

    if (environment.features.enableLogging) {
      console.log('🎯 AuthService.getDashboardRoute() called for user:', {
        username: user.username,
        role: user.role,
        userId: user.id
      });
    }

    // Normalize role to handle both "Client" and "Customer"
    const normalizedRole = user.role?.toLowerCase();
    
    switch (normalizedRole) {
      case 'admin':
        return '/dashboard/admin';
      case 'meterreader':
        return '/dashboard/meter-reader';
      case 'client':
      case 'customer': // Handle both Client and Customer roles
        return '/dashboard/client';
      default:
        if (environment.features.enableLogging) {
          console.warn('⚠️ Unknown role in getDashboardRoute():', user.role);
        }
        return '/dashboard';
    }
  }

  redirectToDashboard(): void {
    const user = this.getCurrentUser();
    
    if (!user) {
      if (environment.features.enableLogging) {
        console.error('🚨 redirectToDashboard() called but no user found!');
      }
      this.router.navigate(['/login']);
      return;
    }

    const dashboardRoute = this.getDashboardRoute();

    // Debug logging for client dashboard issue
    if (environment.features.enableLogging) {
      console.log('🔄 AuthService.redirectToDashboard() called:', {
        user: user,
        userRole: user?.role,
        dashboardRoute: dashboardRoute,
        isAuthenticated: this.isAuthenticated(),
        timestamp: new Date().toISOString()
      });
    }

    // Add a small delay to ensure user data is fully set
    setTimeout(() => {
      const currentUser = this.getCurrentUser();
      const finalRoute = this.getDashboardRoute();
      
      if (environment.features.enableLogging) {
        console.log('🚀 AuthService.redirectToDashboard() executing navigation:', {
          currentUser: currentUser,
          dashboardRoute: finalRoute,
          routerUrl: this.router.url
        });
      }

      if (currentUser) {
        this.router.navigate([finalRoute], { replaceUrl: true });
      } else {
        console.error('🚨 User lost during redirect delay!');
        this.router.navigate(['/login']);
      }
    }, 100);
  }
}
