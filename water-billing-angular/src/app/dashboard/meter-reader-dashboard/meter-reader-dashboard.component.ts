import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface MeterReaderStats {
  assignedCustomers: number;
  readingsThisMonth: number;
  pendingReadings: number;
  totalReadings: number;
  todayReadings: number;
  averageConsumption: number;
}

@Component({
  selector: 'app-meter-reader-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meter-reader-dashboard.component.html',
  styleUrls: ['./meter-reader-dashboard.component.scss']
})
export class MeterReaderDashboardComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  currentUser: any;
  stats: MeterReaderStats = {
    assignedCustomers: 0,
    readingsThisMonth: 0,
    pendingReadings: 0,
    totalReadings: 0,
    todayReadings: 0,
    averageConsumption: 0
  };
  loading = true;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Verify user has meter reader role
    if (!this.authService.isMeterReader()) {
      // Redirect to appropriate dashboard based on role
      const user = this.authService.getCurrentUser();
      if (user?.role === 'Admin') {
        window.location.href = '/dashboard/admin';
      } else if (user?.role === 'Client') {
        window.location.href = '/dashboard/client';
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
    
    // Load clients assigned to meter reader
    this.http.get<any[]>(`${this.apiUrl}/clients`).subscribe({
      next: (clients) => {
        this.stats.assignedCustomers = clients?.length || 0;
      },
      error: (error) => {
        if (!environment.production) {
          console.error('Error loading clients:', error);
        }
        this.stats.assignedCustomers = 0;
      }
    });

    // Load readings data
    this.http.get<any[]>(`${this.apiUrl}/readings`).subscribe({
      next: (readings) => {
        this.stats.totalReadings = readings?.length || 0;
        const today = new Date().toDateString();
        this.stats.todayReadings = readings?.filter(r => 
          new Date(r.readingDate).toDateString() === today
        ).length || 0;
        this.stats.averageConsumption = this.calculateAverageConsumption(readings || []);
      },
      error: (error) => {
        if (!environment.production) {
          console.error('Error loading readings:', error);
        }
        this.stats.totalReadings = 0;
        this.stats.todayReadings = 0;
        this.stats.averageConsumption = 0;
      }
    });
    this.loading = false;
  }

  private calculateAverageConsumption(readings: any[]): number {
    if (!readings || readings.length === 0) return 0;
    const totalConsumption = readings.reduce((sum, reading) => sum + (reading.unitsUsed || 0), 0);
    return Math.round(totalConsumption / readings.length);
  }
}
