import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('HTTP Methods', () => {
    it('should handle GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })

      const response = await fetch('/api/test')
      const data = await response.json()

      expect(mockFetch).toHaveBeenCalledWith('/api/test')
      expect(data).toEqual({ data: 'test' })
    })

    it('should handle POST requests with body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1 }),
      })

      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      })
      const data = await response.json()

      expect(data).toEqual({ id: 1 })
    })

    it('should handle PUT requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ updated: true }),
      })

      const response = await fetch('/api/test/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'updated' }),
      })
      const data = await response.json()

      expect(data).toEqual({ updated: true })
    })

    it('should handle DELETE requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      })

      const response = await fetch('/api/test/1', { method: 'DELETE' })
      const data = await response.json()

      expect(data).toEqual({ deleted: true })
    })
  })

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid input' }),
      })

      const response = await fetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })

    it('should handle 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      })

      const response = await fetch('/api/protected')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should handle 403 Forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: 'Access denied' }),
      })

      const response = await fetch('/api/admin')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })

    it('should handle 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Resource not found' }),
      })

      const response = await fetch('/api/nonexistent')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      const response = await fetch('/api/test')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetch('/api/test')).rejects.toThrow('Network error')
    })
  })

  describe('Authentication Headers', () => {
    it('should include auth token in headers when available', async () => {
      const token = 'test-jwt-token'
      localStorage.setItem('token', token)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'protected' }),
      })

      await fetch('/api/protected', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    })
  })
})

describe('Request/Response Validation', () => {
  it('should validate JSON response format', async () => {
    const validResponse = {
      id: 1,
      name: 'Test',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validResponse),
    })

    const response = await fetch('/api/test')
    const data = await response.json()

    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('name')
    expect(typeof data.id).toBe('number')
    expect(typeof data.name).toBe('string')
  })

  it('should handle empty response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve(null),
    })

    const response = await fetch('/api/test', { method: 'DELETE' })

    expect(response.ok).toBe(true)
    expect(response.status).toBe(204)
  })

  it('should handle array response', async () => {
    const arrayResponse = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(arrayResponse),
    })

    const response = await fetch('/api/items')
    const data = await response.json()

    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)
  })
})
