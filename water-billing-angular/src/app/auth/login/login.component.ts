import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HealthService } from '../../core/services/health.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private healthService: HealthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Auto-redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.authService.redirectToDashboard();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;

        // Debug logging for client redirect issue
        if (!environment.production) {
          console.log('🔑 Login successful:', {
            response: response,
            username: response.username,
            role: response.role,
            timestamp: new Date().toISOString()
          });
        }

        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: `Welcome back, ${response.username}!`,
          timer: 1500,
          showConfirmButton: false
        });

        // Centralized dashboard redirect (Admin, MeterReader, Client)
        if (!environment.production) {
          console.log('🔄 About to call redirectToDashboard() for user:', {
            username: response.username,
            role: response.role,
            hasToken: !!response.token,
            currentUser: this.authService.getCurrentUser()
          });
        }
        
        // Small delay to ensure user is fully set before redirect
        setTimeout(() => {
          this.authService.redirectToDashboard();
        }, 50);
      },
      error: (error) => {
        this.loading = false;

        if (!environment.production) {
          console.error('Login error details:', error);
        }

        let errorMessage = 'Login failed. Please check your username and password and try again.';

        if (error.status === 401) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Please contact support.';
        } else {
          errorMessage = 'Unable to login right now. Please try again later.';
        }

        this.error = errorMessage;

        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: errorMessage
        });
      }
    });
  }

  get f() { return this.loginForm.controls; }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}
