import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token'))
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value && !!token.value)

  // Logowanie
  const login = async (username, password) => {
    isLoading.value = true
    
    try {
      // Sprawdź dostępność Electron API
      if (!window.electronAPI) {
        // Fallback dla przeglądarki - użyj testowych danych
        if (username === 'admin' && password === 'admin123') {
          user.value = {
            id: 1,
            username: 'admin',
            full_name: 'Administrator',
            role: 'admin',
            email: 'admin@serwis.local'
          }
          
          const authToken = btoa(JSON.stringify({ 
            userId: 1, 
            timestamp: Date.now() 
          }))
          
          token.value = authToken
          localStorage.setItem('auth_token', authToken)
          localStorage.setItem('user_data', JSON.stringify(user.value))
          
          return { success: true }
        } else {
          throw new Error('Nieprawidłowa nazwa użytkownika lub hasło')
        }
      }

      // Sprawdź dane w bazie danych (tylko w Electronie)
      const result = await window.electronAPI.database.get(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      )

      if (!result) {
        throw new Error('Nieprawidłowa nazwa użytkownika lub hasło')
      }

      // Sprawdź hasło przez IPC (bcrypt w main process)
      const isPasswordValid = await window.electronAPI.verifyPassword(password, result.password_hash)
      
      if (!isPasswordValid) {
        throw new Error('Nieprawidłowa nazwa użytkownika lub hasło')
      }

      // Ustaw dane użytkownika
      user.value = {
        id: result.id,
        username: result.username,
        full_name: result.full_name,
        role: result.role,
        email: result.email,
        phone: result.phone
      }

      // Wygeneruj prosty token (w produkcji użyj JWT)
      const authToken = btoa(JSON.stringify({ 
        userId: result.id, 
        timestamp: Date.now() 
      }))
      
      token.value = authToken
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('user_data', JSON.stringify(user.value))

      return { success: true }

    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.message || 'Błąd podczas logowania' 
      }
    } finally {
      isLoading.value = false
    }
  }

  // Wylogowanie
  const logout = async () => {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
  }

  // Załaduj dane użytkownika z localStorage
  const loadUser = async () => {
    const savedToken = localStorage.getItem('auth_token')
    const savedUser = localStorage.getItem('user_data')

    if (savedToken && savedUser) {
      try {
        token.value = savedToken
        user.value = JSON.parse(savedUser)
        
        // Sprawdź czy użytkownik nadal istnieje w bazie (tylko w Electronie)
        if (window.electronAPI) {
          const result = await window.electronAPI.database.get(
            'SELECT * FROM users WHERE id = ? AND is_active = 1',
            [user.value.id]
          )

          if (!result) {
            // Użytkownik nie istnieje lub jest nieaktywny
            await logout()
            return false
          }
        }

        return true
      } catch (error) {
        console.error('Error loading user:', error)
        await logout()
        return false
      }
    }

    return false
  }

  // Sprawdź uprawnienia
  const hasPermission = (permission) => {
    if (!user.value) return false
    
    // Admin ma wszystkie uprawnienia
    if (user.value.role === 'admin') return true
    
    // Dodaj logikę uprawnień według potrzeb
    const permissions = {
      'manage_users': ['admin'],
      'manage_settings': ['admin'],
      'view_reports': ['admin', 'manager'],
      'manage_clients': ['admin', 'manager', 'serwisant'],
      'manage_orders': ['admin', 'manager', 'serwisant'],
      'manage_devices': ['admin', 'manager', 'serwisant'],
      'manage_invoices': ['admin', 'manager']
    }

    return permissions[permission]?.includes(user.value.role) || false
  }

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    loadUser,
    hasPermission
  }
}) 