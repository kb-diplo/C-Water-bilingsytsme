import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="privacy-container">
      <div class="privacy-header">
        <h1><i class="fas fa-shield-alt"></i> Privacy Policy</h1>
        <p class="last-updated">Last updated: October 2025</p>
      </div>

      <div class="privacy-content">
        <section>
          <h2>Information We Collect</h2>
          <div class="info-grid">
            <div class="info-card">
              <h3><i class="fas fa-user"></i> Account Information</h3>
              <ul>
                <li>Username and email address</li>
                <li>Role and permissions</li>
                <li>Account creation date</li>
              </ul>
            </div>
            <div class="info-card">
              <h3><i class="fas fa-tint"></i> Billing Data</h3>
              <ul>
                <li>Meter readings and usage history</li>
                <li>Payment records and receipts</li>
                <li>Bill generation data</li>
              </ul>
            </div>
            <div class="info-card">
              <h3><i class="fas fa-cog"></i> Technical Data</h3>
              <ul>
                <li>Login sessions (stored locally)</li>
                <li>User preferences and settings</li>
                <li>System interaction logs</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2>How We Use Your Information</h2>
          <div class="usage-list">
            <div class="usage-item">
              <i class="fas fa-water"></i>
              <div>
                <h4>Water Service Management</h4>
                <p>Process meter readings, generate bills, and manage your water service account</p>
              </div>
            </div>
            <div class="usage-item">
              <i class="fas fa-credit-card"></i>
              <div>
                <h4>Payment Processing</h4>
                <p>Handle payments, generate receipts, and maintain payment history</p>
              </div>
            </div>
            <div class="usage-item">
              <i class="fas fa-lock"></i>
              <div>
                <h4>Security & Authentication</h4>
                <p>Maintain secure login sessions and protect your account</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2>Data Storage & Security</h2>
          <div class="security-info">
            <div class="security-item">
              <i class="fas fa-server"></i>
              <h4>Server Storage</h4>
              <p>Your account and billing data is securely stored on our encrypted servers</p>
            </div>
            <div class="security-item">
              <i class="fas fa-mobile-alt"></i>
              <h4>Local Storage</h4>
              <p>Login sessions and preferences are stored locally on your device for convenience</p>
            </div>
          </div>
        </section>

        <section>
          <h2>Your Rights</h2>
          <div class="rights-grid">
            <div class="right-item">
              <i class="fas fa-eye"></i>
              <h4>Access</h4>
              <p>View all your personal data we have stored</p>
            </div>
            <div class="right-item">
              <i class="fas fa-edit"></i>
              <h4>Correction</h4>
              <p>Request corrections to your personal information</p>
            </div>
            <div class="right-item">
              <i class="fas fa-trash"></i>
              <h4>Deletion</h4>
              <p>Request deletion of your account and data</p>
            </div>
            <div class="right-item">
              <i class="fas fa-download"></i>
              <h4>Portability</h4>
              <p>Export your data in a readable format</p>
            </div>
          </div>
        </section>

        <section>
          <h2>Contact Us</h2>
          <div class="contact-info">
            <div class="contact-item">
              <i class="fas fa-building"></i>
              <div>
                <h4>Denkam Waters Company Limited</h4>
                <p>Ikinu, Kiambu County, Kenya</p>
              </div>
            </div>
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <div>
                <h4>Email</h4>
                <p>privacy@denkamwaters.com</p>
              </div>
            </div>
            <div class="contact-item">
              <i class="fas fa-phone"></i>
              <div>
                <h4>Phone</h4>
                <p>+254 757 690 915</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="privacy-footer">
        <button class="btn-back" (click)="goBack()">
          <i class="fas fa-arrow-left"></i> Back to Home
        </button>
      </div>
    </div>
  `,
  styles: [`
    .privacy-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #334155;
    }

    .privacy-header {
      text-align: center;
      margin-bottom: 40px;
      padding: 30px 0;
      background: linear-gradient(135deg, #0891b2, #164e63);
      color: white;
      border-radius: 12px;
    }

    .privacy-header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5rem;
      font-weight: 600;
    }

    .last-updated {
      margin: 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .privacy-content {
      margin-bottom: 40px;
    }

    section {
      margin-bottom: 40px;
    }

    h2 {
      color: #0891b2;
      font-size: 1.5rem;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .info-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #0891b2;
    }

    .info-card h3 {
      color: #164e63;
      margin: 0 0 15px 0;
      font-size: 1.1rem;
    }

    .info-card ul {
      margin: 0;
      padding-left: 20px;
    }

    .info-card li {
      margin-bottom: 5px;
      color: #64748b;
    }

    .usage-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .usage-item {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 20px;
      background: #f1f5f9;
      border-radius: 8px;
    }

    .usage-item i {
      color: #0891b2;
      font-size: 1.5rem;
      margin-top: 5px;
    }

    .usage-item h4 {
      margin: 0 0 8px 0;
      color: #164e63;
    }

    .usage-item p {
      margin: 0;
      color: #64748b;
    }

    .security-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .security-item {
      text-align: center;
      padding: 30px 20px;
      background: #f0f9ff;
      border-radius: 8px;
    }

    .security-item i {
      color: #0891b2;
      font-size: 2rem;
      margin-bottom: 15px;
    }

    .rights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
    }

    .right-item {
      text-align: center;
      padding: 20px;
      background: #fefefe;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      transition: transform 0.2s ease;
    }

    .right-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .right-item i {
      color: #0891b2;
      font-size: 1.5rem;
      margin-bottom: 10px;
    }

    .right-item h4 {
      margin: 0 0 8px 0;
      color: #164e63;
    }

    .right-item p {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }

    .contact-item i {
      color: #0891b2;
      font-size: 1.2rem;
      width: 20px;
    }

    .contact-item h4 {
      margin: 0 0 5px 0;
      color: #164e63;
    }

    .contact-item p {
      margin: 0;
      color: #64748b;
    }

    .privacy-footer {
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
      .privacy-container {
        padding: 15px;
      }
      
      .privacy-header h1 {
        font-size: 2rem;
      }
      
      .info-grid,
      .rights-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PrivacyPolicyComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
