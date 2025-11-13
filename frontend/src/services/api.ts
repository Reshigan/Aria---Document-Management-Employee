import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aria_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('aria_refresh_token')
      
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', {
            refresh_token: refreshToken
          })
          
          const { access_token, refresh_token } = response.data
          localStorage.setItem('aria_access_token', access_token)
          localStorage.setItem('aria_refresh_token', refresh_token)
          
          error.config.headers.Authorization = `Bearer ${access_token}`
          return axios.request(error.config)
        } catch (refreshError) {
          localStorage.removeItem('aria_access_token')
          localStorage.removeItem('aria_refresh_token')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('aria_access_token')
        localStorage.removeItem('aria_refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
