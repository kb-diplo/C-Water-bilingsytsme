import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MeterReadingCreateDto, MeterReadingResponseDto } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ReadingService {
  private apiUrl = 'http://localhost:5000/api/readings';

  constructor(private http: HttpClient) {}

  // Add meter reading (Admin/MeterReader only)
  addReading(reading: MeterReadingCreateDto): Observable<MeterReadingResponseDto> {
    return this.http.post<MeterReadingResponseDto>(this.apiUrl, reading);
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
