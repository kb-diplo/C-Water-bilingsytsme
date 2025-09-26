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
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
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
        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: `Welcome back, ${response.username}!`,
          timer: 2000,
          showConfirmButton: false
        });
        
        // Role-based dashboard routing
        const role = response.role;
        if (role === 'Admin') {
          this.router.navigate(['/dashboard/admin']);
        } else if (role === 'MeterReader') {
          this.router.navigate(['/dashboard/meter-reader']);
        } else if (role === 'Client') {
          this.router.navigate(['/dashboard/client']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.loading = false;
        // Log error for debugging (only in development)
        if (!environment.production) {
          console.error('Login error details:', error);
        }
        
        // Always show user-friendly message, never mention server details
        let errorMessage = 'Login failed. Please check your username and password and try again.';
        
        // Only differentiate for actual authentication errors
        if (error.status === 401) {
          errorMessage = 'Invalid username or password. Please try again.';
        } else if (error.status === 403) {
          errorMessage = 'Access denied. Please contact support if this continues.';
        } else {
          // For all other errors (network, server, etc.) - generic message
          errorMessage = 'Login failed. Please try again in a moment.';
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
