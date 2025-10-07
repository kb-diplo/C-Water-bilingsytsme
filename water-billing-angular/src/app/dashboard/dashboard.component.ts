import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ClientService } from '../core/services/client.service';
import { BillingService } from '../core/services/billing.service';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  overdueBills: number;
  totalRevenue: number;
  outstandingPayments: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    totalClients: 0,
    activeClients: 0,
    totalBills: 0,
    paidBills: 0,
    pendingBills: 0,
    overdueBills: 0,
    totalRevenue: 0,
    outstandingPayments: 0
  };
  clientStats: any = {
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0
  };
  loading = true;

  constructor(
    public authService: AuthService,
    private clientService: ClientService,
    private billingService: BillingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Add debugging to see what's happening
    const user = this.authService.getCurrentUser();
    console.log('Main dashboard component initialized:', {
      user: user,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });

    // Redirect to role-specific dashboard
    if (user) {
      const dashboardRoute = this.authService.getDashboardRoute();
      console.log('Redirecting from main dashboard to:', dashboardRoute);

      switch (user.role) {
        case 'Admin':
          console.log('Redirecting Admin to /dashboard/admin');
          this.router.navigate(['/dashboard/admin']);
          return;
        case 'MeterReader':
          console.log('Redirecting MeterReader to /dashboard/meter-reader');
          this.router.navigate(['/dashboard/meter-reader']);
          return;
        case 'Client':
          console.log('Redirecting Client to /dashboard/client');
          this.router.navigate(['/dashboard/client']);
          return;
        default:
          console.error('Unknown role in main dashboard:', user.role);
          this.authService.logout();
          return;
      }
    }

    console.log('No user found, loading default dashboard data');
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // Load client stats
    this.clientService.getClients().subscribe({
      next: (clients: any) => {
        this.clientStats = {
          total: clients.length,
          active: clients.filter((c: any) => c.connectionStatus === 'Connected').length,
          inactive: clients.filter((c: any) => c.connectionStatus === 'Disconnected').length,
          suspended: clients.filter((c: any) => c.connectionStatus === 'Pending').length
        };
      },
      error: (error: any) => console.error('Error loading client stats:', error)
    });

    // Load billing stats
    this.billingService.getDashboardStats().subscribe({
      next: (billingStats) => {
        this.stats.totalBills = billingStats.totalBills;
        this.stats.paidBills = billingStats.paidBills;
        this.stats.pendingBills = billingStats.pendingBills;
        this.stats.overdueBills = billingStats.overdueBills;
        this.stats.totalRevenue = billingStats.totalRevenue;
        this.stats.outstandingPayments = billingStats.outstandingPayments;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading billing stats:', error);
        this.loading = false;
      }
    });
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  getUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.username || 'User';
  }
}
