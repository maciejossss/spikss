import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy load components for better performance
const Dashboard = () => import('@/views/Dashboard.vue')
const Login = () => import('@/views/Login.vue')
const Settings = () => import('@/views/Settings.vue')

// Module views
const Clients = () => import('@/views/modules/Clients.vue')
const Devices = () => import('@/views/devices/DevicesView.vue')
const ServiceRecords = () => import('@/views/modules/ServiceRecords.vue')
const Scheduling = () => import('@/views/modules/Scheduling.vue')
const Inventory = () => import('@/views/modules/Inventory.vue')
const Reports = () => import('@/views/modules/Reports.vue')

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: Clients,
    meta: { 
      requiresAuth: true,
      module: 'clients',
      permission: 'read'
    }
  },
  {
    path: '/devices',
    name: 'Devices',
    component: Devices,
    meta: { 
      requiresAuth: true,
      module: 'devices',
      permission: 'read'
    }
  },
  {
    path: '/service-records',
    name: 'ServiceRecords',
    component: ServiceRecords,
    meta: { 
      requiresAuth: true,
      module: 'service-records',
      permission: 'read'
    }
  },
  {
    path: '/scheduling',
    name: 'Scheduling',
    component: Scheduling,
    meta: { 
      requiresAuth: true,
      module: 'scheduling',
      permission: 'read'
    }
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: Inventory,
    meta: { 
      requiresAuth: true,
      module: 'inventory',
      permission: 'read'
    }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    meta: { 
      requiresAuth: true,
      module: 'reports',
      permission: 'read'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { 
      requiresAuth: true,
      module: 'system',
      permission: 'read'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard for authentication and permissions
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Try to restore session from localStorage
      await authStore.restoreSession()
      
      if (!authStore.isAuthenticated) {
        next('/login')
        return
      }
    }
    
    // Check module permissions
    if (to.meta.module && to.meta.permission) {
      const hasPermission = authStore.hasModulePermission(to.meta.module, to.meta.permission)
      
      if (!hasPermission) {
        // Redirect to dashboard with error message
        next('/')
        return
      }
    }
  }
  
  // Redirect to dashboard if already authenticated and trying to access login
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

export default router 