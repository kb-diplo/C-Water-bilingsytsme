import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { ReadingService } from '../core/services/reading.service';
import { ClientService } from '../core/services/client.service';
import { MeterReadingCreateDto, MeterReadingResponseDto, ClientDto, InitialReadingDto } from '../core/models/api.models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-readings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './readings.component.html',
  styleUrls: ['./readings.component.scss']
})
export class ReadingsComponent implements OnInit {
  readings: MeterReadingResponseDto[] = [];
  filteredReadings: MeterReadingResponseDto[] = [];
  clients: ClientDto[] = [];
  searchTerm = '';
  loading = true;
  showAddModal = false;
  showInitialReadingModal = false;
  readingForm: FormGroup;
  initialReadingForm: FormGroup;
  availablePeriods: { value: string, label: string }[] = [];

  constructor(
    private readingService: ReadingService,
    private clientService: ClientService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.readingForm = this.formBuilder.group({
      clientId: ['', Validators.required],
      currentReading: ['', [Validators.required, Validators.min(0)]],
      readingPeriod: [''] // Optional - defaults to current month
    });
    
    this.initialReadingForm = this.formBuilder.group({
      clientId: ['', Validators.required],
      currentReading: ['', [Validators.required, Validators.min(0)]],
      readingPeriod: [''] // Optional - defaults to current month
    });
    
    this.generateAvailablePeriods();
  }

  ngOnInit(): void {
    this.loadReadings();
    this.loadClients();
  }

  generateAvailablePeriods(): void {
    const currentDate = new Date();
    const periods: { value: string, label: string }[] = [];
    
    // Add current month as default (empty value)
    periods.push({ 
      value: '', 
      label: `Current Month (${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})` 
    });
    
    // Add previous 12 months
    for (let i = 1; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      periods.push({ value, label });
    }
    
    this.availablePeriods = periods;
  }

  loadReadings(): void {
    this.loading = true;
    this.readingService.getAllReadings().subscribe({
      next: (readings) => {
        this.readings = readings;
        this.filteredReadings = readings;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading readings:', error);
        this.loading = false;
        Swal.fire('Error', 'Failed to load meter readings', 'error');
      }
    });
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredReadings = this.readings;
      return;
    }

    this.filteredReadings = this.readings.filter(reading =>
      reading.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      reading.meterNumber.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      reading.recordedByUsername.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.readingForm.reset();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.readingForm.reset();
  }

  openInitialReadingModal(): void {
    this.showInitialReadingModal = true;
    this.initialReadingForm.reset();
  }

  closeInitialReadingModal(): void {
    this.showInitialReadingModal = false;
    this.initialReadingForm.reset();
  }

  onSubmit(): void {
    if (this.readingForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const readingData: MeterReadingCreateDto = {
      clientId: parseInt(this.readingForm.value.clientId),
      currentReading: parseFloat(this.readingForm.value.currentReading),
      readingPeriod: this.readingForm.value.readingPeriod || undefined
    };

    this.readingService.addReading(readingData).subscribe({
      next: (reading) => {
        this.readings.unshift(reading);
        this.filteredReadings = this.readings;
        this.closeAddModal();
        Swal.fire('Success', 'Meter reading added successfully', 'success');
      },
      error: (error) => {
        console.error('Error adding reading:', error);
        const errorMessage = error.error?.message || 'Failed to add meter reading';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  onSubmitInitialReading(): void {
    if (this.initialReadingForm.invalid) {
      this.markInitialFormGroupTouched();
      return;
    }

    const initialReadingData: InitialReadingDto = {
      clientId: parseInt(this.initialReadingForm.value.clientId),
      initialReading: parseFloat(this.initialReadingForm.value.currentReading)
    };

    // Show confirmation for initial reading
    Swal.fire({
      title: 'Set Initial Reading?',
      text: 'This will set the baseline meter reading for this client. This is NOT added as a regular reading but sets the starting point for future readings.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, set baseline!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.readingService.setInitialReading(initialReadingData).subscribe({
          next: (response) => {
            this.closeInitialReadingModal();
            Swal.fire('Success', response.message || 'Initial reading baseline set successfully', 'success');
            // Don't add to readings list as this is just setting the baseline
          },
          error: (error) => {
            console.error('Error setting initial reading:', error);
            const errorMessage = error.error?.message || error.error || 'Failed to set initial reading baseline';
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.readingForm.controls).forEach(key => {
      const control = this.readingForm.get(key);
      control?.markAsTouched();
    });
  }

  private markInitialFormGroupTouched(): void {
    Object.keys(this.initialReadingForm.controls).forEach(key => {
      const control = this.initialReadingForm.get(key);
      control?.markAsTouched();
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isMeterReader(): boolean {
    return this.authService.isMeterReader();
  }

  isClient(): boolean {
    return this.authService.isClient();
  }

  get f() { return this.readingForm.controls; }
}
