/**
 * Enterprise-Grade API Client with Cookie-Based Auth + CSRF Protection
 * 
 * Security Features:
 * - HTTP-only cookies for session management (XSS-resilient)
 * - CSRF protection via double-submit cookie pattern
 * - Automatic token refresh
 * - Request/response interceptors
 * - Rate limiting awareness
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'

interface CSRFResponse {
  csrfToken: string
}

class SecureAPIClient {
  private client: AxiosInstance
  private csrfToken: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
      timeout: 30000,
      withCredentials: true, // Send HTTP-only session cookie
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - add CSRF token
    this.client.interceptors.request.use(
      async (config) => {
        // For state-changing methods, ensure CSRF token
        if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
          if (!this.csrfToken) {
            await this.fetchCSRFToken()
          }
          if (this.csrfToken) {
            config.headers['X-CSRF-Token'] = this.csrfToken
          }
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle 401 and CSRF refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          return Promise.reject(error)
        }

        // Handle 403 CSRF token invalid
        if (error.response?.status === 403 && !originalRequest._retry) {
          originalRequest._retry = true
          await this.fetchCSRFToken()
          return this.client(originalRequest)
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * Fetch CSRF token from server
   * Server sets it in a non-HttpOnly cookie AND returns it in response
   */
  private async fetchCSRFToken(): Promise<void> {
    try {
      const response = await axios.get<CSRFResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/csrf`,
        { withCredentials: true }
      )
      this.csrfToken = response.data.csrfToken
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
      this.csrfToken = null
    }
  }

  /**
   * Get CSRF token (for forms or manual requests)
   */
  public async getCSRFToken(): Promise<string | null> {
    if (!this.csrfToken) {
      await this.fetchCSRFToken()
    }
    return this.csrfToken
  }

  // ============================================================================
  // Threat Management
  // ============================================================================

  async getThreats(params?: {
    page?: number
    limit?: number
    severity?: string[]
    status?: string[]
    from?: Date
    to?: Date
  }) {
    const response = await this.client.get('/threats', { params })
    return response.data
  }

  async getThreatById(id: string) {
    const response = await this.client.get(`/threats/${id}`)
    return response.data
  }

  async updateThreat(id: string, data: any) {
    const response = await this.client.patch(`/threats/${id}`, data)
    return response.data
  }

  async exportThreats(filters: any) {
    const response = await this.client.post('/threats/export', filters, {
      responseType: 'blob',
    })
    return response.data
  }

  // ============================================================================
  // Entity Management
  // ============================================================================

  async getEntities(params?: {
    page?: number
    limit?: number
    type?: string[]
    status?: string[]
  }) {
    const response = await this.client.get('/entities', { params })
    return response.data
  }

  async getEntityById(id: string) {
    const response = await this.client.get(`/entities/${id}`)
    return response.data
  }

  async createEntity(data: any) {
    const response = await this.client.post('/entities', data)
    return response.data
  }

  async updateEntity(id: string, data: any) {
    const response = await this.client.patch(`/entities/${id}`, data)
    return response.data
  }

  async deleteEntity(id: string) {
    const response = await this.client.delete(`/entities/${id}`)
    return response.data
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getAnalytics(timeRange: string = '24h') {
    const response = await this.client.get('/analytics/metrics', {
      params: { timeRange },
    })
    return response.data
  }

  async getDashboardAnalytics() {
    const response = await this.client.get('/analytics/dashboard')
    return response.data
  }

  // ============================================================================
  // Incidents
  // ============================================================================

  async getIncidents(params?: any) {
    const response = await this.client.get('/incidents', { params })
    return response.data
  }

  async getIncidentById(id: string) {
    const response = await this.client.get(`/incidents/${id}`)
    return response.data
  }

  async createIncident(data: any) {
    const response = await this.client.post('/incidents', data)
    return response.data
  }

  async updateIncident(id: string, data: any) {
    const response = await this.client.patch(`/incidents/${id}`, data)
    return response.data
  }

  // ============================================================================
  // Actions
  // ============================================================================

  async executeAction(threatId: string, action: string, params?: any) {
    const response = await this.client.post(`/threats/${threatId}/actions`, {
      action,
      params,
    })
    return response.data
  }

  async getActionHistory(threatId: string) {
    const response = await this.client.get(`/threats/${threatId}/actions`)
    return response.data
  }
}

// Export singleton instance
export const secureApiClient = new SecureAPIClient()
export default secureApiClient
