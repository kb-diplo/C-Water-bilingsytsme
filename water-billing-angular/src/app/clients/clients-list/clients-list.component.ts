import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ClientService, Client, ClientCreateRequest } from '../../core/services/client.service';
import { ReadingService } from '../../core/services/reading.service';
import { AuthService } from '../../core/services/auth.service';
import { MeterReadingCreateDto, ClientUpdateDto } from '../../core/models/api.models';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './clients-list.component.html',
  styleUrls: ['./clients-list.component.scss']
})
export class ClientsListComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  searchTerm = '';
  loading = true;
  showAddModal = false;
  showReadingModal = false;
  isEditMode = false;
  editingClientId: number | null = null;
  selectedClient: Client | null = null;
  readingLoading = false;
  previousReading: number | null = null;
  previousReadingDate: Date | null = null;
  clientForm: FormGroup;
  readingForm: FormGroup;
  availablePeriods: { value: string, label: string }[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  
  private searchSubject = new Subject<string>();

  constructor(
    private clientService: ClientService,
    private readingService: ReadingService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.clientForm = this.formBuilder.group({
      username: ['', Validators.required],
      meterNumber: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contactNumber: ['', Validators.required],
      address: ['', Validators.required],
      status: ['Connected', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    this.readingForm = this.formBuilder.group({
      currentReading: ['', [Validators.required, Validators.min(0.01)]],
      readingPeriod: [''] // Optional - defaults to current month
    });
    
    this.generateAvailablePeriods();

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnInit(): void {
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

  loadClients(): void {
    this.loading = true;
    console.log('🔄 ClientsList - Loading clients...');
    console.log('🔄 ClientsList - API URL from service:', this.clientService['apiUrl']);
    
    this.clientService.getClients({
      page: this.currentPage,
      limit: this.itemsPerPage
    }).subscribe({
      next: (clients) => {
        console.log('Clients response:', clients);
        const validClients = clients.filter(client => client.id && client.id > 0);
        this.clients = validClients;
        this.filteredClients = validClients;
        this.totalItems = validClients.length;
        this.loading = false;
        
        if (validClients.length !== clients.length) {
          console.warn('Filtered out clients with invalid IDs:', clients.length - validClients.length);
        }
      },
      error: (error) => {
        console.error('❌ ClientsList - Error loading clients:', error);
        console.error('❌ ClientsList - Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message,
          url: error.url
        });
        
        this.clients = [];
        this.filteredClients = [];
        this.totalItems = 0;
        this.loading = false;
        
        let errorMessage = 'Failed to load clients';
        if (error.status === 404) {
          errorMessage = 'API endpoint not found. The backend may still be deploying. Please wait a moment and refresh.';
        } else if (error.status === 401 || error.status === 403) {
          errorMessage = 'You do not have permission to view clients';
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        Swal.fire({
          title: 'Error Loading Clients',
          text: errorMessage,
          icon: 'error',
          showCancelButton: true,
          confirmButtonText: 'Retry',
          cancelButtonText: 'Close'
        }).then((result) => {
          if (result.isConfirmed) {
            // Retry loading clients after a short delay
            setTimeout(() => {
              this.loadClients();
            }, 2000);
          }
        });
      }
    });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  private performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredClients = this.clients;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredClients = this.clients.filter(client =>
      this.getFullName(client).toLowerCase().includes(term) ||
      client.email.toLowerCase().includes(term) ||
      client.meterNumber.toLowerCase().includes(term) ||
      (client.contactNumber || client.phone || '').toLowerCase().includes(term) ||
      (client.location || client.address || '').toLowerCase().includes(term)
    );
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingClientId = null;
    this.showAddModal = true;
    this.clientForm.reset();
    this.clientForm.patchValue({ status: 'Connected' });
    
    this.clientForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.clientForm.get('confirmPassword')?.setValidators([Validators.required]);
    this.clientForm.get('password')?.updateValueAndValidity();
    this.clientForm.get('confirmPassword')?.updateValueAndValidity();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.isEditMode = false;
    this.editingClientId = null;
    this.clientForm.reset();
  }

  onSubmit(): void {
    if (this.isEditMode) {
      const requiredFields = ['username', 'meterNumber', 'firstName', 'lastName', 'email', 'contactNumber', 'address', 'status'];
      let isValid = true;
      
      for (const field of requiredFields) {
        const control = this.clientForm.get(field);
        if (!control?.value || control.value.trim() === '') {
          isValid = false;
          control?.markAsTouched();
        }
      }
      
      if (!isValid) {
        Swal.fire('Error', 'Please fill in all required fields', 'error');
        return;
      }
    } else {
      if (this.clientForm.invalid) {
        this.markFormGroupTouched();
        return;
      }
      
      const formData = this.clientForm.value;
      if (formData.password !== formData.confirmPassword) {
        Swal.fire('Error', 'Passwords do not match', 'error');
        return;
      }
    }

    const formData = this.clientForm.value;

    if (this.isEditMode) {
      this.updateClient(formData);
    } else {
      this.createClient(formData);
    }
  }

  private createClient(formData: any): void {
    console.log('Creating client with form data:', formData);
    
    const clientData: ClientCreateRequest = {
      Username: formData.username,
      FirstName: formData.firstName,
      MiddleName: formData.middleName || '',
      LastName: formData.lastName,
      Email: formData.email,
      Phone: formData.contactNumber,
      MeterNumber: formData.meterNumber,
      Location: formData.address,
      ConnectionStatus: formData.status || 'Connected',
      Password: formData.password
    };
    
    console.log('Sending client data to backend:', clientData);

    this.clientService.createClient(clientData).subscribe({
      next: (client) => {
        this.loadClients(); // Reload the full list
        this.closeAddModal();
        Swal.fire('Success', 'Client added successfully', 'success');
      },
      error: (error) => {
        console.error('Error adding client:', error);
        const errorMessage = error.error?.message || 'Failed to add client';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  private updateClient(formData: any): void {
    if (!this.editingClientId) return;

    const clientData: ClientUpdateDto = {
      FirstName: formData.firstName,
      MiddleName: formData.middleName,
      LastName: formData.lastName,
      Email: formData.email,
      Phone: formData.contactNumber,
      MeterNumber: formData.meterNumber,
      Location: formData.address,
      ConnectionStatus: formData.status
    };

    this.clientService.updateClient(this.editingClientId, clientData).subscribe({
      next: (response) => {
        this.loadClients(); // Reload the full list
        this.closeAddModal();
        Swal.fire('Success', 'Client updated successfully', 'success');
      },
      error: (error) => {
        console.error('Error updating client:', error);
        const errorMessage = error.error?.message || 'Failed to update client';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  exportExcel(): void {
    if (this.clients.length === 0) {
      Swal.fire('Info', 'No clients data to export', 'info');
      return;
    }

    const exportData = this.clients.map(client => ({
      'ID': client.id,
      'Full Name': this.getFullName(client),
      'Email': client.email,
      'Phone': client.phone,
      'Meter Number': client.meterNumber,
      'Location': client.location,
      'Connection Status': client.connectionStatus,
      'Created Date': new Date(client.createdDate).toLocaleDateString(),
      'Status': client.isActive ? 'Active' : 'Inactive'
    }));

    const csv = this.convertToCSV(exportData);
    this.downloadFile(csv, 'clients-export.csv', 'text/csv');
    Swal.fire('Success', 'Clients exported successfully', 'success');
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  editClient(client: Client): void {
    this.isEditMode = true;
    this.editingClientId = client.id;
    
    this.clientForm.patchValue({
      meterNumber: client.meterNumber,
      firstName: client.firstName,
      middleName: client.middleName || '',
      lastName: client.lastName,
      email: client.email,
      contactNumber: client.phone || client.contactNumber,
      address: client.location || client.address,
      status: client.connectionStatus || client.status || 'Active'
    });
    
    this.clientForm.get('password')?.clearValidators();
    this.clientForm.get('confirmPassword')?.clearValidators();
    this.clientForm.get('password')?.updateValueAndValidity();
    this.clientForm.get('confirmPassword')?.updateValueAndValidity();
    
    this.showAddModal = true;
  }

  viewClient(client: Client): void {
    const clientDetails = `
      <div class="text-left">
        <p><strong>ID:</strong> ${client.id}</p>
        <p><strong>Full Name:</strong> ${this.getFullName(client)}</p>
        <p><strong>Email:</strong> ${client.email}</p>
        <p><strong>Phone:</strong> ${client.phone || client.contactNumber || 'N/A'}</p>
        <p><strong>Meter Number:</strong> ${client.meterNumber}</p>
        <p><strong>Location:</strong> ${client.location || client.address || 'N/A'}</p>
        <p><strong>Connection Status:</strong> ${client.connectionStatus || client.status || 'Unknown'}</p>
        <p><strong>Created Date:</strong> ${new Date(client.createdDate).toLocaleDateString()}</p>
        <p><strong>Active:</strong> ${client.isActive ? 'Yes' : 'No'}</p>
      </div>
    `;

    Swal.fire({
      title: 'Client Details',
      html: clientDetails,
      icon: 'info',
      confirmButtonText: 'Close',
      width: '500px'
    });
  }

  deleteClient(client: Client): void {
    // Check if client has valid ID before attempting deletion
    if (!client.id || client.id === 0) {
      console.error('Invalid client ID for deletion:', client);
      Swal.fire('Error', 'Cannot delete client: Invalid client ID', 'error');
      return;
    }

    Swal.fire({
      title: 'Delete Client',
      text: `Are you sure you want to delete ${this.getFullName(client)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Deleting client with ID:', client.id);
        this.clientService.deleteClient(client.id).subscribe({
          next: (response) => {
            console.log('Client delete response:', response);
            
            // Remove client from local arrays since backend does soft delete
            this.clients = this.clients.filter(c => c.id !== client.id);
            this.filteredClients = this.filteredClients.filter(c => c.id !== client.id);
            
            // Update pagination if needed
            this.totalItems = this.filteredClients.length;
            if (this.currentPage > this.totalPages && this.totalPages > 0) {
              this.currentPage = this.totalPages;
            }
            
            Swal.fire('Deleted', 'Client has been deactivated successfully', 'success');
          },
          error: (error) => {
            console.error('Error deleting client:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message
            });
            
            let errorMessage = 'Failed to delete client';
            if (error.status === 404) {
              errorMessage = 'Client not found or already deleted';
            } else if (error.status === 403) {
              errorMessage = 'You do not have permission to delete this client';
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clientForm.controls).forEach(key => {
      const control = this.clientForm.get(key);
      control?.markAsTouched();
    });
  }

  getFullName(client: Client): string {
    const parts = [client.firstName, client.middleName, client.lastName].filter(Boolean);
    return parts.join(' ');
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isMeterReader(): boolean {
    return this.authService.isMeterReader();
  }

  get paginatedClients(): Client[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredClients.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredClients.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  addReading(client: Client): void {
    this.selectedClient = client;
    this.showReadingModal = true;
    this.readingForm.reset();
    this.loadPreviousReading(client.id);
  }

  private loadPreviousReading(clientId: number): void {
    this.previousReading = null;
    this.previousReadingDate = null;

    this.readingService.getClientReadings(clientId).subscribe({
      next: (readings) => {
        if (readings && readings.length > 0) {
          const latestReading = readings[0]; // Assuming readings are sorted by date desc
          this.previousReading = latestReading.currentReading;
          this.previousReadingDate = latestReading.readingDate;
          
          this.readingForm.get('currentReading')?.setValidators([
            Validators.required,
            Validators.min(this.previousReading + 0.01)
          ]);
        } else {
          this.readingForm.get('currentReading')?.setValidators([
            Validators.required,
            Validators.min(0.01)
          ]);
        }
        this.readingForm.get('currentReading')?.updateValueAndValidity();
      },
      error: (error) => {
        console.error('Error loading previous reading:', error);
        this.readingForm.get('currentReading')?.setValidators([
          Validators.required,
          Validators.min(0.01)
        ]);
        this.readingForm.get('currentReading')?.updateValueAndValidity();
      }
    });
  }

  closeReadingModal(): void {
    this.showReadingModal = false;
    this.selectedClient = null;
    this.previousReading = null;
    this.previousReadingDate = null;
    this.readingForm.reset();
  }

  onSubmitReading(): void {
    console.log('Form validation:', {
      formValid: this.readingForm.valid,
      formValue: this.readingForm.value,
      selectedClient: this.selectedClient,
      formErrors: this.readingForm.errors
    });

    if (this.readingForm.invalid) {
      console.log('Form is invalid');
      this.markReadingFormTouched();
      Swal.fire('Error', 'Please enter a valid current reading', 'error');
      return;
    }

    if (!this.selectedClient) {
      console.log('No client selected');
      Swal.fire('Error', 'No client selected', 'error');
      return;
    }

    const currentReadingValue = this.readingForm.value.currentReading;
    if (!currentReadingValue || currentReadingValue <= 0) {
      Swal.fire('Error', 'Please enter a valid positive reading value', 'error');
      return;
    }

    this.readingLoading = true;
    const readingData: MeterReadingCreateDto = {
      clientId: this.selectedClient.id,
      currentReading: currentReadingValue,
      readingPeriod: this.readingForm.value.readingPeriod || undefined,
      overrideMonthlyRestriction: this.readingForm.value.overrideMonthlyRestriction || false
    };

    console.log('Submitting reading data:', readingData);
    console.log('Selected client:', this.selectedClient);
    console.log('Form value:', this.readingForm.value);
    this.readingService.addReading(readingData).subscribe({
      next: (reading) => {
        console.log('Reading added successfully with override:', reading);
        this.readingLoading = false;
        this.closeReadingModal();
        Swal.fire('Success', `Meter reading added successfully with override for ${this.selectedClient?.fullName}`, 'success');
      },
      error: (error) => {
        console.error('Full error object:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        
        this.readingLoading = false;
        
        let errorMessage = 'Failed to add meter reading with override';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (error.error.errors) {
            // Handle validation errors from backend
            const validationErrors = Object.values(error.error.errors).flat();
            errorMessage = validationErrors.join(', ');
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  addReadingWithOverride(): void {
    const currentReadingValue = this.readingForm.value.currentReading;
    this.readingLoading = true;
    
    const readingData: MeterReadingCreateDto = {
      clientId: this.selectedClient?.id || 0,
      currentReading: parseFloat(currentReadingValue),
      readingPeriod: this.readingForm.value.readingPeriod || undefined,
      overrideMonthlyRestriction: true
    };

    console.log('Submitting reading data with override:', readingData);

    this.readingService.addReading(readingData).subscribe({
      next: (reading) => {
        console.log('Reading added successfully with override:', reading);
        this.readingLoading = false;
        this.closeReadingModal();
        Swal.fire('Success', `Meter reading added successfully with admin override for ${this.selectedClient?.fullName}`, 'success');
      },
      error: (error) => {
        console.error('Error adding reading with override:', error);
        this.readingLoading = false;
        
        let errorMessage = 'Failed to add meter reading with override';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  private markReadingFormTouched(): void {
    Object.keys(this.readingForm.controls).forEach(key => {
      const control = this.readingForm.get(key);
      control?.markAsTouched();
    });
  }
}
