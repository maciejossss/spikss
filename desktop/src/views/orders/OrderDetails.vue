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
    <div v-else-if="order">
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
              <h1 class="text-2xl font-bold text-secondary-900">{{ order.order_number }}</h1>
              <p class="text-lg text-secondary-700 mt-1">{{ order.title }}</p>
              <div class="flex items-center space-x-4 mt-2">
                <span
                  :class="getStatusClass(order.status)"
                  class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
                >
                  {{ getStatusText(order.status) }}
                </span>
                <span
                  :class="getPriorityClass(order.priority)"
                  class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
                >
                  {{ getPriorityText(order.priority) }}
                </span>
                <span class="text-sm text-secondary-500">
                  {{ getOrderTypeText(order.type) }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex space-x-3">
            <button
              v-if="order.status === 'new'"
              @click="startWork"
              class="btn-primary"
            >
              <i class="fas fa-play mr-2"></i>
              Rozpocznij pracę
            </button>
            <button
              v-if="order.status === 'in_progress'"
              @click="completeOrder"
              class="btn-success"
            >
              <i class="fas fa-check mr-2"></i>
              Zakończ zlecenie
            </button>
            <button
              @click="editOrder"
              class="btn-secondary"
            >
              <i class="fas fa-edit mr-2"></i>
              Edytuj
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

      <div
        v-if="detailsLoading"
        class="mb-4 flex items-center text-blue-600 text-sm bg-blue-50 border border-blue-200 rounded-lg px-4 py-2"
      >
        <i class="fas fa-sync-alt fa-spin mr-2"></i>
        <span>Pobieram dane z Railway… proszę czekać.</span>
      </div>

      <!-- Status Timeline -->
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
        <h3 class="text-lg font-medium text-secondary-900 mb-4">
          <i class="fas fa-history mr-2"></i>
          Historia statusów
        </h3>
        <div class="space-y-4">
          <div
            v-for="(status, index) in statusHistory"
            :key="index"
            class="flex items-center space-x-4"
          >
            <div class="flex-shrink-0">
              <div
                :class="[
                  status.current ? 'bg-primary-500' : 'bg-secondary-300',
                  'w-3 h-3 rounded-full'
                ]"
              ></div>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span
                  :class="[
                    status.current ? 'text-primary-600 font-medium' : 'text-secondary-600',
                    'text-sm'
                  ]"
                >
                  {{ status.name }}
                </span>
                <span v-if="status.date" class="text-xs text-secondary-500">
                  {{ formatDate(status.date) }}
                </span>
              </div>
              <p v-if="status.note" class="text-xs text-secondary-500 mt-1">
                {{ status.note }}
              </p>
            </div>
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
            </button>
          </nav>
        </div>

        <div class="p-6">
          <!-- Tab: Szczegóły -->
          <div v-if="activeTab === 'details'">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Podstawowe informacje -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-info-circle mr-2"></i>
                  Podstawowe informacje
                </h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Numer zlecenia</dt>
                    <dd class="text-sm text-secondary-900 font-mono">{{ order.order_number }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Tytuł</dt>
                    <dd class="text-sm text-secondary-900">{{ order.title }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Typ zlecenia</dt>
                    <dd class="text-sm text-secondary-900">{{ getOrderTypeText(order.type) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Data utworzenia</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(order.created_at) }}</dd>
                  </div>
                  <div v-if="order.completed_at">
                    <dt class="text-sm font-medium text-secondary-500">Data ukończenia</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(order.completed_at) }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Klient i urządzenie -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-user-cog mr-2"></i>
                  Klient i urządzenie
                </h3>
                <!-- Proponowane zmiany od serwisanta -->
                <div v-if="pendingClientChange" class="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start justify-between">
                  <div class="flex items-start">
                    <i class="fas fa-exclamation-triangle text-yellow-500 mr-3 mt-1"></i>
                    <div>
                      <p class="text-sm text-yellow-800 font-medium">Uwaga: proponowana zmiana danych klienta oczekuje na decyzję.</p>
                      <p class="text-xs text-yellow-700">Kliknij, aby porównać i zaakceptować/odrzucić.</p>
                    </div>
                  </div>
                  <button @click="openPendingModal()" class="btn-secondary btn-sm">
                    <i class="fas fa-eye mr-2"></i>
                    Zobacz zmiany
                  </button>
                </div>
                <div v-if="pendingDeviceChange" class="mb-4 bg-indigo-50 border border-indigo-200 rounded p-3 flex items-start justify-between">
                  <div class="flex items-start">
                    <i class="fas fa-tools text-indigo-500 mr-3 mt-1"></i>
                    <div>
                      <p class="text-sm text-indigo-800 font-medium">Uwaga: proponowana zmiana danych urządzenia oczekuje na decyzję.</p>
                      <p class="text-xs text-indigo-700">Kliknij, aby porównać i zaakceptować/odrzucić.</p>
                    </div>
                  </div>
                  <button @click="openPendingDeviceModal()" class="btn-secondary btn-sm">
                    <i class="fas fa-eye mr-2"></i>
                    Zobacz zmiany
                  </button>
                </div>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Klient</dt>
                    <dd class="text-sm text-secondary-900">
                      <router-link 
                        :to="`/clients/${order.client_id}`"
                        class="text-primary-600 hover:text-primary-900"
                      >
                        {{ order.client_name }}
                      </router-link>
                    </dd>
                  </div>
                  <div v-if="order.device_name">
                    <dt class="text-sm font-medium text-secondary-500">Urządzenie</dt>
                    <dd class="text-sm text-secondary-900">
                      <router-link 
                        v-if="order.device_id"
                        :to="`/devices/${order.device_id}`"
                        class="text-primary-600 hover:text-primary-900"
                      >
                        {{ order.device_name }}
                      </router-link>
                      <span v-else>{{ order.device_name }}</span>
                    </dd>
                  </div>
                  <div v-if="order.client_phone">
                    <dt class="text-sm font-medium text-secondary-500">Telefon</dt>
                    <dd class="text-sm text-secondary-900">
                      <a :href="`tel:${order.client_phone}`" class="text-primary-600 hover:text-primary-900">
                        {{ order.client_phone }}
                      </a>
                    </dd>
                  </div>
                  <div v-if="order.client_email">
                    <dt class="text-sm font-medium text-secondary-500">Email</dt>
                    <dd class="text-sm text-secondary-900">
                      <a :href="`mailto:${order.client_email}`" class="text-primary-600 hover:text-primary-900">
                        {{ order.client_email }}
                      </a>
                    </dd>
                  </div>
                  <div v-if="order.client_address">
                    <dt class="text-sm font-medium text-secondary-500">Adres</dt>
                    <dd class="text-sm text-secondary-900">
                      <a 
                        :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.client_address)}`"
                        target="_blank"
                        class="text-primary-600 hover:text-primary-900"
                        title="Otwórz w Google Maps"
                      >
                        {{ order.client_address }}
                        <i class="fas fa-external-link-alt ml-1 text-xs"></i>
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <!-- Terminy -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-calendar-alt mr-2"></i>
                  Terminy
                </h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Ustalony termin</dt>
                    <dd class="text-sm text-secondary-900">{{ formatScheduled(order.scheduled_date) }}</dd>
                  </div>
                  <div v-if="order.planned_start_date">
                    <dt class="text-sm font-medium text-secondary-500">Planowany start</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(order.planned_start_date) }}</dd>
                  </div>
                  <div v-if="order.planned_end_date">
                    <dt class="text-sm font-medium text-secondary-500">Planowane zakończenie</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDate(order.planned_end_date) }}</dd>
                  </div>
                  <div v-if="order.started_at">
                    <dt class="text-sm font-medium text-secondary-500">Rozpoczęto</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDateTime(order.started_at) }}</dd>
                  </div>
                  <div v-if="order.completed_at">
                    <dt class="text-sm font-medium text-secondary-500">Zakończono</dt>
                    <dd class="text-sm text-secondary-900">{{ formatDateTime(order.completed_at) }}</dd>
                  </div>
                  <div v-if="order.estimated_hours">
                    <dt class="text-sm font-medium text-secondary-500">Szacowany czas</dt>
                    <dd class="text-sm text-secondary-900">{{ order.estimated_hours }} godz.</dd>
                  </div>
                  <div v-if="order.actual_hours">
                    <dt class="text-sm font-medium text-secondary-500">Rzeczywisty czas</dt>
                    <dd class="text-sm text-secondary-900">{{ order.actual_hours }} godz.</dd>
                  </div>
                </dl>
                <div class="mt-3 flex items-center space-x-2">
                  <button @click="openEditSchedule" class="btn-secondary btn-sm"><i class="fas fa-edit mr-2"></i>Edytuj termin</button>
                  <button @click="openCloseEarly" class="btn-danger btn-sm"><i class="fas fa-ban mr-2"></i>Zamknij zlecenie przed czasem</button>
                </div>
              </div>

              <!-- Koszty -->
              <div class="bg-secondary-50 rounded-lg p-4">
                <h3 class="text-lg font-medium text-secondary-900 mb-4">
                  <i class="fas fa-euro-sign mr-2"></i>
                  Koszty
                </h3>
                <dl class="space-y-3">
                  <div v-if="order.labor_cost">
                    <dt class="text-sm font-medium text-secondary-500">Robocizna</dt>
                    <dd class="text-sm text-secondary-900">{{ order.labor_cost.toFixed(2) }} zł</dd>
                  </div>
                  <div v-if="order.parts_cost">
                    <dt class="text-sm font-medium text-secondary-500">Części</dt>
                    <dd class="text-sm text-secondary-900">{{ order.parts_cost.toFixed(2) }} zł</dd>
                  </div>
                  <div v-if="order.travel_cost">
                    <dt class="text-sm font-medium text-secondary-500">Koszt dojazdu</dt>
                    <dd class="text-sm text-secondary-900">{{ Number(order.travel_cost).toFixed(2) }} zł</dd>
                  </div>
                  <div v-if="order.total_cost">
                    <dt class="text-sm font-medium text-secondary-500">Koszt całkowity</dt>
                    <dd class="text-sm text-secondary-900 font-bold">{{ order.total_cost.toFixed(2) }} zł</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-secondary-500">Szacowany koszt (opis)</dt>
                    <dd class="text-sm text-secondary-900 whitespace-pre-wrap">{{ order.estimated_cost_note || '—' }}</dd>
                  </div>
                  <div class="mt-2 flex items-center space-x-2">
                    <button @click="toggleEditEstimate()" class="btn-secondary btn-sm">
                      <i class="fas" :class="isEditingEstimate ? 'fa-times' : 'fa-edit'"></i>
                      <span class="ml-2">{{ isEditingEstimate ? 'Anuluj' : 'Edytuj szacowany koszt' }}</span>
                    </button>
                    <button @click="editOrder" class="btn-primary btn-sm">
                      <i class="fas fa-calculator mr-2"></i>
                      Przejdź do edycji kosztów
                    </button>
                  </div>
                  <div v-if="isEditingEstimate" class="mt-3">
                    <textarea v-model="editableEstimate" rows="2" class="w-full p-3 border border-secondary-300 rounded-lg text-sm" placeholder="np. Usługa 3000–3500 zł, zależy od ..."></textarea>
                    <div class="mt-2 flex items-center space-x-2">
                      <button @click="saveEstimate" :disabled="isSavingEstimate" class="btn-primary btn-sm">
                        <i v-if="isSavingEstimate" class="fas fa-spinner fa-spin mr-2"></i>
                        <i v-else class="fas fa-save mr-2"></i>
                        Zapisz
                      </button>
                      <button @click="sendEstimateToApp" :disabled="isSavingEstimate || !editableEstimate" class="btn-success btn-sm">
                        <i class="fas fa-paper-plane mr-2"></i>
                        Wyślij do aplikacji
                      </button>
                      <button @click="toggleEditEstimate" :disabled="isSavingEstimate" class="btn-secondary btn-sm">Anuluj</button>
                    </div>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Opis -->
            <div class="mt-6 bg-secondary-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-secondary-900 mb-3">
                <i class="fas fa-align-left mr-2"></i>
                Opis problemu
              </h3>
              <div class="flex items-center justify-between mb-3">
                <div class="text-sm text-secondary-600" v-if="!isEditingDescription && !order.description">Brak opisu</div>
                <div></div>
                <button @click="toggleEditDescription" class="btn-secondary btn-sm">
                  <i class="fas" :class="isEditingDescription ? 'fa-times' : 'fa-edit'"></i>
                  <span class="ml-2">{{ isEditingDescription ? 'Anuluj' : 'Edytuj' }}</span>
                </button>
              </div>

              <div v-if="isEditingDescription">
                <textarea
                  v-model="editableDescription"
                  rows="4"
                  class="w-full p-3 border border-secondary-300 rounded-lg resize-y text-sm"
                  placeholder="Wpisz opis problemu..."
                ></textarea>
                <div class="mt-3 flex items-center space-x-2">
                  <button @click="saveDescription" :disabled="isSavingDescription" class="btn-primary btn-sm">
                    <i v-if="isSavingDescription" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-save mr-2"></i>
                    Zapisz
                  </button>
                  <button @click="toggleEditDescription" :disabled="isSavingDescription" class="btn-secondary btn-sm">Anuluj</button>
                </div>
              </div>
              <p v-else class="text-sm text-secondary-700 whitespace-pre-wrap">{{ order.description }}</p>
            </div>

            <!-- Wykonane czynności i notatki z zakończenia (z aplikacji mobilnej) -->
            <div class="mt-6 bg-secondary-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-secondary-900 mb-3">
                <i class="fas fa-list-check mr-2"></i>
                Szczegóły wykonania
              </h3>
              <div class="mb-3">
                <div class="text-sm text-secondary-600 mb-1">Wykonane czynności:</div>
                <template v-if="completedCategoryLabels.length">
                  <ul class="list-disc list-inside text-sm text-secondary-900">
                    <li v-for="c in completedCategoryLabels" :key="c">{{ c }}</li>
                  </ul>
                </template>
                <div v-else class="text-sm text-secondary-600">Brak danych</div>
              </div>
              <div class="text-sm text-secondary-700 whitespace-pre-wrap mb-2">
                <span class="text-xs text-secondary-500">Opis wykonanych czynności:</span>
                <div>{{ order.completion_notes || 'Brak danych' }}</div>
              </div>
              <div class="text-sm text-secondary-700 whitespace-pre-wrap">
                <span class="text-xs text-secondary-500">Notatki technika:</span>
                <div>{{ technicianNotes }}</div>
              </div>
            </div>

            <!-- Notatki serwisowe (inne) -->
            <div v-if="order.service_notes" class="mt-6 bg-secondary-50 rounded-lg p-4">
              <h3 class="text-lg font-medium text-secondary-900 mb-3">
                <i class="fas fa-sticky-note mr-2"></i>
                Notatki serwisowe
              </h3>
              <p class="text-sm text-secondary-700 whitespace-pre-wrap">{{ order.service_notes }}</p>
            </div>
			<!-- Galeria zdjęć z mobilnej – WYŁĄCZONA -->

			<!-- Dokumentacja urządzenia (lokalna, jak w Urządzeniach) -->
			<div v-if="activeTab === 'details'" class="mt-6 bg-secondary-50 rounded-lg p-4">
				<div class="flex items-center justify-between mb-3">
					<h3 class="text-lg font-medium text-secondary-900">
						<i class="fas fa-folder-open mr-2"></i>
						Dokumentacja urządzenia
					</h3>
				</div>
                <div v-if="!order?.device_id" class="text-sm text-secondary-600">Brak powiązanego urządzenia</div>
                <DeviceFilesManager v-else :key="filesWidgetKey" :device-id="order.device_id" :readonly="true" />
			</div>

			<!-- Photo modal -->
			<div v-if="showPhotoModal" class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" @click="showPhotoModal=false">
				<img :src="selectedPhotoSrc" class="max-w-[90vw] max-h-[90vh] object-contain" @click.stop />
				<button class="absolute top-4 right-4 text-white text-2xl" @click="showPhotoModal=false">×</button>
			</div>
          </div>

          <!-- Tab: Zużyte części -->
          <div v-if="activeTab === 'parts'">
            <div v-if="orderParts.length === 0">
              <div class="text-center py-8" v-if="!order?.parts_used">
                <i class="fas fa-puzzle-piece text-4xl text-secondary-300 mb-4"></i>
                <p class="text-secondary-600 mb-4">Brak wykorzystanych części w tym zleceniu</p>
                <button @click="addPart" class="btn-primary" :disabled="detailsLoading">
                  <i class="fas fa-plus mr-2"></i>
                  Dodaj część
                </button>
              </div>
              <div v-else class="bg-secondary-50 border border-secondary-200 rounded-lg p-4 text-left">
                <h3 class="text-md font-medium text-secondary-900 mb-2">
                  <i class="fas fa-info-circle mr-2"></i>
                  Części zgłoszone z aplikacji mobilnej
                </h3>
                <p class="text-sm text-secondary-700 whitespace-pre-wrap">
                  {{ order.parts_used }}
                </p>
                <div class="mt-3 flex items-center space-x-2">
                  <button @click="transformPartsUsed" class="btn-secondary" :disabled="detailsLoading">Przekształć w pozycje</button>
                  <button @click="addPart" class="btn-primary" :disabled="detailsLoading">
                    <i class="fas fa-plus mr-2"></i>
                    Dodaj część
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Wykorzystane części ({{ orderParts.length }})
                </h3>
                <button @click="addPart" class="btn-primary" :disabled="detailsLoading">
                  <i class="fas fa-plus mr-2"></i>
                  Dodaj część
                </button>
              </div>
              
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-secondary-200 rounded-lg">
                  <thead class="bg-secondary-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Część</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nr katalogowy</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Ilość</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cena jedn.</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Wartość</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Akcje</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-secondary-200">
                    <tr v-for="part in orderParts" :key="part.id">
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ part.name }}</td>
                      <td class="px-4 py-3 text-sm text-secondary-600 font-mono">{{ part.part_number }}</td>
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ part.quantity }}</td>
                      <td class="px-4 py-3 text-sm text-secondary-900">{{ part.unit_price.toFixed(2) }} zł</td>
                      <td class="px-4 py-3 text-sm text-secondary-900 font-medium">
                        {{ (part.quantity * part.unit_price).toFixed(2) }} zł
                      </td>
                      <td class="px-4 py-3 text-sm">
                        <button
                          @click="editPart(part)"
                          class="text-secondary-600 hover:text-secondary-900 mr-2"
                          :disabled="detailsLoading"
                          :class="{ 'opacity-50 cursor-not-allowed': detailsLoading }"
                          title="Edytuj"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button
                          @click="removePart(part)"
                          class="text-red-600 hover:text-red-900"
                          :disabled="detailsLoading"
                          :class="{ 'opacity-50 cursor-not-allowed': detailsLoading }"
                          title="Usuń"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <!-- Tab: Czas pracy (uproszczony, spójny z zakończonymi) -->
          <div v-if="activeTab === 'time'">
            <div class="bg-secondary-50 border border-secondary-200 rounded-lg p-4 max-w-3xl">
              <h3 class="text-md font-medium text-secondary-900 mb-3"><i class="fas fa-stopwatch mr-2"></i>Czas pracy</h3>
              <div class="text-sm text-secondary-700 space-y-1">
                <div>
                  <span class="text-secondary-600">Zgłoszone:</span>
                  <strong v-if="Number(order?.actual_hours||0) > 0">{{ Number(order.actual_hours).toFixed(2) }} h</strong>
                  <strong v-else>{{ computedWorkedHm }} <span class="text-xs text-secondary-500">(policzone)</span></strong>
                </div>
                <div>
                  <span class="text-secondary-600">Policzone (start→koniec):</span>
                  <strong>{{ computedWorkedHm }}</strong>
                </div>
                <div>
                  <span class="text-secondary-600">Wysłano:</span>
                  <strong>{{ order?.desktop_synced_at ? formatDateTime(order.desktop_synced_at) : '—' }}</strong>
                </div>
                <div>
                  <span class="text-secondary-600">Zakończono:</span>
                  <strong>{{ order?.completed_at ? formatDateTime(order.completed_at) : '—' }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Faktury -->
          <div v-if="activeTab === 'invoices'">
            <div v-if="orderInvoices.length === 0" class="text-center py-8">
              <i class="fas fa-file-invoice text-4xl text-secondary-300 mb-4"></i>
              <p class="text-secondary-600 mb-4">Brak faktur dla tego zlecenia</p>
              <button @click="createInvoice" class="btn-primary">
                <i class="fas fa-plus mr-2"></i>
                Wystaw fakturę
              </button>
            </div>

            <div v-else class="space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-medium text-secondary-900">
                  Faktury ({{ orderInvoices.length }})
                </h3>
                <button @click="createInvoice" class="btn-primary">
                  <i class="fas fa-plus mr-2"></i>
                  Wystaw fakturę
                </button>
              </div>

              <div class="space-y-3">
                <div
                  v-for="invoice in orderInvoices"
                  :key="invoice.id"
                  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <h4 class="font-medium text-secondary-900">{{ invoice.invoice_number }}</h4>
                        <span
                          :class="getInvoiceStatusClass(invoice.status)"
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        >
                          {{ getInvoiceStatusText(invoice.status) }}
                        </span>
                      </div>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <span>{{ formatDate(invoice.issue_date) }}</span>
                        <span class="font-medium">{{ invoice.gross_amount?.toFixed(2) }} zł</span>
                      </div>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="$router.push(`/invoices/${invoice.id}`)"
                        class="text-primary-600 hover:text-primary-900"
                        title="Zobacz szczegóły"
                      >
                        <i class="fas fa-eye"></i>
                      </button>
                      <button
                        @click="downloadInvoice(invoice)"
                        class="text-secondary-600 hover:text-secondary-900"
                        title="Pobierz PDF"
                      >
                        <i class="fas fa-download"></i>
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

    <!-- Order not found -->
    <div v-else class="text-center py-12">
      <i class="fas fa-clipboard-list text-6xl text-secondary-300 mb-4"></i>
      <h2 class="text-xl font-medium text-secondary-900 mb-2">Zlecenie nie zostało znalezione</h2>
      <p class="text-secondary-600 mb-6">Zlecenie o podanym ID nie istnieje lub zostało usunięte.</p>
      <router-link to="/orders" class="btn-primary">
        <i class="fas fa-arrow-left mr-2"></i>
        Powrót do listy zleceń
      </router-link>
    </div>

    <!-- Modal: Edycja terminu -->
    <div v-if="showScheduleModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-medium text-secondary-900 mb-4"><i class="fas fa-calendar mr-2"></i>Edytuj termin</h3>
        <div class="space-y-3">
          <label class="text-sm text-secondary-600">Data</label>
          <input v-model="scheduleDate" type="date" class="w-full border rounded p-2" />
          <label class="text-sm text-secondary-600">Godzina</label>
          <input v-model="scheduleTime" type="time" class="w-full border rounded p-2" />
        </div>
        <div class="mt-5 flex items-center justify-end space-x-2">
          <button @click="showScheduleModal=false" class="btn-secondary btn-sm">Anuluj</button>
          <button @click="saveSchedule" :disabled="savingSchedule" class="btn-primary btn-sm">
            <i v-if="savingSchedule" class="fas fa-spinner fa-spin mr-2"></i>
            Zapisz
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Zamknięcie przed czasem -->
    <div v-if="showCloseEarlyModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-medium text-secondary-900 mb-2"><i class="fas fa-ban mr-2"></i>Zamknij zlecenie przed czasem</h3>
        <p class="text-sm text-secondary-600 mb-3">Podaj powód zamknięcia. Zlecenie trafi do archiwum.</p>
        <textarea v-model="closeReason" rows="3" class="w-full border rounded p-2" placeholder="Napisz powód..."></textarea>
        <div class="mt-5 flex items-center justify-end space-x-2">
          <button @click="showCloseEarlyModal=false" class="btn-secondary btn-sm">Anuluj</button>
          <button @click="confirmCloseEarly" :disabled="!closeReason || closingEarly" class="btn-danger btn-sm">
            <i v-if="closingEarly" class="fas fa-spinner fa-spin mr-2"></i>
            Zamknij przed czasem
          </button>
        </div>
      </div>
    </div>

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń zlecenie"
      :message="`Czy na pewno chcesz usunąć zlecenie ${order.order_number}? Ta operacja jest nieodwracalna.`"
      confirm-text="Usuń zlecenie"
      confirm-class="btn-danger"
      @confirm="deleteOrder"
      @cancel="showDeleteModal = false"
    />

    <!-- Modal dodawania/edycji części -->
    <OrderPartFormModal
      v-if="showPartModal"
      :order-id="order?.id"
      :device-id="order?.device_id || null"
      :part-row="editingPart"
      :is-edit="!!editingPart"
      @saved="onPartSaved"
      @close="closePartModal"
    />

    <!-- Modal: Proponowane zmiany klienta -->
    <div v-if="showPendingModal && pendingClientChange" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-secondary-900">
            <i class="fas fa-user-edit mr-2"></i>
            Proponowane zmiany danych klienta
          </h3>
          <button @click="showPendingModal=false" class="text-secondary-500 hover:text-secondary-800"><i class="fas fa-times"></i></button>
        </div>
        <div v-if="clientChangeRows.length === 0" class="bg-secondary-50 border border-secondary-200 rounded p-4 text-sm text-secondary-600">
          Brak rozpoznanych różnic do zastosowania.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="row in clientChangeRows"
            :key="row.label"
            class="bg-secondary-50 rounded p-3 border border-secondary-100"
          >
            <div class="text-xs text-secondary-500 uppercase tracking-wide">{{ row.label }}</div>
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-secondary-500 text-xs mb-1">Aktualnie</div>
                <div class="font-mono text-secondary-700 whitespace-pre-line">{{ row.current }}</div>
              </div>
              <div>
                <div class="text-secondary-500 text-xs mb-1">Propozycja</div>
                <div
                  :class="row.removal ? 'font-mono text-red-700 whitespace-pre-line' : 'font-mono text-yellow-800 whitespace-pre-line'"
                >
                  {{ row.proposed }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-5 flex items-center justify-end space-x-2">
          <button @click="rejectPending(pendingClientChange.id)" class="btn-secondary">
            <i class="fas fa-times mr-2"></i>
            Odrzuć
          </button>
          <button @click="acceptPending(pendingClientChange.id)" class="btn-success">
            <i class="fas fa-check mr-2"></i>
            Akceptuj i zastosuj
          </button>
        </div>
      </div>
    </div>

    <!-- Modal: Proponowane zmiany urządzenia -->
    <div v-if="showPendingDeviceModal && pendingDeviceChange" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-secondary-900">
            <i class="fas fa-tools mr-2"></i>
            Proponowane zmiany danych urządzenia
          </h3>
          <button @click="showPendingDeviceModal=false" class="text-secondary-500 hover:text-secondary-800"><i class="fas fa-times"></i></button>
        </div>
        <div v-if="deviceChangeRows.length === 0" class="bg-secondary-50 border border-secondary-200 rounded p-4 text-sm text-secondary-600">
          Brak rozpoznanych różnic do zastosowania.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="row in deviceChangeRows"
            :key="row.label"
            class="bg-secondary-50 rounded p-3 border border-secondary-100"
          >
            <div class="text-xs text-secondary-500 uppercase tracking-wide">{{ row.label }}</div>
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <div class="text-secondary-500 text-xs mb-1">Aktualnie</div>
                <div class="font-mono text-secondary-700 whitespace-pre-line">{{ row.current }}</div>
              </div>
              <div>
                <div class="text-secondary-500 text-xs mb-1">Propozycja</div>
                <div
                  :class="row.removal ? 'font-mono text-red-700 whitespace-pre-line' : 'font-mono text-indigo-800 whitespace-pre-line'"
                >
                  {{ row.proposed }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-5 flex items-center justify-end space-x-2">
          <button @click="rejectPending(pendingDeviceChange.id)" class="btn-secondary"><i class="fas fa-times mr-2"></i>Odrzuć</button>
          <button @click="acceptPending(pendingDeviceChange.id)" class="btn-success"><i class="fas fa-check mr-2"></i>Akceptuj i zastosuj</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatDate, formatDateTime } from '../../utils/date'
import ConfirmModal from '../../components/ConfirmModal.vue'
import OrderPartFormModal from '../../components/OrderPartFormModal.vue'
import config from '../../../env-config.js'
import DeviceFilesManager from '../../components/DeviceFilesManager.vue'

const route = useRoute()
const router = useRouter()

// Reactive data
const order = ref(null)
const orderParts = ref([])
const timeEntries = ref([])
// Railway time summary (read-only)
const railwayTimeSummary = ref(null)
const railwayTimeLoading = ref(false)
const railwayTimeError = ref('')
// Live timer for open session
const liveSeconds = ref(null)
const livePaused = ref(false)
let liveTimerId = null
let pollTimerId = null
// SSE wyłączone tymczasowo dla stabilności
let sse = null
const orderInvoices = ref([])
const isLoading = ref(false)
const detailsLoading = ref(false)
const error = ref('')
const activeTab = ref('details')
const showDeleteModal = ref(false)
const showPartModal = ref(false)
const editingPart = ref(null)
const showPhotoModal = ref(false)
const selectedPhotoSrc = ref('')
const isCheckingPhotos = ref(false)
const loadingDeviceFiles = ref(false)
const filesError = ref('')
const deviceFiles = ref({ photos: [], files: [] })
const isEditingDescription = ref(false)
const isSavingDescription = ref(false)
const editableDescription = ref('')
const isEditingEstimate = ref(false)
const isSavingEstimate = ref(false)
const editableEstimate = ref('')
const showScheduleModal = ref(false)
const savingSchedule = ref(false)
const scheduleDate = ref('')
const scheduleTime = ref('')
const showCloseEarlyModal = ref(false)
const closeReason = ref('')
const closingEarly = ref(false)
const pendingChanges = ref([])
const clientSnapshot = ref(null)
const deviceSnapshot = ref(null)
const showPendingModal = ref(false)
const showPendingDeviceModal = ref(false)
const filesWidgetKey = ref(0)
const importGuard = ref(false)

// Słownik kategorii usług (do mapowania kodów → nazwy)
const serviceCategories = ref([])

// Fallback: kategorie z mobile app (jeśli baza danych nie ma wszystkich)
const MOBILE_SERVICE_CATEGORIES = {
  '02': { name: '02: AWARIA', subcategories: { '0201': '0201: Naprawa bez użycia części', '0202': '0202: Naprawa z użyciem części' } },
  '01': { name: '01: Diagnostyka', subcategories: { '0101': '0101: Diagnostyka awarii', '0102': '0102: Sprawdzenie parametrów' } },
  '04': { name: '04: Czyszczenie', subcategories: { '0401': '0401: Czyszczenie kotła', '0402': '0402: Czyszczenie palnika' } },
  '05': { name: '05: Regulacja', subcategories: { '0501': '0501: Regulacja palnika', '0502': '0502: Regulacja automatyki' } },
  '08': { name: '08: Przegląd i konserwacja', subcategories: { '0801': '0801: Przegląd okresowy', '0802': '0802: Konserwacja' } },
  '09': { name: '09: Remont i konserwacja', subcategories: { '0901': '0901: Remont kotła', '0902': '0902: Wymiana części' } },
  '06': { name: '06: Sprawdzenie szczelności gazu', subcategories: { '0601': '0601: Sprawdzenie szczelności' } },
  '07': { name: '07: Analiza spalin', subcategories: { '0701': '0701: Analiza spalin' } },
  '03': { name: '03: Przeszkolenie', subcategories: { '0301': '0301: Przeszkolenie użytkownika' } },
  '11': { name: '11: Uruchomienie', subcategories: { '1101': '1101: Uruchomienie urządzenia' } },
  '10': { name: '10: Usunięcie awarii', subcategories: { '1001': '1001: Usunięcie awarii' } }
}

// Computed properties
const tabs = computed(() => [
  { id: 'details', name: 'Szczegóły', icon: 'fas fa-info-circle' },
  { id: 'parts', name: 'Części', icon: 'fas fa-puzzle-piece' },
  { id: 'time', name: 'Czas pracy', icon: 'fas fa-clock' },
  { id: 'invoices', name: 'Faktury', icon: 'fas fa-file-invoice' }
])

const pendingClientChange = computed(() => {
  try {
    if (!order.value || !pendingChanges.value) return null
    const cid = Number(order.value.client_id)
    return (pendingChanges.value.find(pc => pc.entity === 'client' && Number(pc.local_entity_id ?? pc.entity_id) === cid) || null)
  } catch (_) { return null }
})

const pendingDeviceChange = computed(() => {
  try {
    if (!order.value || !pendingChanges.value) return null
    const did = Number(order.value.device_id)
    if (!did) return null
    return (pendingChanges.value.find(pc => pc.entity === 'device' && Number(pc.local_entity_id ?? pc.entity_id) === did) || null)
  } catch (_) { return null }
})

const normalizeValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

const formatDisplayValue = (value, type = 'text') => {
  const normalized = normalizeValue(value)
  if (normalized === '') return '—'
  if (type === 'date') {
    const formatted = formatDate(normalized)
    return formatted || normalized
  }
  return normalized
}

const clientChangeRows = computed(() => {
  const change = pendingClientChange.value
  if (!change) return []
  const payload = change.payload || {}
  const snapshot = clientSnapshot.value || {}
  const rows = []
  const fields = [
    { key: 'phone', label: 'Telefon', current: () => snapshot.phone ?? order.value?.client_phone ?? '' },
    { key: 'email', label: 'Email', current: () => snapshot.email ?? order.value?.client_email ?? '' },
    {
      key: 'address',
      label: 'Adres',
      current: () => snapshot.address ?? order.value?.client_address ?? ''
    }
  ]
  for (const field of fields) {
    const currentRaw = typeof field.current === 'function' ? field.current() : snapshot[field.key]
    const proposedRaw = payload[field.key]
    const currentNorm = normalizeValue(currentRaw)
    const proposedNorm = normalizeValue(proposedRaw)
    if (currentNorm === proposedNorm) continue
    const removal = proposedNorm === ''
    rows.push({
      label: field.label,
      current: formatDisplayValue(currentRaw),
      proposed: removal ? '(usunięcie wartości)' : formatDisplayValue(proposedRaw),
      removal
    })
  }
  return rows
})

const deviceChangeRows = computed(() => {
  const change = pendingDeviceChange.value
  if (!change) return []
  const payload = change.payload || {}
  const snapshot = deviceSnapshot.value || {}
  const rows = []
  const fields = [
    {
      label: 'Marka',
      getCurrent: () => snapshot.brand ?? snapshot.manufacturer ?? order.value?.device_brand ?? '',
      getProposed: () => payload.brand ?? payload.manufacturer ?? ''
    },
    {
      key: 'model',
      label: 'Model',
      getCurrent: () => snapshot.model ?? order.value?.device_model ?? ''
    },
    {
      key: 'serial_number',
      label: 'S/N',
      getCurrent: () => snapshot.serial_number ?? order.value?.device_serial ?? ''
    },
    {
      key: 'fuel_type',
      label: 'Paliwo',
      getCurrent: () => snapshot.fuel_type ?? order.value?.device_fuel_type ?? ''
    },
    { key: 'installation_date', label: 'Instalacja', type: 'date' },
    { key: 'last_service_date', label: 'Ostatni serwis', type: 'date' },
    { key: 'next_service_date', label: 'Następny serwis', type: 'date' },
    { key: 'warranty_end_date', label: 'Gwarancja do', type: 'date' },
    { key: 'notes', label: 'Notatki' }
  ]

  for (const field of fields) {
    const type = field.type || 'text'
    const currentRaw = field.getCurrent ? field.getCurrent() : snapshot[field.key] ?? order.value?.[`device_${field.key}`] ?? ''
    const proposedRaw = field.getProposed ? field.getProposed() : payload[field.key]
    const currentNorm = normalizeValue(currentRaw)
    const proposedNorm = normalizeValue(type === 'date' ? proposedRaw && proposedRaw.slice ? proposedRaw.slice(0, 10) : proposedRaw : proposedRaw)
    if (currentNorm === proposedNorm) continue
    const removal = proposedNorm === ''
    rows.push({
      label: field.label,
      current: formatDisplayValue(currentRaw, type),
      proposed: removal ? '(usunięcie wartości)' : formatDisplayValue(proposedRaw, type),
      removal
    })
  }
  return rows
})

const buildAddressFromRow = (row) => {
  if (!row) return ''
  if (row.address && normalizeValue(row.address) !== '') return row.address
  const parts = []
  if (row.address_street && normalizeValue(row.address_street) !== '') parts.push(row.address_street)
  const cityPart = []
  if (row.address_postal_code && normalizeValue(row.address_postal_code) !== '') cityPart.push(row.address_postal_code)
  if (row.address_city && normalizeValue(row.address_city) !== '') cityPart.push(row.address_city)
  if (cityPart.length) parts.push(cityPart.join(' '))
  if (row.address_country && normalizeValue(row.address_country) !== '') parts.push(row.address_country)
  return parts.join(', ')
}

const loadClientSnapshot = async () => {
  if (!window.electronAPI?.database?.get || !order.value?.client_id) {
    clientSnapshot.value = null
    return
  }
  try {
    const row = await window.electronAPI.database.get(
      `SELECT phone, email, address, address_street, address_city, address_postal_code, address_country
         FROM clients
        WHERE id = ?`,
      [order.value.client_id]
    )
    if (row) {
      clientSnapshot.value = {
        phone: row.phone || null,
        email: row.email || null,
        address: buildAddressFromRow(row)
      }
    } else {
      clientSnapshot.value = null
    }
  } catch (_) {
    clientSnapshot.value = null
  }
}

const loadDeviceSnapshot = async () => {
  if (!window.electronAPI?.database?.get || !order.value?.device_id) {
    deviceSnapshot.value = null
    return
  }
  try {
    const row = await window.electronAPI.database.get(
      `SELECT manufacturer, brand, model, serial_number, fuel_type,
              installation_date, last_service_date, next_service_date, warranty_end_date, notes
         FROM devices
        WHERE id = ?`,
      [order.value.device_id]
    )
    if (row) {
      deviceSnapshot.value = {
        manufacturer: row.manufacturer || null,
        brand: row.brand || null,
        model: row.model || null,
        serial_number: row.serial_number || null,
        fuel_type: row.fuel_type || null,
        installation_date: row.installation_date || null,
        last_service_date: row.last_service_date || null,
        next_service_date: row.next_service_date || null,
        warranty_end_date: row.warranty_end_date || null,
        notes: row.notes || null
      }
    } else {
      deviceSnapshot.value = null
    }
  } catch (_) {
    deviceSnapshot.value = null
  }
}

const statusHistory = computed(() => {
  if (!order.value) return []
  
  const statuses = [
    { id: 'new', name: 'Nowe zlecenie', date: order.value.created_at, current: order.value.status === 'new' },
    { id: 'in_progress', name: 'W realizacji', date: order.value.started_at, current: order.value.status === 'in_progress' },
    { id: 'waiting_for_parts', name: 'Oczekuje na części', date: null, current: order.value.status === 'waiting_for_parts' },
    { id: 'completed', name: 'Ukończone', date: order.value.completed_at, current: order.value.status === 'completed' }
  ]
  
  return statuses.filter(s => s.date || s.current)
})

const totalWorkedHours = computed(() => {
  return timeEntries.value.reduce((total, entry) => total + parseFloat(entry.duration || 0), 0)
})
// Policzone (start→koniec) z order.started_at / order.completed_at
const computedWorkedHm = computed(() => {
  try {
    const s = order.value?.started_at ? new Date(order.value.started_at).getTime() : null
    const e = order.value?.completed_at ? new Date(order.value.completed_at).getTime() : null
    if (!s || !e || e <= s) return '0h 0m'
    const min = Math.round((e - s) / 60000)
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}h ${m}m`
  } catch (_) { return '0h 0m' }
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

