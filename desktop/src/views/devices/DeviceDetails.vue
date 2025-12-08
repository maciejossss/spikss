<template>
  <div class="p-6">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-primary-600"></i>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex">
        <i class="fas fa-exclamation-triangle text-red-400 mr-3 mt-1"></i>
        <div>
          <h3 class="text-sm font-medium text-red-800">Błąd ładowania danych</h3>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Główna zawartość -->
    <div v-else-if="device">
      <!-- Header -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              @click="$router.go(-1)"
              class="flex items-center text-secondary-600 hover:text-secondary-900"
            >
              <i class="fas fa-arrow-left mr-2"></i>
              Powrót
            </button>
            <div class="h-6 border-l border-secondary-300"></div>
            <div>
              <h1 class="text-2xl font-bold text-secondary-900">{{ device.name }}</h1>
              <div class="flex items-center space-x-4 mt-1">
                <span
                  :class="device.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ device.is_active ? 'Aktywne' : 'Nieaktywne' }}
                </span>
                <span class="text-sm text-secondary-500">{{ device.category }}</span>
                <span v-if="device.client_name" class="text-sm text-secondary-500">
                  <i class="fas fa-user mr-1"></i>
                  {{ device.client_name }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex space-x-3">
            <button
              @click="editDevice"
              class="btn-secondary"
            >
              <i class="fas fa-edit mr-2"></i>
              Edytuj
            </button>
            <button
              @click="createServiceOrder"
              class="btn-primary"
            >
              <i class="fas fa-wrench mr-2"></i>
              Nowe zlecenie
            </button>
            <button
              @click="showDeleteModal = true"
              class="btn-danger"
            >
              <i class="fas fa-trash mr-2"></i>
              Usuń
            </button>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="needsService" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div class="flex">
          <i class="fas fa-exclamation-triangle text-yellow-400 mr-3 mt-1"></i>
          <div>
            <h3 class="text-sm font-medium text-yellow-800">Wymaga serwisu</h3>
            <p class="text-sm text-yellow-700 mt-1">
              Ostatni serwis: {{ formatDate(device.last_service_date) }}
              <span v-if="daysSinceLastService > 0">({{ daysSinceLastService }} dni temu)</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 mb-6">
        <div class="border-b border-secondary-200">
          <nav class="flex space-x-8 px-6">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              <i :class="tab.icon" class="mr-2"></i>
              {{ tab.name }}
              <span v-if="tab.count !== undefined" class="ml-2 bg-secondary-100 text-secondary-600 py-1 px-2 rounded-full text-xs">
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Tab: Informacje -->
          <div v-if="activeTab === 'info'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Dane podstawowe -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-info-circle mr-2"></i>
                  Dane podstawowe
                </h3>
                <dl class="space-y-3">
                  <div v-if="device.manufacturer">
                    <dt class="text-sm font-medium text-secondary-500">Producent</dt>
                    <dd class="text-sm text-secondary-900">{{ device.manufacturer }}</dd>
                  </div>
                  <div v-if="device.model">
                    <dt class="text-sm font-medium text-secondary-500">Model</dt>
                    <dd class="text-sm text-secondary-900">{{ device.model }}</dd>
                  </div>
                  <div v-if="device.serial_number">
                    <dt class="text-sm font-medium text-secondary-500">Numer seryjny</dt>
                    <dd class="text-sm text-secondary-900 font-mono">{{ device.serial_number }}</dd>
                  </div>
                  <div v-if="device.production_year">
                    <dt class="text-sm font-medium text-secondary-500">Rok produkcji</dt>
                    <dd class="text-sm text-secondary-900">{{ device.production_year }}</dd>
                  </div>
                  <div v-if="device.category">
                    <dt class="text-sm font-medium text-secondary-500">Kategoria</dt>
                    <dd class="text-sm text-secondary-900">{{ device.category }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Dane techniczne -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-cogs mr-2"></i>
                  Dane techniczne
                </h3>
                <dl class="space-y-3">
                  <div v-if="device.power_consumption">
                    <dt class="text-sm font-medium text-secondary-500">Moc</dt>
                    <dd class="text-sm text-secondary-900">{{ device.power_consumption }} kW</dd>
                  </div>
                  <div v-if="device.fuel_type">
                    <dt class="text-sm font-medium text-secondary-500">Typ paliwa</dt>
                    <dd class="text-sm text-secondary-900">{{ device.fuel_type }}</dd>
                  </div>
                  <div v-if="device.efficiency">
                    <dt class="text-sm font-medium text-secondary-500">Sprawność</dt>
                    <dd class="text-sm text-secondary-900">{{ device.efficiency }}%</dd>
                  </div>
                  <div v-if="device.technical_specs">
                    <dt class="text-sm font-medium text-secondary-500">Specyfikacja techniczna</dt>
                    <dd class="text-sm text-secondary-900 whitespace-pre-wrap">{{ device.technical_specs }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Informacje serwisowe -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-tools mr-2"></i>
                  Informacje serwisowe
                </h3>
                <dl class="space-y-3">
                  <div v-if="device.installation_date">
                    <dt class="text-sm font-medium text-secondary-500">Data instalacji</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(device.installation_date) }}</dd>
                  </div>
                  <div v-if="device.warranty_end_date">
                    <dt class="text-sm font-medium text-secondary-500">Koniec gwarancji</dt>
                    <dd class="text-sm text-secondary-900">
                      {{ formatDate(device.warranty_end_date) }}
                      <span v-if="isWarrantyActive" class="ml-2 text-green-600 text-xs">(aktywna)</span>
                      <span v-else class="ml-2 text-red-600 text-xs">(wygasła)</span>
                    </dd>
                  </div>
                  <div v-if="device.last_service_date">
                    <dt class="text-sm font-medium text-secondary-500">Ostatni serwis</dt>
                    <dd class="text-sm text-secondary-900">
                      {{ formatDate(device.last_service_date) }}
                      <span v-if="daysSinceLastService > 0" class="ml-2 text-secondary-500 text-xs">
                        ({{ daysSinceLastService }} dni temu)
                      </span>
                    </dd>
                  </div>
                  <div v-if="device.next_service_date">
                    <dt class="text-sm font-medium text-secondary-500">Następny serwis</dt>
                    <dd class="text-sm text-secondary-900">
                      {{ formatDate(device.next_service_date) }}
                      <span v-if="daysToNextService !== null" class="ml-2 text-xs"
                            :class="daysToNextService < 0 ? 'text-red-600' : daysToNextService < 30 ? 'text-yellow-600' : 'text-green-600'">
                        {{ daysToNextService < 0 ? `(${Math.abs(daysToNextService)} dni po terminie)` : `(za ${daysToNextService} dni)` }}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Lokalizacja -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-map-marker-alt mr-2"></i>
                  Lokalizacja i właściciel
                </h3>
                <dl class="space-y-3">
                  <div v-if="device.client_name">
                    <dt class="text-sm font-medium text-secondary-500">Właściciel</dt>
                    <dd class="text-sm text-secondary-900">
                      <router-link 
                        :to="`/clients/${device.client_id}`"
                        class="text-primary-600 hover:text-primary-900"
                      >
                        {{ device.client_name }}
                      </router-link>
                    </dd>
                  </div>
                  <div v-if="device.location">
                    <dt class="text-sm font-medium text-secondary-500">Lokalizacja</dt>
                    <dd class="text-sm text-secondary-900">{{ device.location }}</dd>
                  </div>
                  <div v-if="device.created_at">
                    <dt class="text-sm font-medium text-secondary-500">Data dodania</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(device.created_at) }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Notatki -->
            <div v-if="device.notes" class="mt-6 bg-secondary-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-secondary-900 mb-3">
                <i class="fas fa-sticky-note mr-2"></i>
                Notatki
              </h3>
              <p class="text-sm text-secondary-700 whitespace-pre-wrap">{{ device.notes }}</p>
            </div>
          </div>

          <!-- Tab: Zdjęcia i dokumenty -->
          <div v-if="activeTab === 'files'">
            <DeviceFilesManager 
              :device-id="device.id"
              :readonly="false"
            />
          </div>

          <!-- Tab: Historia serwisów -->
          <div v-if="activeTab === 'history'">
            <div v-if="deviceOrders.length === 0" class="text-center py-8">
              <i class="fas fa-history text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak historii serwisów dla tego urządzenia</p>
              <button @click="createServiceOrder" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Utwórz pierwsze zlecenie
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Historia serwisów ({{ deviceOrders.length }})
                </h3>
                <div class="flex items-center space-x-2">
                  <button @click="toggleHistory()" class="btn-secondary">
                    <i :class="showAllHistory ? 'fas fa-compress' : 'fas fa-expand'" class="mr-2"></i>
                    {{ showAllHistory ? 'Zwiń' : 'Pokaż całą historię' }}
                  </button>
                  <button @click="createServiceOrder" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i>
                    Nowe zlecenie
                  </button>
                </div>
              </div>

              <div class="space-y-4">
                <div
                  v-for="order in visibleOrders"
                  :key="order.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <h4 class="font-medium text-secondary-900">{{ order.order_number }}</h4>
                        <span
                          :class="getStatusClass(order.status)"
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        >
                          {{ getStatusText(order.status) }}
                        </span>
                        <span
                          :class="getPriorityClass(order.priority)"
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        >
                          {{ getPriorityText(order.priority) }}
                        </span>
                      </div>
                      <p class="text-sm text-secondary-600 mt-1">{{ order.title }}</p>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <span>{{ formatDate(order.created_at) }}</span>
                        <span v-if="order.completed_at">Ukończono: {{ formatDate(order.completed_at) }}</span>
                        <span v-if="order.total_cost">{{ order.total_cost.toFixed(2) }} zł</span>
                      </div>
                      <div v-if="order.description" class="mt-2 text-sm text-secondary-600">
                        {{ order.description }}
                      </div>
                      <div v-if="parsedCategories(order).length" class="mt-3">
                        <div class="text-xs text-secondary-500 mb-1">Wykonane czynności:</div>
                        <ul class="list-disc list-inside text-sm text-secondary-800">
                          <li v-for="c in parsedCategories(order)" :key="c">{{ c }}</li>
                        </ul>
                      </div>
                      <div v-if="order.completion_notes" class="mt-2 text-sm text-secondary-700 whitespace-pre-wrap">
                        <span class="text-xs text-secondary-500">Notatki serwisowe:</span>
                        <div>{{ order.completion_notes }}</div>
                      </div>
                      <div v-if="order.parts_used" class="mt-2 text-sm text-secondary-700">
                        <span class="text-xs text-secondary-500">Użyte części:</span>
                        <div class="whitespace-pre-wrap">{{ order.parts_used }}</div>
                      </div>
					  <div v-if="getPhotos(order.work_photos).length" class="mt-3">
							<div class="grid grid-cols-3 gap-2">
								<div v-for="(ph, idx) in getPhotos(order.work_photos)" :key="idx" class="aspect-square bg-secondary-50 border rounded overflow-hidden cursor-zoom-in" @click="openPhoto(ph)">
									<img :src="resolvePhotoSrc(ph)" class="w-full h-full object-cover" />
								</div>
							</div>
						</div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="$router.push(`/orders/${order.id}`)"
                        class="text-primary-600 hover:text-primary-900"
                        title="Zobacz szczegóły"
                      >
                        <i class="fas fa-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Części zamienne -->
          <div v-if="activeTab === 'parts'">
            <div v-if="deviceParts.length === 0" class="text-center py-8">
              <i class="fas fa-puzzle-piece text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak części zamiennych dla tego urządzenia</p>
              <button @click="addPart" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Dodaj część zamienną
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Części zamienne ({{ deviceParts.length }})
                </h3>
                <div class="space-x-2">
                  <button @click="addPart" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i>
                    Dodaj część
                  </button>
                  <button @click="openAttachModal" class="btn-secondary">
                    <i class="fas fa-link mr-2"></i>
                    Powiąż z magazynu
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="part in deviceParts"
                  :key="part.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-secondary-900">{{ part.name }}</h4>
                      <p v-if="part.part_number" class="text-sm text-secondary-600 font-mono">Nr: {{ part.part_number }}</p>
                      <p v-if="part.manufacturer" class="text-sm text-secondary-500">{{ part.manufacturer }}</p>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <span v-if="part.gross_price != null || part.price != null">
                          {{ Number(part.gross_price ?? part.price ?? 0).toFixed(2) }} zł
                        </span>
                        <span v-if="part.stock_quantity !== undefined">
                          Stan: {{ part.stock_quantity }}
                          <span :class="part.stock_quantity < part.min_stock_level ? 'text-red-600' : 'text-green-600'">
                            {{ part.stock_quantity < part.min_stock_level ? '(mało)' : '(OK)' }}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        v-if="part.stock_quantity !== null && part.stock_quantity !== undefined"
                        @click="editPart(part)"
                        class="text-secondary-600 hover:text-secondary-900"
                        title="Edytuj"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                      <button
                        v-if="part.stock_quantity !== null && part.stock_quantity !== undefined"
                        @click="deletePart(part)"
                        class="text-red-600 hover:text-red-800 ml-2"
                        title="Usuń"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                      <button
                        v-if="part.device_id && part.stock_quantity !== null && part.stock_quantity !== undefined"
                        @click="unlinkPart(part)"
                        class="text-orange-600 hover:text-orange-800 ml-2"
                        title="Odwiąż od urządzenia"
                      >
                        <i class="fas fa-unlink"></i>
                      </button>
                      <span v-if="part.stock_quantity === null || part.stock_quantity === undefined" class="text-xs text-secondary-500 italic" title="Część z historii zleceń - nie można edytować ani usuwać">
                        Z historii
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal: zarządzanie częścią magazynową powiązaną z urządzeniem -->
          <PartFormModal
            v-if="showPartModal"
            :device-id="device?.id || null"
            :part="editingPart"
            :is-edit="!!editingPart"
            @saved="onPartSaved"
            @close="closePartModal"
          />
          <QuickAttachPartModal
            v-if="showAttachModal"
            :device-id="device?.id"
            @attached="onPartAttached"
            @close="closeAttachModal"
          />

          <!-- Tab: Dokumenty -->
          <div v-if="activeTab === 'documents'">
            <div v-if="deviceDocuments.length === 0" class="text-center py-8">
              <i class="fas fa-file-alt text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak dokumentów dla tego urządzenia</p>
              <button @click="addDocument" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Dodaj dokument
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Dokumenty ({{ deviceDocuments.length }})
                </h3>
                <button @click="addDocument" class="btn-primary">
                  <i class="fas fa-plus mr-2"></i>
                  Dodaj dokument
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="document in deviceDocuments"
                  :key="document.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-secondary-900">{{ document.name }}</h4>
                      <p class="text-sm text-secondary-600">{{ document.type }}</p>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <span>{{ formatDate(document.created_at) }}</span>
                        <span v-if="document.file_size">{{ formatFileSize(document.file_size) }}</span>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="downloadDocument(document)"
                        class="text-primary-600 hover:text-primary-900"
                        title="Pobierz"
                      >
                        <i class="fas fa-download"></i>
                      </button>
                      <button
                        @click="editDocument(document)"
                        class="text-secondary-600 hover:text-secondary-900"
                        title="Edytuj"
                      >
                        <i class="fas fa-edit"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Device not found -->
    <div v-else class="text-center py-12">
      <i class="fas fa-tools text-6xl text-secondary-300 mb-4"></i>
      <h2 class="text-xl font-medium text-secondary-900 mb-2">Urządzenie nie zostało znalezione</h2>
      <p class="text-secondary-600 mb-6">Urządzenie o podanym ID nie istnieje lub zostało usunięte.</p>
      <router-link to="/devices" class="btn-primary">
        <i class="fas fa-arrow-left mr-2"></i>
        Powrót do listy urządzeń
      </router-link>
    </div>

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń urządzenie"
      :message="`Czy na pewno chcesz usunąć urządzenie ${device.name}? Ta operacja jest nieodwracalna.`"
      confirm-text="Usuń urządzenie"
      confirm-class="btn-danger"
      @confirm="deleteDevice"
      @cancel="showDeleteModal = false"
    />

    <!-- Photo modal -->
    <div v-if="showPhotoModal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" @click="showPhotoModal=false">
      <img :src="selectedPhotoSrc" class="max-w-[90vw] max-h-[90vh] object-contain" @click.stop />
      <button class="absolute top-4 right-4 text-white text-2xl" @click="showPhotoModal=false">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDate } from '../../utils/date'
