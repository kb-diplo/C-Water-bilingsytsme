import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillResponseDto, BillDetailResponseDto, PaymentResponseDto, PaymentCreateDto } from '../models/api.models';

// Re-export for convenience
export type Bill = BillResponseDto;
export type BillDetail = BillDetailResponseDto;
export type Payment = PaymentResponseDto;

export interface BillCreateRequest {
  clientId: number;
  billingPeriod: string;
  previousReading: number;
  currentReading: number;
  rate: number;
  dueDate: string;
}

export interface BillUpdateRequest {
  status?: string;
  penalty?: number;
  dueDate?: string;
}

export interface BillingStats {
  totalBills: number;
  paidBills: number;
  pendingBills: number;
  overdueBills: number;
  totalRevenue: number;
  outstandingAmount: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    billCount: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Bills Management
  getBills(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Observable<Bill[]> {
    let httpParams = new HttpParams();
    
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http.get<Bill[]>(`${this.apiUrl}/bills`, { params: httpParams });
  }

  getBillById(id: number): Observable<BillDetail> {
    return this.http.get<BillDetail>(`${this.apiUrl}/bills/${id}`);
  }

  getClientBills(clientId: number): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/bills/client/${clientId}`);
  }

  getUnpaidBills(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/bills?status=Unpaid`);
  }

  getOverdueBills(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/bills?status=Overdue`);
  }

  // Payments Management
  getPayments(params?: {
    page?: number;
    pageSize?: number;
    paymentMethod?: string;
  }): Observable<Payment[]> {
    let httpParams = new HttpParams();
    
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());
    if (params?.paymentMethod) httpParams = httpParams.set('paymentMethod', params.paymentMethod);

    return this.http.get<Payment[]>(`${this.apiUrl}/payments`, { params: httpParams });
  }

  recordPayment(payment: PaymentCreateDto): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/payments`, payment);
  }

  getClientPayments(clientId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/payments/client/${clientId}`);
  }

  // Statistics and Reports
  getBillingStats(): Observable<BillingStats> {
    return this.http.get<BillingStats>(`${this.apiUrl}/bills/stats`);
  }

  getDashboardStats(): Observable<{
    totalBills: number;
    paidBills: number;
    pendingBills: number;
    overdueBills: number;
    totalRevenue: number;
    outstandingPayments: number;
  }> {
    return this.http.get<{
      totalBills: number;
      paidBills: number;
      pendingBills: number;
      overdueBills: number;
      totalRevenue: number;
      outstandingPayments: number;
    }>(`${this.apiUrl}/bills/stats`);
  }

  // Send bill reminder email
  sendBillReminder(billId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/bills/${billId}/remind`, {});
  }

  // Delete bill (Admin only)
  deleteBill(billId: number): Observable<any> {
    const url = `${this.apiUrl}/bills/${billId}`;
    console.log('Delete bill URL:', url);
    return this.http.delete(url);
  }

  // Receipt Downloads
  downloadPaymentReceipt(paymentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/payments/${paymentId}/receipt`, { 
      responseType: 'blob'
    });
  }

  downloadBillReceipt(billId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/payments/bill/${billId}/receipt`, { 
      responseType: 'blob'
    });
  }

  // STK Push functionality
  sendSTKPush(stkData: { BillId: number; PhoneNumber: string; Amount: number }): Observable<any> {
    console.log('Sending STK Push:', stkData);
    return this.http.post(`${this.apiUrl}/payments/mpesa/stkpush`, stkData);
  }

}
