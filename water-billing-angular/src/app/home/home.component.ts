import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CookieService } from '../core/services/cookie.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  showBackToTop = false;
  activeSection = 'home';

  constructor(private cookieService: CookieService) {}

  ngOnInit(): void {
    this.updateActiveSection();
    // Hide the initial loader when home component loads
    this.hideInitialLoader();
  }

  private hideInitialLoader(): void {
    setTimeout(() => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.display = 'none';
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.showBackToTop = window.pageYOffset > 300;
    this.updateActiveSection();
  }

  private updateActiveSection(): void {
    const sections = ['home', 'about', 'features'];
    const scrollPosition = window.pageYOffset + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetBottom = offsetTop + element.offsetHeight;
        
        if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
          this.activeSection = section;
          break;
        }
      }
    }
  }

  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    this.activeSection = sectionId;
    
    if (sectionId === 'home') {
      // For home section, scroll to the very top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const navbarHeight = 80; // Account for fixed navbar
        const elementPosition = element.offsetTop - navbarHeight;
        
        window.scrollTo({
          top: elementPosition,
          behavior: 'smooth'
        });
      }
    }
  }

  scrollToTop(): void {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }

  showPrivacyPolicy(event: Event): void {
    event.preventDefault();
    
    const privacyContent = `
      <div style="text-align: left; max-height: 400px; overflow-y: auto;">
        <h3 style="color: #0891b2; margin-bottom: 20px;">Privacy Policy</h3>
        
        <h4>Data We Collect</h4>
        <ul>
          <li><strong>Account Information:</strong> Username, email, and role for system access</li>
          <li><strong>Billing Data:</strong> Meter readings, usage history, and payment records</li>
          <li><strong>Technical Data:</strong> Login sessions and system preferences</li>
        </ul>
        
        <h4>How We Use Your Data</h4>
        <ul>
          <li>Provide water billing and account management services</li>
          <li>Process payments and generate bills</li>
          <li>Maintain system security and user authentication</li>
          <li>Improve our services based on usage patterns</li>
        </ul>
        
        <h4>Data Storage</h4>
        <p>Your data is stored securely on our servers and locally on your device for essential functions like login sessions.</p>
        
        <h4>Your Rights</h4>
        <ul>
          <li>Access your personal data</li>
          <li>Request data correction or deletion</li>
          <li>Withdraw consent for non-essential cookies</li>
        </ul>
        
        <p style="margin-top: 20px; padding: 15px; background: #e0f7fa; border-radius: 8px; color: #164e63;">
          <strong>Contact:</strong> For privacy concerns, contact us at info@denkamwaters.com
        </p>
      </div>
    `;

    // You can use SweetAlert2 or a modal here
    alert('Privacy Policy\n\nDenkam Waters is committed to protecting your privacy. We collect and use your data only for providing water billing services. Your login information is stored locally for convenience and security. We never share your personal information with third parties.\n\nFor detailed privacy information, please contact us at info@denkamwaters.com');
  }

  showCookiePolicy(event: Event): void {
    event.preventDefault();
    
    const storedData = this.cookieService.getStoredDataSummary();
    const dataList = storedData.map(item => `• ${item.key}: ${item.type}`).join('\n');
    
    const message = `Cookie & Local Storage Policy

What we store on your device:
${dataList}

Why we store this data:
• Essential cookies for login and security
• User preferences for better experience
• No tracking or advertising cookies

You can manage your consent at any time. Essential cookies are required for the system to function properly.

Consent expires after 1 year and can be renewed.`;

    alert(message);
  }
}