import ConfirmModal from '../../components/ConfirmModal.vue'
import PartFormModal from '../../components/PartFormModal.vue'
import QuickAttachPartModal from '../../components/QuickAttachPartModal.vue'
import DeviceFilesManager from '../../components/DeviceFilesManager.vue'
import config from '../../../env-config.js'

const route = useRoute()
const router = useRouter()

// Reactive data
const device = ref(null)
const deviceOrders = ref([])
const deviceParts = ref([])
const deviceDocuments = ref([])
const deviceFiles = ref([])
const isLoading = ref(false)
const error = ref('')
const activeTab = ref('info')
const showDeleteModal = ref(false)
const showPhotoModal = ref(false)
const selectedPhotoSrc = ref('')
const showPartModal = ref(false)
const editingPart = ref(null)
const showAttachModal = ref(false)
const showAllHistory = ref(false)

// Computed properties
const tabs = computed(() => [
  { id: 'info', name: 'Informacje', icon: 'fas fa-info-circle' },
  { id: 'files', name: 'Zdjęcia i dokumenty', icon: 'fas fa-file-image', count: deviceFiles.value.length },
  { id: 'history', name: 'Historia serwisów', icon: 'fas fa-history', count: deviceOrders.value.length },
  { id: 'parts', name: 'Części zamienne', icon: 'fas fa-puzzle-piece', count: deviceParts.value.length },
  { id: 'documents', name: 'Dokumenty (legacy)', icon: 'fas fa-file-alt', count: deviceDocuments.value.length }
])

