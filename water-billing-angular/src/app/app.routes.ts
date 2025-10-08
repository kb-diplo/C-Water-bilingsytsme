import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./shared/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        data: { roles: ['Admin'] }
      },
      {
        path: 'meter-reader',
        loadComponent: () => import('./dashboard/meter-reader-dashboard/meter-reader-dashboard.component').then(m => m.MeterReaderDashboardComponent),
        data: { roles: ['MeterReader'] }
      },
      {
        path: 'client',
        loadComponent: () => import('./dashboard/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent),
        data: { roles: ['Client', 'Customer'] }
      },
      {
        path: 'clients',
        loadComponent: () => import('./clients/clients-list/clients-list.component').then(m => m.ClientsListComponent),
        data: { roles: ['Admin', 'MeterReader'] }
      },
      {
        path: 'readings',
        loadComponent: () => import('./readings/readings-list/readings-list.component').then(m => m.ReadingsListComponent),
        data: { roles: ['Admin', 'MeterReader'] }
      },
      {
        path: 'bills',
        children: [
          {
            path: 'ongoing',
            loadComponent: () => import('./bills/bills-list/bills-list.component').then(m => m.BillsListComponent)
          },
          {
            path: 'history',
            loadComponent: () => import('./bills/bills-list/bills-list.component').then(m => m.BillsListComponent)
          }
        ]
      },
      {
        path: 'reports',
        loadComponent: () => import('./reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'payments',
        loadComponent: () => import('./payments/payments.component').then(m => m.PaymentsComponent)
      },
      {
        path: 'readings',
        loadComponent: () => import('./readings/readings.component').then(m => m.ReadingsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./users/users.component').then(m => m.UsersComponent),
        data: { roles: ['Admin'] }
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  { 
    path: '**', 
    redirectTo: '/home' 
  }
];
