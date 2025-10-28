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
