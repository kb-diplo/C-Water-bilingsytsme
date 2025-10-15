import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface DashboardStats {
  clients: number;
  bills: number;
  totalRevenue: number;
  outstandingPayments: number;
  paidBillsCount: number;
  pendingBillsCount: number;
  overdueBillsCount: number;
  meterReadersCount: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  currentUser: any = null;
  loading = true;
  stats: any = {
    clients: 0,
    bills: 0,
    totalRevenue: 0,
    outstandingPayments: 0,
    paidBillsCount: 0,
    pendingBillsCount: 0,
    overdueBillsCount: 0,
    meterReadersCount: 0
  };
  ongoingBills: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    // Verify user has admin role
    if (!this.authService.isAdmin()) {
      // Redirect to appropriate dashboard based on role using Angular router
      if (this.currentUser?.role === 'MeterReader') {
        this.router.navigate(['/dashboard/meter-reader']);
      } else if (this.currentUser?.role === 'Client') {
        this.router.navigate(['/dashboard/client']);
      } else {
        this.authService.logout();
      }
      return;
    }
    this.loadDashboardData();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  generateReport(): void {
    // Generate comprehensive system report as PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #4e73df; text-align: center; border-bottom: 3px solid #4e73df; padding-bottom: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin: 20px 0; padding: 15px; background: #f8f9fc; border-left: 4px solid #4e73df; }
          .section h2 { color: #4e73df; margin-top: 0; }
          .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
          .stat-label { font-weight: bold; color: #5a5c69; }
          .stat-value { color: #333; }
          .footer { margin-top: 40px; text-align: center; color: #858796; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>WATER BILLING SYSTEM</h1>
          <h2>Comprehensive Dashboard Report</h2>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="section">
          <h2>System Overview</h2>
          <div class="stat-row">
            <span class="stat-label">Total Clients:</span>
            <span class="stat-value">${this.stats.clients}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Total Bills:</span>
            <span class="stat-value">${this.stats.bills}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Total Revenue:</span>
            <span class="stat-value">KSh ${this.stats.totalRevenue.toFixed(2)}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Outstanding Payments:</span>
            <span class="stat-value">KSh ${this.stats.outstandingPayments.toFixed(2)}</span>
          </div>
        </div>

        <div class="section">
          <h2>Bill Status Breakdown</h2>
          <div class="stat-row">
            <span class="stat-label">Paid Bills:</span>
            <span class="stat-value">${this.stats.paidBillsCount}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Pending Bills:</span>
            <span class="stat-value">${this.stats.pendingBillsCount}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Overdue Bills:</span>
            <span class="stat-value">${this.stats.overdueBillsCount}</span>
          </div>
        </div>

        <div class="section">
          <h2>Staff Information</h2>
          <div class="stat-row">
            <span class="stat-label">Meter Readers:</span>
            <span class="stat-value">${this.stats.meterReadersCount}</span>
          </div>
        </div>

        <div class="footer">
          <p>Water Billing System - Admin Dashboard Report</p>
          <p>This report is confidential and for authorized personnel only</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  loadDashboardData(): void {
    console.log('🔄 Loading dashboard data...');
    
    // Load clients count - use same endpoint as clients list for consistency
    this.http.get<any[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        console.log('📊 Clients API response:', clients);
        // Filter out any clients with invalid IDs (same as clients list)
        const validClients = clients?.filter(client => client.id && client.id > 0) || [];
        this.stats.clients = validClients.length;
        console.log('✅ Valid clients count:', this.stats.clients);
      },
      error: (error) => {
        console.error('❌ Error loading clients:', error);
        this.stats.clients = 0;
      }
    });

    // Load bills data
    this.http.get<any[]>(`${this.apiUrl}/bills`).subscribe({
      next: (bills) => {
        console.log('📊 Bills API response:', bills);
        this.stats.bills = bills?.length || 0;
        this.stats.paidBillsCount = bills?.filter(b => b.status === 'Paid').length || 0;
        
        // Pending bills are Unpaid bills that are not yet overdue
        this.stats.pendingBillsCount = bills?.filter(b => 
          b.status === 'Unpaid' && new Date(b.dueDate) >= new Date()
        ).length || 0;
        
        // Overdue bills are Unpaid bills past their due date
        this.stats.overdueBillsCount = bills?.filter(b => 
          b.status === 'Unpaid' && new Date(b.dueDate) < new Date()
        ).length || 0;
        
        this.ongoingBills = bills?.filter(bill => bill.status !== 'Paid').slice(0, 5) || [];
        
        // Calculate outstanding payments from unpaid bills (use balance if available, otherwise totalAmount)
        this.stats.outstandingPayments = bills
          ?.filter(b => b.status === 'Unpaid')
          .reduce((sum, bill) => sum + (bill.balance || bill.totalAmount || 0), 0) || 0;
        
        console.log('✅ Bills stats:', {
          total: this.stats.bills,
          paid: this.stats.paidBillsCount,
          pending: this.stats.pendingBillsCount,
          overdue: this.stats.overdueBillsCount,
          outstanding: this.stats.outstandingPayments
        });
      },
      error: (error) => {
        console.error('❌ Error loading bills:', error);
        this.stats.bills = 0;
        this.stats.paidBillsCount = 0;
        this.stats.pendingBillsCount = 0;
        this.stats.overdueBillsCount = 0;
        this.stats.outstandingPayments = 0;
        this.ongoingBills = [];
      }
    });

    // Load payments data
    this.http.get<any[]>(`${this.apiUrl}/payments`).subscribe({
      next: (payments) => {
        console.log('📊 Payments API response:', payments);
        this.stats.totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        console.log('✅ Total revenue:', this.stats.totalRevenue);
      },
      error: (error) => {
        console.error('❌ Error loading payments:', error);
        this.stats.totalRevenue = 0;
      }
    });

    // Load users count (for meter readers)
    this.http.get<any[]>(`${this.apiUrl}/auth/users`).subscribe({
      next: (users) => {
        console.log('📊 Users API response:', users);
        this.stats.meterReadersCount = users.filter(u => u.role === 'MeterReader').length;
        console.log('✅ Meter readers count:', this.stats.meterReadersCount);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading users:', error);
        this.stats.meterReadersCount = 0;
        this.loading = false;
      }
    });
  }

  // Method to refresh dashboard data (can be called after client operations)
  refreshDashboard(): void {
    this.loadDashboardData();
  }

  // Helper methods for bill display
  isOverdue(bill: any): boolean {
    if (!bill.dueDate) return false;
    return new Date(bill.dueDate) < new Date() && bill.status === 'Unpaid';
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }
}