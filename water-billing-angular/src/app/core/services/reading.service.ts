import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MeterReadingCreateDto, MeterReadingResponseDto, InitialReadingDto } from '../models/api.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReadingService {
  private apiUrl = `${environment.apiUrl}/readings`;

  constructor(private http: HttpClient) {}

  // Add meter reading (Admin/MeterReader only)
  addReading(reading: MeterReadingCreateDto): Observable<MeterReadingResponseDto> {
    return this.http.post<MeterReadingResponseDto>(this.apiUrl, reading);
  }

  // Set initial reading for a client (Admin only)
  setInitialReading(initialReading: InitialReadingDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/initial`, initialReading);
  }

  // Get all readings (Admin only)
  getAllReadings(): Observable<MeterReadingResponseDto[]> {
    return this.http.get<MeterReadingResponseDto[]>(this.apiUrl);
  }

  // Get client readings (Admin/MeterReader)
  getClientReadings(clientId: number): Observable<MeterReadingResponseDto[]> {
    return this.http.get<MeterReadingResponseDto[]>(`${this.apiUrl}/client/${clientId}`);
  }

  // Update reading (Admin only)
  updateReading(id: number, reading: Partial<MeterReadingCreateDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, reading);
  }
}
