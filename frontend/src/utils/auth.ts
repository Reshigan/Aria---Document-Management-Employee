export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('aria_access_token', accessToken);
  localStorage.setItem('aria_refresh_token', refreshToken);
};

export const getAccessToken = () => localStorage.getItem('aria_access_token');
export const getRefreshToken = () => localStorage.getItem('aria_refresh_token');

export const clearTokens = () => {
  localStorage.removeItem('aria_access_token');
  localStorage.removeItem('aria_refresh_token');
};

export const isAuthenticated = () => !!getAccessToken();

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