const visibleOrders = computed(() => {
  return showAllHistory.value ? deviceOrders.value : (deviceOrders.value || []).slice(0, 1)
})

const toggleHistory = () => {
  showAllHistory.value = !showAllHistory.value
}

const parsedCategories = (order) => {
  try {
    const raw = order?.completed_categories
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
    // Mapuj kody na nazwy, jeśli dostępne – tu prosta prezentacja kodów
    return (arr || []).map(x => String(x))
  } catch (_) {
    return []
  }
}

const isWarrantyActive = computed(() => {
  if (!device.value?.warranty_end_date) return false
  return new Date(device.value.warranty_end_date) > new Date()
})

const daysSinceLastService = computed(() => {
  if (!device.value?.last_service_date) return null
  const lastService = new Date(device.value.last_service_date)
  const today = new Date()
  return Math.floor((today - lastService) / (1000 * 60 * 60 * 24))
})

const daysToNextService = computed(() => {
  if (!device.value?.next_service_date) return null
  const nextService = new Date(device.value.next_service_date)
  const today = new Date()
  return Math.floor((nextService - today) / (1000 * 60 * 60 * 24))
})

const needsService = computed(() => {
  return daysToNextService.value !== null && daysToNextService.value <= 7
})

// Helper methods
const getStatusClass = (status) => {
  const classes = {
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_for_parts: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getStatusText = (status) => {
  const texts = {
    new: 'Nowe',
    in_progress: 'W realizacji',
    waiting_for_parts: 'Oczekuje na części',
    completed: 'Ukończone',
    cancelled: 'Anulowane'
  }
  return texts[status] || status
}

const getPriorityClass = (priority) => {
  const classes = {
    low: 'bg-secondary-100 text-secondary-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  }
  return classes[priority] || 'bg-secondary-100 text-secondary-800'
}

const getPriorityText = (priority) => {
  const texts = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    urgent: 'Pilny'
  }
  return texts[priority] || priority
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getPhotos = (photos) => {
  if (!photos) return []
  if (Array.isArray(photos)) {
    return photos.map(p => ({
      path: p.path,
      url: p.url,
      name: p.name
    }))
  }
  return [photos]
}

const openPhoto = (photo) => {
  selectedPhotoSrc.value = resolvePhotoSrc(photo)
  showPhotoModal.value = true
}

const resolvePhotoSrc = (ph) => {
  const val = typeof ph === 'string' ? ph : (ph?.path || ph?.url || '')
  if (!val) return ''
  const v = String(val)
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v
  // Prefer Railway public uploads for relative paths
  const railway = config.RAILWAY_URL || 'https://web-production-fc58d.up.railway.app'
  if (v.startsWith('/uploads')) return `${railway.replace(/\/$/, '')}${v}`
  if (v.startsWith('uploads/')) return `${railway.replace(/\/$/, '')}/${v}`
  if (window?.electronAPI && /^[A-Za-z]:\\/.test(v)) return 'file:///' + v.replace(/\\/g, '/')
  return v
}

// Data loading methods
const loadDevice = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const deviceId = parseInt(route.params.id)
    
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        `SELECT d.*, c.first_name, c.last_name, c.company_name, c.type as client_type
         FROM devices d 
         LEFT JOIN clients c ON d.client_id = c.id 
         WHERE d.id = ?`,
        [deviceId]
      )
      
      if (result && result.length > 0) {
        device.value = {
          ...result[0],
          client_name: result[0].client_type === 'business' 
            ? result[0].company_name 
            : `${result[0].first_name} ${result[0].last_name}`
        }
      } else {
        device.value = null
      }
    } else {
      // Demo data fallback
      const demoDevices = [
        { 
          id: 1, 
          name: 'Kocioł gazowy Viessmann',
          manufacturer: 'Viessmann',
          model: 'Vitopend 100',
          serial_number: 'VIE12345678',
          category: 'Ogrzewanie',
          client_id: 1,
          client_name: 'Jan Kowalski',
          production_year: 2020,
          power_consumption: 24,
          fuel_type: 'Gaz ziemny',
          efficiency: 92,
          installation_date: '2020-10-15',
          warranty_end_date: '2022-10-15',
          last_service_date: '2024-06-15',
          next_service_date: '2025-06-15',
          location: 'Kotłownia - parter',
          technical_specs: 'Kocioł kondensacyjny, typ C, max temp. 80°C',
          notes: 'Wymiana filtra co 6 miesięcy. Kontrola ciśnienia regularnie.',
          is_active: 1,
          created_at: '2020-10-15T10:00:00Z'
        },
        { 
          id: 2, 
          name: 'Klimatyzator Daikin',
          manufacturer: 'Daikin',
          model: 'Sensira FTXC25B',
          serial_number: 'DAI98765432',
          category: 'Klimatyzacja',
          client_id: 2,
          client_name: 'ABC Sp. z o.o.',
          production_year: 2021,
          power_consumption: 2.5,
          fuel_type: 'Elektryczny',
          efficiency: 95,
          installation_date: '2021-03-20',
          warranty_end_date: '2024-03-20',
          last_service_date: '2024-05-20',
          next_service_date: '2024-11-20',
          location: 'Biuro - pokój 201',
          technical_specs: 'Jednostka split, chłodzenie/grzanie, inverter',
          notes: 'Czyszczenie filtrów co 3 miesiące. Sprawdzanie czynnika co roku.',
          is_active: 1,
          created_at: '2021-03-20T14:30:00Z'
        }
      ]
      device.value = demoDevices.find(d => d.id === deviceId) || null
    }
  } catch (err) {
    console.error('Error loading device:', err)
    error.value = 'Błąd podczas ładowania danych urządzenia'
  } finally {
    isLoading.value = false
  }
}

