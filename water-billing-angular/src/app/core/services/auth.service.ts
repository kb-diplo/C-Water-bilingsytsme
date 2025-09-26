import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoginDto, RegisterDto, UserResponse, UserDto } from '../models/api.models';
import { environment } from '../../../environments/environment';

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
    private router: Router
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
            this.setCurrentUser(user);
          }
        }),
        catchError(error => {
          // Only log in development mode
          if (!environment.production) {
            console.error('Login error:', error);
            console.error('Error details:', {
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

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
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
    return user?.role === 'Client';
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
          this.logout();
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
}
