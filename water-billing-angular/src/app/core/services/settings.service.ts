import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SystemSettingsDto, SystemSettingsResponseDto } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = 'http://localhost:5000/api/metrics'; // Note: Your backend uses MetricsController

  constructor(private http: HttpClient) {}

  // Get current billing rates and system settings (Admin only)
  getBillingRates(): Observable<SystemSettingsResponseDto> {
    return this.http.get<SystemSettingsResponseDto>(`${this.apiUrl}/rates`);
  }

  // Update billing rates and system settings (Admin only)
  updateBillingRates(settings: SystemSettingsDto): Observable<SystemSettingsResponseDto> {
    return this.http.put<SystemSettingsResponseDto>(`${this.apiUrl}/rates`, settings);
  }

}
