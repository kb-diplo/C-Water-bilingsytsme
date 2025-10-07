import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cacheSubjects = new Map<string, BehaviorSubject<any>>();
  
  // Default cache duration: 5 minutes
  private defaultCacheDuration = 5 * 60 * 1000;

  constructor() {}

  /**
   * Get data from cache or execute the provided function
   */
  get<T>(key: string, fetchFn: () => Observable<T>, cacheDuration?: number): Observable<T> {
    const now = Date.now();
    const duration = cacheDuration || this.defaultCacheDuration;
    
    // Check if we have valid cached data
    const cached = this.cache.get(key);
    if (cached && now < cached.expiry) {
      console.log(`Cache hit for key: ${key}`);
      return of(cached.data);
    }

    // Check if we already have a subject for this key (prevents duplicate requests)
    let subject = this.cacheSubjects.get(key);
    if (subject) {
      console.log(`Using existing subject for key: ${key}`);
      return subject.asObservable();
    }

    console.log(`Cache miss for key: ${key}, fetching fresh data`);
    
    // Create new subject and fetch data
    subject = new BehaviorSubject<T>(null as any);
    this.cacheSubjects.set(key, subject);

    fetchFn().pipe(
      tap(data => {
        // Cache the data
        this.cache.set(key, {
          data,
          timestamp: now,
          expiry: now + duration
        });
        
        // Update subject
        subject!.next(data);
        
        // Clean up subject after a short delay
        setTimeout(() => {
          this.cacheSubjects.delete(key);
        }, 1000);
      }),
      shareReplay(1)
    ).subscribe({
      next: (data) => {
        // Data is already handled in tap
      },
      error: (error) => {
        console.error(`Error fetching data for key ${key}:`, error);
        subject!.error(error);
        this.cacheSubjects.delete(key);
      }
    });

    return subject.asObservable();
  }

  /**
   * Set data in cache manually
   */
  set<T>(key: string, data: T, cacheDuration?: number): void {
    const now = Date.now();
    const duration = cacheDuration || this.defaultCacheDuration;
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + duration
    });
    
    console.log(`Data cached for key: ${key}`);
  }

  /**
   * Remove specific item from cache
   */
  remove(key: string): void {
    this.cache.delete(key);
    this.cacheSubjects.delete(key);
    console.log(`Cache cleared for key: ${key}`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheSubjects.clear();
    console.log('All cache cleared');
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    if (now >= cached.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now >= entry.expiry) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.cacheSubjects.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }
}
