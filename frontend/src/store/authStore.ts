import { create } from 'zustand'
import api from '../services/api'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types'

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    const response = await api.post<AuthResponse>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
    
    localStorage.setItem('access_token', response.data.access_token)
    localStorage.setItem('refresh_token', response.data.refresh_token)
    set({ user: response.data.user, isAuthenticated: true })
  },

  register: async (data) => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    localStorage.setItem('access_token', response.data.access_token)
    localStorage.setItem('refresh_token', response.data.refresh_token)
    set({ user: response.data.user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ isLoading: false })
      return
    }
    
    try {
      const response = await api.get<User>('/auth/me')
      set({ user: response.data, isAuthenticated: true, isLoading: false })
    } catch (error) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