const loadDeviceOrders = async () => {
  if (!device.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT id, order_number, device_id, title, description, status, priority, total_cost, created_at, completed_at, work_photos, completed_categories, completion_notes, parts_used FROM service_orders WHERE device_id = ? ORDER BY created_at DESC',
        [device.value.id]
      )
      deviceOrders.value = result || []
    } else {
      // Demo data
      const demoOrders = [
        {
          id: 1,
          order_number: 'SRV-2024-001',
          device_id: 1,
          title: 'Przegląd roczny kotła',
          description: 'Przegląd roczny, wymiana filtra, kontrola ciśnienia',
          status: 'completed',
          priority: 'medium',
          total_cost: 450,
          created_at: '2024-06-01T09:00:00Z',
          completed_at: '2024-06-01T12:00:00Z'
        },
        {
          id: 3,
          order_number: 'SRV-2024-023',
          device_id: 2,
          title: 'Konserwacja klimatyzacji',
          description: 'Czyszczenie filtrów, kontrola czynnika',
          status: 'completed',
          priority: 'low',
          total_cost: 200,
          created_at: '2024-05-15T10:00:00Z',
          completed_at: '2024-05-15T11:30:00Z'
        }
      ]
      deviceOrders.value = demoOrders.filter(o => o.device_id === device.value.id)
    }
  } catch (err) {
    console.error('Error loading device orders:', err)
  }
}

