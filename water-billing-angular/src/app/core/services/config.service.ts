import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  apiUrl: string;
  production: boolean;
  version: string;
  features: {
    enableLogging: boolean;
    enableAnalytics: boolean;
    enableErrorReporting: boolean;
  };
  ui: {
    itemsPerPage: number;
    defaultTheme: string;
    enableAnimations: boolean;
  };
  security: {
    tokenExpiryMinutes: number;
    maxLoginAttempts: number;
    sessionTimeoutMinutes: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: AppConfig = {
    apiUrl: environment.apiUrl,
    production: environment.production,
    version: '1.0.0',
    features: {
      enableLogging: !environment.production,
      enableAnalytics: environment.production,
      enableErrorReporting: environment.production
    },
    ui: {
      itemsPerPage: 10,
      defaultTheme: 'light',
      enableAnimations: true
    },
    security: {
      tokenExpiryMinutes: 30,
      maxLoginAttempts: 5,
      sessionTimeoutMinutes: 60
    }
  };

  get appConfig(): AppConfig {
    return { ...this.config };
  }

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get isProduction(): boolean {
    return this.config.production;
  }

  get version(): string {
    return this.config.version;
  }

  getFeature(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  getUiSetting(setting: keyof AppConfig['ui']): any {
    return this.config.ui[setting];
  }

  getSecuritySetting(setting: keyof AppConfig['security']): number {
    return this.config.security[setting];
  }
}
