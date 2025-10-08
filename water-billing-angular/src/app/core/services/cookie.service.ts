import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CookieService {
  private cookieConsentSubject = new BehaviorSubject<boolean>(this.hasConsent());
  public cookieConsent$ = this.cookieConsentSubject.asObservable();

  constructor() {
    // Check consent status on service initialization
    this.checkConsentStatus();
  }

  /**
   * Check if user has given cookie consent
   */
  hasConsent(): boolean {
    return localStorage.getItem('cookiesAccepted') === 'true';
  }

  /**
   * Give cookie consent
   */
  giveConsent(): void {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    this.cookieConsentSubject.next(true);
    console.log('✅ Cookie consent granted');
  }

  /**
   * Revoke cookie consent (for privacy settings)
   */
  revokeConsent(): void {
    localStorage.removeItem('cookiesAccepted');
    localStorage.removeItem('cookieConsentDate');
    this.cookieConsentSubject.next(false);
    console.log('❌ Cookie consent revoked');
  }

  /**
   * Get consent date
   */
  getConsentDate(): Date | null {
    const dateStr = localStorage.getItem('cookieConsentDate');
    return dateStr ? new Date(dateStr) : null;
  }

  /**
   * Check if consent is still valid (within 1 year)
   */
  isConsentValid(): boolean {
    const consentDate = this.getConsentDate();
    if (!consentDate) return false;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return consentDate > oneYearAgo;
  }

  /**
   * Set a cookie-compliant item in localStorage
   */
  setItem(key: string, value: string): void {
    if (this.hasConsent()) {
      localStorage.setItem(key, value);
    } else {
      console.warn('⚠️ Cookie consent required to store data');
    }
  }

  /**
   * Get item from localStorage (always allowed for essential data)
   */
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Check consent status and update subject
   */
  private checkConsentStatus(): void {
    const hasConsent = this.hasConsent() && this.isConsentValid();
    this.cookieConsentSubject.next(hasConsent);
    
    // If consent has expired, remove it
    if (!this.isConsentValid() && localStorage.getItem('cookiesAccepted')) {
      this.revokeConsent();
    }
  }

  /**
   * Get privacy-friendly summary of stored data
   */
  getStoredDataSummary(): { key: string, size: string, type: string }[] {
    const summary = [];
    
    if (localStorage.getItem('token')) {
      summary.push({
        key: 'Authentication Token',
        size: 'Small',
        type: 'Essential - Login session'
      });
    }
    
    if (localStorage.getItem('currentUser')) {
      summary.push({
        key: 'User Profile',
        size: 'Small',
        type: 'Essential - User preferences'
      });
    }
    
    if (localStorage.getItem('cookiesAccepted')) {
      summary.push({
        key: 'Cookie Consent',
        size: 'Tiny',
        type: 'Privacy - Consent record'
      });
    }
    
    return summary;
  }
}
