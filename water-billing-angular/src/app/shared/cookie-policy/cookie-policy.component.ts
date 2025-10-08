import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CookieService } from '../../core/services/cookie.service';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="cookie-container">
      <div class="cookie-header">
        <h1><i class="fas fa-cookie-bite"></i> Cookie Policy</h1>
        <p class="last-updated">Last updated: October 2025</p>
      </div>

      <div class="cookie-content">
        <section class="intro-section">
          <h2>Simple Explanation</h2>
          <p><strong>We don't use traditional cookies.</strong> Instead, we use your browser's local storage to save essential information like your login session. This data stays on your device and is never shared.</p>
        </section>

        <section>
          <h2>What We Store Locally</h2>
          <div class="cookies-grid">
            <div class="cookie-type essential">
              <div class="cookie-icon">
                <i class="fas fa-mobile-alt"></i>
              </div>
              <h3>Local Storage (Not Cookies)</h3>
              <p>Essential data stored on your device only</p>
              <div class="cookie-list">
                <div class="storage-item">
                  <strong>Login Token</strong>
                  <span class="cookie-desc">Keeps you logged in securely</span>
                </div>
                <div class="storage-item">
                  <strong>User Profile</strong>
                  <span class="cookie-desc">Your name and role information</span>
                </div>
                <div class="storage-item">
                  <strong>Cookie Consent</strong>
                  <span class="cookie-desc">Records that you've seen this notice</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>Why We Store This Data</h2>
          <div class="purpose-list">
            <div class="purpose-item">
              <i class="fas fa-sign-in-alt"></i>
              <div>
                <h4>Stay Logged In</h4>
                <p>So you don't have to enter your password every time you visit a new page</p>
              </div>
            </div>
            <div class="purpose-item">
              <i class="fas fa-shield-alt"></i>
              <div>
                <h4>Security</h4>
                <p>Verify that you are authorized to access your water billing account</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>What We DON'T Do</h2>
          <div class="no-tracking">
            <div class="no-item">
              <i class="fas fa-times-circle"></i>
              <span>No advertising or marketing cookies</span>
            </div>
            <div class="no-item">
              <i class="fas fa-times-circle"></i>
              <span>No tracking you on other websites</span>
            </div>
            <div class="no-item">
              <i class="fas fa-times-circle"></i>
              <span>No selling your data to anyone</span>
            </div>
            <div class="no-item">
              <i class="fas fa-times-circle"></i>
              <span>No analyzing your behavior for profit</span>
            </div>
          </div>
        </section>

        <section>
          <h2>Managing Your Cookies</h2>
          <div class="management-info">
            <div class="consent-status">
              <h4>Current Status</h4>
              <div class="status-indicator" [class.accepted]="hasConsent">
                <i class="fas" [class.fa-check-circle]="hasConsent" [class.fa-times-circle]="!hasConsent"></i>
                <span>{{hasConsent ? 'Cookies Accepted' : 'Cookies Not Accepted'}}</span>
              </div>
              <p class="consent-date" *ngIf="consentDate">
                Consent given on: {{consentDate | date:'medium'}}
              </p>
            </div>
            
            <div class="cookie-actions">
              <button class="btn-revoke" (click)="revokeCookies()" *ngIf="hasConsent">
                <i class="fas fa-ban"></i> Revoke Consent
              </button>
              <button class="btn-accept" (click)="acceptCookies()" *ngIf="!hasConsent">
                <i class="fas fa-check"></i> Accept Cookies
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2>Browser Settings</h2>
          <div class="browser-info">
            <p>You can also manage cookies through your browser settings:</p>
            <div class="browser-links">
              <a href="https://support.google.com/chrome/answer/95647" target="_blank">
                <i class="fab fa-chrome"></i> Chrome
              </a>
              <a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank">
                <i class="fab fa-firefox"></i> Firefox
              </a>
              <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank">
                <i class="fab fa-safari"></i> Safari
              </a>
              <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank">
                <i class="fab fa-edge"></i> Edge
              </a>
            </div>
          </div>
        </section>
      </div>

      <div class="cookie-footer">
        <button class="btn-back" (click)="goBack()">
          <i class="fas fa-arrow-left"></i> Back to Home
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cookie-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #334155;
    }

    .cookie-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px 0;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      border-radius: 12px;
    }

    .cookie-header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5rem;
      font-weight: 600;
    }

    .last-updated {
      margin: 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .intro-section {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #f59e0b;
    }

    .cookies-grid {
      display: grid;
      gap: 20px;
    }

    .cookie-type {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #10b981;
    }

    .cookie-type.essential {
      border-left-color: #10b981;
    }

    .cookie-icon {
      text-align: center;
      margin-bottom: 15px;
    }

    .cookie-icon i {
      font-size: 2rem;
      color: #10b981;
    }

    .cookie-type h3 {
      text-align: center;
      margin: 0 0 10px 0;
      color: #164e63;
    }

    .cookie-type p {
      text-align: center;
      margin-bottom: 20px;
      color: #64748b;
    }

    .cookie-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .storage-item {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      margin-bottom: 8px;
    }

    .storage-item strong {
      display: block;
      color: #164e63;
      margin-bottom: 4px;
    }

    .cookie-desc {
      display: block;
      font-size: 0.9rem;
      color: #64748b;
      margin-bottom: 2px;
    }

    .cookie-size {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .purpose-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .purpose-item {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 20px;
      background: #f1f5f9;
      border-radius: 8px;
    }

    .purpose-item i {
      color: #0891b2;
      font-size: 1.5rem;
      margin-top: 5px;
    }

    .purpose-item h4 {
      margin: 0 0 8px 0;
      color: #164e63;
    }

    .purpose-item p {
      margin: 0;
      color: #64748b;
    }

    .no-tracking {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .no-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 15px;
      background: #fef2f2;
      border-radius: 8px;
      color: #dc2626;
      font-weight: 500;
    }

    .no-item i {
      color: #dc2626;
    }

    .management-info {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #0891b2;
    }

    .consent-status {
      margin-bottom: 20px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 10px 0;
      padding: 10px;
      background: #fee2e2;
      border-radius: 6px;
      color: #dc2626;
    }

    .status-indicator.accepted {
      background: #dcfce7;
      color: #16a34a;
    }

    .consent-date {
      font-size: 0.9rem;
      color: #64748b;
      margin: 5px 0 0 0;
    }

    .cookie-actions {
      display: flex;
      gap: 10px;
    }

    .btn-revoke, .btn-accept {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s ease;
    }

    .btn-revoke {
      background: #dc2626;
      color: white;
    }

    .btn-accept {
      background: #16a34a;
      color: white;
    }

    .btn-revoke:hover, .btn-accept:hover {
      transform: translateY(-1px);
    }

    .browser-info {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
    }

    .browser-links {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 15px;
    }

    .browser-links a {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 15px;
      background: white;
      color: #0891b2;
      text-decoration: none;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      transition: transform 0.2s ease;
    }

    .browser-links a:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .cookie-footer {
      text-align: center;
      padding-top: 30px;
      border-top: 1px solid #e2e8f0;
    }

    .btn-back {
      background: linear-gradient(135deg, #0891b2, #164e63);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-back:hover {
      transform: translateY(-1px);
    }

    @media (max-width: 768px) {
      .cookie-container {
        padding: 15px;
      }
      
      .cookie-header h1 {
        font-size: 2rem;
      }
      
      .browser-links {
        justify-content: center;
      }
    }
  `]
})
export class CookiePolicyComponent implements OnInit {
  storedData: { key: string, size: string, type: string }[] = [];
  hasConsent = false;
  consentDate: Date | null = null;

  constructor(private cookieService: CookieService) {}

  ngOnInit(): void {
    this.storedData = this.cookieService.getStoredDataSummary();
    this.hasConsent = this.cookieService.hasConsent();
    this.consentDate = this.cookieService.getConsentDate();
  }

  acceptCookies(): void {
    this.cookieService.giveConsent();
    this.hasConsent = true;
    this.consentDate = new Date();
  }

  revokeCookies(): void {
    if (confirm('Are you sure you want to revoke cookie consent? This may affect your user experience.')) {
      this.cookieService.revokeConsent();
      this.hasConsent = false;
      this.consentDate = null;
    }
  }

  goBack(): void {
    window.history.back();
  }
}
