import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UserDto, RegisterDto } from '../core/models/api.models';
import { AuthService } from '../core/services/auth.service';
import { CacheService } from '../core/services/cache.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgIf, NgFor],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit, OnDestroy {
  private apiUrl = environment.apiUrl;
  users: UserDto[] = [];
  filteredUsers: UserDto[] = [];
  paginatedUsers: UserDto[] = [];
  loading = true;
  
  selectedRole = '';
  selectedStatus = '';
  searchTerm = '';
  
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  showCreateModal = false;
  showEditModal = false;
  newUser: RegisterDto = {
    username: '',
    email: '',
    role: 'MeterReader',
    password: ''
  };
  editUser: any = {
    id: 0,
    username: '',
    email: '',
    role: '',
    isActive: true,
    password: ''
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cacheService: CacheService
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.applyFilters();
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(): void {
    console.log('Loading users with caching');
    this.loading = true;
    
    this.cacheService.get(
      'users-list',
      () => this.http.get<UserDto[]>(`${this.apiUrl}/auth/users`),
      5 * 60 * 1000
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        console.log('Users response:', users);
        if (users && users.length > 0) {
          const firstUser = users[0] as any;
          console.log('First user structure:', firstUser);
          console.log('Available properties:', Object.keys(firstUser));
        }
        
        this.users = users;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
        
        this.users = [];
        this.loading = false;
        
        if (error.status === 401 || error.status === 403) {
          Swal.fire('Access Denied', 'You do not have permission to view users', 'error');
        } else if (error.status === 500) {
          Swal.fire('Server Error', 'Unable to load users. Please try again later.', 'error');
        }
      }
    });
  }

  openCreateUserModal(): void {
    this.newUser = {
      username: '',
      email: '',
      role: 'MeterReader',
      password: ''
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  createUser(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password || !this.newUser.role) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    // Add validation for username length
    if (this.newUser.username.length < 3) {
      Swal.fire('Error', 'Username must be at least 3 characters long', 'error');
      return;
    }

    if (this.newUser.password.length < 6) {
      Swal.fire('Error', 'Password must be at least 6 characters long', 'error');
      return;
    }

    console.log('Creating user with data:', this.newUser);

    this.http.post(`${this.apiUrl}/auth/register`, this.newUser).subscribe({
      next: (response) => {
        console.log('User creation response:', response);
        this.resetForm();
        this.loadUsers();
        Swal.fire('Success', 'User created successfully!', 'success');
      },
      error: (error) => {
        console.error('Error creating user:', error);
        
        let errorMessage = 'Failed to create user';
        if (error.status === 400) {
          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errors) {
              // Handle validation errors
              const validationErrors = Object.values(error.error.errors).flat();
              errorMessage = validationErrors.join(', ');
            }
          }
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to create users.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  private resetForm(): void {
    this.newUser = {
      username: '',
      email: '',
      role: 'MeterReader',
      password: ''
    };
  }

  openEditModal(user: any): void {
    this.editUser = {
      id: this.getUserId(user),
      username: this.getUserUsername(user),
      email: this.getUserEmail(user),
      role: this.getUserRole(user),
      isActive: this.getUserIsActive(user)
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.resetEditForm();
  }

  private resetEditForm(): void {
    this.editUser = {
      id: 0,
      username: '',
      email: '',
      role: '',
      isActive: true,
      password: ''
    };
  }

  updateUser(): void {
    if (!this.editUser.username || !this.editUser.email || !this.editUser.role) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    // Add validation for username length
    if (this.editUser.username.length < 3) {
      Swal.fire('Error', 'Username must be at least 3 characters long', 'error');
      return;
    }

    if (this.editUser.password && this.editUser.password.length < 6) {
      Swal.fire('Error', 'Password must be at least 6 characters long if changing', 'error');
      return;
    }

    console.log('Updating user with data:', this.editUser);

    const updateData: any = {
      Username: this.editUser.username,
      Email: this.editUser.email,
      Role: this.editUser.role,
      IsActive: Boolean(this.editUser.isActive)
    };

    if (this.editUser.password && this.editUser.password.trim() !== '') {
      updateData.Password = this.editUser.password;
    }

    this.http.put(`${this.apiUrl}/auth/users/${this.editUser.id}`, updateData).subscribe({
      next: (response) => {
        console.log('User update response:', response);
        this.showEditModal = false;
        this.resetEditForm();
        this.loadUsers();
        Swal.fire('Success', 'User updated successfully!', 'success');
      },
      error: (error) => {
        console.error('Full error object:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        
        let errorMessage = 'Error updating user. Please try again.';
        
        if (error.status === 400) {
          if (error.error) {
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (error.error.errors) {
              // Handle validation errors
              const validationErrors = Object.values(error.error.errors).flat();
              errorMessage = validationErrors.join(', ');
            }
          }
        } else if (error.status === 401) {
          errorMessage = 'Unauthorized. Please login again.';
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to update users.';
        } else if (error.status === 404) {
          errorMessage = 'User not found.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to server. Please check your connection.';
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  deleteUser(username: string): void {
    if (!username || username.trim() === '') {
      console.error('Invalid username for deletion:', username);
      Swal.fire('Error', 'Cannot delete user: Invalid username', 'error');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.username === username) {
      Swal.fire('Error', 'You cannot delete your own account', 'error');
      return;
    }

    Swal.fire({
      title: 'Delete User',
      text: `Are you sure you want to delete user "${username}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Deleting user:', username);
        this.http.delete(`${this.apiUrl}/auth/users/${username}`).subscribe({
          next: (response) => {
            console.log('User delete response:', response);
            
            this.users = this.users.filter(u => this.getUserUsername(u) !== username);
            
            this.loadUsers();
            
            Swal.fire('Deleted', 'User has been deleted successfully!', 'success');
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            console.error('Error details:', {
              status: error.status,
              statusText: error.statusText,
              error: error.error,
              message: error.message
            });
            
            let errorMessage = 'Error deleting user. Please try again.';
            if (error.status === 404) {
              errorMessage = 'User not found or already deleted';
            } else if (error.status === 403) {
              errorMessage = 'You do not have permission to delete this user';
            } else if (error.status === 400) {
              if (error.error && typeof error.error === 'string') {
                if (error.error.includes('REFERENCE constraint') || 
                    error.error.includes('foreign key') ||
                    error.error.includes('FK_')) {
                  errorMessage = 'Cannot delete user: This user has associated records (clients, readings, payments). Please remove or reassign these records first.';
                } else {
                  errorMessage = error.error;
                }
              } else {
                errorMessage = 'Cannot delete user - invalid request';
              }
            } else if (error.error?.message || error.error) {
              errorMessage = error.error.message || error.error;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  applyFilters(): void {
    let filtered = [...this.users];

    if (this.selectedRole) {
      filtered = filtered.filter(user => this.getUserRole(user) === this.selectedRole);
    }

    if (this.selectedStatus) {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter(user => this.getUserIsActive(user) === isActive);
    }

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        this.getUserId(user).toString().includes(searchLower) ||
        this.getUserUsername(user).toLowerCase().includes(searchLower) ||
        this.getUserEmail(user).toLowerCase().includes(searchLower) ||
        this.getUserRole(user).toLowerCase().includes(searchLower)
      );
    }

    this.filteredUsers = filtered;
    this.calculatePagination();
  }

  clearFilters(): void {
    this.selectedRole = '';
    this.selectedStatus = '';
    this.searchTerm = '';
    this.applyFilters();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    this.updatePaginatedUsers();
  }

  private updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  getEndIndex(): number {
    const endIndex = this.currentPage * this.pageSize;
    return Math.min(endIndex, this.filteredUsers.length);
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  downloadFilteredUsers(): void {
    if (this.filteredUsers.length === 0) {
      Swal.fire('Info', 'No users to download', 'info');
      return;
    }

    const exportData = this.filteredUsers.map(user => ({
      'ID': this.getUserId(user),
      'Username': this.getUserUsername(user),
      'Email': this.getUserEmail(user),
      'Role': this.getUserRole(user),
      'Status': this.getUserIsActive(user) ? 'Active' : 'Inactive',
      'Created Date': this.getUserCreatedDate(user)
    }));

    this.downloadUsers(this.filteredUsers, 'filtered_users');
  }

  trackByUserId(index: number, user: UserDto): number {
    return user.id || index;
  }

  getUserId(user: any): number {
    return user.id || user.Id || 0;
  }

  getUserUsername(user: any): string {
    return user.username || user.Username || '-';
  }

  getUserEmail(user: any): string {
    return user.email || user.Email || '-';
  }

  getUserRole(user: any): string {
    return user.role || user.Role || 'No Role';
  }

  getUserIsActive(user: any): boolean {
    return user.isActive !== undefined ? user.isActive : (user.IsActive !== undefined ? user.IsActive : false);
  }

  getUserIsBootstrap(user: any): boolean {
    return user.isBootstrap !== undefined ? user.isBootstrap : (user.IsBootstrap !== undefined ? user.IsBootstrap : false);
  }

  getUserCreatedDate(user: any): string {
    const createdDate = user.createdDate || user.CreatedDate;
    if (!createdDate) return '-';
    try {
      const date = new Date(createdDate);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  }

  downloadAllUsers(): void {
    this.downloadUsers(this.users, 'all-users');
  }


  private downloadUsers(users: UserDto[], filename: string): void {
    if (users.length === 0) {
      Swal.fire('Info', 'No users to download', 'info');
      return;
    }

    const exportData = users.map(user => ({
      'ID': this.getUserId(user),
      'Username': this.getUserUsername(user),
      'Email': this.getUserEmail(user),
      'Role': this.getUserRole(user),
      'Status': this.getUserIsActive(user) ? 'Active' : 'Inactive',
      'Created Date': this.getUserCreatedDate(user)
    }));

    this.generatePDF(exportData, filename, users.length);
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private generatePDF(data: any[], filename: string, count: number): void {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Denkam Waters - Users Report', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
      doc.text(`Total Users: ${count}`, 105, 37, { align: 'center' });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 45, 190, 45);
      
      const headers = Object.keys(data[0]);
      const rows = data.map(row => Object.values(row).map(val => String(val || '')));
      
      autoTable(doc, {
        head: [headers],
        body: rows as any,
        startY: 50,
        theme: 'grid',
        headStyles: {
          fillColor: [78, 115, 223],
          textColor: 255,
          fontSize: 10,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: 50
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 50, left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 }
        }
      });
      
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Denkam Waters Management System', 105, 285, { align: 'center' });
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'PDF Generated',
        text: 'Users report has been downloaded successfully!',
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
