import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  FinancialReportDto, 
  DateRangeDto 
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://localhost:5000/api/reports';

  constructor(private http: HttpClient) {}

  // Get comprehensive financial report (Admin only)
  getFinancialReport(fromDate?: Date, toDate?: Date): Observable<FinancialReportDto> {
    let params = new HttpParams();
    
    if (fromDate) {
      params = params.set('fromDate', fromDate.toISOString());
    }
    if (toDate) {
      params = params.set('toDate', toDate.toISOString());
    }

    return this.http.get<FinancialReportDto>(`${this.apiUrl}/financial`, { params });
  }

}
