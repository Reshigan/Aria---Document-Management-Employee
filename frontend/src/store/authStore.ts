/**
 * Auth Store - Zustand state management
 */
import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  full_name: string;
  organization_id: number;
  organization_name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('access_token') || localStorage.getItem('token'),
  isAuthenticated: !!(localStorage.getItem('access_token') || localStorage.getItem('token')),
  
  login: (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token'); // Remove old key for cleanup
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },
  
  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null
  })),
}));
