import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientDto, ClientUpdateDto } from '../models/api.models';
import { environment } from '../../../environments/environment';

export interface ClientSearchParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Re-export types for backward compatibility
export type Client = ClientDto;
export interface ClientCreateRequest {
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  meterNumber: string;
  location: string;
  connectionStatus?: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  // Get all clients (Admin/MeterReader only)
  getClients(params?: ClientSearchParams): Observable<ClientDto[]> {
    return this.http.get<ClientDto[]>(this.apiUrl);
  }

  // Get client by ID with role-based access
  getClientById(id: number): Observable<ClientDto> {
    return this.http.get<ClientDto>(`${this.apiUrl}/${id}`);
  }

  // Update client details (Admin/MeterReader only)
  updateClient(id: number, client: ClientUpdateDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, client);
  }

  // Delete client (Admin only)
  deleteClient(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Get client details with readings and bills (Admin/MeterReader only)
  getClientDetails(username: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${username}/details`);
  }

  // Search clients (for backward compatibility)
  searchClients(searchTerm: string): Observable<ClientDto[]> {
    // Since your backend doesn't have a search endpoint, filter on frontend
    return this.getClients();
  }

  // Create client
  createClient(client: ClientCreateRequest): Observable<any> {
    return this.http.post(this.apiUrl, client);
  }

  // Export to CSV (for backward compatibility - note: your backend doesn't have this endpoint)
  exportToCSV(): Observable<Blob> {
    // This would need to be implemented in your backend
    console.warn('exportToCSV method not implemented in backend');
    return this.http.get(`${this.apiUrl}/export`, { 
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    });
  }
}
