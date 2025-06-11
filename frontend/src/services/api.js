import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: '/api/v1', // Używamy proxy Vite zamiast bezpośredniego URL
  timeout: 8000, // Zmniejszone z 10s
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  // Ograniczenie równoczesnych połączeń
  maxRedirects: 3,
  maxContentLength: 50 * 1024 * 1024, // 50MB max
  withCredentials: true // Ważne dla CORS
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add authorization token from localStorage
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Force no cache on every request
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = config.params || {};
      config.params._t = new Date().getTime();
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
      return Promise.reject({
        message: 'Błąd połączenia z serwerem',
        type: 'network'
      })
    }

    // Handle HTTP errors
    const { status, data } = error.response
    
    switch (status) {
      case 400:
        console.error('Bad Request:', data.message)
        break
      case 401:
        console.error('Unauthorized:', data.message)
        // Auto logout on 401
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }
        break
      case 403:
        console.error('Forbidden:', data.message)
        break
      case 404:
        console.error('Not Found:', data.message)
        break
      case 429:
        console.error('Too Many Requests:', data.message)
        break
      case 500:
        console.error('Server Error:', data.message)
        break
      default:
        console.error('HTTP Error:', status, data.message)
    }

    return Promise.reject(error)
  }
)

export { api }
export default api 