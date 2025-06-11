import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const refreshToken = ref(localStorage.getItem('refreshToken'))
  const isLoading = ref(false)

  // Toast notifications
  const toast = useToast()

  // Computed
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || null)
  const userPermissions = computed(() => user.value?.permissions || {})

  // Actions
  async function login(credentials) {
    try {
      isLoading.value = true
      
      const response = await api.post('/auth/login', credentials)
      
      if (response.data.success) {
        const { user: userData, token: authToken, refreshToken: refToken } = response.data.data
        
        // Store user data and tokens
        user.value = userData
        token.value = authToken
        refreshToken.value = refToken
        
        // Persist to localStorage
        localStorage.setItem('token', authToken)
        localStorage.setItem('refreshToken', refToken)
        localStorage.setItem('user', JSON.stringify(userData))
        
        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
        
        toast.success(`Witaj, ${userData.first_name || userData.username}!`)
        
        return { success: true }
      } else {
        throw new Error(response.data.message || 'Błąd logowania')
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Błąd logowania'
      toast.error(message)
      return { success: false, message }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      // Clear state
      user.value = null
      token.value = null
      refreshToken.value = null
      
      // Clear localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      
      // Remove authorization header
      delete api.defaults.headers.common['Authorization']
      
      toast.info('Zostałeś wylogowany')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  async function refreshAuthToken() {
    try {
      if (!refreshToken.value) {
        throw new Error('Brak refresh token')
      }

      const response = await api.post('/auth/refresh', {
        refreshToken: refreshToken.value
      })

      if (response.data.success) {
        const newToken = response.data.data.token
        token.value = newToken
        localStorage.setItem('token', newToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
        
        return true
      } else {
        throw new Error('Nie udało się odświeżyć tokenu')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
      return false
    }
  }

  async function restoreSession() {
    try {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      const storedRefreshToken = localStorage.getItem('refreshToken')

      if (storedToken && storedUser && storedRefreshToken) {
        token.value = storedToken
        refreshToken.value = storedRefreshToken
        user.value = JSON.parse(storedUser)
        
        // Set authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
        
        // Verify token is still valid by making a test request
        try {
          await api.get('/health')
        } catch (error) {
          if (error.response?.status === 401) {
            // Try to refresh token
            const refreshed = await refreshAuthToken()
            if (!refreshed) {
              await logout()
            }
          }
        }
      } else if (import.meta.env.DEV) {
        // Auto-login in development mode if no session exists
        console.log('🔧 Development mode: attempting auto-login...')
        await developmentAutoLogin()
      }
    } catch (error) {
      console.error('Session restore failed:', error)
      await logout()
    }
  }

  async function developmentAutoLogin() {
    try {
      isLoading.value = true
      
      const response = await api.post('/auth/dev-login')
      
      if (response.data.success) {
        const { user: userData, token: authToken, refreshToken: refToken } = response.data.data
        
        // Store user data and tokens
        user.value = userData
        token.value = authToken
        refreshToken.value = refToken
        
        // Persist to localStorage
        localStorage.setItem('token', authToken)
        localStorage.setItem('refreshToken', refToken)
        localStorage.setItem('user', JSON.stringify(userData))
        
        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
        
        console.log('✅ Development auto-login successful')
        toast.success(`Zalogowano automatycznie: ${userData.first_name || userData.username} (DEV)`)
        
        return { success: true }
      } else {
        throw new Error(response.data.message || 'Development auto-login failed')
      }
    } catch (error) {
      console.error('Development auto-login failed:', error)
      // Don't show error toast for auto-login failures in dev mode
      return { success: false, message: error.message }
    } finally {
      isLoading.value = false
    }
  }

  function hasModulePermission(moduleName, permission) {
    if (!user.value) return false
    
    // Admin has access to everything
    if (user.value.role === 'admin') return true
    
    const modulePermissions = userPermissions.value[moduleName] || []
    return modulePermissions.includes(permission) || modulePermissions.includes('all')
  }

  function hasRole(role) {
    return userRole.value === role
  }

  function hasAnyRole(roles) {
    return roles.includes(userRole.value)
  }

  // Setup axios interceptor for automatic token refresh
  function setupInterceptors() {
    api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          const refreshed = await refreshAuthToken()
          if (refreshed) {
            // Retry original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${token.value}`
            return api(originalRequest)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // Initialize interceptors
  setupInterceptors()

  return {
    // State
    user,
    token,
    refreshToken,
    isLoading,
    
    // Computed
    isAuthenticated,
    userRole,
    userPermissions,
    
    // Actions
    login,
    logout,
    refreshAuthToken,
    restoreSession,
    developmentAutoLogin,
    hasModulePermission,
    hasRole,
    hasAnyRole
  }
}) 