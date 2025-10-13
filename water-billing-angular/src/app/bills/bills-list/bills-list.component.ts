import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { BillingService, Bill, Payment } from '../../core/services/billing.service';
import { PaymentCreateDto } from '../../core/models/api.models';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-bills-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './bills-list.component.html',
  styleUrls: ['./bills-list.component.scss']
})
export class BillsListComponent implements OnInit {
  bills: Bill[] = [];
  filteredBills: Bill[] = [];
  searchTerm = '';
  loading = true;
  isOngoing = true;
  pageTitle = '';
  showPaymentModal = false;
  selectedBill: Bill | null = null;
  paymentForm: FormGroup;
  paymentLoading = false;
  stkPhoneNumber = '';
  stkLoading = false;
  
  // Search with debouncing
  private searchSubject = new Subject<string>();

  constructor(
    private billingService: BillingService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    this.paymentForm = this.formBuilder.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['Cash', Validators.required],
      reference: ['']
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
    this.route.url.subscribe(segments => {
      const path = segments[0]?.path;
      this.isOngoing = path === 'ongoing';
      this.pageTitle = this.isOngoing ? 'Ongoing Bills' : 'Billing History';
      this.loadBills();
    });
  }

  loadBills(): void {
    this.loading = true;
    
    if (this.authService.isClient()) {
      // For clients, get their specific bills
      this.loadClientSpecificBills();
    } else {
      // For admin/meter readers, get bills based on page type
      const status = this.isOngoing ? 'Unpaid' : 'Paid';
      this.billingService.getBills({ status }).subscribe({
        next: (bills) => {
          this.bills = bills;
          this.filteredBills = bills;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading bills:', error);
          this.bills = [];
          this.filteredBills = [];
          this.loading = false;
        }
      });
    }
  }

