'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { User, LoginCredentials, RegisterData } from '@/types';
import { message } from 'antd';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await authAPI.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      console.log('[LOGIN] Step 1: Calling authAPI.login...');
      const loginResponse = await authAPI.login(credentials.email, credentials.password);
      console.log('[LOGIN] Step 2: Login response received:', loginResponse);
      localStorage.setItem('token', loginResponse.access_token);
      const tokenCheck = localStorage.getItem('token');
      console.log('[LOGIN] Step 3: Token stored. Verification check:', tokenCheck ? `Token length: ${tokenCheck.length}` : 'TOKEN NOT FOUND!');
      console.log('[LOGIN] Step 3.5: Calling getCurrentUser...');
      const userData = await authAPI.getCurrentUser();
      console.log('[LOGIN] Step 4: User data received:', userData);
      setUser(userData);
      console.log('[LOGIN] Step 5: User state set, showing success message...');
      message.success('Login successful!');
      console.log('[LOGIN] Step 6: Navigating to dashboard...');
      router.push('/dashboard');
      console.log('[LOGIN] Step 7: Login complete!');
    } catch (error: any) {
      console.error('[LOGIN ERROR] Failed at some step:', error);
      console.error('[LOGIN ERROR] Error details:', error.response?.data);
      message.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      await authAPI.register(data.email, data.password, data.full_name || '');
      message.success('Registration successful! Please login.');
      router.push('/login');
    } catch (error: any) {
      console.error('Registration failed:', error);
      message.error(error.response?.data?.detail || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    message.info('Logged out successfully');
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
