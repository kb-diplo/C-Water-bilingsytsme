
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  currentUser: User | null = null;
  sidebarToggled = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleSidebar(): void {
    this.sidebarToggled = !this.sidebarToggled;
  }

  logout(): void {
    const userName = this.getUserDisplayName();
    const userRole = this.currentUser?.role || 'User';
    
    Swal.fire({
      title: 'Ready to Leave?',
      html: `
        <div class="text-center">
          <p class="mb-2">You are currently logged in as:</p>
          <p class="mb-3"><strong>${userName}</strong> (${userRole})</p>
          <p>Select "Logout" below if you are ready to end your current session.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="fas fa-sign-out-alt"></i> Logout',
      cancelButtonText: '<i class="fas fa-times"></i> Cancel',
      reverseButtons: true,
      focusCancel: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Show loading state
        Swal.fire({
          title: 'Logging out...',
          text: 'Please wait while we securely end your session.',
          icon: 'info',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        // Perform logout after a brief delay to show the loading state
        setTimeout(() => {
          this.authService.logout();
        }, 1000);
      }
    });
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

  getUserDisplayName(): string {
    if (!this.currentUser) return 'User';
    return this.currentUser.username || 'User';
  }

  getPageTitle(): string {
    const url = this.router.url;
    
    if (url.includes('/dashboard/admin')) return 'Admin Dashboard';
    if (url.includes('/dashboard/meter-reader')) return 'Meter Reader Dashboard';
    if (url.includes('/dashboard/client')) return 'Client Dashboard';
    if (url.includes('/dashboard')) return 'Dashboard';
    if (url.includes('/clients')) return 'Manage Clients';
    if (url.includes('/bills')) return 'Billing Management';
    if (url.includes('/payments')) return 'Payment Management';
    if (url.includes('/readings')) return 'Meter Readings';
    if (url.includes('/reports')) return 'Reports & Analytics';
    if (url.includes('/settings')) return 'System Settings';
    if (url.includes('/users')) return 'User Management';
    
    return 'Dashboard';
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }
}
