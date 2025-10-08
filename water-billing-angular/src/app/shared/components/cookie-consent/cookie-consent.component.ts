import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cookie-consent-banner" *ngIf="showBanner" [class.show]="showBanner">
      <div class="cookie-content">
        <div class="cookie-text">
          <h5>🍪 Cookie Notice</h5>
          <p>We use cookies to enhance your experience and analyze site usage. You can choose which cookies to accept.</p>
        </div>
        <div class="cookie-buttons">
          <button class="btn btn-outline-light btn-sm me-2" (click)="showSettings = true">
            Cookie Settings
          </button>
          <button class="btn btn-success btn-sm me-2" (click)="acceptAll()">
            Accept All
          </button>
          <button class="btn btn-warning btn-sm me-2" (click)="acceptEssential()">
            Essential Only
          </button>
          <button class="btn btn-danger btn-sm" (click)="declineAll()">
            Decline All
          </button>
        </div>
      </div>
    </div>

    <!-- Cookie Settings Modal -->
    <div class="modal fade" [class.show]="showSettings" [style.display]="showSettings ? 'block' : 'none'" 
         tabindex="-1" *ngIf="showSettings">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cookie Preferences</h5>
            <button type="button" class="btn-close" (click)="showSettings = false"></button>
          <div class="modal-body">
            <div class="cookie-category mb-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h6>Essential Cookies</h6>
                  <small class="text-muted">Authentication tokens, session management, and basic site functionality. These are required for the water billing system to work properly.</small>
                </div>
                <input type="checkbox" class="form-check-input" checked disabled>
              </div>
            </div>
            <div class="cookie-category mb-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h6>Functional Cookies</h6>
                  <small class="text-muted">Remember your preferences like dashboard settings, language, and theme choices.</small>
                </div>
                <input type="checkbox" class="form-check-input" [(ngModel)]="preferences.functional">
              </div>
            </div>
            <div class="cookie-category mb-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h6>Performance Cookies</h6>
                  <small class="text-muted">Help us understand how you use the system to improve performance and user experience.</small>
                </div>
                <input type="checkbox" class="form-check-input" [(ngModel)]="preferences.performance">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="showSettings = false">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="savePreferences()">Save Preferences</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade" [class.show]="showSettings" *ngIf="showSettings"></div>
  `,
  styles: [`
    .cookie-consent-banner {
      position: fixed;
      bottom: 20px;
      left: 20px;
      max-width: 400px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      z-index: 1050;
      transform: translateX(-120%);
      transition: transform 0.3s ease-in-out;
    }
    
    .cookie-consent-banner.show {
      transform: translateX(0);
    }
    
    .cookie-content {
      display: block;
    }
    
    .cookie-text h5 {
      margin-bottom: 0.5rem;
      color: #0891b2;
    }
    
    .cookie-text p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.9;
    }
    
    .cookie-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    
    .cookie-buttons .btn {
      font-size: 0.8rem;
      padding: 0.4rem 0.8rem;
    }
    
    .cookie-category {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
    }
    
    .modal {
      z-index: 1060 !important;
    }
    
    .modal-backdrop {
      z-index: 1055 !important;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    @media (max-width: 768px) {
      .cookie-content {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }
      
      .cookie-buttons {
        flex-direction: column;
        width: 100%;
      }
      
      .cookie-buttons .btn {
        width: 100%;
      }
    }
  `]
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;
  showSettings = false;
  
  preferences = {
    essential: true,
    functional: false,
    analytics: false,
    performance: false
  };

  ngOnInit() {
    this.checkCookieConsent();
  }

  private checkCookieConsent() {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => {
        this.showBanner = true;
      }, 1000);
    } else {
      const savedPreferences = JSON.parse(consent);
      this.preferences = { ...this.preferences, ...savedPreferences };
    }
  }

  acceptAll() {
    this.preferences = {
      essential: true,
      functional: true,
      analytics: true,
      performance: true
    };
    this.saveConsent();
  }

  acceptEssential() {
    this.preferences = {
      essential: true,
      functional: false,
      analytics: false,
      performance: false
    };
    this.saveConsent();
  }

  declineAll() {
    this.preferences = {
      essential: true, // Essential cookies cannot be declined
      functional: false,
      analytics: false,
      performance: false
    };
    this.saveConsent();
    this.showDeclineMessage();
  }

  private showDeclineMessage() {
    // Show a brief message about essential cookies
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #f8f9fa; border: 1px solid #dee2e6; 
                  border-radius: 8px; padding: 1rem; max-width: 300px; z-index: 1060; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <strong>Cookies Declined</strong><br>
        <small>Only essential cookies for basic functionality are active.</small>
      </div>
    `;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      document.body.removeChild(messageDiv);
    }, 3000);
  }

  savePreferences() {
    this.saveConsent();
    this.showSettings = false;
  }

  private saveConsent() {
    localStorage.setItem('cookieConsent', JSON.stringify(this.preferences));
    this.showBanner = false;
    
    // Apply cookie preferences
    if (this.preferences.analytics) {
      this.enableAnalytics();
    }
    
    if (this.preferences.performance) {
      this.enablePerformanceTracking();
    }
  }

  private enableAnalytics() {
    // Add your analytics code here (Google Analytics, etc.)
    console.log('Analytics cookies enabled');
  }

  private enablePerformanceTracking() {
    // Add your performance tracking code here
    console.log('Performance cookies enabled');
  }
}
