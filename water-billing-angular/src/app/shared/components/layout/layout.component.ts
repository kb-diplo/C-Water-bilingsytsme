import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  }

  toggleSidebar(): void {
    this.sidebarToggled = !this.sidebarToggled;
  }

  // Close sidebar when navigating on mobile
  closeSidebarOnMobile(): void {
    if (window.innerWidth <= 768) {
      this.sidebarToggled = false;
    }
  }

  // Toggle user dropdown
  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
  }

  // Toggle billing collapse for clients
  toggleBillingCollapse(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const collapseElement = document.getElementById('collapseMyBilling');
    if (collapseElement) {
      if (collapseElement.classList.contains('show')) {
        collapseElement.classList.remove('show');
      } else {
        collapseElement.classList.add('show');
      }
    }
  }

  // Toggle admin billing collapse
  toggleAdminBillingCollapse(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const collapseElement = document.getElementById('collapseBilling');
    if (collapseElement) {
      if (collapseElement.classList.contains('show')) {
        collapseElement.classList.remove('show');
      } else {
        collapseElement.classList.add('show');
      }
    }
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
    if (this.currentUser) {
      return this.currentUser.username || 'User';
    }
    return '';
  }
}
