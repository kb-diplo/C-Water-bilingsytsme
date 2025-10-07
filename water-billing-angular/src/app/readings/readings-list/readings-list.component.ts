import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Reading {
  id: number;
  clientId: number;
  clientName: string;
  meterNumber: string;
  currentReading: number;
  previousReading: number;
  unitsUsed: number;
  readingDate: Date;
  recordedByUsername: string;
  status: string;
  billingPeriod: string;
  generatedBillId?: number;
  generatedBillNumber?: string;
  billAmount?: number;
}

@Component({
  selector: 'app-readings-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './readings-list.component.html',
  styleUrls: ['./readings-list.component.scss']
})
export class ReadingsListComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  readings: Reading[] = [];
  filteredReadings: Reading[] = [];
  loading = true;
  searchTerm = '';
  selectedYear = '';
  selectedMonth = '';
  selectedStatus = '';
  selectedRecordedBy = '';
  selectedBillStatus = '';
  startDate = '';
  endDate = '';
  availableYears: number[] = [];
  availableRecorders: string[] = [];
  private searchSubject = new Subject<string>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngOnInit(): void {
    this.loadReadings();
    this.initializeFilters();
  }

  private loadReadings(): void {
    this.loading = true;
    this.http.get<Reading[]>(`${this.apiUrl}/readings`).subscribe({
      next: (data) => {
        console.log('Readings loaded successfully:', data);
        this.readings = data;
        this.filteredReadings = [...this.readings];
        this.availableRecorders = this.getUniqueRecorders();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading readings:', error);
        this.loading = false;
        Swal.fire('Error', 'Unable to load meter readings', 'error');
      }
    });
  }

  private initializeFilters(): void {
    // Initialize available years (current year - 5 to current year + 1)
    const currentYear = new Date().getFullYear();
    this.availableYears = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  }

  private getUniqueRecorders(): string[] {
    const recorders = new Set<string>();
    this.readings.forEach(reading => {
      if (reading.recordedByUsername) {
        recorders.add(reading.recordedByUsername);
      }
    });
    return Array.from(recorders).sort();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm.trim());
  }

  private performSearch(term: string): void {
    if (!term) {
      this.filteredReadings = [...this.readings];
      return;
    }
    
    const searchTerm = term.toLowerCase();
    this.filteredReadings = this.readings.filter(reading => 
      reading.clientName?.toLowerCase().includes(searchTerm) ||
      reading.meterNumber?.toLowerCase().includes(searchTerm) ||
      reading.recordedByUsername?.toLowerCase().includes(searchTerm) ||
      reading.status?.toLowerCase().includes(searchTerm)
    );
  }

  applyFilters(): void {
    this.filteredReadings = this.readings.filter(reading => {
      const matchesYear = !this.selectedYear || 
        new Date(reading.readingDate).getFullYear().toString() === this.selectedYear;
      
      const matchesMonth = !this.selectedMonth || 
        (new Date(reading.readingDate).getMonth() + 1).toString() === this.selectedMonth;
      
      const matchesStatus = !this.selectedStatus || 
        reading.status?.toLowerCase() === this.selectedStatus.toLowerCase();
      
      const matchesRecorder = !this.selectedRecordedBy || 
        reading.recordedByUsername === this.selectedRecordedBy;
      
      const matchesBillStatus = !this.selectedBillStatus || 
        (this.selectedBillStatus === 'billed' ? reading.generatedBillId : !reading.generatedBillId);
      
      const matchesDateRange = (!this.startDate || new Date(reading.readingDate) >= new Date(this.startDate)) &&
        (!this.endDate || new Date(reading.readingDate) <= new Date(this.endDate));
      
      return matchesYear && matchesMonth && matchesStatus && 
             matchesRecorder && matchesBillStatus && matchesDateRange;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedYear = '';
    this.selectedMonth = '';
    this.selectedStatus = '';
    this.selectedRecordedBy = '';
    this.selectedBillStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.filteredReadings = [...this.readings];
  }

  downloadReadings(): void {
    if (this.filteredReadings.length === 0) {
      Swal.fire('No Data', 'No readings to export', 'info');
      return;
    }
    
    const data = this.filteredReadings.map(reading => ({
      'Client': reading.clientName,
      'Meter No.': reading.meterNumber,
      'Previous': reading.previousReading,
      'Current': reading.currentReading,
      'Units': reading.unitsUsed,
      'Date': this.formatDate(reading.readingDate),
      'Status': reading.status,
      'Recorded By': reading.recordedByUsername,
      'Bill': reading.generatedBillNumber || 'N/A'
    }));
    
    this.generatePDF(data, this.filteredReadings.length);
  }

  deleteReading(reading: Reading): void {
    Swal.fire({
      title: 'Confirm Delete',
      text: `Are you sure you want to delete the reading for ${reading.clientName} (${reading.meterNumber})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/readings/${reading.id}`).subscribe({
          next: () => {
            this.readings = this.readings.filter(r => r.id !== reading.id);
            this.filteredReadings = this.filteredReadings.filter(r => r.id !== reading.id);
            Swal.fire('Deleted!', 'The reading has been deleted.', 'success');
          },
          error: (error) => {
            console.error('Error deleting reading:', error);
            Swal.fire('Error', 'Failed to delete reading', 'error');
          }
        });
      }
    });
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMonthName(monthNumber: string): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(monthNumber, 10) - 1;
    return months[monthIndex] || '';
  }

  getFilterDescription(): string {
    const filters: string[] = [];
    if (this.selectedYear) filters.push(`Year: ${this.selectedYear}`);
    if (this.selectedMonth) filters.push(`Month: ${this.getMonthName(this.selectedMonth)}`);
    if (this.selectedStatus) filters.push(`Status: ${this.selectedStatus}`);
    if (this.selectedRecordedBy) filters.push(`Recorded By: ${this.selectedRecordedBy}`);
    if (this.selectedBillStatus) filters.push(`Bill Status: ${this.selectedBillStatus}`);
    if (this.startDate || this.endDate) {
      const start = this.startDate ? new Date(this.startDate).toLocaleDateString() : 'Start';
      const end = this.endDate ? new Date(this.endDate).toLocaleDateString() : 'End';
      filters.push(`Date Range: ${start} - ${end}`);
    }
    if (this.searchTerm) filters.push(`Search: "${this.searchTerm}"`);
    
    return filters.length > 0 ? filters.join(' • ') : 'Showing all readings';
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // ... [rest of the component methods] ...

  private generatePDF(data: any[], count: number): void {
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Add header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Denkam Waters - Meter Readings Report', 105, 20, { align: 'center' });
      
      // Add generation info
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
      doc.text(`Total Readings: ${count}`, 105, 37, { align: 'center' });
      
      // Add filter info if any
      let startY = 45;
      if (this.selectedYear || this.selectedMonth || this.selectedStatus || this.selectedRecordedBy) {
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 150);
        doc.text('Filters Applied:', 20, startY);
        startY += 7;
        
        if (this.selectedYear) {
          doc.text(`• Year: ${this.selectedYear}`, 25, startY);
          startY += 5;
        }
        if (this.selectedMonth) {
          doc.text(`• Month: ${this.getMonthName(this.selectedMonth)}`, 25, startY);
          startY += 5;
        }
        if (this.selectedStatus) {
          doc.text(`• Status: ${this.selectedStatus}`, 25, startY);
          startY += 5;
        }
        if (this.selectedRecordedBy) {
          doc.text(`• Recorded By: ${this.selectedRecordedBy}`, 25, startY);
          startY += 5;
        }
        startY += 5;
      }
      
      // Add line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(20, startY, 190, startY);
      startY += 5;
      
      // Prepare table data
      const headers = Object.keys(data[0]);
      const rows = data.map(row => Object.values(row).map(val => String(val || '')));
      
      // Generate table using autoTable
      autoTable(doc, {
        head: [headers],
        body: rows as any,
        startY: startY,
        theme: 'grid',
        headStyles: {
          fillColor: [78, 115, 223],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: 50
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: startY, left: 10, right: 10 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 18 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 15 },
          7: { cellWidth: 25 }
        }
      });
      
      // Add footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Denkam Waters Management System', 105, 285, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      // Generate filename with filters
      const filterSuffix = this.selectedYear || this.selectedMonth ? 
        `_${this.selectedYear || 'AllYears'}_${this.selectedMonth ? this.getMonthName(this.selectedMonth) : 'AllMonths'}` : '';
      
      // Save the PDF
      doc.save(`Denkam_Waters_Meter_Readings${filterSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated',
        text: `${count} reading(s) exported successfully to PDF!`,
        timer: 2000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'PDF Generation Failed',
        text: 'There was an error generating the PDF. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  }
}
