<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Desktop Sidebar -->
    <div class="hidden md:flex md:flex-shrink-0">
      <div class="flex flex-col w-64">
        <div class="flex flex-col flex-grow bg-gray-800 overflow-y-auto">
          <!-- Logo -->
          <div class="flex items-center flex-shrink-0 px-6 py-6 bg-gray-900">
            <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <Settings class="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 class="text-white font-bold text-lg">System Serwisowy</h1>
              <p class="text-gray-400 text-xs">Palniki & Kotły</p>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 px-4 py-6 space-y-2">
            <!-- Dashboard -->
            <router-link
              to="/"
              class="group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
              :class="$route.path === '/' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
            >
              <Home class="mr-3 h-5 w-5" />
              Dashboard
            </router-link>

            <!-- Main modules -->
            <div class="space-y-1">
              <div class="px-3 py-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Moduły
                </h3>
              </div>
              
              <router-link
                v-for="module in availableModules"
                :key="module.name"
                :to="{ name: module.route }"
                class="group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
                :class="$route.meta.module === module.name ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                <component :is="module.icon" class="mr-3 h-5 w-5" />
                {{ module.title }}
                <span v-if="module.badge" class="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {{ module.badge }}
                </span>
              </router-link>
            </div>

            <!-- System section -->
            <div class="space-y-1 pt-6">
              <div class="px-3 py-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  System
                </h3>
              </div>
              
              <router-link
                to="/settings"
                class="group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
                :class="$route.path.startsWith('/settings') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                <Cog class="mr-3 h-5 w-5" />
                Ustawienia
              </router-link>
              
              <router-link
                to="/help"
                class="group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
                :class="$route.path.startsWith('/help') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                <HelpCircle class="mr-3 h-5 w-5" />
                Pomoc
              </router-link>
            </div>
          </nav>

          <!-- User info -->
          <div class="flex-shrink-0 bg-gray-900 p-4">
            <div class="flex items-center">
              <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User class="w-5 h-5 text-white" />
              </div>
              <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-white">
                  {{ user?.first_name || user?.username }}
                </p>
                <p class="text-xs text-gray-400">{{ roleLabel }}</p>
              </div>
              <button
                @click="handleLogout"
                class="ml-3 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-200"
                title="Wyloguj"
              >
                <LogOut class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Mobile header -->
      <div class="md:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <button
              @click="showMobileMenu = !showMobileMenu"
              class="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <Menu class="w-6 h-6" />
            </button>
            <h1 class="ml-3 text-lg font-semibold text-gray-900">System Serwisowy</h1>
          </div>
          <button
            @click="handleLogout"
            class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <LogOut class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>

      <!-- Mobile navigation -->
      <MobileNavigation class="md:hidden" />
    </div>

    <!-- Mobile menu overlay -->
    <div
      v-if="showMobileMenu"
      class="fixed inset-0 z-50 md:hidden"
      @click="showMobileMenu = false"
    >
      <div class="fixed inset-0 bg-black bg-opacity-50"></div>
      <div class="fixed inset-y-0 left-0 w-64 bg-gray-800 shadow-xl">
        <div class="flex flex-col h-full">
          <!-- Mobile logo -->
          <div class="flex items-center flex-shrink-0 px-6 py-6 bg-gray-900">
            <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <Settings class="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 class="text-white font-bold">System Serwisowy</h1>
              <p class="text-gray-400 text-xs">Palniki & Kotły</p>
            </div>
          </div>

          <!-- Mobile navigation -->
          <nav class="flex-1 px-4 py-6 space-y-2">
            <router-link
              to="/"
              @click="showMobileMenu = false"
              class="group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
              :class="$route.path === '/' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
            >
              <Home class="mr-3 h-5 w-5" />
              Pulpit
            </router-link>

            <div class="space-y-1">
              <div class="px-3 py-2">
                <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Moduły
                </h3>
              </div>
              
              <router-link
                v-for="module in availableModules"
                :key="module.name"
                :to="{ name: module.route }"
                @click="showMobileMenu = false"
                class="group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200"
                :class="$route.meta.module === module.name ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'"
              >
                <component :is="module.icon" class="mr-3 h-5 w-5" />
                {{ module.title }}
              </router-link>
            </div>
          </nav>

          <!-- Mobile user info -->
          <div class="flex-shrink-0 bg-gray-900 p-4">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User class="w-4 h-4 text-white" />
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-white">
                  {{ user?.first_name || user?.username }}
                </p>
                <p class="text-xs text-gray-400">{{ roleLabel }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MobileNavigation from './MobileNavigation.vue'
import { 
  Home,
  Users, 
  Settings, 
  FileText, 
  Calendar, 
  Package, 
  BarChart3,
  User,
  LogOut,
  Menu,
  Cog,
  HelpCircle
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const showMobileMenu = ref(false)

const user = computed(() => authStore.user)

const roleLabel = computed(() => {
  const roles = {
    admin: 'Administrator',
    manager: 'Kierownik',
    technician: 'Technik'
  }
  return roles[user.value?.role] || user.value?.role
})

const availableModules = computed(() => [
  {
    name: 'dashboard',
    title: 'Dashboard',
    route: 'dashboard',
    icon: Home,
    permission: null
  },
  {
    name: 'clients',
    title: 'Klienci',
    route: 'client-list',
    icon: Users,
    permission: 'clients.read'
  },
  {
    name: 'devices',
    title: 'Urządzenia',
    route: 'devices',
    icon: Flame,
    permission: 'devices.read'
  },
  {
    name: 'service',
    title: 'Serwis',
    route: 'service',
    icon: Wrench,
    permission: 'service.read',
    badge: pendingServices.value
  },
  {
    name: 'parts',
    title: 'Części',
    route: 'parts',
    icon: Package,
    permission: 'parts.read',
    badge: lowStockParts.value
  },
  {
    name: 'invoices',
    title: 'Faktury',
    route: 'invoices',
    icon: FileText,
    permission: 'invoices.read'
  }
].filter(module => !module.permission || authStore.hasModulePermission(...module.permission.split('.'))))

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script> 