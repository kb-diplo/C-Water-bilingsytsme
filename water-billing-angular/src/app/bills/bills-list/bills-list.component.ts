import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

interface Bill {
  id: number;
  clientName: string;
  billingPeriod: string;
  consumption: number;
  amount: number;
  dueDate: string;
  penalty: number;
  totalPayable: number;
  status: string;
}

@Component({
  selector: 'app-bills-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bills-list.component.html',
  styleUrls: ['./bills-list.component.scss']
})
export class BillsListComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  bills: Bill[] = [];
  filteredBills: Bill[] = [];
  searchTerm = '';
  loading = true;
  isOngoing = true;
  pageTitle = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[0]?.path;
      this.isOngoing = path === 'ongoing';
      this.pageTitle = this.isOngoing ? 'Ongoing Bills' : 'Billing History';
      this.loadBills();
    });
  }

  loadBills(): void {
    let endpoint = `${this.apiUrl}/bills`;
    
    if (this.authService.isClient()) {
      const user = this.authService.getCurrentUser();
      endpoint = `${this.apiUrl}/bills/client/${user?.id}`;
      if (this.isOngoing) {
        endpoint += '/unpaid';
      }
    } else if (this.isOngoing) {
      endpoint += '?status=pending,overdue';
    }

    this.http.get<Bill[]>(endpoint).subscribe({
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
        // Show empty table instead of error notification
      }
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredBills = this.bills;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredBills = this.bills.filter(bill =>
      bill.clientName.toLowerCase().includes(term) ||
      bill.id.toString().includes(term) ||
      bill.status.toLowerCase().includes(term)
    );
  }

  sendReminder(bill: Bill): void {
    Swal.fire({
      title: 'Send Reminder',
      text: `Send payment reminder for Bill #${bill.id}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.post(`${this.apiUrl}/bills/${bill.id}/remind`, {}).subscribe({
          next: () => {
            Swal.fire('Success', 'Reminder sent successfully', 'success');
          },
          error: (error) => {
            console.error('Error sending reminder:', error);
            Swal.fire('Error', 'Failed to send reminder', 'error');
          }
        });
      }
    });
  }

  editBill(bill: Bill): void {
    this.router.navigate(['/bills/edit', bill.id]);
  }

  deleteBill(bill: Bill): void {
    Swal.fire({
      title: 'Delete Bill',
      text: `Are you sure you want to delete Bill #${bill.id}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/bills/${bill.id}`).subscribe({
          next: () => {
            Swal.fire('Deleted', 'Bill has been deleted', 'success');
            this.loadBills();
          },
          error: (error) => {
            console.error('Error deleting bill:', error);
            Swal.fire('Error', 'Failed to delete bill', 'error');
          }
        });
      }
    });
  }

  getBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'overdue': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isMeterReader(): boolean {
    return this.authService.isMeterReader();
  }

  isClient(): boolean {
    return this.authService.isClient();
  }

  getDisplayTitle(): string {
    if (this.isClient()) {
      return this.isOngoing ? 'My Ongoing Bills' : 'My Billing History';
    }
    return this.pageTitle;
  }
}
