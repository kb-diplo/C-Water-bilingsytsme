import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule],
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
  loading = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Verify user has client role
    if (!this.authService.isClient()) {
      // Redirect to appropriate dashboard based on role
      const user = this.authService.getCurrentUser();
      if (user?.role === 'Admin') {
        window.location.href = '/dashboard/admin';
      } else if (user?.role === 'MeterReader') {
        window.location.href = '/dashboard/meter-reader';
      } else {
        this.authService.logout();
      }
      return;
    }
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.authService.logout();
      return;
    }
    
    // Load client's bills
    this.http.get<any[]>(`${this.apiUrl}/bills/client/${user.id}`).subscribe({
      next: (bills) => {
        this.stats.unpaidBills = bills?.filter(b => b.status !== 'Paid').length || 0;
        this.stats.totalOwed = bills?.filter(b => b.status !== 'Paid')
          .reduce((sum, bill) => sum + bill.totalAmount, 0) || 0;
        this.recentBills = bills?.slice(0, 5) || [];
      },
      error: (error) => {
        if (!environment.production) {
          console.error('Error loading bills:', error);
        }
        this.stats.unpaidBills = 0;
        this.stats.totalOwed = 0;
        this.recentBills = [];
      }
    });

    // Load client's payments
    this.http.get<any[]>(`${this.apiUrl}/payments/client/${user.id}`).subscribe({
      next: (payments) => {
        this.stats.totalPaidThisYear = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        this.stats.paymentCount = payments?.length || 0;
        this.stats.averageMonthlyBill = this.stats.paymentCount > 0 ? 
          Math.round(this.stats.totalPaidThisYear / 12) : 0;
        this.paymentHistory = payments?.slice(0, 5) || [];
      },
      error: (error) => {
        if (!environment.production) {
          console.error('Error loading payments:', error);
        }
        this.stats.totalPaidThisYear = 0;
        this.stats.paymentCount = 0;
        this.stats.averageMonthlyBill = 0;
        this.paymentHistory = [];
      }
    });
    this.loading = false;
  }
}
