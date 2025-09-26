import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../core/services/auth.service';
import Swal from 'sweetalert2';

interface Payment {
  id: number;
  billId: number;
  clientName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  status: string;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  private apiUrl = 'https://localhost:44372/api';
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  searchTerm = '';
  loading = true;
  showAddModal = false;
  newPayment = {
    billId: 0,
    amount: 0,
    paymentMethod: '',
    reference: '',
    notes: ''
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    this.http.get<Payment[]>(`${this.apiUrl}/payments`).subscribe({
      next: (payments) => {
        this.payments = payments;
        this.filteredPayments = payments;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.loading = false;
        Swal.fire('Error', 'Failed to load payments', 'error');
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPayments = this.payments;
      return;
    }

    this.filteredPayments = this.payments.filter(payment =>
      payment.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      payment.reference.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  recordPayment(): void {
    this.http.post(`${this.apiUrl}/payments`, this.newPayment).subscribe({
      next: () => {
        this.showAddModal = false;
        this.loadPayments();
        Swal.fire('Success', 'Payment recorded successfully!', 'success');
        this.resetForm();
      },
      error: (error) => {
        console.error('Error recording payment:', error);
        const errorMessage = error.error?.message || 'Error recording payment. Please try again.';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  closeModal(): void {
    this.showAddModal = false;
    this.resetForm();
  }

  private resetForm(): void {
    this.newPayment = {
      billId: 0,
      amount: 0,
      paymentMethod: '',
      reference: '',
      notes: ''
    };
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
}
