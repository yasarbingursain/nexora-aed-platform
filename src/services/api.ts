import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ApiResponse, ApiError, AuthTokens } from '@/types/api.types'
import { toast } from 'react-hot-toast'

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// SSRF protection - allowed domains
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, ''),
].filter(Boolean)

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// CSRF token management
let csrfToken: string | null = null

const getCsrfToken = async (): Promise<string> => {
  if (!csrfToken) {
    try {
      const response = await axios.get('/api/csrf-token')
      csrfToken = response.data.token
    } catch (error) {
      console.error('Failed to get CSRF token:', error)
      throw new Error('Failed to get CSRF token')
    }
  }
  return csrfToken || ''
}

// SSRF protection
const isUrlSafe = (url: string): boolean => {
  try {
    const urlObj = new URL(url, window.location.origin)
    
    // Block private IP ranges
    const hostname = urlObj.hostname
    const privateIpRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ]
    
    if (privateIpRanges.some(range => range.test(hostname))) {
      return false
    }
    
    // Only allow specific domains
    return ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

// Rate limiting
const checkRateLimit = (endpoint: string): boolean => {
  const now = Date.now()
  const key = endpoint
  const current = requestCounts.get(key)
  
  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  current.count++
  return true
}

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // SSRF protection
    if (config.url && !isUrlSafe(config.url)) {
      throw new Error('URL not allowed for security reasons')
    }
    
    // Rate limiting
    const endpoint = config.url || ''
    if (!checkRateLimit(endpoint)) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    
    // Add auth token
    const tokens = getStoredTokens()
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`
    }
    
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      try {
        const csrf = await getCsrfToken()
        config.headers['X-CSRF-Token'] = csrf
      } catch (error) {
        console.warn('Failed to add CSRF token:', error)
      }
    }
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID()
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const tokens = getStoredTokens()
        if (tokens?.refreshToken) {
          const newTokens = await refreshTokens(tokens.refreshToken)
          storeTokens(newTokens)
          
          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
          }
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    // Handle other errors
    const apiError: ApiError = error.response?.data || {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      requestId: error.config?.headers?.['X-Request-ID'] || '',
      path: error.config?.url || '',
    }
    
    // Show user-friendly error messages
    if (error.response?.status !== 401) {
      toast.error(getErrorMessage(apiError))
    }
    
    return Promise.reject(apiError)
  }
)

// Token management
const TOKEN_STORAGE_KEY = 'nexora_tokens'

export const storeTokens = (tokens: AuthTokens): void => {
  try {
    const encrypted = btoa(JSON.stringify(tokens))
    localStorage.setItem(TOKEN_STORAGE_KEY, encrypted)
  } catch (error) {
    console.error('Failed to store tokens:', error)
  }
}

export const getStoredTokens = (): AuthTokens | null => {
  try {
    const encrypted = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!encrypted) return null
    
    const tokens = JSON.parse(atob(encrypted)) as AuthTokens
    
    // Check if token is expired
    if (Date.now() >= tokens.expiresAt) {
      clearTokens()
      return null
    }
    
    return tokens
  } catch (error) {
    console.error('Failed to get stored tokens:', error)
    clearTokens()
    return null
  }
}

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  csrfToken = null
}

// Refresh tokens
const refreshTokens = async (refreshToken: string): Promise<AuthTokens> => {
  const response = await axios.post('/api/auth/refresh', {
    refreshToken,
  })
  return response.data.data
}

// Error message mapping
const getErrorMessage = (error: ApiError): string => {
  const errorMessages: Record<string, string> = {
    'INVALID_CREDENTIALS': 'Invalid email or password',
    'ACCOUNT_LOCKED': 'Account is locked. Please contact support.',
    'MFA_REQUIRED': 'Multi-factor authentication required',
    'INVALID_MFA_CODE': 'Invalid MFA code',
    'TOKEN_EXPIRED': 'Session expired. Please log in again.',
    'INSUFFICIENT_PERMISSIONS': 'You do not have permission to perform this action',
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
    'VALIDATION_ERROR': 'Please check your input and try again',
    'RESOURCE_NOT_FOUND': 'The requested resource was not found',
    'CONFLICT': 'A conflict occurred. Please refresh and try again.',
    'SERVER_ERROR': 'A server error occurred. Please try again later.',
  }
  
  return errorMessages[error.code] || error.message || 'An unexpected error occurred'
}

// Request wrapper with error handling
export const apiRequest = async <T = any>(
  config: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await api(config)
    return response.data.data
  } catch (error) {
    throw error
  }
}

// Convenience methods
export const apiGet = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>({ method: 'GET', url, ...config })

export const apiPost = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => apiRequest<T>({ method: 'POST', url, data, ...config })

export const apiPut = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => apiRequest<T>({ method: 'PUT', url, data, ...config })

export const apiPatch = <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => apiRequest<T>({ method: 'PATCH', url, data, ...config })

export const apiDelete = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>({ method: 'DELETE', url, ...config })

export default api
