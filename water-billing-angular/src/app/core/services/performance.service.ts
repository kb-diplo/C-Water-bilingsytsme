import { Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  private metrics: Map<string, PerformanceMetric> = new Map();

  constructor(private logger: LoggerService) {}

  startMeasurement(name: string): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now()
    };
    this.metrics.set(name, metric);
  }

  endMeasurement(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      this.logger.warn(`Performance metric '${name}' not found`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.logger.debug(`Performance: ${name} took ${metric.duration.toFixed(2)}ms`);
    
    // Log slow operations
    if (metric.duration > 1000) {
      this.logger.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`);
    }

    this.metrics.delete(name);
    return metric.duration;
  }

  measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return operation().finally(() => {
      this.endMeasurement(name);
    });
  }

  measureSync<T>(name: string, operation: () => T): T {
    this.startMeasurement(name);
    try {
      return operation();
    } finally {
      this.endMeasurement(name);
    }
  }

  getMemoryUsage(): any {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  logMemoryUsage(): void {
    const memory = this.getMemoryUsage();
    if (memory) {
      this.logger.debug('Memory Usage', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });
    }
  }
}
