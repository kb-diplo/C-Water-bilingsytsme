import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../core/services/auth.service';
import Swal from 'sweetalert2';

interface MeterReading {
  id: number;
  clientId: number;
  clientName: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  readingDate: string;
  readBy: string;
  status: string;
}

@Component({
  selector: 'app-readings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './readings.component.html',
  styleUrls: ['./readings.component.scss']
})
export class ReadingsComponent implements OnInit {
  private apiUrl = 'http://localhost:5000/api';
  readings: MeterReading[] = [];
  filteredReadings: MeterReading[] = [];
  searchTerm = '';
  loading = true;
  showAddModal = false;
  readingForm: FormGroup;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.readingForm = this.formBuilder.group({
      clientId: ['', Validators.required],
      currentReading: ['', [Validators.required, Validators.min(0)]],
      readingDate: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadReadings();
  }

  loadReadings(): void {
    this.loading = true;
    this.http.get<MeterReading[]>(`${this.apiUrl}/readings`).subscribe({
      next: (readings: MeterReading[]) => {
        this.readings = readings;
        this.filteredReadings = readings;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading readings:', error);
        this.loading = false;
        Swal.fire('Error', 'Failed to load meter readings', 'error');
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
      reading.readBy.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.readingForm.reset();
    this.readingForm.patchValue({
      readingDate: new Date().toISOString().split('T')[0]
    });
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.readingForm.reset();
  }

  onSubmit(): void {
    if (this.readingForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const readingData = this.readingForm.value;
    this.http.post<MeterReading>(`${this.apiUrl}/readings`, readingData).subscribe({
      next: (reading: MeterReading) => {
        this.readings.unshift(reading);
        this.filteredReadings = this.readings;
        this.closeAddModal();
        Swal.fire('Success', 'Meter reading added successfully', 'success');
      },
      error: (error: any) => {
        console.error('Error adding reading:', error);
        const errorMessage = error.error?.message || 'Failed to add meter reading';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.readingForm.controls).forEach(key => {
      const control = this.readingForm.get(key);
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