const getOrderTypeText = (type) => {
  const texts = {
    repair: 'Naprawa',
    maintenance: 'Konserwacja',
    installation: 'Instalacja',
    inspection: 'Przegląd'
  }
  return texts[type] || type
}

const getInvoiceStatusClass = (status) => {
  const classes = {
    draft: 'bg-secondary-100 text-secondary-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getInvoiceStatusText = (status) => {
  const texts = {
    draft: 'Projekt',
    sent: 'Wysłana',
    paid: 'Opłacona',
    overdue: 'Przeterminowana'
  }
  return texts[status] || status
}

// Data loading methods
const loadOrder = async () => {
  isLoading.value = true
  error.value = ''
  let hydrationInProgress = false
  
  try {
    const orderId = parseInt(route.params.id)
    
    if (Number.isFinite(orderId)) {
      if (window.electronAPI?.database) {
        try {
          const hydrationRow = await window.electronAPI.database.get(
            'SELECT notes, actual_hours, actual_start_date, actual_end_date FROM service_orders WHERE id = ?',
            [orderId]
          )
          const needsHydration =
            !hydrationRow ||
            !hydrationRow.completion_notes ||
            !hydrationRow.notes ||
            hydrationRow.actual_hours == null ||
            Number(hydrationRow.actual_hours) <= 0 ||
            hydrationRow.actual_start_date == null ||
            hydrationRow.actual_end_date == null
          if (needsHydration) {
            hydrationInProgress = true
            detailsLoading.value = true
            await fetch(`http://localhost:5174/api/railway/import-order/${orderId}?detailsOnly=1`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ markImported: false, detailsOnly: true })
            }).catch((err) => {
              console.warn('[loadOrder] Unable to hydrate order from Railway:', err?.message || err)
            })
          }
        } catch (err) {
          console.warn('[loadOrder] SQLite hydration check failed:', err?.message || err)
        }
      } else {
        hydrationInProgress = true
        detailsLoading.value = true
        await fetch(`http://localhost:5174/api/railway/import-order/${orderId}?detailsOnly=1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markImported: false, detailsOnly: true })
        }).catch((err) => {
          console.warn('[loadOrder] Unable to hydrate order from Railway (no db):', err?.message || err)
        })
      }
    }

    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        `SELECT 
           so.*, 
           c.first_name, c.last_name, c.company_name, c.type as client_type,
           c.phone as c_phone, c.email as c_email, c.address as c_address,
           c.address_street, c.address_city, c.address_postal_code,
           d.name as d_name, d.manufacturer as d_brand, d.model as d_model,
           d.serial_number as d_serial, d.fuel_type as d_fuel,
           d.installation_date as d_installation_date,
           d.warranty_end_date as d_warranty_end_date
         FROM service_orders so 
         LEFT JOIN clients c ON so.client_id = c.id
         LEFT JOIN devices d ON so.device_id = d.id
         WHERE so.id = ?`,
        [orderId]
      )
      
      if (result && result.length > 0) {
        const row = result[0]
        // Adres: preferuj so.address, potem c.address, potem części
        const addrParts = []
        if (row.address_street) addrParts.push(row.address_street)
        if (row.address_postal_code && row.address_city) {
          addrParts.push(`${row.address_postal_code} ${row.address_city}`)
        } else {
          if (row.address_postal_code) addrParts.push(row.address_postal_code)
          if (row.address_city) addrParts.push(row.address_city)
        }
        const fullAddress = row.address || row.c_address || addrParts.join(', ')

        // Klient: firma → imię+nazwisko → so.client_name → fallback
        const nameFromClient = row.company_name || `${(row.first_name||'').trim()} ${(row.last_name||'').trim()}`.trim()
        const clientName = nameFromClient || row.client_name || 'Klient bez nazwy'
        const clientPhone = row.client_phone || row.c_phone || null
        const clientEmail = row.client_email || row.c_email || null

        // Urządzenie: nazwa z devices → marka+model → so.device_model → so.device_type
        const deviceDisplay = row.d_name 
          || (row.d_brand && row.d_model ? `${row.d_brand} ${row.d_model}` : (row.d_model || null))
          || (row.device_model || row.device_type || null)

        order.value = {
          ...row,
          device_name: deviceDisplay || row.device_name || null,
          device_brand: row.d_brand || row.device_brand || null,
          device_model: row.d_model || row.device_model || null,
          device_serial: row.d_serial || row.device_serial || null,
          device_fuel_type: row.d_fuel || row.device_fuel_type || null,
          device_installation_date: row.d_installation_date || row.device_installation_date || null,
          device_warranty_end_date: row.d_warranty_end_date || row.device_warranty_end_date || null,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          client_address: fullAddress
        }
        await loadClientSnapshot()
        await loadDeviceSnapshot()
        // Po wczytaniu zlecenia sprawdź czy są proponowane zmiany dla klienta
        await loadPendingChanges()
        // Jeśli zlecenie jest ukończone, a brak danych z mobilnej – spróbuj bezpiecznie dociągnąć z Railway
        try { await ensureCompletionImported() } catch (_) {}
      } else {
        order.value = null
        clientSnapshot.value = null
        deviceSnapshot.value = null
      }
    } else {
      // Demo data fallback
      const demoOrders = [
        { 
          id: 1,
          order_number: 'SRV-2024-001',
          client_id: 1,
          client_name: 'Jan Kowalski',
          client_phone: '+48 123 456 789',
          client_email: 'jan.kowalski@email.com',
          device_id: 1,
          device_name: 'Kocioł gazowy Viessmann',
          title: 'Przegląd roczny kotła',
          description: 'Przegląd roczny kotła gazowego - sprawdzenie wszystkich podzespołów, wymiana filtrów, kontrola ciśnienia.',
          service_notes: 'Wymieniono filtr powietrza. Sprawdzono ciśnienie - OK. Wyczyszczono komorę spalania.',
          type: 'maintenance',
          status: 'completed',
          priority: 'medium',
          planned_start_date: '2024-06-01',
          planned_end_date: '2024-06-01',
          estimated_hours: 3,
          actual_hours: 3.5,
          labor_cost: 300,
          parts_cost: 150,
          total_cost: 450,
          created_at: '2024-06-01T09:00:00Z',
          started_at: '2024-06-01T09:15:00Z',
          completed_at: '2024-06-01T12:30:00Z',
          parts_used: 'Filtr powietrza, Uszczelka komory spalania'
        },
        { 
          id: 2,
          order_number: 'SRV-2024-015',
          client_id: 2,
          client_name: 'ABC Sp. z o.o.',
          client_phone: '+48 22 123 45 67',
          client_email: 'kontakt@abc.pl',
          device_id: 2,
          device_name: 'Klimatyzator Daikin',
          title: 'Naprawa klimatyzacji - brak chłodzenia',
          description: 'Klimatyzator nie chłodzi. Sprawdzić czynnik chłodniczy i możliwe wycieki.',
          type: 'repair',
          status: 'in_progress',
          priority: 'high',
          planned_start_date: '2024-07-05',
          planned_end_date: '2024-07-06',
          estimated_hours: 4,
          actual_hours: 2.5,
          labor_cost: 400,
          parts_cost: 400,
          total_cost: 800,
          created_at: '2024-07-05T14:30:00Z',
          started_at: '2024-07-05T15:00:00Z',
          completed_at: null,
          parts_used: 'Czynnik chłodniczy, Uszczelka wydechowa'
        }
      ]
      order.value = demoOrders.find(o => o.id === orderId) || null
    }
  } catch (err) {
    console.error('Error loading order:', err)
    error.value = 'Błąd podczas ładowania danych zlecenia'
  } finally {
    if (hydrationInProgress) detailsLoading.value = false
    isLoading.value = false
  }
}

const loadOrderParts = async () => {
  if (!order.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT op.*, sp.name, sp.part_number FROM order_parts op LEFT JOIN spare_parts sp ON op.part_id = sp.id WHERE op.order_id = ? ORDER BY sp.name',
        [order.value.id]
      )
      orderParts.value = result || []
    } else {
      // Demo data
      const demoParts = [
        {
          id: 1,
          order_id: 1,
          name: 'Filtr powietrza',
          part_number: 'VIE-FIL-001',
          quantity: 1,
          unit_price: 45.00
        },
        {
          id: 2,
          order_id: 1,
          name: 'Uszczelka komory spalania',
          part_number: 'VIE-USZ-003',
          quantity: 1,
          unit_price: 25.00
        }
      ]
      orderParts.value = demoParts.filter(p => p.order_id === order.value.id)
    }
  } catch (err) {
    console.error('Error loading order parts:', err)
  }
}

const loadTimeEntries = async () => {
  if (!order.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT * FROM time_entries WHERE order_id = ? ORDER BY date, start_time',
        [order.value.id]
      )
      timeEntries.value = result || []
    } else {
      // Demo data
      const demoTimeEntries = [
        {
          id: 1,
          order_id: 1,
          date: '2024-06-01',
          start_time: '09:15',
          end_time: '12:30',
          duration: 3.25,
          description: 'Przegląd kotła, wymiana filtra, czyszczenie'
        },
        {
          id: 2,
          order_id: 2,
          date: '2024-07-05',
          start_time: '15:00',
          end_time: '17:30',
          duration: 2.5,
          description: 'Diagnostyka klimatyzacji, sprawdzenie czynnika'
        }
      ]
      timeEntries.value = demoTimeEntries.filter(t => t.order_id === order.value.id)
    }
  } catch (err) {
    console.error('Error loading time entries:', err)
  }
}

const loadRailwayTimeSummary = async () => {
  try {
    railwayTimeLoading.value = true
    railwayTimeError.value = ''
    railwayTimeSummary.value = null
    const id = order.value?.id
    if (!id) return
    const r = await fetch(`${config.RAILWAY_URL.replace(/\/$/, '')}/api/time/summary/${id}`)
    const j = await r.json().catch(()=>({}))
    if (!r.ok || !j?.success) throw new Error(j?.error || `HTTP ${r.status}`)
    const sessions = Array.isArray(j.sessions) ? j.sessions : []
    const firstStart = (sessions[0] && sessions[0].start_at) ? String(sessions[0].start_at) : null
    const lastEnd = (sessions[sessions.length-1] && sessions[sessions.length-1].end_at) ? String(sessions[sessions.length-1].end_at) : null
    const totalSec = Number(j.total_seconds || 0)
    const hours = Math.round((totalSec/3600)*10)/10
    let pauseCount = 0
    let pauseTotal = 0
    for (let i=1;i<sessions.length;i++) {
      try {
        const prevEnd = sessions[i-1].end_at ? new Date(sessions[i-1].end_at).getTime() : null
        const curStart = sessions[i].start_at ? new Date(sessions[i].start_at).getTime() : null
        if (prevEnd && curStart && curStart>prevEnd) {
          pauseCount += 1
          pauseTotal += Math.floor((curStart - prevEnd)/1000)
        }
      } catch (_) {}
    }
    railwayTimeSummary.value = { ...j, firstStart, lastEnd, worked_hours: hours, pause_count: pauseCount, pause_seconds: pauseTotal }

    // Setup/clear live timer based on open session
    try {
      // Clear previous interval if any
      if (liveTimerId) { clearInterval(liveTimerId); liveTimerId = null }
      liveSeconds.value = null
      const last = sessions.length ? sessions[sessions.length-1] : null
      const hasOpen = last && !last.end_at
      const isInProgress = order.value && order.value.status === 'in_progress'
      // Paused indicator: in progress, but brak otwartej sesji
      livePaused.value = !!(isInProgress && !hasOpen)
      if (isInProgress) {
        let base = Number(j.total_seconds || 0)
        let startMs = null
        if (hasOpen) {
          startMs = new Date(last.start_at).getTime()
        } else if (order.value.started_at) {
          // Fallback: brak sesji w Railway – licz od started_at (bez pauz)
          startMs = new Date(order.value.started_at).getTime()
        }
        if (startMs && !livePaused.value) {
          const nowSec = Math.floor((Date.now() - startMs) / 1000)
          liveSeconds.value = Math.max(0, base + nowSec)
          liveTimerId = setInterval(() => { liveSeconds.value = (liveSeconds.value || 0) + 1 }, 1000)
        } else {
          // brak danych startu – nie licz, ale pokaż „pauza” jeśli dotyczy
          liveSeconds.value = null
        }
      }
      // Stabilny tryb: delikatny polling tylko gdy ekran widoczny i zlecenie w toku
      const isVisible = typeof document !== 'undefined' ? (document.visibilityState === 'visible') : true
      if (isInProgress && isVisible && !pollTimerId) {
        pollTimerId = setInterval(() => {
          const vis = typeof document !== 'undefined' ? (document.visibilityState === 'visible') : true
          if (vis) loadRailwayTimeSummary().catch(()=>{})
        }, 8000)
      } else if ((!isInProgress || !isVisible) && pollTimerId) {
        clearInterval(pollTimerId); pollTimerId = null
      }
    } catch (_) {
      if (liveTimerId) { clearInterval(liveTimerId); liveTimerId = null }
      liveSeconds.value = null
    }
  } catch (e) {
    railwayTimeError.value = e?.message || 'Błąd raportu czasu'
  } finally {
    railwayTimeLoading.value = false
  }
}

const loadOrderInvoices = async () => {
  if (!order.value) return
  
  try {
    if (window.electronAPI?.database) {
      const result = await window.electronAPI.database.query(
        'SELECT * FROM invoices WHERE order_id = ? ORDER BY issue_date DESC',
        [order.value.id]
      )
      orderInvoices.value = result || []
    } else {
      // Demo data
      const demoInvoices = [
        {
          id: 1,
          order_id: 1,
          invoice_number: 'FV-2024-06-001',
          status: 'paid',
          gross_amount: 553.50,
          issue_date: '2024-06-15'
        }
      ]
      orderInvoices.value = demoInvoices.filter(i => i.order_id === order.value.id)
    }
  } catch (err) {
    console.error('Error loading order invoices:', err)
  }
}

// Action methods
const editOrder = () => {
  // Otwórz listę zleceń z zakładką Zakończone i modalem edycji kosztów
  router.push({ name: 'OrdersList', query: { edit: '1', id: String(order.value.id) } })
}

const deleteOrder = async () => {
  try {
    if (window.electronAPI?.database) {
      // Zanim usuniesz zlecenie – przywróć magazyn dla wszystkich pozycji i usuń pozycje
      try {
        const rows = await window.electronAPI.database.query('SELECT part_id, quantity FROM order_parts WHERE order_id = ?', [order.value.id])
        for (const r of (rows || [])) {
          if (r?.part_id && r?.quantity) {
            await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) + ? WHERE id = ?', [Number(r.quantity), Number(r.part_id)])
          }
        }
        await window.electronAPI.database.run('DELETE FROM order_parts WHERE order_id = ?', [order.value.id])
      } catch (_) { /* soft fail */ }
      await window.electronAPI.database.run(
        'DELETE FROM service_orders WHERE id = ?',
        [order.value.id]
      )
    }
    router.push('/orders')
  } catch (err) {
    console.error('Error deleting order:', err)
    error.value = 'Błąd podczas usuwania zlecenia'
  }
  showDeleteModal.value = false
}

const startWork = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'UPDATE service_orders SET status = ?, started_at = ? WHERE id = ?',
        ['in_progress', new Date().toISOString(), order.value.id]
      )
    }
    order.value.status = 'in_progress'
    order.value.started_at = new Date().toISOString()
  } catch (err) {
    console.error('Error starting work:', err)
    error.value = 'Błąd podczas rozpoczynania pracy'
  }
}

const completeOrder = async () => {
  try {
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run(
        'UPDATE service_orders SET status = ?, completed_at = ? WHERE id = ?',
        ['completed', new Date().toISOString(), order.value.id]
      )
    }
    order.value.status = 'completed'
    order.value.completed_at = new Date().toISOString()
  } catch (err) {
    console.error('Error completing order:', err)
    error.value = 'Błąd podczas kończenia zlecenia'
  }
}

const toggleEditDescription = () => {
  if (!order.value) return
  if (!isEditingDescription.value) {
    editableDescription.value = order.value.description || ''
    isEditingDescription.value = true
  } else {
    isEditingDescription.value = false
  }
}

const saveDescription = async () => {
  if (!order.value || !window.electronAPI?.database) {
    order.value.description = editableDescription.value
    isEditingDescription.value = false
    return
  }
  try {
    isSavingDescription.value = true
    await window.electronAPI.database.run(
      'UPDATE service_orders SET description = ? , updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [editableDescription.value, order.value.id]
    )
    order.value.description = editableDescription.value
    isEditingDescription.value = false
    // Po zapisie odśwież dane z bazy, aby UI zawsze pokazywał aktualny stan
    await loadOrder()
    // Best-effort: wyślij aktualizację do Railway, aby mobilna zobaczyła zmianę opisu
    try { await fetch('http://localhost:5174/api/railway/export-order/' + order.value.id, { method: 'POST' }) } catch (_) {}
  } catch (e) {
    console.error('Error saving description:', e)
    alert('Nie udało się zapisać opisu')
  } finally {
    isSavingDescription.value = false
  }
}

const toggleEditEstimate = () => {
  if (!order.value) return
  if (!isEditingEstimate.value) {
    editableEstimate.value = order.value.estimated_cost_note || ''
    isEditingEstimate.value = true
  } else {
    isEditingEstimate.value = false
  }
}

const saveEstimate = async () => {
  if (!order.value || !window.electronAPI?.database) {
    order.value.estimated_cost_note = editableEstimate.value
    isEditingEstimate.value = false
    return
  }
  try {
    isSavingEstimate.value = true
    await window.electronAPI.database.run(
      'UPDATE service_orders SET estimated_cost_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [editableEstimate.value, order.value.id]
    )
    order.value.estimated_cost_note = editableEstimate.value
    isEditingEstimate.value = false
  } catch (e) {
    console.error('Error saving estimate:', e)
    alert('Nie udało się zapisać szacowanego kosztu')
  } finally {
    isSavingEstimate.value = false
  }
}

const openEditSchedule = () => {
  try {
    const raw = String(order.value?.scheduled_date || '')
    if (raw && raw.length >= 10) {
      // preferuj string bez konwersji – unikamy stref czasowych
      scheduleDate.value = raw.slice(0,10)
      scheduleTime.value = raw.includes('T') ? raw.slice(11,16) : ''
    } else {
      scheduleDate.value = ''
      scheduleTime.value = ''
    }
    showScheduleModal.value = true
  } catch (_) { showScheduleModal.value = true }
}

const saveSchedule = async () => {
  try {
    if (!order.value?.id) return
    if (!scheduleDate.value) { alert('Wybierz datę'); return }
    const timePart = (scheduleTime.value && /^\d{2}:\d{2}$/.test(scheduleTime.value)) ? scheduleTime.value : '00:00'
    // Zapisz bez zmian strefy – jako plain string ISO bez Z
    const iso = `${scheduleDate.value}T${timePart}:00`
    savingSchedule.value = true
    // Update lokalnie
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run('UPDATE service_orders SET scheduled_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [iso, order.value.id])
    }
    order.value.scheduled_date = iso
    showScheduleModal.value = false
    // Wyślij do Railway (best-effort via export-order)
    try { await fetch('http://localhost:5174/api/railway/export-order/' + order.value.id, { method: 'POST' }) } catch (_) {}
  } catch (e) { alert('Nie udało się zapisać terminu') }
  finally { savingSchedule.value = false }
}

const openCloseEarly = () => { closeReason.value = ''; showCloseEarlyModal.value = true }

const confirmCloseEarly = async () => {
  try {
    if (!order.value?.id) return
    if (!closeReason.value) { alert('Podaj powód'); return }
    closingEarly.value = true
    // Zmień status lokalnie na "przed czasem" i zapisz powód
    if (window.electronAPI?.database) {
      await window.electronAPI.database.run('UPDATE service_orders SET status = ?, rejected_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['przed_czasem', closeReason.value, order.value.id])
    }
    order.value.status = 'przed_czasem'
    // Wyślij do Railway – najpierw status/assign sync, potem pełny export
    try {
      await fetch('http://localhost:5174/api/railway/export-order/' + order.value.id, { method: 'POST' })
    } catch (_) {}
    showCloseEarlyModal.value = false
  } catch (e) { alert('Nie udało się zamknąć zlecenia') }
  finally { closingEarly.value = false }
}

// Lokalny formatter: bezpiecznie pokazuje YYYY-MM-DD HH:MM niezależnie od formatu wejściowego
const formatScheduled = (raw) => {
  try {
    if (!raw) return '—'
    const s = String(raw)
    if (s.includes('T')) {
      const d = s.slice(0,10)
      const t = s.slice(11,16)
      return t ? `${d}, ${t}` : d
    }
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const da = String(d.getDate()).padStart(2,'0')
      const hh = String(d.getHours()).padStart(2,'0'); const mm = String(d.getMinutes()).padStart(2,'0')
      return `${y}-${m}-${da}${(hh+mm!=='0000') ? `, ${hh}:${mm}` : ''}`
    }
    return s
  } catch (_) { return String(raw || '—') }
}

const sendEstimateToApp = async () => {
  try {
    if (!order.value?.id) return
    // Upewnij się, że zapis lokalny jest aktualny
    if (isEditingEstimate.value) {
      await saveEstimate()
    }
    // Wyślij natychmiast do Railway i powiadom mobilkę przez SSE
    const r = await fetch(`http://localhost:5174/api/railway/export-order/${order.value.id}`, { method: 'POST' })
    if (!r.ok) throw new Error('Export to Railway failed')
    alert('Wysłano do aplikacji')
  } catch (e) {
    alert('Nie udało się wysłać do aplikacji')
  }
}

const createInvoice = () => {
  router.push({ 
    name: 'InvoicesList', 
    query: { 
      add: 'true',
      order_id: order.value.id
    } 
  })
}

const downloadInvoice = (invoice) => {
  console.log('Download invoice:', invoice.id)
  // TODO: Implement PDF download
}

// Pending changes
const mapPendingChangeToLocal = async (change) => {
  const entity = change?.entity
  const normalized = {
    ...change,
    payload: (typeof change?.payload === 'string' ? JSON.parse(change.payload || '{}') : change?.payload || {})
  }
  if (!entity) return normalized
  
  // Najpierw sprawdź czy mamy external_id w payload - to jest najszybsze i najbardziej niezawodne
  const payloadExternal = normalized.payload?.external_id
  const payloadDeviceExternal = normalized.payload?.device_external_id || normalized.payload?.external_device_id || null
  const fallbackExternal = entity === 'device'
    ? (payloadDeviceExternal || payloadExternal || null)
    : payloadExternal || null
  
  // Próbuj pobrać encję z Railway tylko jeśli nie mamy external_id w payload
  // i tylko jeśli entity_id jest dostępne
  let remote = null
  if (!fallbackExternal && normalized.entity_id != null && String(normalized.entity_id).trim() !== '') {
    const base = 'http://localhost:5174'
    const path = entity === 'device' ? 'devices' : 'clients'
    try {
      // Próbuj pobrać encję z Railway używając entity_id (Railway ID)
      // Jeśli encja nie istnieje (404), to jest OK - pending change może odnosić się do nieistniejącej encji
      const resp = await fetch(`${base}/api/railway/${path}/${encodeURIComponent(normalized.entity_id)}`).catch(() => null)
      if (resp && resp.ok) {
        const data = await resp.json().catch(() => ({}))
        remote = entity === 'device' ? (data.device || data.data?.device) : (data.client || data.data?.client)
      }
      // Jeśli 404 - encja nie istnieje, to normalne, nie loguj jako błąd
    } catch (err) {
      // Ignoruj błędy sieciowe - encja może nie istnieć lub serwer może być niedostępny
    }
  }
  
  // Użyj external_id z pobranej encji lub z payload
  const externalId = remote?.external_id || fallbackExternal || null
  let localId = null
  if (externalId && window.electronAPI?.database?.get) {
    try {
      const row = await window.electronAPI.database.get(
        entity === 'device'
          ? 'SELECT id FROM devices WHERE external_id = ?'
          : 'SELECT id FROM clients WHERE external_id = ?',
        [externalId]
      )
      if (row && row.id != null) localId = Number(row.id)
    } catch (_) { /* ignore */ }
  }
  const fallbackCandidates = [remote?.id, normalized.entity_id].map(v => (v != null ? Number(v) : null))
  for (const candidate of fallbackCandidates) {
    if (localId != null || candidate == null || !window.electronAPI?.database?.get) continue
    try {
      const row = await window.electronAPI.database.get(
        entity === 'device'
          ? 'SELECT id FROM devices WHERE id = ?'
          : 'SELECT id FROM clients WHERE id = ?',
        [candidate]
      )
      if (row && row.id != null) {
        localId = Number(row.id)
      }
    } catch (_) { /* ignore */ }
  }
  return {
    ...normalized,
    external_id: externalId || null,
    local_entity_id: localId != null ? localId : null,
    remote_snapshot: remote
  }
}

const loadPendingChanges = async () => {
  try {
    const r = await fetch('http://localhost:5174/api/railway/pending-changes')
    const j = await r.json().catch(()=>({}))
    if (r.ok && j && j.success) {
      const items = Array.isArray(j.items) ? j.items : []
      const mapped = []
      for (const raw of items) {
        try {
          mapped.push(await mapPendingChangeToLocal(raw))
        } catch (err) {
          console.warn('[pending-change] map error:', err?.message || err)
          mapped.push({
            ...raw,
            payload: (typeof raw?.payload === 'string' ? JSON.parse(raw.payload || '{}') : raw?.payload || {})
          })
        }
      }
      pendingChanges.value = mapped
    } else {
      pendingChanges.value = []
    }
  } catch (error) {
    console.warn('[pending-change] load error:', error?.message || error)
    pendingChanges.value = []
  }
}

const openPendingModal = () => { showPendingModal.value = true }
const openPendingDeviceModal = () => { showPendingDeviceModal.value = true }

const acceptPending = async (id) => {
  try {
    // Ustal typ zmiany (client/device) po id
    const ch = (pendingChanges.value || []).find(pc => pc.id === id)
    if (!ch) {
      alert('Nie znaleziono zmiany')
      return
    }
    // Sprawdź sukces akceptacji przed kontynuacją
    const acceptResp = await fetch(`http://localhost:5174/api/railway/pending-changes/${id}/accept`, { method: 'POST' })
    const acceptData = await acceptResp.json().catch(() => ({ success: false }))
    if (!acceptResp.ok || !acceptData.success) {
      alert('Nie udało się zaakceptować zmiany. Encja może nie istnieć na serwerze.')
      await loadPendingChanges() // Odśwież listę zmian
      return
    }
    // Natychmiast usuń wszystkie propozycje dotyczące tej samej encji, aby zniknął baner
    try {
      const entity = ch?.entity
      const entityId = ch?.entity_id
      pendingChanges.value = (pendingChanges.value || []).filter(pc => !(pc.entity === entity && Number(pc.entity_id) === Number(entityId)))
    } catch (_) {}
    // Po akceptacji – pobierz świeże dane odpowiedniej encji do lokalnej bazy
    // Używamy Railway ID (entity_id) lub external_id zamiast lokalnego ID
    if (ch && ch.entity === 'client') {
      const railwayId = ch.entity_id // Railway ID
      const externalId = ch.external_id // external_id jeśli dostępne
      const importUrl = externalId 
        ? `http://localhost:5174/api/railway/import-client/${railwayId}?externalId=${encodeURIComponent(externalId)}`
        : `http://localhost:5174/api/railway/import-client/${railwayId}`
      const importResp = await fetch(importUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(()=>null)
      if (!importResp || !importResp.ok) {
        console.warn('[acceptPending] Failed to import client after accept:', railwayId)
      }
      showPendingModal.value = false
    } else if (ch && ch.entity === 'device') {
      const railwayId = ch.entity_id // Railway ID
      const externalId = ch.external_id // external_id jeśli dostępne
      const importUrl = externalId 
        ? `http://localhost:5174/api/railway/import-device/${railwayId}?externalId=${encodeURIComponent(externalId)}`
        : `http://localhost:5174/api/railway/import-device/${railwayId}`
      const importResp = await fetch(importUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(()=>null)
      if (!importResp || !importResp.ok) {
        console.warn('[acceptPending] Failed to import device after accept:', railwayId)
      }
      showPendingDeviceModal.value = false
    } else {
      // fallback: zamknij oba jeśli typ nieznany
      showPendingModal.value = false
      showPendingDeviceModal.value = false
    }
    await loadPendingChanges()
    await loadOrder() // odśwież widok zlecenia
  } catch (e) {
    console.error('[acceptPending] Error:', e)
    alert('Nie udało się zaakceptować zmiany')
  }
}

const rejectPending = async (id) => {
  try {
    const ch = (pendingChanges.value || []).find(pc => pc.id === id)
    await fetch(`http://localhost:5174/api/railway/pending-changes/${id}/reject`, { method: 'POST' })
    if (ch && ch.entity === 'device') {
      showPendingDeviceModal.value = false
    } else {
      showPendingModal.value = false
    }
    await loadPendingChanges()
  } catch (e) { alert('Nie udało się odrzucić zmiany') }
}

// Parts management
const addPart = () => {
  editingPart.value = null
  showPartModal.value = true
}

const editPart = (part) => {
  editingPart.value = { ...part }
  showPartModal.value = true
}

const closePartModal = () => {
  showPartModal.value = false
  editingPart.value = null
}

const recalcAndPersistPartsCost = async () => {
  // Recalculate parts_cost from order_parts
  if (!order.value || !window.electronAPI?.database) return
  const rows = await window.electronAPI.database.query(
    'SELECT COALESCE(SUM(total_price), 0) AS sum FROM order_parts WHERE order_id = ?',
    [order.value.id]
  )
  const sum = (rows && rows[0] && (rows[0].sum || 0)) || 0
  await window.electronAPI.database.run(
    'UPDATE service_orders SET parts_cost = ?, total_cost = COALESCE(labor_cost,0) + COALESCE(travel_cost,0) + ? WHERE id = ?',
    [sum, sum, order.value.id]
  )
  order.value.parts_cost = sum
  order.value.total_cost = (order.value.labor_cost || 0) + (Number(order.value.travel_cost || 0)) + sum
}

const importLatestDetails = async () => {
  if (!order.value?.id) return true
  let toggled = false
  try {
    detailsLoading.value = true
    toggled = true
    if (window.electronAPI?.database) {
      const row = await window.electronAPI.database.get(
        `SELECT notes, actual_hours, actual_start_date, actual_end_date FROM service_orders WHERE id = ?`,
        [order.value.id]
      )
      const needsImport =
        !row ||
        !row.completion_notes ||
        !row.notes ||
        row.actual_hours == null ||
        Number(row.actual_hours) <= 0 ||
        row.actual_start_date == null ||
        row.actual_end_date == null
      if (needsImport) {
        await ensureCompletionImported()
      }
    } else {
      await ensureCompletionImported()
    }
    return true
  } catch (error) {
    console.error('Import from Railway failed:', error)
    alert('Nie udało się pobrać najnowszych danych z Railway. Operacja została przerwana. Spróbuj ponownie, gdy będzie internet.')
    return false
  } finally {
    if (toggled) detailsLoading.value = false
  }
}

const onPartSaved = async () => {
  await loadOrderParts()
  await recalcAndPersistPartsCost()
  if (!(await importLatestDetails())) return
  // Automatyczna synchronizacja z Railway gdy zmienia się order_parts
  if (order.value?.id && window.electronAPI?.database) {
    try {
      await window.electronAPI.database.run(
        "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
        [order.value.id]
      )
      await fetch(`http://localhost:5174/api/railway/export-order/${order.value.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {}) // Soft fail - jeśli błąd, nie blokuj użytkownika
    } catch (error) {
      console.error('Export order failed:', error)
      alert('Nie udało się wysłać zlecenia do Railway. Spróbuj ponownie później.')
      return
    }
  }
  closePartModal()
}

const removePart = async (part) => {
  try {
    if (window.electronAPI?.database) {
      // Przywróć stan magazynowy zanim usuniesz pozycję
      try {
        if (part?.part_id && part?.quantity) {
          await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) + ? WHERE id = ?', [Number(part.quantity), Number(part.part_id)])
        }
      } catch (_) { /* soft fail */ }
      await window.electronAPI.database.run('DELETE FROM order_parts WHERE id = ?', [part.id])
      await loadOrderParts()
      await recalcAndPersistPartsCost()
      if (!(await importLatestDetails())) return
      // Automatyczna synchronizacja z Railway gdy zmienia się order_parts
      if (order.value?.id) {
        try {
          await window.electronAPI.database.run(
            "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
            [order.value.id]
          )
          await fetch(`http://localhost:5174/api/railway/export-order/${order.value.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(() => {}) // Soft fail - jeśli błąd, nie blokuj użytkownika
        } catch (_) { /* soft fail */ }
      }
    }
  } catch (e) {
    console.error('Error deleting part:', e)
    alert('Nie udało się usunąć części')
  }
}

// Transform tekstu parts_used do pozycji order_parts
const transformPartsUsed = async () => {
  try {
    if (!order.value?.parts_used) return
    const proceed = confirm('Czy chcesz przekształcić tekstowe części z mobilnej w pozycje magazynowe?')
    if (!proceed) return
    const raw = String(order.value.parts_used || '')
    // Podział po przecinku, średniku lub nowej linii
    const tokens = raw
      .split(/[,;\n]/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
    if (tokens.length === 0) {
      alert('Brak rozpoznanych pozycji do przekształcenia')
      return
    }

    for (const token of tokens) {
      // Spróbuj dopasować istniejącą część po nazwie lub numerze
      let sp = null
      try {
        // Najpierw szukaj w częściach przypisanych do urządzenia
        if (order.value.device_id) {
          const rowsDev = await window.electronAPI.database.query(
            'SELECT id, name, part_number, price FROM spare_parts WHERE device_id = ? AND (LOWER(name) = LOWER(?) OR LOWER(part_number) = LOWER(?)) LIMIT 1',
            [order.value.device_id, token, token]
          )
          sp = rowsDev && rowsDev[0] ? rowsDev[0] : null
        }
        // Fallback: globalne (device_id IS NULL)
        if (!sp) {
          const rows = await window.electronAPI.database.query(
            'SELECT id, name, part_number, price FROM spare_parts WHERE device_id IS NULL AND (LOWER(name) = LOWER(?) OR LOWER(part_number) = LOWER(?)) LIMIT 1',
            [token, token]
          )
          sp = rows && rows[0] ? rows[0] : null
        }
      } catch (_) { sp = null }

      // Jeśli nie ma – utwórz minimalną część w magazynie (cena 0) z przypisaniem do urządzenia
      if (!sp) {
        const ins = await window.electronAPI.database.run(
          'INSERT INTO spare_parts (name, price, stock_quantity, min_stock_level, device_id, created_at, updated_at) VALUES (?, 0, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [token, order.value.device_id || null]
        )
        sp = { id: ins.id, name: token, part_number: null, price: 0 }
      }

      // Dodaj pozycję do order_parts (ilość = 1, cena z magazynu)
      await window.electronAPI.database.run(
        'INSERT INTO order_parts (order_id, part_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [order.value.id, sp.id, 1, Number(sp.gross_price ?? sp.price ?? 0), Number(sp.gross_price ?? sp.price ?? 0)]
      )
    }

    await loadOrderParts()
    await recalcAndPersistPartsCost()
  if (!(await importLatestDetails())) return
    // Automatyczna synchronizacja z Railway gdy zmienia się order_parts
    if (order.value?.id && window.electronAPI?.database) {
      try {
        await window.electronAPI.database.run(
          "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
          [order.value.id]
        )
        await fetch(`http://localhost:5174/api/railway/export-order/${order.value.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {}) // Soft fail - jeśli błąd, nie blokuj użytkownika
      } catch (_) { /* soft fail */ }
    }
    alert('Przekształcono części na pozycje zlecenia')
  } catch (e) {
    console.error('Transform parts_used error:', e)
    alert('Nie udało się przekształcić części')
  }
}

const addTimeEntry = () => {
  console.log('Add time entry to order:', order.value.id)
  // TODO: Implement time tracking
}

const editTimeEntry = (entry) => {
  console.log('Edit time entry:', entry.id)
  // TODO: Implement time tracking
}

const removeTimeEntry = (entry) => {
  console.log('Remove time entry:', entry.id)
  // TODO: Implement time tracking
}

// Watchers
watch(() => route.params.id, () => {
  loadOrder()
}, { immediate: true })

watch(
  () => order.value?.client_id,
  () => { loadClientSnapshot() }
)

watch(
  () => order.value?.device_id,
  () => { loadDeviceSnapshot() }
)

watch(
  pendingClientChange,
  (change) => {
    if (change) loadClientSnapshot()
  }
)

watch(
  pendingDeviceChange,
  (change) => {
    if (change) loadDeviceSnapshot()
  }
)

watch(order, () => {
  if (order.value) {
    Promise.all([
      loadOrderParts(),
      loadTimeEntries(),
      loadOrderInvoices(),
      loadRailwayTimeSummary()
    ])
  }
})

// Stop live timer when leaving or status changes
watch(() => order.value && order.value.status, (st) => {
  if (st !== 'in_progress') {
    if (liveTimerId) { clearInterval(liveTimerId); liveTimerId = null }
    if (pollTimerId) { clearInterval(pollTimerId); pollTimerId = null }
    liveSeconds.value = null
    livePaused.value = false
  } else {
    // status przełączony na in_progress → dociągnij najnowszy stan
    loadRailwayTimeSummary().catch(()=>{})
  }
})

// SSE wyłączone; polegamy na łagodnym pollingu (powyżej)
onMounted(() => { /* no-op */ })
onUnmounted(() => {
  try { if (sse) sse.close() } catch (_) {}
  if (pollTimerId) { clearInterval(pollTimerId); pollTimerId = null }
  if (liveTimerId) { clearInterval(liveTimerId); liveTimerId = null }
})

// Lifecycle
onMounted(() => {
  loadOrder()
  loadServiceCategories().catch(()=>{})
})
const parsedCategories = computed(() => {
  try {
    const raw = order.value?.completed_categories
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw || '[]')
    return (arr || []).map(x => String(x))
  } catch (_) {
    return []
  }
})

const categoryByCode = computed(() => {
  const map = new Map()
  try {
    for (const c of (serviceCategories.value || [])) {
      const code = String(c.code || '').trim()
      if (!code) continue
      map.set(code, c)
    }
  } catch (_) {}
  return map
})
const categoryById = computed(() => {
  const map = new Map()
  try {
    for (const c of (serviceCategories.value || [])) {
      if (c && c.id != null) map.set(Number(c.id), c)
    }
  } catch (_) {}
  return map
})

const completedCategoryLabels = computed(() => {
  const out = []
  try {
    for (const code of parsedCategories.value) {
      const codeStr = String(code).trim()
      let obj = categoryByCode.value.get(codeStr)
      // Fallback: jeśli nie znaleziono po code, sprawdź po id (gdy wpis to liczba)
      if (!obj) {
        const maybeId = Number(code)
        if (Number.isFinite(maybeId)) obj = categoryById.value.get(maybeId)
      }
      // Fallback 2: użyj kategorii z mobile app jeśli baza danych nie ma
      if (!obj) {
        // Sprawdź czy to główna kategoria (np. "10")
        if (MOBILE_SERVICE_CATEGORIES[codeStr]) {
          out.push(MOBILE_SERVICE_CATEGORIES[codeStr].name)
          continue
        }
        // Sprawdź czy to podkategoria (np. "1001") - szukaj w głównych kategoriach
        let found = false
        for (const [mainCode, mainCat] of Object.entries(MOBILE_SERVICE_CATEGORIES)) {
          if (mainCat.subcategories && mainCat.subcategories[codeStr]) {
            out.push(mainCat.subcategories[codeStr])
            found = true
            break
          }
        }
        // Jeśli nadal nie znaleziono, pokaż kod
        if (!found) {
          out.push(codeStr)
        }
        continue
      }
      // Mamy obiekt z bazy danych - użyj standardowego mapowania
      const label = obj.name || obj.description || codeStr
      if (obj.parent_id != null) {
        const parent = categoryById.value.get(Number(obj.parent_id))
        const parentLabel = parent ? (parent.name || parent.description || '') : ''
        out.push(parentLabel ? `${parentLabel} > ${label}` : label)
      } else {
        out.push(label)
      }
    }
  } catch (_) {}
  return out
})

const technicianNotes = computed(() => {
  try {
    const t = String(order.value?.notes || '').trim()
    if (!t) return 'Brak danych'
    const looksLikeSrv = /^SRV\-\d{4}\-\d+/.test(t)
    const looksLikeId = /^\d+$/.test(t)
    const equalsOrder = t === String(order.value?.order_number || '')
    return (looksLikeSrv || looksLikeId || equalsOrder) ? 'Brak danych' : t
  } catch (_) { return 'Brak danych' }
})

async function loadServiceCategories() {
  try {
    const r = await fetch('http://localhost:5174/api/desktop/service-categories')
    if (!r.ok) return
    const list = await r.json().catch(() => [])
    if (Array.isArray(list)) serviceCategories.value = list
  } catch (_) { /* silent */ }
}

const getPhotos = (wp) => {
  try {
    const arr = typeof wp === 'string' ? JSON.parse(wp) : (Array.isArray(wp) ? wp : []);
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

const openPhoto = (ph) => {
  selectedPhotoSrc.value = photoProxySrc(ph)
  showPhotoModal.value = true
}

const resolvePhotoSrc = (ph) => {
  const val = typeof ph === 'object' ? (ph.local || ph.url || ph.path || ph.remote || '') : String(ph || '')
  if (!val) return ''
  if (val.startsWith('/api/desktop/files/')) return `http://localhost:5174${val}`
  if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) return val
  if (val.startsWith('/uploads')) return `${config.RAILWAY_URL.replace(/\/$/, '')}${val}`
  if (val.startsWith('uploads/')) return `${config.RAILWAY_URL.replace(/\/$/, '')}/${val}`
  if (window?.electronAPI && /^[A-Za-z]:\\/.test(val)) return 'file:///' + val.replace(/\\/g, '/')
  return val
}

const photoProxySrc = (ph) => {
  const v = resolvePhotoSrc(ph)
  if (!v) return ''
  return v.startsWith('http') ? `/api/desktop/files/proxy?u=${encodeURIComponent(v)}` : v
}

const checkPhotos = async () => {
  try {
    isCheckingPhotos.value = true
    const orderId = parseInt(route.params.id)
    // Now prefer bezpośredni import – pobierze order, zaktualizuje work_photos i skeszuję zdjęcia do device_files
    let ok = false
    // NEW: przed importem zsynchronizuj lokalne pliki urządzenia do Railway, aby mobilka miała publiczne URL-e
    try {
      const devId = order.value?.device_id || null
      if (devId) {
        await fetch(`http://localhost:5174/api/railway/device-files/sync/${devId}`, { method: 'POST' }).catch(()=>{})
      }
    } catch (_) { /* soft-fail */ }
    try {
      const r = await fetch('http://localhost:5174/api/railway/import-order/' + orderId + '?detailsOnly=1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markImported: false, detailsOnly: true })
      })
      ok = r.ok
    } catch (_) { ok = false }

    // Po imporcie: wymuś lokalny cache zdjęć, aby miniatury miały lokalny URL (bez CORS)
    try {
      await fetch(`http://localhost:5174/api/desktop/orders/${orderId}/cache-photos`, { method: 'POST' }).catch(()=>{})
    } catch (_) {}

    // Sprawdź stan lokalny po imporcie
    let localCount = null
    try {
      if (window.electronAPI?.database) {
        const rows = await window.electronAPI.database.query('SELECT work_photos FROM service_orders WHERE id = ?', [orderId])
        const row = rows?.[0]
        if (row) localCount = getPhotos(row.work_photos).length
      }
    } catch (_) {}

    await loadOrder()
    const msg = ok
      ? `Import wykonany. Lokalnie zdjęć: ${localCount ?? 'n/d'}\nZapisano zdjęcia do galerii urządzenia (offline).`
      : 'Import nieudany (brak odpowiedzi lokalnego API). Spróbuj ponownie.'
    alert(msg)
  } finally {
    isCheckingPhotos.value = false
  }
}

// Jeśli order ukończony i brakuje notatek/zdjęć/kategorii – sprowadź z Railway (bez interakcji)
const ensureCompletionImported = async () => {
  try {
    if (importGuard.value) return
    const o = order.value
    if (!o || String(o.status) !== 'completed') return
    const needsNotes = !o.completion_notes || String(o.completion_notes).trim() === ''
    const needsTechnicianNotes = !o.notes || String(o.notes).trim() === ''
    const needsActualHours = o.actual_hours == null || Number(o.actual_hours) <= 0
    const needsStartEnd = !o.actual_start_date || !o.actual_end_date
    let needsPhotos = false
    try { const arr = getPhotos(o.work_photos); needsPhotos = !(Array.isArray(arr) && arr.length > 0) } catch (_) { needsPhotos = true }
    let needsCategories = false
    try { const pc = parsedCategories.value; needsCategories = !(Array.isArray(pc) && pc.length > 0) } catch (_) { needsCategories = true }
    if (!(needsNotes || needsTechnicianNotes || needsActualHours || needsStartEnd || needsPhotos || needsCategories)) return
    importGuard.value = true
    await fetch(`http://localhost:5174/api/railway/import-order/${o.id}?detailsOnly=1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markImported: false, detailsOnly: true }) }).catch(()=>{})
    // Po imporcie przeładuj zamówienie (bez blokowania UI)
    setTimeout(() => { loadOrder().catch(()=>{}) }, 300)
  } catch (_) { /* soft-fail */ }
}

// Desktop: pobierz dokumentację urządzenia z Railway (ten sam kształt co w PWA)
const loadDeviceFiles = async () => {
  try {
    filesError.value = ''
    deviceFiles.value = { photos: [], files: [] }
    if (!order.value?.device_id) return
    loadingDeviceFiles.value = true
    // 1) Preferuj lokalne źródło: electronAPI.fileManager (SQLite)
    let photos = []
    let files = []
    if (window.electronAPI?.fileManager?.getDeviceFiles) {
      try {
        const rows = await window.electronAPI.fileManager.getDeviceFiles(order.value.device_id)
        const normalized = Array.isArray(rows) ? rows : []
        files = normalized.map(r => ({
          id: r.id,
          file_name: r.file_name || r.name,
          file_path: r.file_path || r.path,
          url: r.url || (r.id ? `/api/desktop/files/${r.id}` : undefined),
          mime_type: r.mime_type || r.file_type || '',
          file_type: r.file_type || r.mime_type || ''
        })).filter(x => x != null)
      } catch (_) { /* fallback poniżej */ }
    }
    // 2) Fallback: lokalne HTTP API serwera Electron (to samo źródło danych co powyżej)
    if (!files.length) {
      try {
        const localUrl = `/api/desktop/devices/${order.value.device_id}/files`
        const r = await fetch(localUrl)
        if (r.ok) {
          const j = await r.json().catch(()=>({}))
          const arr = Array.isArray(j?.items) ? j.items : []
          files = arr.filter(f => f != null)
        }
      } catch (_) { /* pomijamy */ }
    }
    // 3) Obrazki: wydziel z files jako miniatury
    const isImg = (f) => String(f?.mime_type||f?.file_type||'').startsWith('image/') || String(f?.file_name||'').toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)
    const fileImages = (files||[]).filter(isImg).map(f => ({ public_url: f.public_url || f.url || f.file_path }))
    const uniq = new Map()
    for (const ph of [...photos, ...fileImages]) {
      const k = String(ph?.public_url || ph?.url || ph?.path || '')
      if (k) uniq.set(k, ph)
    }
    photos = Array.from(uniq.values())
    deviceFiles.value = { photos, files }
  } catch (e) {
    filesError.value = e?.message || 'Błąd pobierania plików'
  } finally {
    loadingDeviceFiles.value = false
  }
}

// Computed: lista PDF do wyświetlenia (bez v-if na elemencie v-for)
const pdfFiles = computed(() => {
  try {
    const arr = Array.isArray(deviceFiles.value?.files) ? deviceFiles.value.files : []
    return arr.filter(f => {
      const t = String(f?.mime_type || f?.file_type || '').toLowerCase()
      const n = String(f?.file_name || '').toLowerCase()
      return t.includes('pdf') || n.endsWith('.pdf')
    })
  } catch (_) { return [] }
})

</script> 