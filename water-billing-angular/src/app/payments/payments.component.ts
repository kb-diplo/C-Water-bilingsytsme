import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaymentService } from '../core/services/payment.service';
import { AuthService } from '../core/services/auth.service';
import { PaymentResponseDto } from '../core/models/api.models';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit {
  payments: PaymentResponseDto[] = [];
  loading = false;
  userRole = '';
  isAdmin = false;
  isClient = false;

  constructor(
    private paymentService: PaymentService,
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

    if (this.isAdmin) {
      // Admin can see all payments
      this.paymentService.getAllPayments().subscribe({
        next: (payments) => {
          this.payments = payments;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load payments', error);
          this.loading = false;
        }
      });
    } else if (this.isClient) {
      // Client can see their own payments
      const userId = this.authService.getUserId();
      if (userId) {
        this.paymentService.getClientPayments(userId).subscribe({
          next: (payments) => {
            this.payments = payments;
            this.loading = false;
          },
          error: (error) => {
            console.error('Failed to load payments', error);
            this.loading = false;
          }
        });
      }
    }
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

  downloadPaymentsPDF(): void {
    if (this.payments.length === 0) {
      return;
    }

    // Calculate total payments
    const totalAmount = this.payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Payment History Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .info-section {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
          }
          .info-item {
            font-size: 14px;
          }
          .info-item strong {
            color: #007bff;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #007bff;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          tr:hover {
            background-color: #e9ecef;
          }
          .amount {
            color: #28a745;
            font-weight: bold;
          }
          .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge-mpesa { background-color: #28a745; color: white; }
          .badge-cash { background-color: #007bff; color: white; }
          .badge-bank { background-color: #17a2b8; color: white; }
          .badge-card { background-color: #ffc107; color: #333; }
          .summary {
            margin-top: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
          }
          .summary h3 {
            margin: 0 0 15px 0;
            color: #007bff;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 16px;
          }
          .summary-item.total {
            font-size: 20px;
            font-weight: bold;
            color: #28a745;
            border-top: 2px solid #007bff;
            padding-top: 10px;
            margin-top: 15px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💧 DENKAM WATERS COMPANY</h1>
          <p>Payment History Report</p>
        </div>

        <div class="info-section">
          <div class="info-item">
            <strong>Report Generated:</strong> ${new Date().toLocaleString('en-KE')}
          </div>
          <div class="info-item">
            <strong>Total Records:</strong> ${this.payments.length}
          </div>
          <div class="info-item">
            <strong>Generated By:</strong> ${this.authService.getCurrentUser()?.username || 'System'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill Number</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            ${this.payments.map(payment => `
              <tr>
                <td>${this.formatDate(payment.paymentDate)}</td>
                <td>${payment.billNumber}</td>
                <td>${payment.clientName}</td>
                <td class="amount">KSh ${payment.amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                  <span class="badge badge-${payment.paymentMethod.toLowerCase()}">
                    ${payment.paymentMethod}
                  </span>
                </td>
                <td>${payment.reference || '-'}</td>
                <td>${payment.recordedByUsername}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-item">
            <span>Total Payments:</span>
            <span>${this.payments.length} transactions</span>
          </div>
          <div class="summary-item">
            <span>Payment Methods:</span>
            <span>${this.getPaymentMethodsSummary()}</span>
          </div>
          <div class="summary-item total">
            <span>Total Amount Collected:</span>
            <span>KSh ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated report from Water Billing Management System</p>
          <p>© ${new Date().getFullYear()} Denkam Waters Company. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payment_History_${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private getPaymentMethodsSummary(): string {
    const methods = this.payments.reduce((acc, payment) => {
      acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(methods)
      .map(([method, count]) => `${method}(${count})`)
      .join(', ');
  }
}
