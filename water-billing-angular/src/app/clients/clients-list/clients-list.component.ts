import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ClientService, Client, ClientCreateRequest } from '../../core/services/client.service';
import { ReadingService } from '../../core/services/reading.service';
import { AuthService } from '../../core/services/auth.service';
import { MeterReadingCreateDto } from '../../core/models/api.models';
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
  clientForm: FormGroup;
  readingForm: FormGroup;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  
  // Search with debouncing
  private searchSubject = new Subject<string>();

  constructor(
    private clientService: ClientService,
    private readingService: ReadingService,
    private authService: AuthService,
    private formBuilder: FormBuilder
  ) {
    this.clientForm = this.formBuilder.group({
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
      currentReading: ['', [Validators.required, Validators.min(0.01)]]
    });

    // Setup debounced search
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

  loadClients(): void {
    this.loading = true;
    this.clientService.getClients({
      page: this.currentPage,
      limit: this.itemsPerPage
    }).subscribe({
      next: (clients) => {
        this.clients = clients;
        this.filteredClients = clients;
        this.totalItems = clients.length;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.loading = false;
        Swal.fire('Error', 'Failed to load clients', 'error');
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

    this.loading = true;
    this.clientService.searchClients(searchTerm).subscribe({
      next: (clients) => {
        this.filteredClients = clients;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching clients:', error);
        this.filteredClients = this.clients.filter(client =>
          this.getFullName(client).toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.meterNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.contactNumber || client.phone || '').includes(searchTerm)
        );
        this.loading = false;
      }
    });
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingClientId = null;
    this.showAddModal = true;
    this.clientForm.reset();
    this.clientForm.patchValue({ status: 'Connected' });
    
    // Add password validators for new client
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
    // For edit mode, only validate required fields (not password fields)
    if (this.isEditMode) {
      const requiredFields = ['meterNumber', 'firstName', 'lastName', 'email', 'contactNumber', 'address', 'status'];
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
      // For new clients, validate all fields including passwords
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
    const clientData: ClientCreateRequest = {
      username: formData.email, // Use email as username
      firstName: formData.firstName,
      middleName: formData.middleName || '',
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.contactNumber,
      meterNumber: formData.meterNumber,
      location: formData.address,
      connectionStatus: formData.status || 'Connected',
      password: formData.password
    };

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

    // Send all fields - backend will handle partial updates
    const clientData = {
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.contactNumber,
      meterNumber: formData.meterNumber,
      location: formData.address,
      connectionStatus: formData.status
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

    // Prepare data for Excel export
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

    // Convert to CSV format (Excel can open CSV files)
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
    
    // Pre-populate form with client data
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
    
    // Remove password requirements for editing
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
        this.clientService.deleteClient(client.id).subscribe({
          next: () => {
            this.clients = this.clients.filter(c => c.id !== client.id);
            this.filteredClients = this.filteredClients.filter(c => c.id !== client.id);
            Swal.fire('Deleted', 'Client has been deleted', 'success');
          },
          error: (error) => {
            console.error('Error deleting client:', error);
            Swal.fire('Error', 'Failed to delete client', 'error');
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

  // Pagination methods
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
  }

  closeReadingModal(): void {
    this.showReadingModal = false;
    this.selectedClient = null;
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
      currentReading: parseFloat(currentReadingValue)
    };

    console.log('Submitting reading data:', readingData);

    this.readingService.addReading(readingData).subscribe({
      next: (reading) => {
        console.log('Reading added successfully:', reading);
        this.readingLoading = false;
        this.closeReadingModal();
        Swal.fire('Success', `Meter reading added successfully for ${this.selectedClient?.fullName}`, 'success');
      },
      error: (error) => {
        console.error('Error adding reading:', error);
        this.readingLoading = false;
        const errorMessage = error.error?.message || error.message || 'Failed to add meter reading';
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
