import axios from 'axios'

// Tworzymy instancję axios z domyślną konfiguracją
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 5000, // timeout zgodny z PG_CONNECTION_TIMEOUT
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor dla requestów - dodaje token autoryzacji
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor dla odpowiedzi - obsługa błędów
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Obsługa błędów autoryzacji
      if (error.response.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/auth/login'
      }
      
      // Obsługa błędów walidacji
      if (error.response.status === 422) {
        return Promise.reject({
          message: 'Błąd walidacji danych',
          errors: error.response.data.errors
        })
      }

      // Obsługa błędów bazy danych
      if (error.response.status === 500) {
        const errorMessage = error.response.data.message || 'Wystąpił błąd serwera'
        if (errorMessage.includes('connection')) {
          return Promise.reject({
            message: 'Problem z połączeniem z bazą danych. Spróbuj ponownie za chwilę.'
          })
        }
      }

      return Promise.reject({
        message: error.response.data.message || 'Wystąpił błąd',
        status: error.response.status
      })
    }

    // Obsługa błędów sieci
    if (error.request) {
      return Promise.reject({
        message: 'Nie można połączyć się z serwerem. Sprawdź połączenie z internetem.'
      })
    }

    return Promise.reject(error)
  }
) 