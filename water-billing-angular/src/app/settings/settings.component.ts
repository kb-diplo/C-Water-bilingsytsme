import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../core/services/auth.service';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

interface SystemSettings {
  id?: number;
  ratePerUnit: number;
  penaltyRate: number;
  gracePeriodDays?: number;
  lastUpdated?: string;
  updatedByUsername?: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  settingsForm: FormGroup;
  loading = true;
  saving = false;
  currentSettings: SystemSettings | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.settingsForm = this.formBuilder.group({
      ratePerUnit: ['', [Validators.required, Validators.min(0)]],
      penaltyRate: ['', [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.http.get<SystemSettings>(`${this.apiUrl}/metrics/rates`).subscribe({
      next: (settings) => {
        this.currentSettings = settings;
        this.settingsForm.patchValue({
          ratePerUnit: settings.ratePerUnit,
          penaltyRate: settings.penaltyRate
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.loading = false;
        Swal.fire('Error', 'Failed to load system settings', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.settingsForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.saving = true;
    const formData = this.settingsForm.value;
    
    // Add default gracePeriodDays since backend requires it but we don't show it
    const settingsData = {
      ratePerUnit: formData.ratePerUnit,
      penaltyRate: formData.penaltyRate,
      gracePeriodDays: this.currentSettings?.gracePeriodDays || 30 // Keep existing or default to 30
    };

    this.http.put<SystemSettings>(`${this.apiUrl}/metrics/rates`, settingsData).subscribe({
      next: (settings) => {
        this.currentSettings = settings;
        this.saving = false;
        Swal.fire('Success', 'System settings updated successfully', 'success');
      },
      error: (error) => {
        console.error('Error updating settings:', error);
        this.saving = false;
        const errorMessage = error.error?.message || 'Failed to update system settings';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  resetForm(): void {
    if (this.currentSettings) {
      this.settingsForm.patchValue({
        ratePerUnit: this.currentSettings.ratePerUnit,
        penaltyRate: this.currentSettings.penaltyRate
      });
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.settingsForm.controls).forEach(key => {
      const control = this.settingsForm.get(key);
      control?.markAsTouched();
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get f() { return this.settingsForm.controls; }
}
