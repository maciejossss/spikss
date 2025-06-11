<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
    <div class="grid grid-cols-5 h-16">
      <!-- Dashboard -->
      <router-link
        to="/"
        class="flex flex-col items-center justify-center space-y-1 transition-colors duration-200"
        :class="$route.path === '/' ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'"
      >
        <Home :class="iconClasses" />
        <span class="text-xs font-medium">Pulpit</span>
      </router-link>

      <!-- Clients -->
      <router-link
        to="/clients"
        class="flex flex-col items-center justify-center space-y-1 transition-colors duration-200"
        :class="$route.path.startsWith('/clients') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'"
      >
        <Users :class="iconClasses" />
        <span class="text-xs font-medium">Klienci</span>
      </router-link>

      <!-- Devices -->
      <router-link
        to="/devices"
        class="flex flex-col items-center justify-center space-y-1 transition-colors duration-200"
        :class="$route.path.startsWith('/devices') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'"
      >
        <Flame :class="iconClasses" />
        <span class="text-xs font-medium">Urządzenia</span>
      </router-link>

      <!-- Services -->
      <router-link
        to="/services"
        class="flex flex-col items-center justify-center space-y-1 transition-colors duration-200"
        :class="$route.path.startsWith('/services') ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600'"
      >
        <Wrench :class="iconClasses" />
        <span class="text-xs font-medium">Serwisy</span>
      </router-link>

      <!-- More -->
      <button
        @click="showMoreMenu = !showMoreMenu"
        class="flex flex-col items-center justify-center space-y-1 transition-colors duration-200 text-gray-600 hover:text-primary-600 relative"
      >
        <MoreHorizontal :class="iconClasses" />
        <span class="text-xs font-medium">Więcej</span>
        
        <!-- Badge for notifications -->
        <div v-if="hasNotifications" class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
      </button>
    </div>

    <!-- More menu overlay -->
    <div
      v-if="showMoreMenu"
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      @click="showMoreMenu = false"
    ></div>

    <!-- More menu -->
    <div
      v-if="showMoreMenu"
      class="fixed bottom-16 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 min-w-48 animate-scale-in"
    >
      <div class="p-2">
        <router-link
          v-for="item in moreMenuItems"
          :key="item.route"
          :to="item.route"
          @click="showMoreMenu = false"
          class="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors duration-200"
        >
          <component :is="item.icon" class="w-5 h-5 mr-3 text-gray-500" />
          {{ item.title }}
          <span v-if="item.badge" class="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
            {{ item.badge }}
          </span>
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Home, 
  Users, 
  Flame, 
  Wrench, 
  MoreHorizontal,
  Package,
  FileText,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-vue-next'

const showMoreMenu = ref(false)

const iconClasses = computed(() => 'w-5 h-5')

const hasNotifications = computed(() => {
  // You can implement notification logic here
  return false
})

const moreMenuItems = ref([
  {
    title: 'Magazyn',
    route: '/inventory',
    icon: Package,
    badge: null
  },
  {
    title: 'Raporty',
    route: '/reports',
    icon: FileText,
    badge: null
  },
  {
    title: 'Analityka',
    route: '/analytics',
    icon: BarChart3,
    badge: null
  },
  {
    title: 'Ustawienia',
    route: '/settings',
    icon: Settings,
    badge: null
  },
  {
    title: 'Pomoc',
    route: '/help',
    icon: HelpCircle,
    badge: null
  }
])

// Close menu when clicking outside
const handleClickOutside = () => {
  showMoreMenu.value = false
}
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style> 