const loadDeviceParts = async () => {
  if (!device.value) return
  try {
    if (window.electronAPI?.database) {
      // 1) Części bezpośrednio przypisane do urządzenia
      const direct = await window.electronAPI.database.query(
        'SELECT id, name, part_number, manufacturer, brand, category, price, stock_quantity, min_stock_level, device_id FROM spare_parts WHERE device_id = ? ORDER BY name',
        [device.value.id]
      ).catch(()=>[])

      // 2) Części użyte historycznie w zleceniach tego urządzenia (bez konieczności przypisania do device_id)
      const hist = await window.electronAPI.database.query(
        `SELECT 
           COALESCE(sp.id, op.part_id) as id,
           COALESCE(sp.name, 'Nieznana część') as name,
           COALESCE(sp.part_number, '') as part_number,
           sp.manufacturer,
           sp.brand,
           sp.category,
           COALESCE(sp.gross_price, sp.price, 0) as price,
           sp.gross_price,
           sp.net_price,
           NULL as stock_quantity,
           NULL as min_stock_level,
           so.device_id
         FROM order_parts op
         JOIN service_orders so ON so.id = op.order_id
         LEFT JOIN spare_parts sp ON sp.id = op.part_id
         WHERE so.device_id = ? AND op.part_id IS NOT NULL
         ORDER BY COALESCE(sp.name, 'Nieznana część')`,
        [device.value.id]
      ).catch(()=>[])

      // Połącz i usuń duplikaty po (id || name+part_number)
      const merged = [...(direct||[]), ...(hist||[])]
      const uniq = []
      const keys = new Set()
      for (const r of merged) {
        const k = r && (r.id ? `id:${r.id}` : `np:${(r.name||'')}:${(r.part_number||'')}`)
        if (!keys.has(k)) { keys.add(k); uniq.push(r) }
      }
      deviceParts.value = uniq
    } else {
      deviceParts.value = []
    }
  } catch (err) {
    console.error('Error loading device parts:', err)
  }
}

