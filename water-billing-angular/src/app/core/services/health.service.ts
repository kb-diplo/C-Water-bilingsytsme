import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  constructor(private http: HttpClient) {}

  checkBackendHealth(): Observable<any> {
    const healthUrls = [
      'https://localhost:7001/api/hello/test',
      'http://localhost:5000/api/hello/test',
      'https://localhost:5001/api/hello/test',
      'http://localhost:7000/api/hello/test'
    ];

    // Try each URL and return the first successful one
    return this.tryUrls(healthUrls);
  }

  private tryUrls(urls: string[]): Observable<any> {
    if (urls.length === 0) {
      return of({ error: 'No backend found' });
    }

    const [currentUrl, ...remainingUrls] = urls;
    
    return this.http.get(currentUrl).pipe(
      timeout(3000),
      catchError(() => this.tryUrls(remainingUrls))
    );
  }
}
