
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';
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
  showUserDropdown = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Close dropdown on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.showUserDropdown = false;
    });
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = document.getElementById('userDropdown');
    const dropdownMenu = dropdown?.nextElementSibling;
    
    if (dropdown && dropdownMenu && !dropdown.contains(target) && !dropdownMenu.contains(target)) {
      this.showUserDropdown = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarToggled = !this.sidebarToggled;
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
  }

  navigateToProfile(): void {
    this.showUserDropdown = false; // Close dropdown
    this.router.navigate(['/dashboard/profile']);
  }

  navigateToSettings(): void {
    this.showUserDropdown = false; // Close dropdown
    this.router.navigate(['/dashboard/settings']);
  }

  logout(): void {
    // Simple, instant logout - no confirmation needed
    this.authService.logout();
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

  toggleBillingCollapse(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const collapseElement = document.getElementById('collapseMyBilling');
    if (collapseElement) {
      // Toggle the collapse manually
      if (collapseElement.classList.contains('show')) {
        collapseElement.classList.remove('show');
      } else {
        collapseElement.classList.add('show');
      }
    }
  }

  toggleAdminBillingCollapse(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const collapseElement = document.getElementById('collapseBilling');
    if (collapseElement) {
      // Toggle the collapse manually
      if (collapseElement.classList.contains('show')) {
        collapseElement.classList.remove('show');
      } else {
        collapseElement.classList.add('show');
      }
    }
  }
}
