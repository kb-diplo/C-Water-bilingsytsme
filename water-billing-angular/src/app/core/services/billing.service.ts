import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bill {
  id: number;
  clientId: number;
  clientName: string;
  meterNumber: string;
  billingPeriod: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  rate: number;
  amount: number;
  penalty: number;
  totalPayable: number;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

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

export interface Payment {
  id: number;
  billId: number;
  clientId: number;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Cheque';
  referenceNumber?: string;
  paymentDate: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentCreateRequest {
  billId: number;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paymentDate: string;
  notes?: string;
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
    clientId?: number;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<Bill[]> {
    let httpParams = new HttpParams();
    
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.clientId) httpParams = httpParams.set('clientId', params.clientId.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<Bill[]>(`${this.apiUrl}/bills`, { params: httpParams });
  }

  getBillById(id: number): Observable<Bill> {
    return this.http.get<Bill>(`${this.apiUrl}/bills/${id}`);
  }

  getClientBills(clientId: number): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/bills/client/${clientId}`);
  }

  getUnpaidBills(clientId?: number): Observable<Bill[]> {
    const url = clientId 
      ? `${this.apiUrl}/bills/client/${clientId}/unpaid`
      : `${this.apiUrl}/bills?status=pending,overdue`;
    return this.http.get<Bill[]>(url);
  }

  getOverdueBills(): Observable<Bill[]> {
    return this.http.get<Bill[]>(`${this.apiUrl}/bills/overdue`);
  }

  createBill(bill: BillCreateRequest): Observable<Bill> {
    return this.http.post<Bill>(`${this.apiUrl}/bills`, bill);
  }

  updateBill(id: number, bill: BillUpdateRequest): Observable<Bill> {
    return this.http.put<Bill>(`${this.apiUrl}/bills/${id}`, bill);
  }

  deleteBill(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bills/${id}`);
  }

  // Payments Management
  getPayments(params?: {
    billId?: number;
    clientId?: number;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Observable<Payment[]> {
    let httpParams = new HttpParams();
    
    if (params?.billId) httpParams = httpParams.set('billId', params.billId.toString());
    if (params?.clientId) httpParams = httpParams.set('clientId', params.clientId.toString());
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get<Payment[]>(`${this.apiUrl}/payments`, { params: httpParams });
  }

  recordPayment(payment: PaymentCreateRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/payments`, payment);
  }

  getBillPayments(billId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}/payments/bill/${billId}`);
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
    }>(`${this.apiUrl}/dashboard/billing`);
  }

  // Utility Methods
  sendBillReminder(billId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/bills/${billId}/remind`, {});
  }

  generateBillPDF(billId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/bills/${billId}/pdf`, { 
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    });
  }

  exportBillsToCSV(params?: { status?: string; startDate?: string; endDate?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);

    return this.http.get(`${this.apiUrl}/bills/export`, { 
      params: httpParams,
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    });
  }
}
