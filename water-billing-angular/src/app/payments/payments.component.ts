import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PaymentService } from '../core/services/payment.service';
import { MpesaService, MpesaStkPushRequest } from '../core/services/mpesa.service';
import { BillService } from '../core/services/bill.service';
import { AuthService } from '../core/services/auth.service';
import { PaymentCreateDto, PaymentResponseDto, BillResponseDto } from '../core/models/api.models';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit {
  payments: PaymentResponseDto[] = [];
  bills: BillResponseDto[] = [];
  loading = false;
  error = '';
  success = '';

  // Manual payment form
  manualPayment: PaymentCreateDto = {
    billId: 0,
    amount: 0,
    paymentMethod: 'Cash',
    reference: ''
  };

  // Mpesa payment form
  mpesaPayment: MpesaStkPushRequest = {
    billId: 0,
    phoneNumber: '',
    amount: 0
  };

  // Payment methods for dropdown
  paymentMethods = ['Cash', 'Bank', 'Mpesa', 'Card'];

  // Current user role
  userRole = '';
  isAdmin = false;
  isClient = false;

  constructor(
    private paymentService: PaymentService,
    private mpesaService: MpesaService,
    private billService: BillService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getRole() || '';
    this.isAdmin = this.userRole === 'Admin';
    this.isClient = this.userRole === 'Client';
    
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    if (this.isAdmin) {
      // Admin can see all payments and bills
      this.paymentService.getAllPayments().subscribe({
        next: (payments) => {
          this.payments = payments;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load payments';
          this.loading = false;
        }
      });

      this.billService.getAllBills().subscribe({
        next: (bills) => {
          this.bills = bills.filter(b => b.status === 'Unpaid');
        },
        error: (error) => {
          console.error('Failed to load bills', error);
        }
      });
    } else if (this.isClient) {
      // Client can see their own payments and bills
      const userId = this.authService.getUserId();
      if (userId) {
        this.billService.getClientBills(userId).subscribe({
          next: (bills) => {
            this.bills = bills.filter(b => b.status === 'Unpaid');
            this.loading = false;
          },
          error: (error) => {
            this.error = 'Failed to load your bills';
            this.loading = false;
          }
        });

        this.paymentService.getClientPayments(userId).subscribe({
          next: (payments) => {
            this.payments = payments;
          },
          error: (error) => {
            console.error('Failed to load payments', error);
          }
        });
      }
    }
  }

  recordManualPayment(): void {
    if (!this.manualPayment.billId || !this.manualPayment.amount) {
      this.error = 'Please select a bill and enter payment amount';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.paymentService.recordPayment(this.manualPayment).subscribe({
      next: (response) => {
        this.success = 'Payment recorded successfully!';
        this.resetManualPaymentForm();
        this.loadData();
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to record payment';
        this.loading = false;
      }
    });
  }

  initiateMpesaPayment(): void {
    if (!this.mpesaPayment.billId || !this.mpesaPayment.amount || !this.mpesaPayment.phoneNumber) {
      this.error = 'Please fill in all Mpesa payment fields';
      return;
    }

    if (!this.mpesaService.isValidPhoneNumber(this.mpesaPayment.phoneNumber)) {
      this.error = 'Please enter a valid phone number (e.g., 0712345678)';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Format phone number
    this.mpesaPayment.phoneNumber = this.mpesaService.formatPhoneNumber(this.mpesaPayment.phoneNumber);

    this.mpesaService.initiateStkPush(this.mpesaPayment).subscribe({
      next: (response) => {
        if (response.responseCode === '0') {
          this.success = response.customerMessage || 'Payment request sent to your phone. Please enter your M-Pesa PIN.';
          this.resetMpesaPaymentForm();
          
          // Poll for transaction status
          this.pollTransactionStatus(response.checkoutRequestID);
        } else {
          this.error = response.responseDescription || 'Failed to initiate M-Pesa payment';
        }
        this.loading = false;
      },
      error: (error) => {
        this.error = error.error?.message || 'Failed to initiate M-Pesa payment';
        this.loading = false;
      }
    });
  }

  private pollTransactionStatus(checkoutRequestId: string): void {
    // Poll every 5 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes / 5 seconds

    const poll = setInterval(() => {
      attempts++;
      
      this.mpesaService.getTransactionStatus(checkoutRequestId).subscribe({
        next: (status) => {
          if (status.status === 'Success') {
            clearInterval(poll);
            this.success = 'Payment completed successfully!';
            this.loadData();
          } else if (status.status === 'Failed' || status.status === 'Cancelled') {
            clearInterval(poll);
            this.error = this.mpesaService.getStatusMessage(status.status);
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            this.error = 'Payment status check timed out. Please check your payment history.';
          }
        },
        error: (error) => {
          if (attempts >= maxAttempts) {
            clearInterval(poll);
            this.error = 'Payment status check failed. Please check your payment history.';
          }
        }
      });
    }, 5000);
  }

  resetManualPaymentForm(): void {
    this.manualPayment = {
      billId: 0,
      amount: 0,
      paymentMethod: 'Cash',
      reference: ''
    };
  }

  resetMpesaPaymentForm(): void {
    this.mpesaPayment = {
      billId: 0,
      phoneNumber: '',
      amount: 0
    };
  }

  getBillDisplay(bill: BillResponseDto): string {
    return `${bill.billNumber} - ${bill.clientName} (KSh ${bill.totalAmount})`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-KE');
  }
}
