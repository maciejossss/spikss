import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Lazy loading komponentów
const Login = () => import('../views/Login.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const ClientsList = () => import('../views/clients/ClientsList.vue')
const ClientDetails = () => import('../views/clients/ClientDetails.vue')
const DevicesList = () => import('../views/devices/DevicesList.vue')
const DeviceDetails = () => import('../views/devices/DeviceDetails.vue')
const OrdersList = () => import('../views/orders/OrdersList.vue')
const OrderDetails = () => import('../views/orders/OrderDetails.vue')
const InvoicesList = () => import('../views/invoices/InvoicesList.vue')
const InvoiceDetails = () => import('../views/invoices/InvoiceDetails.vue')
const Reports = () => import('../views/Reports.vue')
const MapView = () => import('../views/Map.vue')
const Settings = () => import('../views/Settings.vue')
const Calendar = () => import('../views/Calendar.vue')
const SpareParts = () => import('../views/SpareParts.vue')
const MobileMonitor = () => import('../views/MobileMonitor.vue')
const ServiceCategories = () => import('../views/ServiceCategories.vue')
const PartCategories = () => import('../views/PartCategories.vue')
const Protocols = () => import('../views/Protocols.vue')
const WorkCards = () => import('../views/WorkCards.vue')
const InventoryCheck = () => import('../views/InventoryCheck.vue')
const WebsiteContent = () => import('../views/WebsiteContent.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { 
      requiresAuth: false,
      layout: 'blank'
    }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { 
      requiresAuth: true,
      title: 'Panel główny'
    }
  },
  {
    path: '/clients',
    name: 'ClientsList',
    component: ClientsList,
    meta: { 
      requiresAuth: true,
      title: 'Klienci'
    }
  },
  {
    path: '/clients/:id',
    name: 'ClientDetails',
    component: ClientDetails,
    meta: { 
      requiresAuth: true,
      title: 'Szczegóły klienta'
    }
  },
  {
    path: '/devices',
    name: 'DevicesList', 
    component: DevicesList,
    meta: { 
      requiresAuth: true,
      title: 'Urządzenia'
    }
  },
  {
    path: '/devices/:id',
    name: 'DeviceDetails',
    component: DeviceDetails,
    meta: { 
      requiresAuth: true,
      title: 'Szczegóły urządzenia'
    }
  },
  {
    path: '/orders',
    name: 'OrdersList',
    component: OrdersList,
    meta: { 
      requiresAuth: true,
      title: 'Zlecenia serwisowe'
    }
  },
  {
    path: '/orders/:id',
    name: 'OrderDetails',
    component: OrderDetails,
    meta: { 
      requiresAuth: true,
      title: 'Szczegóły zlecenia'
    }
  },
  {
    path: '/invoices',
    name: 'InvoicesList',
    component: InvoicesList,
    meta: { 
      requiresAuth: true,
      title: 'Faktury'
    }
  },
  {
    path: '/invoices/:id',
    name: 'InvoiceDetails',
    component: InvoiceDetails,
    meta: { 
      requiresAuth: true,
      title: 'Szczegóły faktury'
    }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: Calendar,
    meta: { 
      requiresAuth: true,
      title: 'Kalendarz'
    }
  },
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    meta: { 
      requiresAuth: true,
      title: 'Raporty'
    }
  },
  {
    path: '/map',
    name: 'Map',
    component: MapView,
    meta: {
      requiresAuth: true,
      title: 'Mapa klientów'
    }
  },
  {
    path: '/protocols',
    name: 'Protocols',
    component: Protocols,
    meta: {
      requiresAuth: true,
      title: 'Protokóły serwisowe'
    }
  },
  {
    path: '/work-cards',
    name: 'WorkCards',
    component: WorkCards,
    meta: {
      requiresAuth: true,
      title: 'Karty pracy'
    }
  },
  {
    path: '/spare-parts',
    name: 'SpareParts',
    component: SpareParts,
    meta: { 
      requiresAuth: true,
      title: 'Części zamienne'
    }
  },
  {
    path: '/inventory-check',
    name: 'InventoryCheck',
    component: InventoryCheck,
    meta: {
      requiresAuth: true,
      title: 'Inwentura'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { 
      requiresAuth: true,
      title: 'Ustawienia'
    }
  },
  {
    path: '/mobile-monitor',
    name: 'MobileMonitor',
    component: MobileMonitor,
    meta: { 
      requiresAuth: true,
      title: 'Monitor Prac Mobilnych',
      adminOnly: true
    }
  },
  {
    path: '/service-categories',
    name: 'ServiceCategories',
    component: ServiceCategories,
    meta: { 
      requiresAuth: true,
      title: 'Kategorie Usług'
    }
  },
  {
    path: '/part-categories',
    name: 'PartCategories',
    component: PartCategories,
    meta: {
      requiresAuth: true,
      title: 'Kategorie części'
    }
  },
  {
    path: '/website-content',
    name: 'WebsiteContent',
    component: WebsiteContent,
    meta: {
      requiresAuth: true,
      title: 'Treści WWW',
      adminOnly: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Sprawdź czy trasa wymaga autoryzacji
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // Spróbuj załadować użytkownika z localStorage
      await authStore.loadUser()
      
      if (!authStore.isAuthenticated) {
        next('/login')
        return
      }
    }
  }

  if (to.meta.adminOnly && authStore.user?.role !== 'admin') {
    next('/')
    return
  }
  
  // Jeśli użytkownik jest zalogowany i próbuje wejść na stronę logowania
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

export default router 