const loadDeviceDocuments = async () => {
  if (!device.value) return
  
  try {
    if (window.electronAPI?.databaseOperation) {
      const result = await window.electronAPI.databaseOperation('query', {
        sql: 'SELECT * FROM device_files WHERE device_id = ? ORDER BY created_at DESC',
        params: [device.value.id]
      })
      deviceDocuments.value = result || []
    } else {
      // Demo data
      const demoDocuments = [
        {
          id: 1,
          device_id: 1,
          name: 'Instrukcja obsługi',
          type: 'Instrukcja',
          file_size: 2048576,
          created_at: '2020-10-15T10:00:00Z'
        },
        {
          id: 2,
          device_id: 1,
          name: 'Karta gwarancyjna',
          type: 'Gwarancja',
          file_size: 512000,
          created_at: '2020-10-15T10:30:00Z'
        }
      ]
      deviceDocuments.value = demoDocuments.filter(d => d.device_id === device.value.id)
    }
  } catch (err) {
    console.error('Error loading device documents:', err)
  }
}

const loadDeviceFiles = async () => {
  if (!device.value) return
  
  try {
    if (window.electronAPI?.fileManager) {
      const result = await window.electronAPI.fileManager.getDeviceFiles(device.value.id)
      deviceFiles.value = result || []
    } else {
      // Demo data
      deviceFiles.value = []
    }
  } catch (err) {
    console.error('Error loading device files:', err)
  }
}

