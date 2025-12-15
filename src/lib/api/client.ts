/**
 * Nexora API Client
 * Centralized HTTP client for backend API communication
 */

import secureApiClient from './secure-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export class APIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Facade used by legacy hooks (analytics, entities, threats)
export const api = {
  analytics: {
    metrics: ({ from, to }: { from: Date; to: Date }) => {
      // secureApiClient currently supports timeRange; map dates to a string range
      const timeRange = '24h';
      return secureApiClient.getAnalytics(timeRange as any);
    },
    dashboard: () => secureApiClient.getDashboardAnalytics(),
  },
  entities: {
    list: (params?: { type?: string; risk_threshold?: number }) =>
      secureApiClient.getEntities(params as any),
    get: (id: string) => secureApiClient.getEntityById(id),
    baseline: (id: string) => secureApiClient.getEntityById(id),
    create: (data: any) => secureApiClient.createEntity(data),
    update: (id: string, data: any) => secureApiClient.updateEntity(id, data),
    delete: (id: string) => secureApiClient.deleteEntity(id),
  },
  threats: {
    list: (filters?: any) => secureApiClient.getThreats(filters),
    get: (id: string) => secureApiClient.getThreatById(id),
    update: (id: string, data: any) => secureApiClient.updateThreat(id, data),
    timeline: (id: string) => secureApiClient.getActionHistory(id),
    export: (filters?: any) => secureApiClient.exportThreats(filters),
  },
};
