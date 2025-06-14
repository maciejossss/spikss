<template>
  <div class="bg-base-200 min-h-screen">
    <!-- Header with title and actions -->
    <div class="bg-base-100 border-b border-base-300 px-6 py-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-base-content">System Serwisowy - Dashboard</h1>
          <p class="text-sm text-base-content/60 mt-1">
            Witaj, {{ user?.first_name || user?.username }}! | Rola: {{ roleLabel }} | {{ formatDate(new Date()) }}
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <Button variant="primary" size="sm">
            + Dodaj Pulpit
          </Button>
          <Button variant="secondary" size="sm">
            + Dodaj Widget
          </Button>
          <Button variant="warning" size="sm">
            🔄 Odśwież
          </Button>
        </div>
      </div>
    </div>

    <div class="container-responsive py-6">
      <!-- Main metrics row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 mb-8">
        <!-- Circular chart cards -->
        <MetricCard
          title="Klienci Aktywni"
          :value="stats.totalClients"
          type="chart"
          color="blue"
          :percentage="70"
          variant="elevated"
        />

        <MetricCard
          title="Urządzenia"
          :value="stats.activeDevices"
          type="chart"
          color="green"
          :percentage="60"
          variant="elevated"
        />

        <MetricCard
          title="Serwisy Pending"
          :value="stats.pendingServices"
          type="chart"
          color="yellow"
          :percentage="50"
          variant="elevated"
        />

        <MetricCard
          title="Magazyn Alert"
          :value="stats.lowStock"
          type="chart"
          color="red"
          :percentage="20"
          variant="elevated"
        />

        <!-- System status card -->
        <MetricCard
          title="Status Systemu"
          value="DZIAŁA"
          type="icon"
          :icon="CheckCircle"
          color="green"
          status="RUNNING"
          variant="elevated"
        />
      </div>

      <!-- Second row with detailed stats -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Suspended Services -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-header">
            <div class="flex items-center justify-between">
              <h3 class="card-title">Zlecenia Zawieszone</h3>
              <div class="dropdown dropdown-end">
                <label tabindex="0" class="btn btn-ghost btn-sm">
                  <MoreHorizontal class="w-4 h-4" />
                </label>
              </div>
            </div>
          </div>
          <div class="card-body text-center">
            <p class="text-xs text-base-content/60 mb-6">Pogrupowane według statusu instancji</p>
            
            <div class="mb-8">
              <div class="text-4xl font-bold text-base-content mb-1">{{ suspendedServices.total }}</div>
              <div class="text-sm text-base-content/60">INSTANCJE</div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-success mb-1">{{ suspendedServices.resumable }}</div>
                <div class="text-xs text-base-content/60">ZAWIESZONE<br>(MOŻLIWE WZNOWIENIE)</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-error mb-1">{{ suspendedServices.nonResumable }}</div>
                <div class="text-xs text-base-content/60">ZAWIESZONE<br>(NIEMOŻLIWE WZNOWIENIE)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alarms -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-header">
            <h3 class="card-title">Alarmy</h3>
          </div>
          <div class="card-body text-center">
            <div class="flex items-center justify-center mb-6">
              <div class="w-12 h-12 bg-info/20 rounded-2xl flex items-center justify-center mr-4">
                <Bell class="w-6 h-6 text-info" />
              </div>
              <div class="text-left">
                <div class="text-3xl font-bold text-base-content">{{ alarms.total }}</div>
                <div class="text-sm text-base-content/60">LICZBA UTWORZONYCH ALARMÓW</div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-3 text-center">
              <div>
                <div class="text-lg font-bold text-base-content mb-1">{{ alarms.enabled }}</div>
                <div class="text-xs text-base-content/60">WŁĄCZONE</div>
              </div>
              <div>
                <div class="text-lg font-bold text-base-content mb-1">{{ alarms.disabled }}</div>
                <div class="text-xs text-base-content/60">WYŁĄCZONE</div>
              </div>
              <div>
                <div class="text-lg font-bold text-base-content mb-1">{{ alarms.mapped }}</div>
                <div class="text-xs text-base-content/60">ZMAPOWANE</div>
              </div>
              <div>
                <div class="text-lg font-bold text-base-content mb-1">{{ alarms.notMapped }}</div>
                <div class="text-xs text-base-content/60">NIEZMAPOWANE</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Data Monitoring -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-header">
            <h3 class="card-title">Monitoring Danych</h3>
          </div>
          <div class="card-body text-center">
            <div class="flex items-center justify-center mb-6">
              <div class="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center mr-4">
                <Activity class="w-6 h-6 text-secondary" />
              </div>
              <div class="text-left">
                <div class="text-3xl font-bold text-base-content">{{ dataMonitoring.totalConnections }}</div>
                <div class="text-sm text-base-content/60">AKTYWNE POŁĄCZENIA</div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-base-content/70">Przepustowość</span>
                <span class="text-sm font-medium text-base-content">{{ dataMonitoring.throughput }} MB/s</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-base-content/70">Opóźnienie</span>
                <span class="text-sm font-medium text-base-content">{{ dataMonitoring.latency }}ms</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-base-content/70">Współczynnik błędów</span>
                <span class="text-sm font-medium text-error">{{ dataMonitoring.errorRate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Errors Table -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <h3 class="card-title">Błędy Systemu</h3>
            <div class="flex items-center space-x-2">
              <button class="btn btn-outline btn-sm">
                Eksportuj
              </button>
              <button class="btn btn-primary btn-sm">
                Zobacz Wszystkie
              </button>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Kod Błędu</th>
                  <th>Opis</th>
                  <th>Ważność</th>
                  <th>Data i Czas</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="error in systemErrors" :key="error.id" class="hover">
                  <td class="font-medium">{{ error.code }}</td>
                  <td>{{ error.description }}</td>
                  <td>
                    <div class="badge" :class="getSeverityClasses(error.severity)">
                      {{ getSeverityLabel(error.severity) }}
                    </div>
                  </td>
                  <td class="text-base-content/60">{{ formatDate(error.timestamp) }}</td>
                  <td>
                    <div class="flex space-x-2">
                      <button class="btn btn-ghost btn-xs">Zobacz</button>
                      <button class="btn btn-ghost btn-xs">Rozwiąż</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Quick Access Modules -->
      <div class="card bg-base-100 shadow-xl mt-8">
        <div class="card-header">
          <h3 class="card-title">Szybki Dostęp</h3>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <router-link
              v-for="module in availableModules"
              :key="module.name"
              :to="module.route"
              class="btn btn-outline btn-block h-auto p-6 flex-col space-y-3 hover:btn-primary group"
            >
              <component :is="module.icon" class="w-8 h-8 group-hover:scale-110 transition-transform" />
              <div class="text-center">
                <h3 class="text-sm font-medium">{{ module.title }}</h3>
                <p v-if="module.description" class="text-xs opacity-60 mt-1">
                  {{ module.description }}
                </p>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  Users, 
  Settings, 
  FileText, 
  Calendar, 
  Package, 
  BarChart3,
  CheckCircle,
  Bell,
  Activity,
  MoreHorizontal
} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import MetricCard from '@/components/ui/MetricCard.vue'

const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

const stats = ref({
  totalClients: 3,
  activeDevices: 5,
  pendingServices: 2,
  lowStock: 1
})

const suspendedServices = ref({
  total: 267,
  resumable: 203,
  nonResumable: 64
})

const alarms = ref({
  total: 7,
  enabled: 3,
  disabled: 4,
  mapped: 6,
  notMapped: 1
})

const dataMonitoring = ref({
  totalConnections: 1,
  throughput: 10,
  latency: 50,
  errorRate: 2
})

const systemErrors = ref([
  { id: 1, code: '0xC0C01B52', description: 'Invalid Input', severity: 'High', timestamp: '2023-04-15 10:00:00' },
  { id: 2, code: '0xC0C01B4e', description: 'Resource Not Found', severity: 'Medium', timestamp: '2023-04-14 14:30:00' },
  { id: 3, code: '0xC0C01680', description: 'Connection Timeout', severity: 'Low', timestamp: '2023-04-13 16:45:00' },
  { id: 4, code: '0xC0C01627', description: 'Data Integrity Error', severity: 'High', timestamp: '2023-04-12 09:15:00' }
])

const roleLabel = computed(() => {
  const roles = {
    admin: 'Administrator',
    manager: 'Kierownik',
    technician: 'Technik'
  }
  return roles[user.value?.role] || user.value?.role
})

const modules = [
  {
    name: 'clients',
    title: 'Klienci',
    icon: Users,
    route: '/clients'
  },
  {
    name: 'devices',
    title: 'Urządzenia',
    icon: Settings,
    route: '/devices'
  },
  {
    name: 'service-records',
    title: 'Serwis',
    icon: FileText,
    route: '/service-records'
  },
  {
    name: 'scheduling',
    title: 'Harmonogram',
    icon: Calendar,
    route: '/scheduling'
  },
  {
    name: 'inventory',
    title: 'Magazyn',
    icon: Package,
    route: '/inventory'
  },
  {
    name: 'reports',
    title: 'Raporty',
    icon: BarChart3,
    route: '/reports'
  }
]

const availableModules = computed(() => {
  return modules.filter(module => 
    authStore.hasModulePermission(module.name, 'read')
  )
})

function navigateToModule(route) {
  router.push(route)
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

function getSeverityClasses(severity) {
  const classes = {
    High: 'badge-error',
    Medium: 'badge-warning', 
    Low: 'badge-success'
  }
  return classes[severity] || 'badge-ghost'
}

function getSeverityLabel(severity) {
  const labels = {
    High: 'Wysoki',
    Medium: 'Średni',
    Low: 'Niski'
  }
  return labels[severity] || severity
}

onMounted(async () => {
  // Load dashboard stats - these would be real API calls
  console.log('Dashboard loaded')
})
</script> 