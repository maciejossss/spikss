import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy loading dla modułów
const Dashboard = () => import('@/views/Dashboard.vue')
const Login = () => import('@/views/Login.vue')

// Moduł klientów
const ClientList = () => import('@/modules/clients/views/ClientList.vue')
const ClientDetails = () => import('@/modules/clients/views/ClientDetails.vue')
const ClientEdit = () => import('@/modules/clients/views/ClientEdit.vue')

// Moduł urządzeń
const DeviceList = () => import('@/modules/devices/views/DeviceList.vue')
const DeviceDetails = () => import('@/modules/devices/views/DeviceDetails.vue')
const DeviceEdit = () => import('@/modules/devices/views/DeviceEdit.vue')

// Moduł serwisu
const ServiceList = () => import('@/modules/service/views/ServiceList.vue')
const ServiceDetails = () => import('@/modules/service/views/ServiceDetails.vue')
const ServiceEdit = () => import('@/modules/service/views/ServiceEdit.vue')

// Moduł części
const PartsList = () => import('@/modules/parts/views/PartsList.vue')
const PartsDetails = () => import('@/modules/parts/views/PartsDetails.vue')
const PartsEdit = () => import('@/modules/parts/views/PartsEdit.vue')

// Moduł faktur
const InvoiceList = () => import('@/modules/invoices/views/InvoiceList.vue')
const InvoiceDetails = () => import('@/modules/invoices/views/InvoiceDetails.vue')
const InvoiceEdit = () => import('@/modules/invoices/views/InvoiceEdit.vue')

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { requiresAuth: false }
  },
  // Moduł klientów
  {
    path: '/clients',
    name: 'clients',
    component: ClientList,
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:id',
    name: 'client-details',
    component: ClientDetails,
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:id/edit',
    name: 'client-edit',
    component: ClientEdit,
    meta: { requiresAuth: true }
  },
  // Moduł urządzeń
  {
    path: '/devices',
    name: 'devices',
    component: DeviceList,
    meta: { requiresAuth: true }
  },
  {
    path: '/devices/:id',
    name: 'device-details',
    component: DeviceDetails,
    meta: { requiresAuth: true }
  },
  {
    path: '/devices/:id/edit',
    name: 'device-edit',
    component: DeviceEdit,
    meta: { requiresAuth: true }
  },
  // Moduł serwisu
  {
    path: '/service',
    name: 'service',
    component: ServiceList,
    meta: { requiresAuth: true }
  },
  {
    path: '/service/:id',
    name: 'service-details',
    component: ServiceDetails,
    meta: { requiresAuth: true }
  },
  {
    path: '/service/:id/edit',
    name: 'service-edit',
    component: ServiceEdit,
    meta: { requiresAuth: true }
  },
  // Moduł części
  {
    path: '/parts',
    name: 'parts',
    component: PartsList,
    meta: { requiresAuth: true }
  },
  {
    path: '/parts/:id',
    name: 'parts-details',
    component: PartsDetails,
    meta: { requiresAuth: true }
  },
  {
    path: '/parts/:id/edit',
    name: 'parts-edit',
    component: PartsEdit,
    meta: { requiresAuth: true }
  },
  // Moduł faktur
  {
    path: '/invoices',
    name: 'invoices',
    component: InvoiceList,
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices/:id',
    name: 'invoice-details',
    component: InvoiceDetails,
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices/:id/edit',
    name: 'invoice-edit',
    component: InvoiceEdit,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Middleware autoryzacji
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (!requiresAuth && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router 