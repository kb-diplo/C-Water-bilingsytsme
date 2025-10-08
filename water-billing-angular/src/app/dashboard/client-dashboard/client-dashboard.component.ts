import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

interface ClientStats {
  unpaidBills: number;
  totalOwed: number;
  totalPaidThisYear: number;
  paymentCount: number;
  averageMonthlyBill: number;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  stats: ClientStats = {
    unpaidBills: 0,
    totalOwed: 0,
    totalPaidThisYear: 0,
    paymentCount: 0,
    averageMonthlyBill: 0
  };
  recentBills: any[] = [];
  paymentHistory: any[] = [];
  loading = false;
  paymentForm: FormGroup;
  paymentLoading = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private formBuilder: FormBuilder
  ) {
    this.paymentForm = this.formBuilder.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^254[0-9]{9}$/)]],
      amount: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    console.log('Client dashboard initialized for user:', user);

    if (!user) {
      console.log('No user found, redirecting to login');
      this.authService.logout();
      return;
    }

    // More flexible role checking (case-insensitive, handle both Client and Customer)
    const userRole = user.role?.toLowerCase();
    if (userRole !== 'client' && userRole !== 'customer') {
      console.error('User does not have Client/Customer role. User role:', user.role, 'Expected: Client or Customer');
      console.log('Available user properties:', Object.keys(user));
      console.log('Redirecting to correct dashboard...');
      this.authService.redirectToDashboard(); // Redirect to correct dashboard
      return;
    }

    console.log('User is authenticated and has Client role, loading dashboard data');
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.error('No user found in loadDashboardData');
      this.authService.logout();
      return;
    }

    console.log('Loading dashboard data for user:', user.id, user.username);
    this.loading = true;

    // Get the current client's information
    this.http.get<any>(`${this.apiUrl}/clients/my-info`).subscribe({
      next: (clientInfo) => {
        console.log('Client info response:', clientInfo);
        const clientId = clientInfo.id;
        console.log('Found client ID:', clientId, 'for user:', user.username);

        // Load bills for this client
        this.http.get<any[]>(`${this.apiUrl}/bills/client/${clientId}`).subscribe({
          next: (bills) => {
            console.log('Bills response:', bills);
            this.stats.unpaidBills = bills?.filter(b => b.status !== 'Paid').length || 0;
            // Use balance for accurate outstanding amount calculation
            this.stats.totalOwed = bills?.filter(b => b.status !== 'Paid')
              .reduce((sum, bill) => sum + (bill.balance || bill.totalAmount - (bill.amountPaid || 0)), 0) || 0;
            this.recentBills = bills?.slice(0, 5) || [];
            console.log('Bills stats:', this.stats);
            this.loading = false; // Set loading to false after bills are loaded
          },
          error: (err) => {
            console.error('Error loading bills:', err);
            this.stats.unpaidBills = 0;
            this.stats.totalOwed = 0;
            this.recentBills = [];
            this.loading = false; // Set loading to false even on error
          }
        });

        // Load payments for this client
        this.http.get<any[]>(`${this.apiUrl}/payments/client/${clientId}`).subscribe({
          next: (payments) => {
            console.log('Payments response:', payments);
            this.stats.totalPaidThisYear = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            this.stats.paymentCount = payments?.length || 0;
            this.stats.averageMonthlyBill = this.stats.paymentCount > 0 ?
              Math.round(this.stats.totalPaidThisYear / 12) : 0;
            this.paymentHistory = payments?.slice(0, 5) || [];
            console.log('Payment stats:', this.stats);
          },
          error: (err) => {
            console.error('Error loading payments:', err);
            this.stats.totalPaidThisYear = 0;
            this.stats.paymentCount = 0;
            this.stats.averageMonthlyBill = 0;
            this.paymentHistory = [];
          }
        });
      },
      error: (err) => {
        console.error('Error loading client info:', err);
        console.error('Error details:', err.error);
        
        // Handle different error scenarios more gracefully
        if (err.status === 404) {
          console.error('Client information not found. User may not have a client record.');
          // Don't logout immediately - show error message instead
          this.loading = false;
          // You could show a message to contact admin instead of logging out
        } else if (err.status === 401 || err.status === 403) {
          // Only logout for authentication/authorization errors
          console.error('Authentication error, logging out');
          this.authService.logout();
        } else {
          console.error('API error, showing empty dashboard');
          this.loading = false;
        }
      }
    });
  }

  // Navigation methods for Quick Actions
  navigateToMyBills(): void {
    console.log('Navigating to bills...');
    this.router.navigate(['/bills/ongoing']);
  }

  navigateToPayments(): void {
    console.log('Navigating to payments...');
    this.router.navigate(['/payments']);
  }

  scrollToPayment(): void {
    console.log('Make Payment button clicked');
    console.log('Current stats:', this.stats);
    
    // First try to find the payment section
    const paymentSection = document.getElementById('paymentSection');
    console.log('Payment section element:', paymentSection);
    
    if (paymentSection) {
      console.log('Scrolling to payment section');
      
      // Scroll to the payment section
      paymentSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Focus on the phone number input after scrolling
      setTimeout(() => {
        const phoneInput = document.getElementById('phoneNumber') as HTMLInputElement;
        console.log('Phone input element:', phoneInput);
        
        if (phoneInput) {
          phoneInput.focus();
          phoneInput.select(); // Also select any existing text
          console.log('Focused on phone number input');
          
          // Add a visual highlight to make it obvious
          phoneInput.style.boxShadow = '0 0 10px #007bff';
          setTimeout(() => {
            phoneInput.style.boxShadow = '';
          }, 2000);
        } else {
          console.error('Phone number input not found');
        }
      }, 800); // Reduced timeout for faster response
      
    } else {
      console.error('Payment section not found');
      console.log('Unpaid bills count:', this.stats.unpaidBills);
      
      // Show appropriate message based on the situation
      if (this.stats.unpaidBills === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No Unpaid Bills',
          text: 'You currently have no unpaid bills. The payment section is only available when you have outstanding bills.',
          confirmButtonText: 'OK'
        });
      } else {
        // Payment section should be there but isn't - might be a loading issue
        Swal.fire({
          icon: 'warning',
          title: 'Payment Section Not Found',
          text: 'The payment section is not currently visible. Please refresh the page and try again.',
          confirmButtonText: 'Refresh Page'
        }).then((result) => {
          if (result.isConfirmed) {
            // Reload component data instead of full page reload
            this.loadDashboardData();
          }
        });
      }
    }
  }

  downloadReport(): void {
    console.log('Downloading report...');
    
    Swal.fire({
      title: 'Download Report',
      text: 'What type of report would you like to download?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Bills Summary',
      cancelButtonText: 'Payment History',
      showDenyButton: true,
      denyButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.downloadBillsSummary();
      } else if (result.isDismissed && result.dismiss !== Swal.DismissReason.cancel) {
        // Cancel button was clicked (Payment History)
        this.downloadPaymentHistory();
      }
    });
  }

  private downloadBillsSummary(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    // Create a simple HTML report
    const reportContent = `
      <html>
        <head>
          <title>Bills Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Water Billing System</h1>
            <h2>Bills Summary Report</h2>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Account: ${user.username}</p>
          </div>
          <div class="stats">
            <div class="stat-card">
              <h3>Unpaid Bills</h3>
              <p>${this.stats.unpaidBills}</p>
            </div>
            <div class="stat-card">
              <h3>Total Owed</h3>
              <p>KSh ${this.stats.totalOwed.toFixed(2)}</p>
            </div>
            <div class="stat-card">
              <h3>Paid This Year</h3>
              <p>KSh ${this.stats.totalPaidThisYear.toFixed(2)}</p>
            </div>
            <div class="stat-card">
              <h3>Payment Count</h3>
              <p>${this.stats.paymentCount}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create and download the file
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bills-summary-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    window.URL.revokeObjectURL(url);

    Swal.fire({
      icon: 'success',
      title: 'Report Downloaded',
      text: 'Your bills summary report has been downloaded successfully.',
      timer: 2000,
      showConfirmButton: false
    });
  }

  private downloadPaymentHistory(): void {
    Swal.fire({
      icon: 'info',
      title: 'Payment History',
      text: 'Payment history report functionality will be available soon. Please contact the office for detailed payment records.',
      confirmButtonText: 'OK'
    });
  }

  contactSupport(): void {
    console.log('Contact support clicked...');
    Swal.fire({
      icon: 'info',
      title: 'Contact Support',
      html: `
        <div class="text-left">
          <p><strong>Office Hours:</strong> Monday - Friday, 8:00 AM - 5:00 PM</p>
          <p><strong>Phone:</strong> 0743683868 / 0757690915</p>
          <p><strong>Email:</strong> support@denkamwaters.com</p>
          <p><strong>Location:</strong> Kiambu, Kahawa Wendani</p>
        </div>
      `,
      confirmButtonText: 'OK',
      width: '500px'
    });
  }

  initiateSTKPush(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const phoneNumber = this.paymentForm.get('phoneNumber')?.value;
    const amount = this.paymentForm.get('amount')?.value;

    // Show confirmation dialog
    Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div class="text-left">
          <p><strong>Phone Number:</strong> ${phoneNumber}</p>
          <p><strong>Amount:</strong> KSh ${amount}</p>
          <p class="text-muted">You will receive an M-Pesa prompt on your phone to complete the payment.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Proceed with Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#28a745'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processSTKPush(phoneNumber, amount);
      }
    });
  }

  private processSTKPush(phoneNumber: string, amount: number): void {
    this.paymentLoading = true;

    // Get current user to find their client ID
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.paymentLoading = false;
      Swal.fire('Error', 'User not authenticated', 'error');
      return;
    }

    // First get the client ID for the current user
    this.http.get<any>(`${this.apiUrl}/clients/my-info`).subscribe({
      next: (clientProfile) => {
        const clientId = clientProfile.id;
        
        // Now get the bills for this client
        this.http.get<any[]>(`${this.apiUrl}/bills/client/${clientId}`).subscribe({
          next: (bills) => {
            console.log('Client bills loaded:', bills);
            const unpaidBill = bills.find(bill => bill.balance > 0);
            if (!unpaidBill) {
              this.paymentLoading = false;
              Swal.fire('Error', 'No unpaid bills found', 'error');
              return;
            }

            const stkPushData = {
              billId: unpaidBill.id,
              phoneNumber: phoneNumber,
              amount: amount
            };

            console.log('Initiating STK Push with data:', stkPushData);

            this.http.post(`${this.apiUrl}/payments/mpesa/stkpush`, stkPushData).subscribe({
              next: (response: any) => {
                this.paymentLoading = false;
                console.log('STK Push initiated:', response);
                
                Swal.fire({
                  icon: 'success',
                  title: 'Payment Request Sent!',
                  html: `
                    <div class="text-left">
                      <p>✅ M-Pesa payment request has been sent to <strong>${phoneNumber}</strong></p>
                      <p>💰 Amount: <strong>KSh ${amount}</strong></p>
                      <p>📱 Please check your phone and enter your M-Pesa PIN to complete the payment.</p>
                      <p class="text-muted">The payment will be processed automatically once confirmed.</p>
                    </div>
                  `,
                  confirmButtonText: 'OK',
                  timer: 10000
                }).then(() => {
                  // Reset form and reload dashboard data
                  this.paymentForm.reset();
                  this.loadDashboardData();
                });
              },
              error: (error) => {
                this.paymentLoading = false;
                console.error('STK Push error:', error);
                
                let errorMessage = 'Failed to initiate M-Pesa payment';
                if (error.error?.message) {
                  errorMessage = error.error.message;
                } else if (error.status === 400) {
                  errorMessage = 'Invalid payment details. Please check your phone number and amount.';
                } else if (error.status === 404) {
                  errorMessage = 'Bill not found. Please refresh and try again.';
                }
                
                Swal.fire('Payment Failed', errorMessage, 'error');
              }
            });
          },
          error: (error) => {
            this.paymentLoading = false;
            console.error('Error loading client bills:', error);
            Swal.fire('Error', 'Failed to load bill information. Please try again.', 'error');
          }
        });
      },
      error: (error) => {
        this.paymentLoading = false;
        console.error('Error loading client profile:', error);
        Swal.fire('Error', 'Failed to load client profile. Please try again.', 'error');
      }
    });
  }
}