// Action methods
const editDevice = () => {
  router.push({ name: 'DevicesList', query: { edit_id: device.value.id } })
}

const deleteDevice = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'UPDATE devices SET is_active = 0 WHERE id = ?',
        [device.value.id]
      )
    }
    router.push('/devices')
  } catch (err) {
    console.error('Error deleting device:', err)
    error.value = 'Błąd podczas usuwania urządzenia'
  }
  showDeleteModal.value = false
}

const createServiceOrder = () => {
  router.push({ 
    name: 'OrdersList', 
    query: { 
      add: 'true',
      client_id: device.value.client_id,
      device_id: device.value.id
    } 
  })
}

const addPart = () => {
  editingPart.value = null
  showPartModal.value = true
}

const editPart = (part) => {
  editingPart.value = { ...part }
  showPartModal.value = true
}

const deletePart = async (part) => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'DELETE FROM spare_parts WHERE id = ?',
        [part.id]
      )
    }
    loadDeviceParts() // Refresh the list
  } catch (err) {
    console.error('Error deleting part:', err)
    error.value = 'Błąd podczas usuwania części'
  }
}

const onPartSaved = async () => {
  await loadDeviceParts()
  closePartModal()
}

const closePartModal = () => {
  showPartModal.value = false
  editingPart.value = null
}

