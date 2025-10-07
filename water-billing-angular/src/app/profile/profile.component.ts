import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  currentUser: any = null;
  profileForm: FormGroup;
  passwordForm: FormGroup;
  loading = false;
  showPasswordSection = false;

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    this.profileForm = this.formBuilder.group({
      username: [{ value: '', disabled: true }],
      email: ['', [Validators.required, Validators.email]],
      firstName: [''],
      lastName: [''],
      phone: ['']
    });

    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.loadUserProfile();
    }
  }

  loadUserProfile(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/auth/profile`).subscribe({
      next: (user) => {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || ''
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        // Fallback to current user data
        this.profileForm.patchValue({
          username: this.currentUser.username,
          email: this.currentUser.email || '',
          firstName: this.currentUser.firstName || '',
          lastName: this.currentUser.lastName || '',
          phone: this.currentUser.phone || ''
        });
        this.loading = false;
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach(key => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    const profileData = {
      email: this.profileForm.value.email,
      firstName: this.profileForm.value.firstName,
      lastName: this.profileForm.value.lastName,
      phone: this.profileForm.value.phone
    };

    this.http.put(`${this.apiUrl}/auth/profile`, profileData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire('Success', 'Profile updated successfully', 'success');
        
        // Update local user data
        const updatedUser = { ...this.currentUser, ...profileData };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.error?.message || 'Failed to update profile';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      Object.keys(this.passwordForm.controls).forEach(key => {
        this.passwordForm.get(key)?.markAsTouched();
      });
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      Swal.fire('Error', 'New passwords do not match', 'error');
      return;
    }

    this.loading = true;
    const passwordData = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.http.put(`${this.apiUrl}/auth/change-password`, passwordData).subscribe({
      next: (response) => {
        this.loading = false;
        this.passwordForm.reset();
        this.showPasswordSection = false;
        Swal.fire('Success', 'Password changed successfully', 'success');
      },
      error: (error) => {
        this.loading = false;
        const errorMessage = error.error?.message || 'Failed to change password';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  togglePasswordSection(): void {
    this.showPasswordSection = !this.showPasswordSection;
    if (!this.showPasswordSection) {
      this.passwordForm.reset();
    }
  }

  getRoleBadgeClass(): string {
    switch (this.currentUser?.role?.toLowerCase()) {
      case 'admin': return 'badge-danger';
      case 'meterreader': return 'badge-info';
      case 'client':
      case 'customer': return 'badge-success';
      default: return 'badge-secondary';
    }
  }
}
