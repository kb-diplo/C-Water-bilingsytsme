import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentCreateDto, PaymentResponseDto } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://localhost:5000/api/payments';

  constructor(private http: HttpClient) {}

  // Record payment with validation
  recordPayment(payment: PaymentCreateDto): Observable<PaymentResponseDto> {
    return this.http.post<PaymentResponseDto>(this.apiUrl, payment);
  }

  // Get all payments (Admin only)
  getAllPayments(): Observable<PaymentResponseDto[]> {
    return this.http.get<PaymentResponseDto[]>(this.apiUrl);
  }

  // Get payments for a specific bill
  getBillPayments(billId: number): Observable<PaymentResponseDto[]> {
    return this.http.get<PaymentResponseDto[]>(`${this.apiUrl}/bill/${billId}`);
  }

  // Get payment summary (Admin only)
  getPaymentSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/summary`);
  }

  // Get client payments
  getClientPayments(clientId: number): Observable<PaymentResponseDto[]> {
    return this.http.get<PaymentResponseDto[]>(`${this.apiUrl}/client/${clientId}`);
  }
}