const openAttachModal = () => {
  showAttachModal.value = true
}

const closeAttachModal = () => {
  showAttachModal.value = false
}

const onPartAttached = async () => {
  await loadDeviceParts()
  closeAttachModal()
}

const unlinkPart = async (part) => {
  try {
    if (!window.electronAPI?.database) return
    await window.electronAPI.database.run(
      'UPDATE spare_parts SET device_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [part.id]
    )
    await loadDeviceParts()
  } catch (e) {
    console.error('Error unlinking part:', e)
    alert('Nie udało się odwiązać części')
  }
}

const addDocument = () => {
  // TODO: Implement document management
  console.log('Add document for device:', device.value.id)
}

const editDocument = (document) => {
  // TODO: Implement document management
  console.log('Edit document:', document.id)
}

const downloadDocument = (document) => {
  // TODO: Implement document download
  console.log('Download document:', document.id)
}

// Watchers
watch(() => route.params.id, () => {
  loadDevice()
}, { immediate: true })

watch(device, () => {
  if (device.value) {
    Promise.all([
      loadDeviceOrders(),
      loadDeviceParts(),
      loadDeviceDocuments(),
      loadDeviceFiles()
    ])
  }
})

// Odśwież listę części przy przełączeniu na zakładkę "Części zamienne"
watch(activeTab, (newTab) => {
  if (newTab === 'parts' && device.value) {
    loadDeviceParts()
  }
})

// Lifecycle
onMounted(() => {
  loadDevice()
})
</script> 