import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieService } from '../../core/services/cookie.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showBanner" class="cookie-consent-banner" [class.show]="showBanner">
      <div class="cookie-content">
        <div class="cookie-icon">
          <i class="fas fa-cookie-bite"></i>
        </div>
        <div class="cookie-text">
          <h4>🍪 Cookie Notice</h4>
          <p>
            We use essential cookies for login and preferences. No tracking or ads.
          </p>
          <div class="cookie-details" *ngIf="showDetails">
            <h5>What we store:</h5>
            <ul>
              <li><strong>Authentication Token:</strong> Keeps you logged in securely</li>
              <li><strong>User Preferences:</strong> Remembers your dashboard settings</li>
              <li><strong>Session Data:</strong> Ensures smooth navigation</li>
            </ul>
            <p class="privacy-note">
              <i class="fas fa-shield-alt"></i>
              We never share your data with third parties. All data is stored locally on your device.
            </p>
          </div>
        </div>
      </div>
      <div class="cookie-actions">
        <button class="btn-details" (click)="toggleDetails()" type="button">
          <i class="fas" [class.fa-chevron-down]="!showDetails" [class.fa-chevron-up]="showDetails"></i>
          {{ showDetails ? 'Less Info' : 'More Info' }}
        </button>
        <button class="btn-accept" (click)="acceptCookies()" type="button">
          <i class="fas fa-check"></i>
          Accept & Continue
        </button>
      </div>
    </div>
    <div *ngIf="showBanner" class="cookie-backdrop" (click)="acceptCookies()"></div>
  `,
  styles: [`
    .cookie-consent-banner {
      position: fixed;
      bottom: -100%;
      left: 20px;
      width: 320px;
      max-width: calc(100vw - 40px);
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      transition: all 0.3s ease-out;
      backdrop-filter: blur(10px);
      overflow: hidden;
    }

    .cookie-consent-banner.show {
      bottom: 20px;
    }

    .cookie-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.1);
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .cookie-content {
      display: flex;
      padding: 16px;
      gap: 12px;
      align-items: flex-start;
    }

    .cookie-icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #0891b2, #164e63);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.9rem;
    }

    .cookie-text {
      flex: 1;
    }

    .cookie-text h4 {
      margin: 0 0 6px 0;
      color: #164e63;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .cookie-text p {
      margin: 0 0 12px 0;
      color: #64748b;
      line-height: 1.4;
      font-size: 0.8rem;
    }

    .cookie-details {
      background: #e0f7fa;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      border-left: 4px solid #0891b2;
    }

    .cookie-details h5 {
      margin: 0 0 12px 0;
      color: #164e63;
      font-size: 1rem;
      font-weight: 600;
    }

    .cookie-details ul {
      margin: 0 0 16px 0;
      padding-left: 20px;
      color: #4b5563;
    }

    .cookie-details li {
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .privacy-note {
      background: rgba(8, 145, 178, 0.1);
      padding: 12px;
      border-radius: 6px;
      margin: 0;
      font-size: 0.85rem;
      color: #164e63;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .privacy-note i {
      color: #0891b2;
    }

    .cookie-actions {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
      justify-content: flex-end;
      align-items: center;
    }

    .btn-details {
      background: transparent;
      border: 1px solid #cbd5e1;
      color: #64748b;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
    }

    .btn-details:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-accept {
      background: linear-gradient(135deg, #0891b2, #0284c7);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      box-shadow: 0 2px 8px rgba(8, 145, 178, 0.2);
    }

    .btn-accept:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
    }

    @media (max-width: 768px) {
      .cookie-consent-banner {
        width: 95%;
        bottom: -100%;
      }

      .cookie-consent-banner.show {
        bottom: 10px;
      }

      .cookie-content {
        flex-direction: column;
        padding: 20px;
        gap: 16px;
        text-align: center;
      }

      .cookie-actions {
        flex-direction: column;
        padding: 0 20px 20px;
      }

      .btn-details,
      .btn-accept {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class CookieConsentComponent implements OnInit {
  showBanner = false;
  showDetails = false;

  constructor(private cookieService: CookieService) {}

  ngOnInit() {
    // Check if user has already accepted cookies and consent is still valid
    if (!this.cookieService.hasConsent() || !this.cookieService.isConsentValid()) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        this.showBanner = true;
      }, 2000);
    }
  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }

  acceptCookies() {
    // Use cookie service to handle consent
    this.cookieService.giveConsent();
    
    // Hide banner with animation
    this.showBanner = false;
    
    // Optional: Show a brief success message
    setTimeout(() => {
      console.log('🍪 Thank you for accepting our privacy policy!');
    }, 500);
  }
}
