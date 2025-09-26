
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
    Swal.fire({
      title: 'Ready to Leave?',
      text: 'Select "Logout" below if you are ready to end your current session.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
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
