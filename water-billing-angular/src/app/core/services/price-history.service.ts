import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PriceHistoryCreateDto, PriceHistoryResponseDto } from '../models/api.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PriceHistoryService {
  private apiUrl = `${environment.apiUrl}/pricehistory`;

  constructor(private http: HttpClient) {}

  // Get all price history records (Admin only)
  getPriceHistory(): Observable<PriceHistoryResponseDto[]> {
    return this.http.get<PriceHistoryResponseDto[]>(this.apiUrl);
  }

  // Get current active price (All authenticated users)
  getCurrentPrice(): Observable<PriceHistoryResponseDto> {
    return this.http.get<PriceHistoryResponseDto>(`${this.apiUrl}/current`);
  }

  // Create new price history entry (Admin only)
  createPriceHistory(dto: PriceHistoryCreateDto): Observable<PriceHistoryResponseDto> {
    return this.http.post<PriceHistoryResponseDto>(this.apiUrl, dto);
  }

  // Get rate for specific billing period (All authenticated users)
  getRateForPeriod(billingPeriod: string): Observable<{ billingPeriod: string, ratePerUnit: number }> {
    return this.http.get<{ billingPeriod: string, ratePerUnit: number }>(`${this.apiUrl}/rate/${billingPeriod}`);
  }

  // Get penalty rate for specific billing period (All authenticated users)
  getPenaltyRateForPeriod(billingPeriod: string): Observable<{ billingPeriod: string, penaltyRate: number }> {
    return this.http.get<{ billingPeriod: string, penaltyRate: number }>(`${this.apiUrl}/penalty-rate/${billingPeriod}`);
  }

  // Helper method to generate available periods for dropdowns
  generateAvailablePeriods(monthsBack: number = 12): { value: string, label: string }[] {
    const currentDate = new Date();
    const periods: { value: string, label: string }[] = [];
    
    // Add current month
    const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    periods.push({ 
      value: currentPeriod, 
      label: `${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)` 
    });
    
    // Add future months (next 12 months)
    for (let i = 1; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      periods.push({ value, label });
    }
    
    return periods;
  }

  // Helper method to validate period format
  validatePeriodFormat(period: string): boolean {
    const regex = /^\d{4}-\d{2}$/;
    if (!regex.test(period)) return false;
    
    const [year, month] = period.split('-').map(Number);
    return year >= 2020 && year <= 2030 && month >= 1 && month <= 12;
  }
}
