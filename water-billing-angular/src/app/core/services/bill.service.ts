import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BillResponseDto } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class BillService {
  private apiUrl = 'http://localhost:5000/api/bills';

  constructor(private http: HttpClient) {}

  // Get all bills with pagination (Admin only)
  getAllBills(page: number = 1, pageSize: number = 20, status?: string): Observable<BillResponseDto[]> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<BillResponseDto[]>(this.apiUrl, { params });
  }

  // Get client bills with role-based access
  getClientBills(clientId: number): Observable<BillResponseDto[]> {
    return this.http.get<BillResponseDto[]>(`${this.apiUrl}/client/${clientId}`);
  }

  // Get unpaid bills for a client
  getClientUnpaidBills(clientId: number): Observable<BillResponseDto[]> {
    return this.http.get<BillResponseDto[]>(`${this.apiUrl}/client/${clientId}/unpaid`);
  }

  // Get bill details with payments
  getBillById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // Get overdue bills (Admin/MeterReader)
  getOverdueBills(): Observable<BillResponseDto[]> {
    return this.http.get<BillResponseDto[]>(`${this.apiUrl}/overdue`);
  }

  // Update bill status (Admin only)
  updateBillStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status });
  }
}
