import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

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
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Verify user has meter reader role
    if (!this.authService.isMeterReader()) {
      // Redirect to appropriate dashboard based on role using Angular router
      const user = this.authService.getCurrentUser();
      if (user?.role === 'Admin') {
        this.router.navigate(['/dashboard/admin']);
      } else if (user?.role === 'Client') {
        this.router.navigate(['/dashboard/client']);
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
        console.log('Meter Reader - Raw clients data:', clients);
        this.stats.assignedCustomers = clients?.length || 0;
        console.log('Meter Reader - Clients count:', this.stats.assignedCustomers);
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.stats.assignedCustomers = 0;
      }
    });

    // Load readings data
    this.http.get<any[]>(`${this.apiUrl}/readings`).subscribe({
      next: (readings) => {
        console.log('Meter Reader - Raw readings data:', readings);
        console.log('Meter Reader - Readings count:', readings?.length);
        
        this.stats.totalReadings = readings?.length || 0;
        
        const today = new Date();
        const todayStr = today.toDateString();
        
        const todayReadings = readings?.filter(r => {
          const readingDate = new Date(r.readingDate);
          const matches = readingDate.toDateString() === todayStr;
          if (matches) console.log('Today reading found:', r);
          return matches;
        }) || [];
        this.stats.todayReadings = todayReadings.length;
        console.log('Today readings count:', this.stats.todayReadings);
        
        // Calculate this month's readings
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const monthReadings = readings?.filter(r => {
          const readingDate = new Date(r.readingDate);
          return readingDate.getMonth() === currentMonth && readingDate.getFullYear() === currentYear;
        }) || [];
        this.stats.readingsThisMonth = monthReadings.length;
        console.log('This month readings count:', this.stats.readingsThisMonth);
        
        this.stats.averageConsumption = this.calculateAverageConsumption(readings || []);
        console.log('Average consumption:', this.stats.averageConsumption);
        
        console.log('Final stats:', this.stats);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading readings:', error);
        console.error('Error details:', error.error);
        this.stats.totalReadings = 0;
        this.stats.todayReadings = 0;
        this.stats.readingsThisMonth = 0;
        this.stats.averageConsumption = 0;
        this.loading = false;
      }
    });
  }

  private calculateAverageConsumption(readings: any[]): number {
    if (!readings || readings.length === 0) return 0;
    const totalConsumption = readings.reduce((sum, reading) => sum + (reading.unitsUsed || 0), 0);
    return Math.round(totalConsumption / readings.length);
  }

  // Navigation methods
  navigateToClients(): void {
    console.log('Navigating to clients...');
    this.router.navigate(['/dashboard/clients']);
  }

  navigateToReadings(): void {
    console.log('Navigating to readings...');
    this.router.navigate(['/dashboard/readings']);
  }

  openQuickAddReading(): void {
    console.log('Opening quick add reading...');
    Swal.fire({
      icon: 'info',
      title: 'Quick Add Reading',
      text: 'Please go to the Clients page and click the "Add Reading" button next to the client you want to record a reading for.',
      confirmButtonText: 'Go to Clients',
      showCancelButton: true,
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.navigateToClients();
      }
    });
  }
}
