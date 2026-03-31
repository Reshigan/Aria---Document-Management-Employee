import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  company_id: string
  company_name?: string
  role?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const data = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token')
    set({ isAuthenticated: !!token })
  },
}))
