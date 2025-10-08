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
          <h4>We Value Your Privacy</h4>
          <p>
            Denkam Waters uses essential cookies to ensure our water billing system works properly and securely. 
            We store your login session and preferences locally to provide you with the best experience.
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
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 600px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 2px solid #0891b2;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(8, 145, 178, 0.2);
      z-index: 10000;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
      padding: 24px;
      gap: 20px;
      align-items: flex-start;
    }

    .cookie-icon {
      flex-shrink: 0;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #0891b2, #164e63);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
    }

    .cookie-text {
      flex: 1;
    }

    .cookie-text h4 {
      margin: 0 0 12px 0;
      color: #164e63;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .cookie-text p {
      margin: 0 0 16px 0;
      color: #4b5563;
      line-height: 1.5;
      font-size: 0.95rem;
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
      gap: 12px;
      padding: 0 24px 24px;
      justify-content: flex-end;
      align-items: center;
    }

    .btn-details {
      background: transparent;
      border: 2px solid #0891b2;
      color: #0891b2;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .btn-details:hover {
      background: #0891b2;
      color: white;
      transform: translateY(-1px);
    }

    .btn-accept {
      background: linear-gradient(135deg, #0891b2, #164e63);
      border: none;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
    }

    .btn-accept:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(8, 145, 178, 0.4);
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
