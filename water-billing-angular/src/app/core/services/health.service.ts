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
    // Use the environment API URL and fallback to default
    const baseUrl = environment.apiUrl.replace('/api', '');
    const healthUrls = [
      `${baseUrl}/api/health`,
      `${baseUrl}/`,
      'https://c-water-bilingsytsme.onrender.com/api/health',
      'https://c-water-bilingsytsme.onrender.com/'
    ];
    
    console.log('Checking backend health at:', healthUrls[0]);

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
