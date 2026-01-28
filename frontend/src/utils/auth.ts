// Token storage keys
const ACCESS_TOKEN_KEY = 'aria_access_token';
const REFRESH_TOKEN_KEY = 'aria_refresh_token';
const TOKEN_EXPIRY_KEY = 'aria_token_expiry';

// Token management
export const setTokens = (accessToken: string, refreshToken: string, expiresIn?: number) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  
  // Set token expiry time (default: 30 minutes from now)
  const expiryTime = Date.now() + (expiresIn || 30 * 60) * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getTokenExpiry = () => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

export const isAuthenticated = () => !!getAccessToken();

// Check if token is expired or about to expire (within 5 minutes)
export const isTokenExpired = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  
  // Consider token expired if less than 5 minutes remaining
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  return Date.now() > expiry - bufferTime;
};

// Check if token needs refresh (within 10 minutes of expiry)
export const shouldRefreshToken = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  
  // Refresh if less than 10 minutes remaining
  const refreshBuffer = 10 * 60 * 1000; // 10 minutes
  return Date.now() > expiry - refreshBuffer;
};

// Refresh token function
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  // If already refreshing, wait for the result
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        resolve(token);
      });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const { access_token, refresh_token, expires_in } = data;

    setTokens(access_token, refresh_token || refreshToken, expires_in);
    onTokenRefreshed(access_token);
    
    return access_token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    clearTokens();
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login?session_expired=true';
    }
    
    return null;
  } finally {
    isRefreshing = false;
  }
};

// Parse JWT token to get payload
export const parseJwt = (token: string): { exp?: number; sub?: string; email?: string; name?: string; role?: string; [key: string]: unknown } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Get user info from token
export const getUserFromToken = () => {
  const token = getAccessToken();
  if (!token) return null;
  
  const payload = parseJwt(token);
  if (!payload) return null;
  
  return {
    id: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string,
    role: payload.role as string,
  };
};
