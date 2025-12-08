<template>
  <div id="app" class="h-screen flex flex-col">
    <!-- Blank layout dla logowania -->
    <template v-if="$route.meta.layout === 'blank'">
      <router-view />
    </template>
    
    <!-- Główny layout aplikacji -->
    <template v-else>
      <!-- Górne menu -->
      <header class="bg-white shadow-sm border-b border-secondary-200 z-10">
        <div class="px-6 py-4">
          <div class="flex flex-wrap items-center justify-between gap-4 lg:flex-nowrap lg:gap-6">
            <!-- Logo i tytuł -->
            <div class="flex items-center space-x-4 order-1">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">S</span>
              </div>
              <h1 class="text-xl font-semibold text-secondary-900">System Serwisowy</h1>
            </div>
            
            <!-- Górne menu nawigacji -->
            <nav class="hidden md:flex md:flex-wrap md:gap-x-6 md:gap-y-3 md:w-full lg:w-auto order-3 md:order-2 mt-4 md:mt-0">
              <router-link
                v-for="item in mainMenuItems"
                :key="item.name"
                :to="item.path"
                class="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="[
                  $route.path.startsWith(item.path) && item.path !== '/' ? 'bg-primary-100 text-primary-700' : 
                  $route.path === item.path ? 'bg-primary-100 text-primary-700' :
                  item.isSpecial ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200' :
                  'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-50'
                ]"
              >
                <i :class="[item.icon, item.isSpecial ? 'text-blue-600' : '']" class="w-4 h-4"></i>
                <span>{{ item.label }}</span>
                <i v-if="item.isSpecial" class="fas fa-star text-xs text-blue-400 ml-1"></i>
              </router-link>
            </nav>
            
            <!-- Prawe menu -->
            <div class="flex items-center space-x-4 order-2 md:order-3 ml-auto md:ml-0">
              <!-- Powiadomienia -->
              <button class="relative p-2 text-secondary-400 hover:text-secondary-600">
                <i class="fas fa-bell w-5 h-5"></i>
                <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <!-- Profil użytkownika -->
              <div class="relative" ref="userMenuRef">
                <button 
                  @click="showUserMenu = !showUserMenu"
                  class="flex items-center space-x-2 p-2 text-secondary-700 hover:text-secondary-900"
                >
                  <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span class="text-primary-600 font-medium text-sm">
                      {{ user?.full_name?.charAt(0) || 'U' }}
                    </span>
                  </div>
                  <span class="hidden md:block text-sm font-medium">{{ user?.full_name || 'Użytkownik' }}</span>
                  <i class="fas fa-chevron-down w-3 h-3"></i>
                </button>
                
                <!-- Dropdown menu -->
                <transition name="fade">
                  <div v-if="showUserMenu" class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-secondary-200 py-1 z-20">
                    <a href="#" @click.prevent="showUserMenu = false" class="block px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50">
                      <i class="fas fa-user w-4 h-4 mr-2"></i>
                      Mój profil
                    </a>
                    <router-link to="/settings" @click="showUserMenu = false" class="block px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50">
                      <i class="fas fa-cog w-4 h-4 mr-2"></i>
                      Ustawienia
                    </router-link>
                    <hr class="my-1 border-secondary-200">
                    <a href="#" @click="logout" class="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <i class="fas fa-sign-out-alt w-4 h-4 mr-2"></i>
                      Wyloguj
                    </a>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <!-- Główna zawartość -->
      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const showUserMenu = ref(false)
const userMenuRef = ref(null)

const user = computed(() => authStore.user)

const mainMenuItems = computed(() => {
  const baseItems = [
    { name: 'dashboard', path: '/', label: 'Panel główny', icon: 'fas fa-home' },
    { name: 'clients', path: '/clients', label: 'Klienci', icon: 'fas fa-users' },
    { name: 'devices', path: '/devices', label: 'Urządzenia', icon: 'fas fa-tools' },
    { name: 'orders', path: '/orders', label: 'Zlecenia', icon: 'fas fa-clipboard-list' },
    { name: 'spare-parts', path: '/spare-parts', label: 'Części', icon: 'fas fa-puzzle-piece' },
    { name: 'invoices', path: '/invoices', label: 'Faktury', icon: 'fas fa-file-invoice' },
    { name: 'calendar', path: '/calendar', label: 'Kalendarz', icon: 'fas fa-calendar' },
    { name: 'reports', path: '/reports', label: 'Raporty', icon: 'fas fa-chart-bar' },
    { name: 'map', path: '/map', label: 'Mapa', icon: 'fas fa-map-marked-alt' },
    { name: 'protocols', path: '/protocols', label: 'Protokóły', icon: 'fas fa-file-signature' },
    { name: 'work-cards', path: '/work-cards', label: 'Karty pracy', icon: 'fas fa-clipboard-check' },
    { name: 'inventory-check', path: '/inventory-check', label: 'Inwentura', icon: 'fas fa-clipboard-list' }
  ]
  
  // Dodaj monitor mobilny tylko dla adminów
  if (user.value?.role === 'admin') {
    baseItems.push({
      name: 'mobile-monitor', 
      path: '/mobile-monitor', 
      label: 'Monitor Mobilny', 
      icon: 'fas fa-mobile-alt',
      isSpecial: true
    })
    
    // Dodaj zarządzanie kategoriami usług tylko dla adminów
    baseItems.push({
      name: 'service-categories', 
      path: '/service-categories', 
      label: 'Kategorie Usług', 
      icon: 'fas fa-tags',
      isSpecial: true
    })
    
    // Dodaj zarządzanie kategoriami części tylko dla adminów
    baseItems.push({
      name: 'part-categories',
      path: '/part-categories',
      label: 'Kategorie części',
      icon: 'fas fa-boxes-stacked',
      isSpecial: true
    })
    baseItems.push({
      name: 'website-content',
      path: '/website-content',
      label: 'Strona WWW',
      icon: 'fas fa-globe',
      isSpecial: true
    })
  }
  
  return baseItems
})

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

// Zamknij menu użytkownika po kliknięciu poza nim
const handleClickOutside = (event) => {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target)) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style> 