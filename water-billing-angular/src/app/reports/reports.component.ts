import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ReportData {
  totalRevenue: number;
  outstandingPayments: number;
  totalConsumption: number;
  paidBillsCount: number;
  pendingBillsCount: number;
  overdueBillsCount: number;
  disconnectedClients: number;
  monthlyRevenueData: any[];
  monthlyConsumptionData: any[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, AfterViewInit {
  private apiUrl = 'http://localhost:5000/api';
  reportData: ReportData = {
    totalRevenue: 0,
    outstandingPayments: 0,
    totalConsumption: 0,
    paidBillsCount: 0,
    pendingBillsCount: 0,
    overdueBillsCount: 0,
    disconnectedClients: 0,
    monthlyRevenueData: [],
    monthlyConsumptionData: []
  };
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadReportData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeCharts();
    }, 1000);
  }

  loadReportData(): void {
    this.http.get<ReportData>(`${this.apiUrl}/reports/financial`).subscribe({
      next: (data) => {
        this.reportData = data;
        this.loading = false;
        this.initializeCharts();
      },
      error: (error) => {
        console.error('Error loading report data:', error);
        this.loading = false;
      }
    });
  }

  initializeCharts(): void {
    if (this.loading) return;

    this.createRevenueChart();
    this.createConsumptionChart();
  }

  createRevenueChart(): void {
    const ctx = document.getElementById('monthlyRevenueChart') as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.reportData.monthlyRevenueData.map(item => 
          new Date(item.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })
        ),
        datasets: [{
          label: 'Revenue (Ksh)',
          data: this.reportData.monthlyRevenueData.map(item => item.total),
          backgroundColor: 'rgba(78, 115, 223, 0.8)',
          borderColor: 'rgba(78, 115, 223, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return 'Ksh ' + value.toLocaleString();
              }
            }
          }
        }
      }
    });
  }

  createConsumptionChart(): void {
    const ctx = document.getElementById('monthlyConsumptionChart') as HTMLCanvasElement;
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.reportData.monthlyConsumptionData.map(item => item.month),
        datasets: [
          {
            label: 'Paid (m³)',
            data: this.reportData.monthlyConsumptionData.map(item => item.paid),
            backgroundColor: 'rgba(28, 200, 138, 0.2)',
            borderColor: 'rgba(28, 200, 138, 1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Pending (m³)',
            data: this.reportData.monthlyConsumptionData.map(item => item.pending),
            backgroundColor: 'rgba(246, 194, 62, 0.2)',
            borderColor: 'rgba(246, 194, 62, 1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Overdue (m³)',
            data: this.reportData.monthlyConsumptionData.map(item => item.overdue),
            backgroundColor: 'rgba(231, 74, 59, 0.2)',
            borderColor: 'rgba(231, 74, 59, 1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Total (m³)',
            data: this.reportData.monthlyConsumptionData.map(item => item.total),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString() + ' m³';
              }
            }
          }
        }
      }
    });
  }

  downloadPDF(): void {
    window.open(`${this.apiUrl}/reports/financial?export=pdf`, '_blank');
  }
}
