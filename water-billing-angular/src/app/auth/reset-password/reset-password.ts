import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule
  ]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isLoading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  resetToken: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get token from URL parameters
    this.route.queryParams.subscribe(params => {
      this.resetToken = params['token'];
      if (!this.resetToken) {
        Swal.fire('Error', 'Invalid reset link. Please request a new password reset.', 'error');
        this.router.navigate(['/login']);
      }
    });
  }

  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    return null;
  }

  togglePasswordVisibility(field: 'new' | 'confirm'): void {
    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
      const input = document.getElementById('newPassword') as HTMLInputElement;
      input.type = this.showNewPassword ? 'text' : 'password';
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
      const input = document.getElementById('confirmPassword') as HTMLInputElement;
      input.type = this.showConfirmPassword ? 'text' : 'password';
    }
  }

  onSubmit(): void {
    if (this.resetForm.valid && this.resetToken) {
      this.isLoading = true;

      const resetData = {
        token: this.resetToken,
        newPassword: this.resetForm.value.newPassword
      };

      this.http.post(`${environment.apiUrl}/auth/reset-password`, resetData)
        .subscribe({
          next: (response: any) => {
            this.isLoading = false;
            Swal.fire({
              icon: 'success',
              title: 'Password Reset Successful!',
              text: 'Your password has been reset successfully. You can now log in with your new password.',
              confirmButtonText: 'Go to Login'
            }).then(() => {
              this.router.navigate(['/login']);
            });
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Password reset error:', error);
            
            let errorMessage = 'Failed to reset password. Please try again.';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.status === 400) {
              errorMessage = 'Invalid or expired reset token. Please request a new password reset.';
            }
            
            Swal.fire('Error', errorMessage, 'error');
          }
        });
    } else {
      this.resetForm.markAllAsTouched();
    }
  }
}