  private loadClientSpecificBills(): void {
    // For clients, first get their client ID, then get their specific bills
    this.http.get<any>(`${environment.apiUrl}/clients/my-info`).subscribe({
      next: (clientInfo) => {
        console.log('Client info for bills:', clientInfo);
        const clientId = clientInfo.id;
        
        // Now get bills for this specific client
        this.billingService.getClientBills(clientId).subscribe({
          next: (allBills) => {
            console.log('All client bills:', allBills);
            // Filter by status on frontend since we have all bills
            const status = this.isOngoing ? 'Unpaid' : 'Paid';
            this.bills = allBills.filter(bill => bill.status === status);
            this.filteredBills = this.bills;
            console.log(`Filtered ${status} bills:`, this.bills);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading client bills:', error);
            this.bills = [];
            this.filteredBills = [];
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error loading client info:', error);
        // Fallback to the general endpoint with role-based filtering
        console.log('Falling back to general bills endpoint with role filtering');
        const status = this.isOngoing ? 'Unpaid' : 'Paid';
        this.billingService.getBills({ status }).subscribe({
          next: (bills) => {
            this.bills = bills;
            this.filteredBills = bills;
            this.loading = false;
          },
          error: (fallbackError) => {
            console.error('Error loading bills with fallback:', fallbackError);
            this.bills = [];
            this.filteredBills = [];
            this.loading = false;
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
      this.filteredBills = this.bills;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredBills = this.bills.filter(bill =>
      bill.clientName.toLowerCase().includes(term) ||
      bill.billNumber?.toLowerCase().includes(term) ||
      bill.id.toString().includes(term) ||
      bill.status.toLowerCase().includes(term)
    );
  }

  payBill(bill: Bill): void {
    this.selectedBill = bill;
    this.paymentForm.patchValue({
      amount: bill.balance,
      paymentMethod: 'Cash',
      reference: ''
    });
    // Pre-populate phone number if available (you might need to adjust based on your Bill interface)
    this.stkPhoneNumber = (bill as any).clientPhone || '';
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedBill = null;
    this.paymentForm.reset();
  }

  submitPayment(): void {
    if (this.paymentForm.invalid || !this.selectedBill) {
      return;
    }

    this.paymentLoading = true;
    const paymentData: PaymentCreateDto = {
      billId: this.selectedBill.id,
      amount: this.paymentForm.value.amount,
      paymentMethod: this.paymentForm.value.paymentMethod,
      reference: this.paymentForm.value.reference
    };

    this.billingService.recordPayment(paymentData).subscribe({
      next: (payment) => {
        this.paymentLoading = false;
        this.closePaymentModal();
        Swal.fire('Success', 'Payment recorded successfully', 'success');
        this.loadBills(); // Refresh the bills list
      },
      error: (error) => {
        this.paymentLoading = false;
        console.error('Error recording payment:', error);
        const errorMessage = error.error?.message || 'Failed to record payment';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  downloadBillReceipt(bill: Bill): void {
    this.http.get(`${environment.apiUrl}/payments/bill/${bill.id}/receipt`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Denkam_Waters_Bill_${bill.billNumber}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          icon: 'success',
          title: 'Bill Receipt Downloaded',
          text: 'Your bill receipt has been downloaded successfully.',
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Failed to download receipt', 'error');
      }
    });
  }

  // Helper methods
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isMeterReader(): boolean {
    return this.authService.isMeterReader();
  }

  isClient(): boolean {
    return this.authService.isClient();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  }

  getBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'badge-success';
      case 'unpaid': return 'badge-warning';
      case 'overdue': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  isOverdue(bill: Bill): boolean {
    return new Date(bill.dueDate) < new Date() && bill.balance > 0;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString();
  }

  getDisplayTitle(): string {
    if (this.isClient()) {
      return this.isOngoing ? 'My Ongoing Bills' : 'My Billing History';
    }
    return this.pageTitle;
  }

  // Additional action methods from original
  initiateClientSTKPush(bill: Bill): void {
    // STK Push functionality for clients
    Swal.fire({
      title: 'Pay via M-Pesa STK Push',
      html: `
        <div class="text-left">
          <div class="mb-3">
            <strong>Bill:</strong> ${bill.billNumber}<br>
            <strong>Amount Due:</strong> KSh ${bill.balance.toFixed(2)}
          </div>
          <div class="form-group mb-3">
            <label for="stkPhone" class="form-label">M-Pesa Phone Number *</label>
            <input type="text" id="stkPhone" class="form-control" placeholder="254XXXXXXXXX" pattern="254[0-9]{9}">
            <small class="text-muted">Format: 254XXXXXXXXX</small>
          </div>
          <div class="form-group mb-3">
            <label for="stkAmount" class="form-label">Payment Amount *</label>
            <input type="number" id="stkAmount" class="form-control" value="${bill.balance}" max="${bill.balance}" min="1" step="0.01">
            <small class="text-muted">Maximum: KSh ${bill.balance.toFixed(2)}</small>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Send STK Push',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#28a745',
      preConfirm: () => {
        const phoneInput = document.getElementById('stkPhone') as HTMLInputElement;
        const amountInput = document.getElementById('stkAmount') as HTMLInputElement;
        
        const phone = phoneInput.value;
        const amount = parseFloat(amountInput.value);
        
        if (!phone || !phone.match(/^254[0-9]{9}$/)) {
          Swal.showValidationMessage('Please enter a valid phone number (254XXXXXXXXX)');
          return false;
        }
        
        if (!amount || amount <= 0 || amount > bill.balance) {
          Swal.showValidationMessage(`Please enter a valid amount (1 - ${bill.balance})`);
          return false;
        }
        
        return { phone, amount };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.processClientSTKPush(bill, result.value.phone, result.value.amount);
      }
    });
  }

  private processClientSTKPush(bill: Bill, phoneNumber: string, amount: number): void {
    const stkData = {
      BillId: bill.id,
      PhoneNumber: phoneNumber,
      Amount: amount
    };

    this.http.post(`${environment.apiUrl}/payments/mpesa/stkpush`, stkData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'STK Push Sent!',
          html: `
            <div class="text-left">
              <p>✅ M-Pesa payment request sent to <strong>${phoneNumber}</strong></p>
              <p>💰 Amount: <strong>KSh ${amount.toFixed(2)}</strong></p>
              <p>📱 Please check your phone and enter your M-Pesa PIN to complete the payment.</p>
              <p class="text-muted">The payment will be processed automatically once confirmed.</p>
            </div>
          `,
          timer: 10000,
          showConfirmButton: true
        }).then(() => {
          // Reload bills to show updated balance
          this.loadBills();
        });
      },
      error: (error) => {
        console.error('STK Push error:', error);
        const errorMessage = error.error?.message || 'Failed to initiate M-Pesa payment';
        Swal.fire('Payment Failed', errorMessage, 'error');
      }
    });
  }

  viewBillPayments(bill: Bill): void {
    // Show payments for this bill
    this.http.get<Payment[]>(`${environment.apiUrl}/payments/client/${bill.clientId}`).subscribe({
      next: (allPayments) => {
        const payments = allPayments.filter(p => p.billId === bill.id);
        
        if (payments.length === 0) {
          Swal.fire('Info', 'No payments found for this bill', 'info');
          return;
        }

        let paymentsHtml = '<div class="payments-list" style="max-height: 400px; overflow-y: auto;">';
        payments.forEach((payment, index) => {
          paymentsHtml += `
            <div class="payment-item border p-3 mb-3 rounded" style="background-color: #f8f9fa;">
              <div class="row">
                <div class="col-md-8">
                  <h6 class="text-primary mb-2">Payment #${index + 1}</h6>
                  <div class="row">
                    <div class="col-6">
                      <strong>Amount:</strong> KSh ${payment.amount.toFixed(2)}<br>
                      <strong>Method:</strong> ${payment.paymentMethod}
                    </div>
                    <div class="col-6">
                      <strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}<br>
                      <strong>Reference:</strong> ${payment.reference || 'N/A'}
                    </div>
                  </div>
                </div>
                <div class="col-md-4 text-center">
                  <button class="btn btn-sm btn-success download-payment-btn" data-payment-id="${payment.id}" data-bill-number="${bill.billNumber}">
                    <i class="fas fa-download"></i> Download Receipt
                  </button>
                </div>
              </div>
            </div>
          `;
        });
        paymentsHtml += '</div>';

        Swal.fire({
          title: `Payments for Bill ${bill.billNumber}`,
          html: paymentsHtml,
          width: '700px',
          showCloseButton: true,
          showConfirmButton: false,
          didOpen: () => {
            const downloadButtons = document.querySelectorAll('.download-payment-btn');
            downloadButtons.forEach(button => {
              button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const btn = target.closest('.download-payment-btn') as HTMLElement;
                const paymentId = parseInt(btn.getAttribute('data-payment-id') || '0');
                const billNumber = btn.getAttribute('data-bill-number') || '';
                this.downloadPaymentReceipt(paymentId, billNumber);
              });
            });
          }
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Failed to load payments', 'error');
      }
    });
  }

  downloadPaymentReceipt(paymentId: number, billNumber: string): void {
    this.http.get(`${environment.apiUrl}/payments/${paymentId}/receipt`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Denkam_Waters_Payment_Receipt_${billNumber}_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Swal.fire({
          icon: 'success',
          title: 'Payment Receipt Downloaded',
          text: 'Your payment receipt has been downloaded successfully.',
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        Swal.fire('Error', 'Failed to download payment receipt', 'error');
      }
    });
  }

  sendBillReminder(bill: Bill): void {
    if (bill.status === 'Paid') {
      Swal.fire('Info', 'Cannot send reminder for paid bills', 'info');
      return;
    }

    Swal.fire({
      title: 'Send Bill Reminder',
      text: `Send payment reminder email to ${bill.clientName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send Email',
      confirmButtonColor: '#007bff'
    }).then((result) => {
      if (result.isConfirmed) {
        this.billingService.sendBillReminder(bill.id).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Email Sent!',
              text: `Bill reminder sent successfully to ${(response as any).email}`,
              timer: 3000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            let errorMessage = 'Failed to send bill reminder';
            
            if (error.status === 400) {
              errorMessage = error.error || 'Cannot send reminder for this bill';
            } else if (error.status === 404) {
              errorMessage = 'Bill not found';
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            }
            
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  deleteBill(bill: Bill): void {
    if (!this.isAdmin()) {
      Swal.fire('Access Denied', 'Only administrators can delete bills', 'error');
      return;
    }

    if (bill.balance < bill.totalAmount) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Delete Bill',
        text: 'This bill has payments recorded and cannot be deleted. Please contact system administrator if you need to remove this bill.',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: 'Delete Bill',
      html: `
        <div class="text-left">
          <p><strong>Bill Number:</strong> ${bill.billNumber}</p>
          <p><strong>Client:</strong> ${bill.clientName}</p>
          <p><strong>Amount:</strong> KSh ${bill.totalAmount.toLocaleString()}</p>
          <p><strong>Status:</strong> ${bill.status}</p>
          <br>
          <p class="text-danger">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, Delete Bill',
      cancelButtonText: 'Cancel',
      width: '500px'
    }).then((result) => {
      if (result.isConfirmed) {
        this.billingService.deleteBill(bill.id).subscribe({
          next: (response) => {
            this.bills = this.bills.filter(b => b.id !== bill.id);
            this.filteredBills = this.filteredBills.filter(b => b.id !== bill.id);
            
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: `Bill ${bill.billNumber} has been deleted successfully`,
              timer: 3000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error deleting bill:', error);
            let errorMessage = 'Failed to delete bill';
            
            if (error.status === 400) {
              errorMessage = error.error?.Message || error.error || 'Cannot delete bill with existing payments';
            } else if (error.status === 401) {
              errorMessage = 'Unauthorized: Please log in as an administrator';
            } else if (error.status === 403) {
              errorMessage = 'Access denied: Only administrators can delete bills';
            } else if (error.status === 404) {
              errorMessage = error.error?.Message || 'Bill not found';
            }
            
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  downloadBills(): void {
    if (this.filteredBills.length === 0) {
      Swal.fire('Info', 'No bills to download', 'info');
      return;
    }

    const exportData = this.filteredBills.map(bill => ({
      'Bill Number': bill.billNumber || `#${bill.id}`,
      'Client Name': bill.clientName || 'N/A',
      'Units Used (m³)': bill.unitsUsed || 0,
      'Amount (KSh)': bill.amount || 0,
      'Due Date': this.formatDate(bill.dueDate),
      'Penalty (KSh)': bill.penaltyAmount || 0,
      'Total Amount (KSh)': bill.totalAmount || 0,
      'Balance (KSh)': bill.balance || 0,
      'Status': bill.status
    }));

    this.generateBillsPDF(exportData, this.filteredBills.length);
  }

  private generateBillsPDF(data: any[], count: number): void {
    const title = this.isOngoing ? 'Ongoing Bills Report' : 'Billing History Report';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th { background-color: #4e73df; color: white; padding: 8px; text-align: left; }
          td { padding: 6px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .header { text-align: center; margin-bottom: 20px; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
          .summary { background: #f8f9fc; padding: 15px; margin: 20px 0; border-left: 4px solid #4e73df; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Total Bills: ${count}</p>
        </div>
        ${this.isClient() ? `
        <div class="summary">
          <h3>Summary</h3>
          <p><strong>Total Outstanding:</strong> KSh ${this.filteredBills.reduce((sum, b) => sum + (b.balance || 0), 0).toFixed(2)}</p>
        </div>
        ` : ''}
        <table>
          <thead>
            <tr>
              ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${Object.values(row).map(val => `<td>${val}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Water Billing System - Bills Report</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    Swal.fire('Success', `${count} bill(s) exported successfully`, 'success');
  }

  sendSTKPush(): void {
    if (!this.isValidPhoneNumber(this.stkPhoneNumber)) {
      Swal.fire('Error', 'Please enter a valid phone number (254XXXXXXXXX)', 'error');
      return;
    }

    if (!this.selectedBill) {
      Swal.fire('Error', 'No bill selected for payment', 'error');
      return;
    }

    const amount = this.selectedBill.balance || this.selectedBill.totalAmount;
    
    Swal.fire({
      title: 'Confirm STK Push',
      html: `
        <div class="text-left">
          <p><strong>Bill:</strong> ${this.selectedBill.billNumber}</p>
          <p><strong>Client:</strong> ${this.selectedBill.clientName}</p>
          <p><strong>Phone:</strong> ${this.stkPhoneNumber}</p>
          <p><strong>Amount:</strong> KSh ${amount.toFixed(2)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send STK Push',
      confirmButtonColor: '#28a745'
    }).then((result) => {
      if (result.isConfirmed && this.selectedBill) {
        this.processAdminSTKPush(this.selectedBill, this.stkPhoneNumber, amount);
      }
    });
  }

  private processAdminSTKPush(bill: Bill, phoneNumber: string, amount: number): void {
    const stkData = {
      BillId: bill.id,
      PhoneNumber: phoneNumber,
      Amount: amount
    };

    this.http.post(`${environment.apiUrl}/payments/mpesa/stkpush`, stkData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'STK Push Sent!',
          html: `
            <div class="text-left">
              <p>✅ M-Pesa payment request sent to <strong>${phoneNumber}</strong></p>
              <p>💰 Amount: <strong>KSh ${amount.toFixed(2)}</strong></p>
              <p>📱 Please ask the client to check their phone and enter M-Pesa PIN.</p>
              <p class="text-muted">The payment will be processed automatically once confirmed.</p>
            </div>
          `,
          timer: 15000,
          showConfirmButton: true
        }).then(() => {
          this.loadBills();
        });
      },
      error: (error) => {
        console.error('STK Push error:', error);
        Swal.fire('Error', 'Failed to send STK Push. Please try again.', 'error');
      }
    });
  }

  isValidPhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^254[0-9]{9}$/;
    return phoneRegex.test(phoneNumber);
  }
}
