import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UserDto, RegisterDto } from '../core/models/api.models';
import { AuthService } from '../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private apiUrl = environment.apiUrl;
  users: UserDto[] = [];
  loading = true;
  showCreateModal = false;
  newUser: RegisterDto = {
    username: '',
    email: '',
    role: 'MeterReader',
    password: ''
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<UserDto[]>(`${this.apiUrl}/auth/users`).subscribe({
      next: (users) => {
        console.log('Users loaded:', users); // Debug log
        this.users = users;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.users = [];
        this.loading = false;
        // Show empty table instead of error
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
  }

  createUser(): void {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    this.http.post(`${this.apiUrl}/auth/register`, this.newUser).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadUsers();
        Swal.fire('Success', 'User created successfully!', 'success');
      },
      error: (error) => {
        console.error('Error creating user:', error);
        const errorMessage = error.error?.message || 'Error creating user. Please try again.';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  deleteUser(username: string): void {
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
        this.http.delete(`${this.apiUrl}/auth/users/${username}`).subscribe({
          next: () => {
            this.loadUsers();
            Swal.fire('Deleted', 'User has been deleted successfully!', 'success');
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            Swal.fire('Error', 'Error deleting user. Please try again.', 'error');
          }
        });
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  trackByUserId(index: number, user: UserDto): number {
    return user.id;
  }
}
