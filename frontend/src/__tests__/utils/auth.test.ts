import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setTokens,
  getAccessToken,
  getRefreshToken,
  getTokenExpiry,
  clearTokens,
  isAuthenticated,
  isTokenExpired,
  shouldRefreshToken,
  parseJwt,
  getUserFromToken,
} from '../../utils/auth'

describe('Token Management', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('setTokens', () => {
    it('should store access and refresh tokens', () => {
      setTokens('access123', 'refresh456')
      expect(localStorage.getItem('aria_access_token')).toBe('access123')
      expect(localStorage.getItem('aria_refresh_token')).toBe('refresh456')
    })

    it('should set expiry time', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
      setTokens('access', 'refresh', 1800)
      const expiry = localStorage.getItem('aria_token_expiry')
      expect(expiry).toBeDefined()
      expect(parseInt(expiry!)).toBe(Date.now() + 1800 * 1000)
    })

    it('should default to 30 minute expiry', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
      setTokens('access', 'refresh')
      const expiry = parseInt(localStorage.getItem('aria_token_expiry')!)
      expect(expiry).toBe(Date.now() + 30 * 60 * 1000)
    })
  })

  describe('getAccessToken', () => {
    it('should return stored access token', () => {
      localStorage.setItem('aria_access_token', 'mytoken')
      expect(getAccessToken()).toBe('mytoken')
    })

    it('should return null when no token', () => {
      expect(getAccessToken()).toBeNull()
    })
  })

  describe('getRefreshToken', () => {
    it('should return stored refresh token', () => {
      localStorage.setItem('aria_refresh_token', 'myrefresh')
      expect(getRefreshToken()).toBe('myrefresh')
    })

    it('should return null when no token', () => {
      expect(getRefreshToken()).toBeNull()
    })
  })

  describe('getTokenExpiry', () => {
    it('should return parsed expiry timestamp', () => {
      localStorage.setItem('aria_token_expiry', '1704067200000')
      expect(getTokenExpiry()).toBe(1704067200000)
    })

    it('should return null when no expiry set', () => {
      expect(getTokenExpiry()).toBeNull()
    })
  })

  describe('clearTokens', () => {
    it('should remove all auth tokens from localStorage', () => {
      localStorage.setItem('aria_access_token', 'token')
      localStorage.setItem('aria_refresh_token', 'refresh')
      localStorage.setItem('aria_token_expiry', '12345')
      clearTokens()
      expect(localStorage.getItem('aria_access_token')).toBeNull()
      expect(localStorage.getItem('aria_refresh_token')).toBeNull()
      expect(localStorage.getItem('aria_token_expiry')).toBeNull()
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('aria_access_token', 'token')
      expect(isAuthenticated()).toBe(true)
    })

    it('should return false when no access token', () => {
      expect(isAuthenticated()).toBe(false)
    })
  })

  describe('isTokenExpired', () => {
    it('should return true when no expiry set', () => {
      expect(isTokenExpired()).toBe(true)
    })

    it('should return true when token is expired', () => {
      vi.setSystemTime(new Date('2024-01-01T01:00:00Z'))
      localStorage.setItem('aria_token_expiry', new Date('2024-01-01T00:00:00Z').getTime().toString())
      expect(isTokenExpired()).toBe(true)
    })

    it('should return true within 5 minute buffer', () => {
      vi.setSystemTime(new Date('2024-01-01T00:57:00Z'))
      localStorage.setItem('aria_token_expiry', new Date('2024-01-01T01:00:00Z').getTime().toString())
      expect(isTokenExpired()).toBe(true)
    })

    it('should return false when token has time remaining', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
      localStorage.setItem('aria_token_expiry', new Date('2024-01-01T01:00:00Z').getTime().toString())
      expect(isTokenExpired()).toBe(false)
    })
  })

  describe('shouldRefreshToken', () => {
    it('should return false when no expiry', () => {
      expect(shouldRefreshToken()).toBe(false)
    })

    it('should return true within 10 minute refresh window', () => {
      vi.setSystemTime(new Date('2024-01-01T00:52:00Z'))
      localStorage.setItem('aria_token_expiry', new Date('2024-01-01T01:00:00Z').getTime().toString())
      expect(shouldRefreshToken()).toBe(true)
    })

    it('should return false when well before expiry', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
      localStorage.setItem('aria_token_expiry', new Date('2024-01-01T01:00:00Z').getTime().toString())
      expect(shouldRefreshToken()).toBe(false)
    })
  })
})

describe('parseJwt', () => {
  it('should parse valid JWT payload', () => {
    const payload = { sub: 'user-123', email: 'test@test.com', role: 'admin', exp: 9999999999 }
    const encoded = btoa(JSON.stringify(payload))
    const token = `header.${encoded}.signature`
    const result = parseJwt(token)
    expect(result).toEqual(payload)
  })

  it('should return null for invalid token', () => {
    expect(parseJwt('invalid')).toBeNull()
    expect(parseJwt('')).toBeNull()
  })

  it('should return null for malformed base64', () => {
    expect(parseJwt('a.!!!.c')).toBeNull()
  })
})

describe('getUserFromToken', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return null when no token', () => {
    expect(getUserFromToken()).toBeNull()
  })

  it('should extract user info from valid token', () => {
    const payload = { sub: 'user-123', email: 'test@test.com', name: 'Test User', role: 'admin' }
    const encoded = btoa(JSON.stringify(payload))
    const token = `header.${encoded}.signature`
    localStorage.setItem('aria_access_token', token)
    const user = getUserFromToken()
    expect(user).toEqual({
      id: 'user-123',
      email: 'test@test.com',
      name: 'Test User',
      role: 'admin',
    })
  })

  it('should return null for invalid stored token', () => {
    localStorage.setItem('aria_access_token', 'invalid-token')
    expect(getUserFromToken()).toBeNull()
  })
})
