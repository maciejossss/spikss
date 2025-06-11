<template>
  <div class="p-4 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Serwis</h1>
        <p class="text-sm text-gray-600">Zlecenia i kalendarz</p>
      </div>
      <div class="flex gap-3">
        <button 
          @click="showServiceModal = true"
          class="btn btn-primary"
          :disabled="!canCreateRecord"
        >
          <Plus class="w-4 h-4 mr-2" />
          Nowe zgłoszenie serwisowe
        </button>
        <button 
          @click="showAppointmentModal = true"
          class="btn btn-secondary"
          :disabled="!canCreateAppointment"
        >
          <Calendar class="w-4 h-4 mr-2" />
          Umów termin wizyty
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'records'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'records'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <Settings class="w-4 h-4 mr-2 inline" />
          Zlecenia serwisowe
        </button>
        <button
          @click="activeTab = 'appointments'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'appointments'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <Calendar class="w-4 h-4 mr-2 inline" />
          Terminy wizyt
        </button>
        <button
          @click="activeTab = 'today'"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === 'today'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <Clock class="w-4 h-4 mr-2 inline" />
          Dzisiaj
          <span v-if="todaysCount > 0" class="ml-1 bg-red-100 text-red-600 text-xs rounded-full px-2 py-0.5">
            {{ todaysCount }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Loading -->
    <div v-if="serviceStore.loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error Display -->
    <div v-if="serviceStore.error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div class="flex items-center">
        <AlertCircle class="w-5 h-5 text-red-500 mr-2" />
        <div>
          <h3 class="text-sm font-medium text-red-800">Błąd połączenia</h3>
          <p class="text-sm text-red-700 mt-1">{{ serviceStore.error }}</p>
          <button 
            @click="retryConnection" 
            class="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-if="!serviceStore.loading">
      <!-- Service Records Tab -->
      <div v-if="activeTab === 'records'" class="space-y-4">
        <!-- Filters -->
        <div class="card p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Szukaj</label>
              <input
                v-model="filters.search"
                type="text"
                placeholder="Numer zlecenia, klient..."
                class="input"
                @input="debouncedSearch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Typ serwisu</label>
              <select v-model="filters.service_type" class="select" @change="applyFilters">
                <option value="">Wszystkie</option>
                <option v-for="type in serviceStore.config.serviceTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select v-model="filters.status" class="select" @change="applyFilters">
                <option value="">Wszystkie</option>
                <option v-for="status in serviceStore.config.serviceStatuses" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                @click="clearFilters"
                class="btn-secondary w-full"
                :disabled="!serviceStore.hasActiveFilters"
              >
                <X class="w-4 h-4 mr-2" />
                Wyczyść
              </button>
            </div>
          </div>
        </div>

        <!-- Service Records List -->
        <div class="card">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">
              Zlecenia serwisowe
              <span v-if="serviceStore.pagination.total" class="text-sm text-gray-500 font-normal">
                ({{ serviceStore.pagination.total }})
              </span>
            </h3>
          </div>
          
          <div v-if="serviceStore.serviceRecords.length === 0" class="p-8 text-center">
            <Settings class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">Brak zleceń serwisowych</h3>
            <p class="text-gray-600">Nie znaleziono żadnych zleceń spełniających kryteria wyszukiwania.</p>
          </div>

          <div v-else class="divide-y divide-gray-200">
            <div
              v-for="record in serviceStore.serviceRecords"
              :key="record.id"
              class="p-4 hover:bg-gray-50"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 cursor-pointer" @click="viewServiceRecord(record)">
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      <div :class="[
                        'w-2 h-2 rounded-full',
                        getStatusColor(record.status)
                      ]"></div>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        #{{ record.id.substring(0, 8) }} - {{ record.device?.brand }} {{ record.device?.model || 'Urządzenie' }}
                      </p>
                      <p class="text-sm text-gray-600">
                        <span class="font-medium">{{ record.client?.company_name || record.client?.contact_person || 'Nieznany klient' }}</span>
                      </p>
                    </div>
                  </div>
                  <div class="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>{{ getServiceTypeLabel(record.service_type) }}</span>
                    <span>{{ getStatusLabel(record.status) }}</span>
                    <span>{{ formatDate(record.scheduled_date) }}</span>
                    <span v-if="record.technician">{{ record.technician.first_name }} {{ record.technician.last_name }}</span>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span v-if="record.priority === 'high'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Pilne
                  </span>
                  <span v-if="record.follow_up_required" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Kontrola
                  </span>
                  <button 
                    @click.stop="deleteServiceRecord(record)"
                    class="btn btn-ghost btn-sm text-red-600 hover:text-red-800 hover:bg-red-50"
                    title="Usuń zlecenie"
                  >
                    ✕
                  </button>
                  <div class="cursor-pointer" @click="viewServiceRecord(record)">
                    <ChevronRight class="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="serviceStore.pagination.totalPages > 1" class="px-4 py-3 border-t border-gray-200">
            <div class="flex items-center justify-between">
              <div class="text-sm text-gray-700">
                Strona {{ serviceStore.pagination.page }} z {{ serviceStore.pagination.totalPages }}
              </div>
              <div class="flex space-x-2">
                <button
                  @click="previousPage"
                  :disabled="serviceStore.pagination.page === 1"
                  class="btn-secondary btn-sm"
                >
                  Poprzednia
                </button>
                <button
                  @click="nextPage"
                  :disabled="serviceStore.pagination.page === serviceStore.pagination.totalPages"
                  class="btn-secondary btn-sm"
                >
                  Następna
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Appointments Tab -->
      <div v-if="activeTab === 'appointments'" class="space-y-4">
        <div class="card">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Terminy wizyt</h3>
          </div>
          
          <div v-if="serviceStore.appointments.length === 0" class="p-8 text-center">
            <Calendar class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">Brak terminów</h3>
            <p class="text-gray-600">Nie masz zaplanowanych żadnych wizyt.</p>
          </div>

          <div v-else class="divide-y divide-gray-200">
            <div
              v-for="appointment in serviceStore.appointments"
              :key="appointment.id"
              class="p-4 hover:bg-gray-50 cursor-pointer"
              @click="viewAppointment(appointment)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <p class="text-sm font-medium text-gray-900">
                      {{ appointment.description || 'Wizyta serwisowa' }}
                    </p>
                    <span :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    ]">
                      {{ getAppointmentStatusLabel(appointment.status) }}
                    </span>
                  </div>
                  
                  <div class="space-y-1">
                    <p class="text-sm text-gray-800">
                      <span class="font-medium">Klient:</span> 
                      {{ appointment.client?.company_name || appointment.client?.contact_person || 'Nieznany klient' }}
                    </p>
                    
                    <p class="text-sm text-gray-600" v-if="appointment.technician_first_name">
                      <span class="font-medium">Technik:</span> 
                      {{ appointment.technician_first_name }} {{ appointment.technician_last_name }}
                    </p>
                    
                    <p class="text-sm text-gray-600" v-if="appointment.device_brand">
                      <span class="font-medium">Urządzenie:</span> 
                      {{ appointment.device_brand }} {{ appointment.device_model }} ({{ getDeviceTypeLabel(appointment.device_type) }})
                    </p>
                    
                    <p class="text-sm text-gray-600">
                      <span class="font-medium">Typ:</span> 
                      {{ getAppointmentTypeLabel(appointment.appointment_type) }}
                    </p>
                    
                    <div class="flex items-center space-x-4 mt-2">
                      <div class="text-sm text-gray-500">
                        <span class="font-medium">Data:</span> {{ formatDate(appointment.appointment_date) }}
                      </div>
                      <div class="text-sm text-gray-500">
                        <span class="font-medium">Godzina:</span> {{ appointment.start_time }}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    appointment.priority === 'high' ? 'bg-red-100 text-red-800' :
                    appointment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  ]">
                    {{ getPriorityLabel(appointment.priority) }}
                  </span>
                  <ChevronRight class="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Today Tab -->
      <div v-if="activeTab === 'today'" class="space-y-4">
        <div class="card">
          <div class="p-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Dzisiejsze wizyty</h3>
          </div>
          
          <div v-if="serviceStore.todaysAppointments.length === 0" class="p-8 text-center">
            <Clock class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">Brak wizyt na dziś</h3>
            <p class="text-gray-600">Nie masz zaplanowanych wizyt na dzisiaj.</p>
          </div>

          <div v-else class="divide-y divide-gray-200">
            <div
              v-for="appointment in serviceStore.todaysAppointments"
              :key="appointment.id"
              class="p-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <p class="text-sm font-medium text-gray-900">
                      {{ appointment.description || 'Wizyta serwisowa' }}
                    </p>
                    <span :class="[
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      appointment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    ]">
                      {{ getAppointmentStatusLabel(appointment.status) }}
                    </span>
                  </div>
                  
                  <div class="space-y-1">
                    <p class="text-sm text-gray-800">
                      <span class="font-medium">Klient:</span> 
                      {{ appointment.client?.company_name || appointment.client?.contact_person || 'Nieznany klient' }}
                    </p>
                    
                    <p class="text-sm text-gray-600" v-if="appointment.technician_first_name">
                      <span class="font-medium">Technik:</span> 
                      {{ appointment.technician_first_name }} {{ appointment.technician_last_name }}
                    </p>
                    
                    <p class="text-sm text-gray-600" v-if="appointment.device_brand">
                      <span class="font-medium">Urządzenie:</span> 
                      {{ appointment.device_brand }} {{ appointment.device_model }} ({{ getDeviceTypeLabel(appointment.device_type) }})
                    </p>
                    
                    <p class="text-sm text-gray-600">
                      <span class="font-medium">Typ:</span> 
                      {{ getAppointmentTypeLabel(appointment.appointment_type) }}
                    </p>
                    
                    <div class="text-sm text-gray-500 mt-2">
                      <span class="font-medium">Godzina:</span> {{ appointment.start_time }}
                    </div>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <span :class="[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    appointment.priority === 'high' ? 'bg-red-100 text-red-800' :
                    appointment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  ]">
                    {{ getPriorityLabel(appointment.priority) }}
                  </span>
                  <button
                    v-if="canWrite"
                    @click="convertToService(appointment)"
                    class="btn-sm btn-primary"
                  >
                    Rozpocznij serwis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals would go here -->
    <!-- ServiceRecordModal, AppointmentModal, etc. -->

    <!-- Service Record Modal -->
    <div v-if="showServiceModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="showServiceModal = false"></div>
        
        <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Nowe zlecenie serwisowe</h3>
            <button @click="showServiceModal = false" class="text-gray-400 hover:text-gray-600">
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <form @submit.prevent="createServiceRecord" class="space-y-4">
            <div>
              <label class="label">
                <span class="label-text">Typ serwisu</span>
              </label>
              <select v-model="newServiceRecord.service_type" class="select select-bordered w-full" required>
                <option value="">Wybierz typ</option>
                <option v-for="type in serviceStore.config.serviceTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="label">
                <span class="label-text">Klient</span>
              </label>
              <div class="relative">
                <input 
                  v-model="newServiceRecord.client_search" 
                  @focus="showAllClients"
                  @input="debouncedClientSearch(newServiceRecord.client_search)"
                  placeholder="Wyszukaj klienta lub kliknij aby wybrać..." 
                  class="input input-bordered w-full" 
                  required 
                />
                <div v-if="clientSuggestions.length > 0 || showAllClientsDropdown" class="absolute z-50 w-full mt-1 border border-base-300 rounded-lg bg-base-100 shadow-lg max-h-40 overflow-y-auto">
                  <div v-for="client in displayedClients" :key="client.id" 
                       @mousedown="selectClient(client)"
                       class="px-3 py-2 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0">
                    <div class="font-medium">{{ client.company_name || client.contact_person || 'Brak nazwy' }}</div>
                    <div class="text-sm text-gray-500">{{ client.address_city || 'Brak miasta' }}</div>
                    <div class="text-sm text-gray-500">{{ client.phone || 'Brak telefonu' }}</div>
                  </div>
                  <div v-if="displayedClients.length === 0" class="px-3 py-2 text-gray-500 text-center">
                    Brak klientów spełniających kryteria
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label class="label">
                <span class="label-text">Urządzenie</span>
              </label>
              <select v-model="newServiceRecord.device_id" class="select select-bordered w-full" required>
                <option value="">Wybierz urządzenie</option>
                <option v-for="device in clientDevices" :key="device.id" :value="device.id">
                  {{ device.brand }} {{ device.model }} - {{ device.serial_number }}
                </option>
              </select>
            </div>
            
            <div>
              <label class="label">
                <span class="label-text">Opis problemu</span>
              </label>
              <textarea v-model="newServiceRecord.description" rows="3" class="textarea textarea-bordered w-full" required placeholder="Opisz problem..."></textarea>
            </div>
            
            <div>
              <label class="label">
                <span class="label-text">Priorytet</span>
              </label>
              <select v-model="newServiceRecord.priority" class="select select-bordered w-full" required>
                <option value="">Wybierz priorytet</option>
                <option v-for="priority in serviceStore.config.priorityLevels" :key="priority.value" :value="priority.value">
                  {{ priority.label }}
                </option>
              </select>
            </div>
            
            <div class="modal-action">
              <button type="button" @click="resetServiceForm" class="btn btn-ghost">Anuluj</button>
              <button type="submit" class="btn btn-primary" :disabled="isCreatingRecord">
                <span v-if="isCreatingRecord" class="loading loading-spinner loading-sm mr-2"></span>
                Utwórz zlecenie
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Appointment Modal -->
    <div v-if="showAppointmentModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="showAppointmentModal = false"></div>
        
        <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Umów termin wizyty</h3>
            <button @click="showAppointmentModal = false" class="text-gray-400 hover:text-gray-600">
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <form @submit.prevent="createAppointment">
            <!-- Service Record Selection -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Zlecenie serwisowe</span>
              </label>
              <select v-model="newAppointment.service_record_id" class="select select-bordered w-full" required>
                <option value="">Wybierz zlecenie serwisowe</option>
                <option v-for="record in serviceRecordsForAppointment" :key="record.id" :value="record.id">
                  {{ record.description }} - {{ getClientName(record) }} ({{ formatDate(record.created_at) }})
                </option>
              </select>
            </div>

            <!-- Client Search (auto-filled from service record) -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Klient</span>
              </label>
              <div class="relative">
                <input 
                  v-model="newAppointment.client_search" 
                  @input="debouncedAppointmentClientSearch(newAppointment.client_search)"
                  type="text" 
                  placeholder="Wyszukaj klienta..."
                  class="input input-bordered w-full"
                  required
                  :readonly="newAppointment.service_record_id"
                />
                
                <!-- Client suggestions -->
                <div v-if="appointmentClientSuggestions.length > 0" class="absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div 
                    v-for="client in appointmentClientSuggestions" 
                    :key="client.id"
                    @click="selectClientForAppointment(client)"
                    class="p-3 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0"
                  >
                    <div class="font-medium">{{ client.company_name || client.contact_person }}</div>
                    <div class="text-sm text-gray-500">{{ client.address_city || 'Brak miasta' }}</div>
                    <div class="text-sm text-gray-500">{{ client.phone || 'Brak telefonu' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Technician Selection -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Technik</span>
              </label>
              <select 
                v-model="newAppointment.technician_id"
                class="select select-bordered w-full"
                required
              >
                <option value="">Wybierz technika</option>
                <option 
                  v-for="technician in technicians" 
                  :key="technician.id" 
                  :value="technician.id"
                >
                  {{ technician.display_name }}
                </option>
              </select>
            </div>

            <!-- Typ wizyty -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Typ wizyty</span>
              </label>
              <select 
                v-model="newAppointment.appointment_type"
                class="select select-bordered w-full"
                required
              >
                <option value="maintenance">Konserwacja</option>
                <option value="repair">Naprawa</option>
                <option value="inspection">Przegląd</option>
                <option value="consultation">Konsultacja</option>
                <option value="installation">Instalacja</option>
                <option value="warranty_claim">Reklamacja gwarancyjna</option>
                <option value="emergency">Awaria</option>
              </select>
            </div>

            <!-- Date and Time -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Data i godzina</span>
              </label>
              <input 
                v-model="newAppointment.appointment_date" 
                type="datetime-local"
                class="input input-bordered w-full"
                required
              />
            </div>

            <!-- Description -->
            <div class="form-control mb-6">
              <label class="label">
                <span class="label-text">Opis</span>
              </label>
              <textarea 
                v-model="newAppointment.description" 
                placeholder="Szczegóły wizyty..."
                class="textarea textarea-bordered w-full h-24"
              ></textarea>
            </div>

            <!-- Form actions -->
            <div class="modal-action">
              <button type="button" @click="resetAppointmentForm" class="btn btn-ghost">Anuluj</button>
              <button type="submit" class="btn btn-primary" :disabled="isCreatingAppointment">
                <span v-if="isCreatingAppointment" class="loading loading-spinner loading-sm mr-2"></span>
                Umów wizytę
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useServiceStore } from '@/stores/serviceStore'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { 
  Plus, Calendar, Settings, Clock, ChevronRight, 
  AlertCircle, X 
} from 'lucide-vue-next'
import { debounce } from 'lodash-es'

const serviceStore = useServiceStore()
const authStore = useAuthStore()

// Reactive data
const activeTab = ref('records')
const showServiceModal = ref(false)
const showAppointmentModal = ref(false)

const filters = ref({
  search: '',
  service_type: '',
  status: ''
})

// Form data
const newServiceRecord = ref({
  service_type: '',
  client_id: null,
  client_search: '',
  device_id: null,
  description: '',
  priority: 'medium'
})

const newAppointment = ref({
  service_record_id: null,
  client_id: null,
  client_search: '',
  appointment_date: '',
  description: '',
  technician_id: null,
  appointment_type: 'maintenance'
})

// Suggestions and loading states  
const clientSuggestions = ref([])
const appointmentClientSuggestions = ref([])
const clientDevices = ref([])
const serviceRecordsForAppointment = ref([])
const technicians = ref([])
const isCreatingRecord = ref(false)
const isCreatingAppointment = ref(false)
const showAllClientsDropdown = ref(false)
const allClients = ref([])

// Computed
const canWrite = computed(() => 
  authStore.hasModulePermission('service-records', 'write') ||
  authStore.hasModulePermission('scheduling', 'write')
)

const canCreateRecord = computed(() => {
  console.log('🔐 Checking canCreateRecord:', {
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    role: authStore.user?.role
  })
  return authStore.isAuthenticated && (authStore.user?.role === 'admin' || authStore.user?.role === 'technician')
})

const canCreateAppointment = computed(() => {
  console.log('🔐 Checking canCreateAppointment:', {
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user,
    role: authStore.user?.role
  })
  return authStore.isAuthenticated && (authStore.user?.role === 'admin' || authStore.user?.role === 'technician')
})

const todaysCount = computed(() => serviceStore.todaysAppointments.length)

const displayedClients = computed(() => {
  if (newServiceRecord.value.client_search.length > 0) {
    return clientSuggestions.value
  } else if (showAllClientsDropdown.value) {
    return allClients.value
  }
  return []
})

// Methods
const loadData = async () => {
  try {
    console.log('🔄 Loading ServiceRecords data...')
    console.log('📍 Active tab:', activeTab.value)
    
    // Clear any previous errors
    serviceStore.clearError()
    
    // Load configuration first
    console.log('📋 Fetching service config...')
    try {
      await serviceStore.fetchServiceConfig()
      console.log('✅ Service config loaded:', serviceStore.config)
    } catch (configError) {
      console.warn('⚠️ Service config failed, continuing with defaults:', configError.message)
    }
    
    // Load data based on active tab
    if (activeTab.value === 'records') {
      console.log('📊 Loading service records...')
      await serviceStore.fetchServiceRecords()
      console.log('✅ Service records loaded:', serviceStore.serviceRecords.length)
    } else if (activeTab.value === 'appointments') {
      console.log('📅 Loading appointments...')
      await serviceStore.fetchAppointments()
      console.log('✅ Appointments loaded:', serviceStore.appointments.length)
    } else if (activeTab.value === 'today') {
      console.log('🕐 Loading today\'s appointments...')
      try {
        await serviceStore.fetchTodaysAppointments()
        console.log('✅ Today\'s appointments loaded:', serviceStore.todaysAppointments.length)
        console.log('📋 Today\'s appointments data:', serviceStore.todaysAppointments)
      } catch (todayError) {
        console.error('❌ Failed to load today\'s appointments:', todayError)
        console.error('Error response:', todayError.response?.data)
        console.error('Error message:', todayError.message)
        
        // Show user-friendly error
        if (todayError.response?.status === 500) {
          console.error('🚨 Server error - connection issues')
        } else if (!todayError.response) {
          console.error('🌐 Network error - cannot reach server')
        }
        throw todayError
      }
    }
    console.log('✅ Data loading completed')
  } catch (error) {
    console.error('❌ Error loading data:', error)
    console.error('Error details:', error.response?.data || error.message)
    console.error('Error stack:', error.stack)
    
    // Set a user-friendly error message
    if (!error.response) {
      serviceStore.error = 'Błąd połączenia z serwerem. Sprawdź czy serwer jest uruchomiony.'
    } else if (error.response.status === 500) {
      serviceStore.error = 'Błąd serwera. Spróbuj ponownie za chwilę.'
    } else {
      serviceStore.error = error.response?.data?.message || error.message || 'Nieznany błąd'
    }
  }
}

// Client search functions
const searchClients = debounce(async () => {
  console.log('🔍 Searching for clients with:', newServiceRecord.value.client_search)
  if (newServiceRecord.value.client_search.length > 2) {
    try {
      const response = await api.get('/clients', {
        params: {
          search: newServiceRecord.value.client_search,
          limit: 10
        }
      })
      console.log('🔍 API Response:', response.data)
      clientSuggestions.value = response.data.data || []
      console.log('Client search results:', clientSuggestions.value)
    } catch (error) {
      console.error('Error searching clients:', error)
      clientSuggestions.value = []
    }
  } else {
    clientSuggestions.value = []
  }
}, 300)

const searchClientsForAppointment = debounce(async () => {
  console.log('🔍 Searching for appointment clients with:', newAppointment.value.client_search)
  if (newAppointment.value.client_search.length > 2) {
    try {
      const response = await api.get('/clients', {
        params: {
          search: newAppointment.value.client_search,
          limit: 10
        }
      })
      console.log('🔍 API Response:', response.data)
      appointmentClientSuggestions.value = response.data.data || []
      console.log('Appointment client search results:', appointmentClientSuggestions.value)
    } catch (error) {
      console.error('Error searching clients:', error)
      appointmentClientSuggestions.value = []
    }
  } else {
    appointmentClientSuggestions.value = []
  }
}, 300)

const selectClient = async (client) => {
  console.log('👤 Selected client:', client)
  newServiceRecord.value.client_id = client.id
  
  // Display client info with full address
  const clientName = client.company_name || client.contact_person || 'Nieznany klient'
  
  // Build full address
  const addressParts = []
  if (client.address_street) addressParts.push(client.address_street)
  if (client.address_postal_code && client.address_city) {
    addressParts.push(`${client.address_postal_code} ${client.address_city}`)
  } else {
    if (client.address_postal_code) addressParts.push(client.address_postal_code)
    if (client.address_city) addressParts.push(client.address_city)
  }
  
  const fullAddress = addressParts.length > 0 ? `, ${addressParts.join(', ')}` : ''
  const phone = client.phone ? ` (tel: ${client.phone})` : ''
  
  newServiceRecord.value.client_search = `${clientName}${fullAddress}${phone}`
  clientSuggestions.value = []
  showAllClientsDropdown.value = false
  
  // Load client devices
  await loadClientDevices(client.id)
}

const selectClientForAppointment = (client) => {
  newAppointment.value.client_id = client.id
  // Handle new format (contact_person)  
  newAppointment.value.client_search = client.company_name || client.contact_person || 'Nieznany klient'
  appointmentClientSuggestions.value = []
}

// Load devices for selected client
const loadClientDevices = async (clientId) => {
  try {
    console.log('🔧 Loading devices for client:', clientId)
    const response = await api.get('/devices', {
      params: {
        client_id: clientId
      }
    })
    clientDevices.value = response.data.data || []
    console.log('✅ Client devices loaded:', clientDevices.value)
  } catch (error) {
    console.error('❌ Error loading client devices:', error)
    clientDevices.value = []
  }
}

// Load technicians for appointment assignments
const loadTechnicians = async () => {
  try {
    console.log('👨‍🔧 Loading technicians...')
    const response = await api.get('/service/technicians')
    technicians.value = response.data.data || []
    console.log('✅ Technicians loaded:', technicians.value)
  } catch (error) {
    console.error('❌ Error loading technicians:', error)
    technicians.value = []
  }
}

// Load service records for appointment dropdown
const loadServiceRecordsForAppointment = async () => {
  try {
    console.log('📋 Loading service records for appointment...')
    const response = await api.get('/service/records', {
      params: {
        status: 'scheduled,in_progress', // Show scheduled and in-progress records
        limit: 100
      }
    })
    serviceRecordsForAppointment.value = response.data.data || []
    console.log('✅ Service records loaded:', serviceRecordsForAppointment.value)
  } catch (error) {
    console.error('❌ Error loading service records:', error)
    serviceRecordsForAppointment.value = []
  }
}

// Helper functions
const getClientName = (record) => {
  if (record.client) {
    return record.client.company_name || record.client.contact_person || 'Nieznany klient'
  }
  return 'Nieznany klient'
}

const formatDate = (dateString) => {
  if (!dateString) return
  return new Date(dateString).toLocaleDateString('pl-PL')
}

// Watch for service record selection in appointment modal
watch(() => newAppointment.value.service_record_id, async (serviceRecordId) => {
  if (serviceRecordId) {
    // Auto-fill appointment data from service record
    const selectedRecord = serviceRecordsForAppointment.value.find(r => r.id === serviceRecordId)
    if (selectedRecord) {
      // client_id will be fetched from device when creating appointment
      newAppointment.value.client_search = getClientName(selectedRecord)
      newAppointment.value.description = `Wizyta w sprawie zlecenia: ${selectedRecord.description || ''}`
    }
  }
})

// Debounced search functions
const debouncedClientSearch = debounce(async (searchTerm) => {
  if (searchTerm && searchTerm.length > 2) {
    await searchClients()
  } else {
    clientSuggestions.value = []
  }
}, 300)

const debouncedAppointmentClientSearch = debounce(async (searchTerm) => {
  if (searchTerm && searchTerm.length > 2 && !newAppointment.value.service_record_id) {
    await searchClientsForAppointment()
  } else {
    appointmentClientSuggestions.value = []
  }
}, 300)

// Reset forms
const resetServiceForm = () => {
  newServiceRecord.value = {
    service_type: '',
    client_id: null,
    client_search: '',
    device_id: null,
    description: '',
    priority: 'medium'
  }
  clientSuggestions.value = []
  clientDevices.value = []
  showServiceModal.value = false
}

const resetAppointmentForm = () => {
  newAppointment.value = {
    service_record_id: null,
    client_id: null,
    client_search: '',
    appointment_date: '',
    description: '',
    technician_id: null,
    appointment_type: 'maintenance'
  }
  appointmentClientSuggestions.value = []
  showAppointmentModal.value = false
}

const applyFilters = () => {
  serviceStore.setFilters(filters.value)
  serviceStore.fetchServiceRecords()
}

const clearFilters = () => {
  filters.value = {
    search: '',
    service_type: '',
    status: ''
  }
  serviceStore.clearFilters()
  serviceStore.fetchServiceRecords()
}

const debouncedSearch = debounce(() => {
  applyFilters()
}, 300)

const previousPage = () => {
  if (serviceStore.pagination.page > 1) {
    serviceStore.setPagination({ page: serviceStore.pagination.page - 1 })
    loadData()
  }
}

const nextPage = () => {
  if (serviceStore.pagination.page < serviceStore.pagination.totalPages) {
    serviceStore.setPagination({ page: serviceStore.pagination.page + 1 })
    loadData()
  }
}

const viewServiceRecord = (record) => {
  // Open service record details modal or navigate to details page
  console.log('View service record:', record)
  // TODO: Add navigation to service record details
  alert(`Szczegóły zlecenia #${record.id.substring(0, 8)}:\n\nOpis: ${record.description}\nStatus: ${getStatusLabel(record.status)}\nTyp: ${getServiceTypeLabel(record.service_type)}`)
}

const viewAppointment = (appointment) => {
  // Open appointment details modal or navigate to details page  
  console.log('View appointment:', appointment)
  // TODO: Add navigation to appointment details
  alert(`Szczegóły wizyty:\n\nTytuł: ${appointment.title || 'Wizyta serwisowa'}\nData: ${formatDateTime(appointment.scheduled_date)}\nStatus: ${appointment.status}`)
}

const convertToService = async (appointment) => {
  try {
    await serviceStore.convertAppointmentToService(appointment.id, {
      service_type: 'maintenance',
      description: `Serwis na podstawie terminu: ${appointment.title}`
    })
    // Refresh data
    await loadData()
  } catch (error) {
    console.error('Error converting appointment:', error)
  }
}

// Utility functions
const getStatusColor = (status) => {
  const colors = {
    'scheduled': 'bg-blue-400',
    'in_progress': 'bg-yellow-400',
    'completed': 'bg-green-400',
    'cancelled': 'bg-red-400',
    'pending_parts': 'bg-orange-400',
    'follow_up_required': 'bg-purple-400'
  }
  return colors[status] || 'bg-gray-400'
}

const getStatusLabel = (status) => {
  const labels = {
    'scheduled': 'Zaplanowany',
    'in_progress': 'W trakcie',
    'completed': 'Zakończony',
    'cancelled': 'Anulowany',
    'pending_parts': 'Oczekuje na części',
    'follow_up_required': 'Wymaga kontroli'
  }
  return labels[status] || status
}

const getServiceTypeLabel = (type) => {
  const serviceType = serviceStore.config.serviceTypes.find(t => t.value === type)
  return serviceType?.label || type
}

const getAppointmentStatusLabel = (status) => {
  const statusLabels = {
    'scheduled': 'Zaplanowana',
    'confirmed': 'Potwierdzona',
    'in_progress': 'W trakcie',
    'completed': 'Zakończona',
    'cancelled': 'Anulowana',
    'no_show': 'Nieobecność',
    'rescheduled': 'Przełożona'
  }
  return statusLabels[status] || status
}

const getAppointmentTypeLabel = (type) => {
  const typeLabels = {
    'maintenance': 'Konserwacja',
    'repair': 'Naprawa',
    'inspection': 'Przegląd',
    'consultation': 'Konsultacja',
    'installation': 'Instalacja',
    'warranty_claim': 'Reklamacja gwarancyjna',
    'emergency': 'Awaria'
  }
  return typeLabels[type] || type
}

const getDeviceTypeLabel = (type) => {
  const deviceLabels = {
    'boiler': 'Kocioł',
    'burner': 'Palnik',
    'pump': 'Pompa',
    'valve': 'Zawór',
    'controller': 'Sterownik',
    'sensor': 'Czujnik',
    'other': 'Inne'
  }
  return deviceLabels[type] || type
}

const getPriorityLabel = (priority) => {
  const priorityLabels = {
    'low': 'Niski',
    'normal': 'Normalny',
    'medium': 'Średni',
    'high': 'Wysoki',
    'urgent': 'Pilny'
  }
  return priorityLabels[priority] || priority
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('pl-PL')
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('pl-PL', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Watch for tab changes
watch(activeTab, () => {
  loadData()
})

// Load data on mount
onMounted(() => {
  loadData()
})

// Form submission
const createServiceRecord = async () => {
  try {
    isCreatingRecord.value = true
    console.log('🔥 Creating service record...')
    console.log('📝 Form data:', newServiceRecord.value)
    
    // Validate required fields
    if (!newServiceRecord.value.service_type) {
      alert('Wybierz typ serwisu')
      return
    }
    if (!newServiceRecord.value.device_id) {
      alert('Wybierz urządzenie')
      return
    }
    if (!newServiceRecord.value.description.trim()) {
      alert('Wprowadź opis problemu')
      return
    }
    
    // Only send fields that exist in service_records table
    const recordData = {
      device_id: newServiceRecord.value.device_id,
      service_type: newServiceRecord.value.service_type,
      service_date: new Date().toISOString().split('T')[0],
      description: newServiceRecord.value.description.trim(),
      status: 'scheduled'
    }
    
    console.log('📤 Sending to API:', recordData)
    
    const result = await serviceStore.createServiceRecord(recordData)
    console.log('✅ Service record created:', result)
    
    // Show success message first
    alert('Zlecenie serwisowe zostało utworzone!')
    
    // Reset form and close modal
    resetServiceForm()
    
    // Refresh data
    await loadData()
    
  } catch (error) {
    console.error('❌ Error creating service record:', error)
    console.error('Error details:', error.response?.data || error.message)
    alert(`Błąd tworzenia zlecenia: ${error.response?.data?.message || error.message}`)
  } finally {
    isCreatingRecord.value = false
  }
}

const createAppointment = async () => {
  try {
    isCreatingAppointment.value = true
    console.log('📅 Creating appointment...')
    console.log('📝 Form data:', newAppointment.value)
    
    // Validate required fields
    if (!newAppointment.value.service_record_id) {
      alert('Wybierz zlecenie serwisowe')
      return
    }
    if (!newAppointment.value.appointment_date) {
      alert('Wybierz datę i godzinę')
      return
    }
    if (!newAppointment.value.technician_id) {
      alert('Wybierz technika')
      return
    }
    
    // Split datetime-local into date and time for backend
    const datetime = new Date(newAppointment.value.appointment_date)
    const appointmentDate = datetime.toISOString().split('T')[0] // YYYY-MM-DD
    const startTime = datetime.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
    
    // Get the service record to extract device_id
    const selectedServiceRecord = serviceRecordsForAppointment.value.find(
      record => record.id === newAppointment.value.service_record_id
    )
    
    if (!selectedServiceRecord) {
      alert('Nie znaleziono wybranego zlecenia serwisowego')
      return
    }
    
    // Get device data to obtain client_id
    console.log('🔧 Getting device data for device_id:', selectedServiceRecord.device_id)
    let deviceResponse
    try {
      deviceResponse = await api.get(`/devices/${selectedServiceRecord.device_id}`)
    } catch (error) {
      alert('Błąd pobierania danych urządzenia')
      console.error('❌ Error getting device data:', error)
      return
    }
    
    const device = deviceResponse.data.data
    if (!device || !device.client_id) {
      alert('Nie znaleziono klienta dla wybranego urządzenia')
      return
    }
    
    console.log('✅ Device data retrieved:', {
      device_id: device.id,
      client_id: device.client_id,
      client_name: device.company_name || device.contact_person
    })
    
    const appointmentData = {
      client_id: device.client_id,  // Get from device, not service record
      device_id: selectedServiceRecord.device_id,
      technician_id: newAppointment.value.technician_id,
      appointment_date: appointmentDate,
      start_time: startTime,
      description: newAppointment.value.description.trim() || `Wizyta serwisowa - ${selectedServiceRecord.description}`,
      appointment_type: newAppointment.value.appointment_type,
      status: 'scheduled',
      priority: 'normal'
    }
    
    console.log('📤 Sending appointment to API:', appointmentData)
    
    const result = await serviceStore.createAppointment(appointmentData)
    console.log('✅ Appointment created:', result)
    
    // Show success message first
    alert('Termin wizyty został umówiony!')
    
    // Reset form and close modal
    resetAppointmentForm()
    
    // Refresh data for current active tab
    await loadData()
    
    // ZAWSZE odśwież dzisiejsze terminy niezależnie od aktywnej zakładki
    // aby zaktualizować licznik w zakładce "Dzisiaj"
    try {
      console.log('🔄 Refreshing today\'s appointments...')
      await serviceStore.fetchTodaysAppointments()
      console.log('✅ Today\'s appointments refreshed:', serviceStore.todaysAppointments.length)
    } catch (todayError) {
      console.warn('⚠️ Failed to refresh today\'s appointments:', todayError.message)
    }
    
  } catch (error) {
    console.error('❌ Error creating appointment:', error)
    const errorMessage = error.response?.data?.message || error.message || 'Błąd podczas umówienia terminu'
    alert(`Błąd umówienia terminu: ${errorMessage}`)
  } finally {
    isCreatingAppointment.value = false
  }
}

// Watch for appointment modal opening to load service records
watch(() => showAppointmentModal.value, async (isOpen) => {
  if (isOpen) {
    await loadServiceRecordsForAppointment()
    await loadTechnicians()
    // Set default technician to current user
    if (authStore.user && !newAppointment.value.technician_id) {
      newAppointment.value.technician_id = authStore.user.id
    }
  }
})

const showAllClients = async () => {
  if (allClients.value.length === 0) {
    try {
      console.log('📋 Loading all clients...')
      const response = await api.get('/clients', {
        params: {
          limit: 100
        }
      })
      allClients.value = response.data.data || []
      console.log('✅ All clients loaded:', allClients.value.length)
    } catch (error) {
      console.error('❌ Error loading all clients:', error)
      allClients.value = []
    }
  }
  showAllClientsDropdown.value = true
}

const hideClientSuggestions = () => {
  // Delay hiding to allow for click events
  setTimeout(() => {
    showAllClientsDropdown.value = false
    clientSuggestions.value = []
  }, 150)
}

const deleteServiceRecord = async (record) => {
  // Confirm deletion
  const confirmMessage = `Czy na pewno chcesz usunąć zlecenie #${record.id.substring(0, 8)}?\n\nKlient: ${record.client?.company_name || record.client?.contact_person || 'Nieznany'}\nUrządzenie: ${record.device?.brand} ${record.device?.model}\n\nTa operacja jest nieodwracalna!`
  
  if (!confirm(confirmMessage)) {
    return
  }

  try {
    await serviceStore.deleteServiceRecord(record.id)
    alert('Zlecenie zostało usunięte')
    // Refresh data
    await loadData()
  } catch (error) {
    console.error('❌ Error deleting service record:', error)
    console.error('Error details:', error.response?.data || error.message)
    alert(`Błąd usuwania zlecenia: ${error.response?.data?.message || error.message}`)
  }
}

// Retry connection function
const retryConnection = () => {
  console.log('🔄 Retrying connection...')
  serviceStore.clearError()
  loadData()
}
</script> 