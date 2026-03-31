const API_URL = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api'

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token')
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options
    const token = this.getToken()

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    }

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config)

    if (response.status === 401) {
      const hadToken = this.getToken()
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      if (hadToken && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.message || `API Error: ${response.status}`)
    }

    if (response.status === 204) return {} as T
    return response.json()
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint)
  }

  async getList<T>(endpoint: string): Promise<T[]> {
    const res = await this.request<unknown>(endpoint)
    if (Array.isArray(res)) return res as T[]
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>
      const arrayKey = Object.keys(obj).find(k => Array.isArray(obj[k]))
      if (arrayKey) return obj[arrayKey] as T[]
    }
    return []
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body })
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient(API_URL)
export default api
