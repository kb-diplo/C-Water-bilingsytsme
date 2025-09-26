import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MpesaStkPushRequest {
  billId: number;
  phoneNumber: string;
  amount: number;
}

export interface MpesaStkPushResponse {
  merchantRequestID: string;
  checkoutRequestID: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface MpesaTransactionStatus {
  id: number;
  billId: number;
  billNumber: string;
  clientName: string;
  amount: number;
  phoneNumber: string;
  status: string; // Pending, Success, Failed, Cancelled
  mpesaReceiptNumber?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MpesaService {
  private apiUrl = `${environment.apiUrl}/payments/mpesa`;

  constructor(private http: HttpClient) {}

  /**
   * Initiate Mpesa STK Push payment
   */
  initiateStkPush(request: MpesaStkPushRequest): Observable<MpesaStkPushResponse> {
    return this.http.post<MpesaStkPushResponse>(`${this.apiUrl}/stkpush`, request);
  }

  /**
   * Get Mpesa transaction status
   */
  getTransactionStatus(checkoutRequestId: string): Observable<MpesaTransactionStatus> {
    return this.http.get<MpesaTransactionStatus>(`${this.apiUrl}/status/${checkoutRequestId}`);
  }

  /**
   * Format phone number to Mpesa format (254XXXXXXXXX)
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return /^254\d{9}$/.test(formatted);
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Payment request sent. Please check your phone and enter your M-Pesa PIN.';
      case 'success':
        return 'Payment completed successfully!';
      case 'failed':
        return 'Payment failed. Please try again.';
      case 'cancelled':
        return 'Payment was cancelled.';
      default:
        return 'Unknown payment status.';
    }
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'success':
        return 'success';
      case 'failed':
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
