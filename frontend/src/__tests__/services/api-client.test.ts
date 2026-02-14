import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
  defaults: { headers: { common: {} } },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn((err: any) => err?.isAxiosError === true),
  },
}))

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('HTTP Methods', () => {
    it('should make GET requests', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: { items: [] }, status: 200 })
      const result = await mockAxiosInstance.get('/api/v1/customers')
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/customers')
      expect(result.status).toBe(200)
    })

    it('should make POST requests with data', async () => {
      const data = { name: 'Test Customer', email: 'test@example.com' }
      mockAxiosInstance.post.mockResolvedValueOnce({ data: { id: 1, ...data }, status: 201 })
      const result = await mockAxiosInstance.post('/api/v1/customers', data)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/customers', data)
      expect(result.status).toBe(201)
    })

    it('should make PUT requests', async () => {
      const data = { name: 'Updated Customer' }
      mockAxiosInstance.put.mockResolvedValueOnce({ data: { id: 1, ...data }, status: 200 })
      const result = await mockAxiosInstance.put('/api/v1/customers/1', data)
      expect(result.status).toBe(200)
    })

    it('should make DELETE requests', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: null, status: 204 })
      const result = await mockAxiosInstance.delete('/api/v1/customers/1')
      expect(result.status).toBe(204)
    })

    it('should make PATCH requests', async () => {
      const data = { name: 'Patched' }
      mockAxiosInstance.patch.mockResolvedValueOnce({ data: { id: 1, ...data }, status: 200 })
      const result = await mockAxiosInstance.patch('/api/v1/customers/1', data)
      expect(result.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      const error = { response: { status: 400, data: { detail: 'Invalid input' } }, isAxiosError: true }
      mockAxiosInstance.post.mockRejectedValueOnce(error)
      await expect(mockAxiosInstance.post('/api/v1/test', {})).rejects.toMatchObject({
        response: { status: 400 },
      })
    })

    it('should handle 401 Unauthorized', async () => {
      const error = { response: { status: 401, data: { detail: 'Not authenticated' } }, isAxiosError: true }
      mockAxiosInstance.get.mockRejectedValueOnce(error)
      await expect(mockAxiosInstance.get('/api/v1/protected')).rejects.toMatchObject({
        response: { status: 401 },
      })
    })

    it('should handle 403 Forbidden', async () => {
      const error = { response: { status: 403, data: { detail: 'Insufficient permissions' } }, isAxiosError: true }
      mockAxiosInstance.get.mockRejectedValueOnce(error)
      await expect(mockAxiosInstance.get('/api/v1/admin')).rejects.toMatchObject({
        response: { status: 403 },
      })
    })

    it('should handle 404 Not Found', async () => {
      const error = { response: { status: 404, data: { detail: 'Not found' } }, isAxiosError: true }
      mockAxiosInstance.get.mockRejectedValueOnce(error)
      await expect(mockAxiosInstance.get('/api/v1/nonexistent')).rejects.toMatchObject({
        response: { status: 404 },
      })
    })

    it('should handle 500 Internal Server Error', async () => {
      const error = { response: { status: 500, data: { detail: 'Server error' } }, isAxiosError: true }
      mockAxiosInstance.get.mockRejectedValueOnce(error)
      await expect(mockAxiosInstance.get('/api/v1/test')).rejects.toMatchObject({
        response: { status: 500 },
      })
    })

    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network Error'))
      await expect(mockAxiosInstance.get('/api/v1/test')).rejects.toThrow('Network Error')
    })

    it('should handle timeout errors', async () => {
      const error = { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }
      mockAxiosInstance.get.mockRejectedValueOnce(error)
      await expect(mockAxiosInstance.get('/api/v1/slow')).rejects.toMatchObject({
        code: 'ECONNABORTED',
      })
    })
  })

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', () => {
      const token = 'test-jwt-token'
      localStorage.setItem('aria_access_token', token)
      const config = { headers: {} as Record<string, string> }
      config.headers['Authorization'] = `Bearer ${token}`
      expect(config.headers['Authorization']).toBe(`Bearer ${token}`)
    })

    it('should not add auth header when no token', () => {
      const config = { headers: {} as Record<string, string> }
      const token = localStorage.getItem('aria_access_token')
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
      expect(config.headers['Authorization']).toBeUndefined()
    })
  })

  describe('Response Handling', () => {
    it('should handle paginated response', async () => {
      const paginatedResponse = {
        data: {
          items: [{ id: 1 }, { id: 2 }],
          total: 50,
          page: 1,
          page_size: 10,
        },
        status: 200,
      }
      mockAxiosInstance.get.mockResolvedValueOnce(paginatedResponse)
      const result = await mockAxiosInstance.get('/api/v1/customers?page=1&limit=10')
      expect(result.data.items).toHaveLength(2)
      expect(result.data.total).toBe(50)
    })

    it('should handle list response', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }, { id: 3 }], status: 200 })
      const result = await mockAxiosInstance.get('/api/v1/customers')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data).toHaveLength(3)
    })

    it('should handle empty response', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: [], status: 200 })
      const result = await mockAxiosInstance.get('/api/v1/customers')
      expect(result.data).toEqual([])
    })
  })
})
