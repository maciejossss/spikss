<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-secondary-900">Zlecenia serwisowe</h1>
        <p class="text-secondary-600">Zarządzaj zleceniami i serwisami</p>
        <!-- DEBUG INFO -->
        <p class="text-xs text-blue-600 mt-1">
          DEBUG: showAddModal={{ showAddModal }}, showEditModal={{ showEditModal }}
        </p>
      </div>
      <!-- Bardzo widoczny pasek akcji dla zakładki Usunięte -->
      <div v-if="activeTab==='trash'" class="mb-4 px-4 py-3 rounded-md border border-red-200 bg-red-50 flex items-center justify-between">
        <div class="text-sm font-medium text-red-800">
          Tryb kosza: możesz zaznaczyć widoczne pozycje i usunąć je bezpowrotnie.
        </div>
        <div class="flex items-center space-x-2">
          <button @click="selectAllVisibleDeleted" type="button" class="px-3 py-1 text-sm border border-red-300 rounded bg-white hover:bg-red-100">
            Zaznacz widoczne
          </button>
          <button @click="clearSelectionDeleted" type="button" class="px-3 py-1 text-sm border border-red-300 rounded bg-white hover:bg-red-100">
            Wyczyść
          </button>
          <button @click="hardDeleteSelected" :disabled="selectedDeletedIds.length===0" type="button" class="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            Usuń zaznaczone ({{ selectedDeletedIds.length }})
          </button>
        </div>
      </div>
              <button
          @click="openAddModal"
          class="btn-primary"
          id="test-new-order-btn"
        >
          <i class="fas fa-plus mr-2"></i>
          Nowe zlecenie
        </button>
        <button @click="refreshFromRailway" class="ml-2 btn-secondary" title="Aktualizuj wysłane">
          <i class="fas fa-sync-alt mr-2"></i> Aktualizuj wysłane
        </button>
        <button @click="refreshStatusesFromRailway" class="ml-2 btn-secondary" title="Aktualizuj statusy zleceń">
          <i class="fas fa-cloud-download-alt mr-2"></i> Aktualizuj statusy zleceń
        </button>
    </div>

    <!-- Statystyki -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-clock text-blue-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.new }}</div>
            <div class="text-sm text-secondary-600">Nowe</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-tools text-yellow-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.in_progress }}</div>
            <div class="text-sm text-secondary-600">W realizacji</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-red-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.urgent }}</div>
            <div class="text-sm text-secondary-600">Pilne</div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <i class="fas fa-check-circle text-green-600"></i>
            </div>
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold text-secondary-900">{{ orderStats.completed }}</div>
            <div class="text-sm text-secondary-600">Ukończone</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Zakładki -->
    <div class="mb-4">
      <div class="inline-flex rounded-lg overflow-hidden border border-secondary-200 bg-white">
        <button
          @click="activeTab = 'active'"
          :class="activeTab === 'active' ? 'bg-primary-50 text-primary-700' : 'bg-white text-secondary-700'"
          class="px-4 py-2 text-sm font-medium hover:bg-secondary-50"
        >
          Aktywne
        </button>
        <button
          @click="activeTab = 'completed'"
          :class="activeTab === 'completed' ? 'bg-primary-50 text-primary-700' : 'bg-white text-secondary-700'"
          class="px-4 py-2 text-sm font-medium hover:bg-secondary-50 border-l border-secondary-200"
        >
          Zakończone
        </button>
        <button
          @click="activeTab = 'toSync'"
          :class="activeTab === 'toSync' ? 'bg-primary-50 text-primary-700' : 'bg-white text-secondary-700'"
          class="px-4 py-2 text-sm font-medium hover:bg-secondary-50 border-l border-secondary-200"
        >
          Do wysłania
        </button>
        <button
          @click="switchToFromClient"
          :class="activeTab === 'fromClient' ? 'bg-primary-50 text-primary-700' : 'bg-white text-secondary-700'"
          class="px-4 py-2 text-sm font-medium hover:bg-secondary-50 border-l border-secondary-200"
        >
          Od klientów
        </button>
        <button
          @click="activeTab = 'archived'"
          :class="activeTab === 'archived' ? 'bg-primary-50 text-primary-700' : 'bg-white text-secondary-700'"
          class="px-4 py-2 text-sm font-medium hover:bg-secondary-50 border-l border-secondary-200"
        >
          Archiwum
        </button>
        <button
          @click="activeTab = 'trash'"
          :class="activeTab === 'trash' ? 'bg-primary-50 text-primary-700' : 'bg-white text-secondary-700'"
          class="px-4 py-2 text-sm font-medium hover:bg-secondary-50 border-l border-secondary-200"
        >
          Usunięte
        </button>
        <div v-if="activeTab==='trash'" class="ml-2 flex items-center space-x-2">
          <span class="text-xs text-secondary-500">BULK UI</span>
          <button @click="selectAllVisibleDeleted" class="px-2 py-1 text-xs border rounded">Zaznacz widoczne</button>
          <button @click="clearSelectionDeleted" class="px-2 py-1 text-xs border rounded">Wyczyść</button>
          <button @click="hardDeleteSelected" :disabled="selectedDeletedIds.length===0" class="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-40">Usuń zaznaczone ({{ selectedDeletedIds.length }})</button>
        </div>
      </div>
    </div>

    <!-- Filtry i wyszukiwanie -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Wyszukiwanie -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Szukaj
          </label>
          <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Numer, tytuł, klient..."
              class="input-field pl-10"
            />
          </div>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Status
          </label>
          <select v-model="filterStatus" class="input-field">
            <option value="">Wszystkie</option>
            <option value="new">Nowe</option>
            <option value="assigned">Przypisane</option>
            <option value="in_progress">W realizacji</option>
            <option value="waiting_for_parts">Oczekuje na części</option>
            <option value="completed">Ukończone</option>
            <option value="cancelled">Anulowane</option>
            <option value="przed_czasem">Przed czasem</option>
          </select>
        </div>

        <!-- Typ -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Typ
          </label>
          <select v-model="filterType" class="input-field">
            <option value="">Wszystkie</option>
            <option value="breakdown">Awaria</option>
            <option value="maintenance">Konserwacja</option>
            <option value="installation">Instalacja</option>
            <option value="inspection">Przegląd</option>
          </select>
        </div>

        <!-- Priorytet -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Priorytet
          </label>
          <select v-model="filterPriority" class="input-field">
            <option value="">Wszystkie</option>
            <option value="low">Niski</option>
            <option value="medium">Średni</option>
            <option value="high">Wysoki</option>
            <option value="urgent">Pilny</option>
          </select>
        </div>

        <!-- Klient -->
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-2">
            Klient
          </label>
          <select v-model="filterClient" class="input-field">
            <option value="">Wszyscy klienci</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ getClientName(client) }}
            </option>
          </select>
        </div>

        <!-- Akcje kosza w obszarze filtrów (sticky) -->
        <div v-if="activeTab==='trash'" class="mt-4 flex items-center justify-end space-x-2 sticky top-0 z-10 bg-white/90 backdrop-blur px-2 py-1 rounded">
          <span class="text-sm text-secondary-600">Zaznaczono: {{ selectedDeletedIds.length }}</span>
          <button @click="selectAllVisibleDeleted" type="button" class="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50">
            Zaznacz widoczne
          </button>
          <button @click="clearSelectionDeleted" type="button" class="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50">
            Wyczyść
          </button>
          <button @click="hardDeleteSelected" :disabled="selectedDeletedIds.length===0" type="button" class="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            Usuń zaznaczone
          </button>
        </div>
      </div>
    </div>

    <!-- Lista zleceń -->
    <div class="bg-white rounded-xl shadow-sm border border-secondary-200">
      <!-- Loading state -->
      <div v-if="isLoading" class="p-8 text-center">
        <i class="fas fa-spinner fa-spin text-2xl text-primary-600 mb-4"></i>
        <p class="text-secondary-600">Ładowanie zleceń...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-8 text-center">
        <i class="fas fa-exclamation-triangle text-2xl text-red-500 mb-4"></i>
        <p class="text-red-600">{{ error }}</p>
        <button @click="loadOrders" class="btn-secondary mt-4">
          <i class="fas fa-redo mr-2"></i>
          Spróbuj ponownie
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="paginatedOrders.length === 0" class="p-8 text-center">
        <i class="fas fa-clipboard-list text-4xl text-secondary-300 mb-4"></i>
        <p class="text-secondary-600 mb-4">
          {{ hasFilters ? 'Brak zleceń spełniających kryteria' : 'Brak zleceń w systemie' }}
        </p>
        <button v-if="!hasFilters" @click="openAddModal" class="btn-primary">
          <i class="fas fa-plus mr-2"></i>
          Dodaj pierwsze zlecenie
        </button>
      </div>

      <!-- Toolbar dla kosza (masowe usuwanie) -->
      <div v-if="activeTab==='trash'" class="flex items-center justify-between mb-3 bg-white border border-secondary-200 rounded-lg px-4 py-2">
        <div class="text-sm text-secondary-600">
          Zaznaczono: {{ selectedDeletedIds.length }}
        </div>
        <div class="flex items-center space-x-2">
          <button @click="selectAllVisibleDeleted" type="button" class="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50">
            Zaznacz widoczne
          </button>
          <button @click="clearSelectionDeleted" type="button" class="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50">
            Wyczyść zaznaczenie
          </button>
          <button v-if="selectedDeletedIds.length>0" @click="hardDeleteSelected" type="button" class="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700">
            Usuń zaznaczone
          </button>
        </div>
      </div>

      <!-- Tabela zleceń -->
      <div class="bg-white shadow overflow-x-auto sm:rounded-md">
        <table class="min-w-full divide-y divide-secondary-200">
          <thead class="bg-secondary-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Zlecenie
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Klient
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Urządzenie
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Typ/Priorytet
              </th>
              <th v-if="activeTab==='trash'" class="px-2 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                <input type="checkbox" :checked="isAllDeletedSelected" @change="toggleSelectAllDeleted($event)" />
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Technik
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                Terminy
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                <div class="flex items-center justify-end space-x-2">
                  <span>Akcje</span>
                  <template v-if="activeTab==='trash'">
                    <input type="checkbox" :checked="isAllDeletedSelected" @change="toggleSelectAllDeleted($event)" title="Zaznacz/odznacz widoczne" />
                    <button
                      @click="hardDeleteSelected"
                      :disabled="selectedDeletedIds.length===0"
                      class="text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Usuń zaznaczone (bezpowrotnie)"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </template>
                </div>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-secondary-200">
            <template v-for="order in paginatedOrders" :key="order.id">
            <tr class="hover:bg-secondary-50 align-top">
              <!-- Zlecenie -->
              <td class="px-4 py-4 text-sm">
                <div class="space-y-1">
                  <div class="flex items-center space-x-2">
                    <div class="font-medium text-secondary-900">{{ order.order_number || `#${order.id}` }}</div>
                    <input v-if="activeTab==='trash'" type="checkbox" :value="order.id" v-model="selectedDeletedIds" class="ml-1" />
                    <!-- Ikona zmian klienta -->
                    <span v-if="hasPendingClientChange(order)"
                          class="inline-flex items-center text-yellow-700 bg-yellow-100 border border-yellow-200 rounded px-2 py-0.5 text-[11px] cursor-pointer"
                          title="Proponowane zmiany danych klienta – kliknij, aby zobaczyć"
                          @click="goToOrder(order.id)">
                      <i class="fas fa-exclamation-circle mr-1"></i>
                      Zmiana danych
                    </span>
                    <!-- Ikona zmian urządzenia -->
                    <span v-if="hasPendingDeviceChange(order)"
                          class="inline-flex items-center text-indigo-700 bg-indigo-100 border border-indigo-200 rounded px-2 py-0.5 text-[11px] cursor-pointer"
                          title="Proponowane zmiany danych urządzenia – kliknij, aby zobaczyć"
                          @click="goToOrder(order.id)">
                      <i class="fas fa-tools mr-1"></i>
                      Zmiana urządzenia
                    </span>
                  </div>
                  <div class="text-secondary-500 text-xs">{{ order.title }}</div>
                  <!-- Chip pauz (sesje pracy) – pokazuj tylko, jeśli mamy dane z summary -->
                  <div v-if="order._ws && (order._ws.sessionsCount || order._ws.totalSeconds)" class="text-[11px] inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                    <i class="fas fa-pause mr-1 text-gray-500"></i>
                    Pauzy: {{ order._ws.sessionsCount || 0 }}, łącznie: {{ formatSeconds(order._ws.totalSeconds || 0) }}
                  </div>
                </div>
              </td>
              
              <!-- Klient -->
              <td class="px-4 py-4 text-sm">
                <div class="space-y-2">
                  <div class="font-medium text-secondary-900">
                    <i class="fas fa-user text-primary-500 mr-1"></i>
                    {{ getClientDisplayName(order) }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="order.client_phone">
                    <i class="fas fa-phone text-green-500 mr-1"></i>
                    {{ order.client_phone }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="order.client_email">
                    <i class="fas fa-envelope text-blue-500 mr-1"></i>
                    {{ order.client_email }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="getClientAddress(order)">
                    <i class="fas fa-map-marker-alt text-red-500 mr-1"></i>
                    {{ getClientAddress(order) }}
                  </div>
                  <div v-if="isRequestRow(order)" class="pt-2 mt-2 border-t border-secondary-100">
                    <div class="text-[11px] uppercase tracking-wide text-secondary-500 mb-1">
                      Status danych
                    </div>
                    <div class="space-y-3">
                      <div>
                        <div class="text-[11px] font-semibold text-secondary-600 uppercase tracking-wide">Klient</div>
                        <div class="flex flex-wrap gap-1 mt-1">
                          <span
                            v-if="order.autoClientReady"
                            class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200"
                          >
                            <i class="fas fa-check mr-1"></i>
                            Dane kompletne
                          </span>
                          <template v-else>
                            <span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
                              <i class="fas fa-exclamation-circle mr-1"></i>
                              Braki
                            </span>
                            <span
                              v-for="missing in (order.autoClientMissing || [])"
                              :key="`client-missing-${missing}`"
                              class="inline-flex items-center px-2 py-0.5 text-[11px] rounded bg-red-50 text-red-700 border border-red-100"
                            >
                              {{ missing }}
                            </span>
                          </template>
                        </div>
                      </div>
                      <div>
                        <div class="text-[11px] font-semibold text-secondary-600 uppercase tracking-wide">Urządzenie</div>
                        <div class="flex flex-wrap gap-1 mt-1">
                          <span
                            v-if="order.autoDeviceReady"
                            class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200"
                          >
                            <i class="fas fa-check mr-1"></i>
                            Dane kompletne
                          </span>
                          <template v-else>
                            <span class="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 border border-red-200">
                              <i class="fas fa-exclamation-circle mr-1"></i>
                              Braki
                            </span>
                            <span
                              v-for="missing in (order.autoDeviceMissing || [])"
                              :key="`device-missing-${missing}`"
                              class="inline-flex items-center px-2 py-0.5 text-[11px] rounded bg-red-50 text-red-700 border border-red-100"
                            >
                              {{ missing }}
                            </span>
                          </template>
                        </div>
                      </div>
                      <div
                        v-if="order.autoWarnings?.length"
                        class="flex flex-wrap gap-1"
                      >
                        <span
                          v-for="warn in order.autoWarnings"
                          :key="`warn-${warn}`"
                          class="inline-flex items-center px-2 py-0.5 text-[11px] rounded bg-yellow-50 text-yellow-700 border border-yellow-100"
                        >
                          <i class="fas fa-info-circle mr-1"></i>
                          {{ warn }}
                        </span>
                      </div>
                      <div
                        v-if="order.autoMissing && order.autoMissing.length"
                        class="flex flex-col gap-1 text-xs bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700"
                      >
                        <div class="font-semibold">Brakuje danych, aby utworzyć zlecenie:</div>
                        <ul class="list-disc list-inside space-y-1">
                          <li v-for="missing in order.autoMissing" :key="`missing-${missing}`">
                            {{ missing }}
                          </li>
                        </ul>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="btn-secondary !text-xs"
                          type="button"
                          :disabled="!order.autoClientReady"
                          @click="openClientModalForRequest(order)"
                        >
                          <i class="fas fa-user-plus mr-1"></i>
                          Utwórz klienta
                        </button>
                        <button
                        class="btn-secondary !text-xs"
                        type="button"
                        :disabled="!order.autoDeviceReady"
                        @click="openDeviceModalForRequest(order)"
                        >
                          <i class="fas fa-tools mr-1"></i>
                          Utwórz urządzenie
                        </button>
                        <button
                          class="btn-primary !text-xs"
                          type="button"
                          @click="finalizeRequestConversion(order)"
                        >
                          <i class="fas fa-share-square mr-1"></i>
                          Utwórz zlecenie
                        </button>
                      </div>
                      <div
                        v-if="order._clientAutomationMessage || order._deviceAutomationMessage"
                        class="flex flex-col gap-1 text-xs text-green-600 mt-2"
                      >
                        <div v-if="order._clientAutomationMessage" class="flex items-center gap-1">
                          <i class="fas fa-check-circle"></i>
                          {{ order._clientAutomationMessage }}
                        </div>
                        <div v-if="order._deviceAutomationMessage" class="flex items-center gap-1">
                          <i class="fas fa-check-circle"></i>
                          {{ order._deviceAutomationMessage }}
                        </div>
                      </div>
                      <div
                        v-if="order.linked_client_id || order.linked_device_id"
                        class="space-y-1 text-[11px] text-secondary-600"
                      >
                        <div v-if="order.linked_client_id">
                          <i class="fas fa-user mr-1 text-secondary-500"></i>
                          Klient: {{ order.linked_client_name || ('ID ' + order.linked_client_id) }}
                        </div>
                        <div v-if="order.linked_device_id">
                          <i class="fas fa-cog mr-1 text-secondary-500"></i>
                          Urządzenie: {{ order.linked_device_name || ('ID ' + order.linked_device_id) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              
              <!-- Urządzenie -->
              <td class="px-4 py-4 text-sm">
                <div class="space-y-2">
                  <div class="font-medium text-secondary-900">
                    <i class="fas fa-cog text-orange-500 mr-1"></i>
                    {{ getDeviceDisplayName(order) }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="order.device_brand">
                    <i class="fas fa-industry text-blue-600 mr-1"></i>
                    <strong>Marka:</strong> {{ order.device_brand }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="order.device_model">
                    <i class="fas fa-tag text-purple-600 mr-1"></i>
                    <strong>Model:</strong> {{ order.device_model }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="order.device_last_service">
                    <i class="fas fa-calendar-check text-green-600 mr-1"></i>
                    <strong>Ostatni serwis:</strong> {{ formatDate(order.device_last_service) }}
                  </div>
                  <div class="text-secondary-600 text-xs" v-if="order.device_serial">
                    <i class="fas fa-barcode text-gray-600 mr-1"></i>
                    <strong>S/N:</strong> {{ order.device_serial }}
                  </div>
                </div>
              </td>

              <!-- Typ/Priorytet -->
              <td class="px-4 py-4">
                <div class="text-sm text-secondary-900">{{ getOrderTypeLabel(order) }}</div>
                <span 
                  :class="getPriorityClass(order.priority)"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getPriorityName(order.priority) }}
                </span>
              </td>

              <!-- Checkbox (tylko w zakładce Usunięte) -->
              <td v-if="activeTab==='trash'" class="px-2 py-4">
                <input type="checkbox" :value="order.id" v-model="selectedDeletedIds" />
              </td>

              <!-- Status -->
              <td class="px-4 py-4">
                <span 
                  :class="getStatusClass(order.status)"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getStatusName(order.status) }}
                </span>
              </td>

              <!-- Technik -->
              <td class="px-4 py-4">
                <!-- Zgłoszenia od klientów: pokaż wyraźny przycisk konwersji/przypisania zamiast nieaktywnego selecta -->
                <div v-if="isRequestRow(order)" class="flex flex-col space-y-2 text-sm">
                  <button
                    @click="finalizeRequestConversion(order)"
                    :class="[
                      'flex items-center justify-center px-3 py-1 rounded font-medium transition-colors',
                      order.linked_client_id && order.linked_device_id
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-200 hover:bg-blue-300 text-blue-700'
                    ]"
                    :title="order.linked_client_id && order.linked_device_id
                      ? 'Otwórz formularz nowego zlecenia z danymi zgłoszenia'
                      : 'Brakuje przypiętego klienta lub urządzenia – sprawdź dane przed utworzeniem zlecenia'"
                  >
                    Utwórz zlecenie
                  </button>
                </div>
                <div v-else-if="order.assigned_user_id" class="text-sm text-secondary-900">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-user-wrench text-blue-500"></i>
                    <select 
                      :value="order.assigned_user_id || ''"
                      @input="changeTechnician(order, $event.target.value)"
                      class="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :disabled="order.status === 'completed'"
                    >
                      <option value="">Nie przypisano</option>
                      <option 
                        v-for="technician in technicians" 
                        :key="technician.id" 
                        :value="String(technician.id)"
                      >
                        {{ technician.full_name }} (ID: {{ technician.id }}) - Zleceń: {{ getTechnicianOrderCount(technician.id) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div v-else class="text-sm text-secondary-400">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-user-slash text-gray-400"></i>
                    <select 
                      :value="order.assigned_user_id || ''"
                      @input="changeTechnician(order, $event.target.value)"
                      class="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      :disabled="order.status === 'completed'"
                    >
                      <option value="">Nie przypisano</option>
                      <option 
                        v-for="technician in technicians" 
                        :key="technician.id" 
                        :value="String(technician.id)"
                      >
                        {{ technician.full_name }} (ID: {{ technician.id }}) - Zleceń: {{ getTechnicianOrderCount(technician.id) }}
                      </option>
                    </select>
                  </div>
                </div>
              </td>

              <!-- Terminy -->
              <td class="px-4 py-4 text-sm text-secondary-900">
                <div v-if="order.created_at" class="text-secondary-500">
                  Utworzone: {{ formatDate(order.created_at) }}
                </div>
                <div v-if="order.scheduled_date">Planowane: {{ formatDate(order.scheduled_date) }}</div>
                <div v-if="order.started_at" class="text-secondary-500">Rozpoczęte: {{ formatTime(order.started_at) }}</div>
                <div v-if="order.completed_at" class="text-green-600">Ukończone: {{ formatTime(order.completed_at) }}</div>
                <div v-if="order.started_at && order.completed_at" class="text-xs text-secondary-600">
                  Czas pracy: {{ humanDuration(order.started_at, order.completed_at) }}
                  <span v-if="order.estimated_hours"> (szac.: {{ order.estimated_hours }}h)</span>
                </div>
              </td>

              <!-- Koszty -->
              <td class="px-4 py-4 text-sm text-secondary-900">
                <div v-if="order.total_cost > 0">
                  {{ order.total_cost.toFixed(2) }} zł
                </div>
                <div v-else class="text-secondary-400">
                  Nie ustalono
                </div>
                <div v-if="order.estimated_hours" class="text-xs text-secondary-500">
                  {{ order.estimated_hours }}h szacowane
                </div>
                <div v-if="order.started_at && order.completed_at" class="text-xs text-green-600">
                  Czas pracy: {{ durationMinutes(order.started_at, order.completed_at) }} min
                </div>
              </td>

              <!-- Akcje -->
              <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-right">
                <div class="flex space-x-2 justify-end">
                  <button
                    @click="viewOrder(order.id)"
                    class="text-primary-600 hover:text-primary-900"
                    title="Zobacz szczegóły"
                  >
                    <i class="fas fa-eye"></i>
                  </button>
                  <button v-if="order.status==='completed' || isRequestRow(order)" @click="toggleDetails(order)" class="text-secondary-600 hover:text-secondary-900" :title="isRequestRow(order) ? 'Szczegóły zgłoszenia klienta' : 'Szczegóły wykonania'">
                    <i class="fas fa-file-alt"></i>
                  </button>
                  <button
                    v-if="!isRequestRow(order)"
                    @click="editOrder(order)"
                    class="text-secondary-600 hover:text-secondary-900"
                    title="Edytuj"
                  >
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    v-if="isRequestRow(order)"
                    @click="finalizeRequestConversion(order)"
                    :class="[
                      'text-green-600 hover:text-green-900 transition-opacity',
                      (!order.linked_client_id || !order.linked_device_id) ? 'opacity-60' : ''
                    ]"
                    :title="(!order.linked_client_id || !order.linked_device_id)
                      ? 'Brakuje przypiętego klienta lub urządzenia – sprawdź dane przed utworzeniem zlecenia'
                      : 'Utwórz zlecenie z tego zgłoszenia i przypisz'"
                  >
                    <i class="fas fa-share-square"></i>
                  </button>

                  <button
                    v-if="order.status === 'new'"
                    @click="startOrder(order)"
                    class="text-blue-600 hover:text-blue-900"
                    title="Wyślij do technika"
                  >
                    <i class="fas fa-paper-plane"></i>
                  </button>
                  
                  <button
                    v-if="order.status === 'in_progress'"
                    @click="completeOrder(order)"
                    class="text-green-600 hover:text-green-900"
                    title="Oznacz jako ukończone"
                  >
                    <i class="fas fa-check"></i>
                  </button>
                  
                  <button
                    @click="isRequestRow(order) ? deleteClientRequest(order) : deleteOrder(order)"
                    class="text-red-600 hover:text-red-900"
                    title="Usuń"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                  <input v-if="activeTab==='trash'" type="checkbox" :value="order.id" v-model="selectedDeletedIds" class="ml-2" />
                </div>
              </td>
            </tr>
            <tr v-if="expandedRowId===order.id" class="bg-secondary-50">
              <td colspan="8" class="px-6 py-4 text-sm text-secondary-800">
                <div v-if="isRequestRow(order)" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-blue-50 p-3 rounded">
                    <div class="font-semibold mb-2">Dane kontaktowe</div>
                    <div><strong>Imię i nazwisko:</strong> {{ order.client_name || '—' }}</div>
                    <div><strong>Telefon:</strong> {{ order.client_phone || '—' }}</div>
                    <div><strong>Email:</strong> {{ order.client_email || '—' }}</div>
                    <div v-if="order.client_nip"><strong>NIP:</strong> {{ order.client_nip }}</div>
                  </div>
                  <div class="bg-green-50 p-3 rounded">
                    <div class="font-semibold mb-2">Lokalizacja</div>
                    <div><strong>Adres:</strong> {{ order.address || '—' }}</div>
                    <div v-if="order.directions"><strong>Dojazd:</strong> {{ order.directions }}</div>
                  </div>
                  <div class="bg-yellow-50 p-3 rounded">
                    <div class="font-semibold mb-2">Urządzenie</div>
                    <div><strong>Typ:</strong> {{ order.device_type || '—' }}</div>
                    <div v-if="order.device_model"><strong>Model:</strong> {{ order.device_model }}</div>
                    <div v-if="order.device_year"><strong>Rok:</strong> {{ order.device_year }}</div>
                    <div v-if="order.device_serviced"><strong>Serwisowane:</strong> {{ order.device_serviced }}</div>
                  </div>
                  <div class="bg-purple-50 p-3 rounded">
                    <div class="font-semibold mb-2">Preferencje</div>
                    <div><strong>Typ zgłoszenia:</strong> {{ order.service_type || '—' }}</div>
                    <div v-if="order.scheduled_date"><strong>Data:</strong> {{ formatDate(order.scheduled_date) }}</div>
                    <div v-if="order.preferred_time"><strong>Godzina:</strong> {{ order.preferred_time?.slice(0,5) }}</div>
                    <div><strong>Pilne:</strong> {{ order.is_urgent ? 'Tak' : 'Nie' }}</div>
                    <div v-if="order.submitted_at || order.created_at"><strong>Wysłane:</strong> {{ formatDate(order.submitted_at || order.created_at) }}</div>
                  </div>
                  <div class="md:col-span-2 bg-white p-3 rounded border">
                    <div class="font-semibold mb-2">Opis zgłoszenia</div>
                    <div class="whitespace-pre-wrap">{{ order.description || '—' }}</div>
                  </div>
                </div>
                <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div class="font-semibold mb-1">Opis wykonanych czynności</div>
                    <div class="whitespace-pre-wrap">{{ order.completion_notes || 'Brak danych' }}</div>
                  </div>
                  <!-- Użyte części (ukryte – zarządzane z poziomu desktop operatora) -->
                  <div v-if="false">
                    <div class="font-semibold mb-1">Użyte części</div>
                    <div class="whitespace-pre-wrap">{{ order.parts_used || 'Brak danych' }}</div>
                  </div>
                  <div>
                    <div class="font-semibold mb-1">Czas pracy</div>
                  <div class="text-sm text-secondary-800">
                    <span v-if="order.actual_hours !== null && order.actual_hours !== undefined">Zgłoszone: {{ Number(order.actual_hours).toFixed(1) }} h</span>
                    <span v-else-if="computedHumanDuration(order)">Zgłoszone (policzone): {{ computedHumanDuration(order) }}</span>
                    <span v-else>Brak zgłoszonych godzin</span>
                  </div>
                    <div class="text-xs text-secondary-600" v-if="computedHumanDuration(order)">
                      Policzone (start→koniec): {{ computedHumanDuration(order) }}
                    </div>
                    <div class="text-xs text-secondary-600" v-if="order._ws && order._ws.totalSeconds != null">
                      Policzone z sesji: {{ formatSeconds(order._ws.totalSeconds) }} (pauz: {{ order._ws.sessionsCount || 0 }})
                    </div>
                    <div class="text-xs text-secondary-500" v-if="order.created_at">
                      Wysłano: {{ formatDate(order.created_at) }}
                    </div>
                    <div class="text-xs text-secondary-600" v-if="order.completed_at">
                      Zakończono: {{ formatDate(order.completed_at) }}
                    </div>
                  </div>
                </div>
                <!-- Wykonane kategorie (z aplikacji mobilnej) -->
                <div class="mt-3">
                  <div class="font-semibold mb-1">Wykonane prace</div>
                  <template v-if="getOrderCategoryLabels(order).length">
                    <ul class="list-disc list-inside text-sm text-secondary-800">
                      <li v-for="c in getOrderCategoryLabels(order)" :key="c">{{ c }}</li>
                    </ul>
                  </template>
                  <div v-else class="text-sm text-secondary-600">Brak danych</div>
                </div>

                <!-- Notatki technika -->
                <div class="mt-3">
                  <div class="font-semibold mb-1">Notatki technika</div>
                  <div class="whitespace-pre-wrap text-sm text-secondary-800">{{ getTechnicianNotes(order) || 'Brak danych' }}</div>
                </div>
                <!-- Dokumentacja zdjęciowa (wyłączona) -->
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Paginacja -->
      <div v-if="totalPages > 1" class="bg-white px-4 py-3 border-t border-secondary-200 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="currentPage > 1 && (currentPage--)"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Poprzednia
            </button>
            <button
              @click="currentPage < totalPages && (currentPage++)"
              :disabled="currentPage === totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-secondary-300 text-sm font-medium rounded-md text-secondary-700 bg-white hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następna
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-secondary-700">
                Pokazano
                <span class="font-medium">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
                do
                <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredOrders.length) }}</span>
                z
                <span class="font-medium">{{ filteredOrders.length }}</span>
                wyników
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  @click="currentPage > 1 && (currentPage--)"
                  :disabled="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-chevron-left"></i>
                </button>
                
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="typeof page === 'number' && (currentPage = page)"
                  :class="[
                    page === currentPage
                      ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                      : 'bg-white border-secondary-300 text-secondary-500 hover:bg-secondary-50',
                    typeof page === 'number' ? 'cursor-pointer' : 'cursor-default'
                  ]"
                  class="relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                >
                  {{ page }}
                </button>
                
                <button
                  @click="currentPage < totalPages && (currentPage++)"
                  :disabled="currentPage === totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-secondary-300 bg-white text-sm font-medium text-secondary-500 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i class="fas fa-chevron-right"></i>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dodawania/edycji zlecenia -->
    <!-- DEBUG: showAddModal={{ showAddModal }}, showEditModal={{ showEditModal }} -->
    
    <OrderFormModal
      v-if="showAddModal || showEditModal"
      :order="editingOrder"
      :clients="clients"
      :devices="devices"
      :prefill="orderPrefill"
      :is-edit="showEditModal"
      @close="closeModal"
      @saved="onOrderSaved"
    />

    <!-- Modal potwierdzenia usunięcia -->
    <ConfirmModal
      v-if="showDeleteModal"
      title="Usuń zlecenie"
      :message="`Czy na pewno chcesz usunąć zlecenie ${deletingOrder?.order_number}?`"
      confirm-text="Usuń"
      confirm-class="btn-danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Modal rozliczenia zlecenia -->
    <OrderBillingModal
      v-if="showBillingModal"
      :order="billingOrder"
      @close="closeBillingModal"
      @completed="onOrderBillingCompleted"
    />

    <ClientFormModal
      v-if="showRequestClientModal"
      :client="null"
      :prefill="requestClientPrefill"
      :is-edit="false"
      @close="closeRequestClientModal"
      @saved="handleRequestClientSaved"
    />
    <DeviceFormModal
      v-if="showRequestDeviceModal"
      :device="null"
      :clients="clients"
      :prefill="requestDevicePrefill"
      :is-edit="false"
      :default-client-id="requestDeviceDefaultClientId"
      @close="closeRequestDeviceModal"
      @saved="handleRequestDeviceSaved"
    />
    <!-- Modal wyboru technika -->
    <AssignTechnicianModal
      v-if="showAssignModal"
      :order="assigningOrder"
      :technicians="technicians"
      @close="showAssignModal = false"
      @assigned="assignOrderToTechnician"
      @refresh-technicians="loadTechnicians"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatDate, formatTime } from '../../utils/date'
import OrderFormModal from './OrderFormModal.vue'
import OrderBillingModal from '../../components/OrderBillingModal.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import AssignTechnicianModal from './AssignTechnicianModal.vue'
import ClientFormModal from '../clients/ClientFormModal.vue'
import DeviceFormModal from '../devices/DeviceFormModal.vue'

const router = useRouter()
const route = useRoute()

// Railway API base (auto-detected)
// Preferuj własną domenę produkcyjną
// Preferuj bezpośredni host Railway; domena www jest tylko zapasowa
  const RAILWAY_CANDIDATES = [
    'https://web-production-fc58d.up.railway.app',
    'https://web-production-310c4.up.railway.app',
    'https://www.instalacjeserwis.pl'
  ]
const railwayBase = ref('')

let _detectInProgress = false
let _detectTs = 0
async function detectRailwayBase() {
  const now = Date.now()
  // Cache wynik na 60s, aby nie szturmować API
  if (railwayBase.value && now - _detectTs < 60_000) return railwayBase.value
  if (_detectInProgress) {
    // mała pauza na inny tick
    await new Promise(r => setTimeout(r, 250))
    return railwayBase.value
  }
  _detectInProgress = true
  try {
    for (const host of RAILWAY_CANDIDATES) {
      // Prefer hosts that expose our API endpoints (not tylko health)
      try {
        const ctrl1 = new AbortController();
        const t1 = setTimeout(() => ctrl1.abort(), 2000);
        const r1 = await fetch(`${host}/api/health`, { method: 'GET', signal: ctrl1.signal });
        clearTimeout(t1);
        if (r1.ok) { railwayBase.value = host; _detectTs = Date.now(); return railwayBase.value; }
      } catch (_) {}
      try {
        const ctrl2 = new AbortController();
        const t2 = setTimeout(() => ctrl2.abort(), 2000);
        const r2 = await fetch(`${host}/api/health`, { method: 'GET', signal: ctrl2.signal });
        clearTimeout(t2);
        if (r2.ok) { railwayBase.value = host; _detectTs = Date.now(); return railwayBase.value; }
      } catch (_) {}
    }
    // fallback
    railwayBase.value = RAILWAY_CANDIDATES[0]
    _detectTs = Date.now()
    return railwayBase.value
  } catch (e) {
    // ignore
  } finally {
    _detectInProgress = false
  }
}

async function getBase() {
  return await detectRailwayBase()
}

// Prefer retrying against known Railway host first when syncing
async function getPreferredBases() {
  const primary = await detectRailwayBase()
  const known = [
    'https://web-production-fc58d.up.railway.app',
    'https://www.instalacjeserwis.pl'
  ]
  const list = [primary, ...known].filter((v, i, a) => !!v && a.indexOf(v) === i)
  return list
}

// Reactive data
const orders = ref([])
const clients = ref([])
const devices = ref([])
const serviceCategories = ref([])
const brokenPhotos = ref({}) // map: key `${orderId}-${index}` -> true
const isLoading = ref(false)
const error = ref('')
const searchQuery = ref('')
const filterStatus = ref('')
const filterType = ref('')
const filterPriority = ref('')
const filterClient = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeTab = ref('active') // active | completed | archived | toSync | fromClient | trash
const ORDER_TAB_STORAGE_KEY = 'orders.defaultTab'
const TAB_CANONICAL = {
  active: 'active',
  completed: 'completed',
  archived: 'archived',
  tosync: 'toSync',
  fromclient: 'fromClient',
  trash: 'trash'
}
const TAB_WHITELIST = new Set(Object.keys(TAB_CANONICAL))

const resolveTabName = (value) => {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().toLowerCase()
  return TAB_CANONICAL[normalized] || null
}

const applyInitialTab = () => {
  const queryTab = resolveTabName(route.query?.tab)
  if (queryTab) {
    activeTab.value = queryTab
  } else {
    let stored = null
    try {
      stored = sessionStorage.getItem(ORDER_TAB_STORAGE_KEY)
    } catch (_) {}
    const storedTab = resolveTabName(stored)
    if (storedTab) {
      activeTab.value = storedTab
    }
  }
  try {
    sessionStorage.removeItem(ORDER_TAB_STORAGE_KEY)
  } catch (_) {}
}
const selectedDeletedIds = ref([])
const isAllDeletedSelected = computed(() => {
  if (activeTab.value !== 'trash') return false
  const ids = (paginatedOrders.value || []).map(o => o.id)
  if (!ids.length) return false
  return ids.every(id => selectedDeletedIds.value.includes(id))
})

function toggleSelectAllDeleted(ev) {
  if (activeTab.value !== 'trash') return
  const ids = (paginatedOrders.value || []).map(o => o.id)
  if (ev && ev.target && ev.target.checked) {
    selectedDeletedIds.value = ids
  } else {
    selectedDeletedIds.value = []
  }
}

function selectAllVisibleDeleted() {
  if (activeTab.value !== 'trash') return
  const ids = (paginatedOrders.value || []).map(o => o.id)
  selectedDeletedIds.value = ids
}

function clearSelectionDeleted() {
  selectedDeletedIds.value = []
}

async function hardDeleteSelected() {
  try {
    if (activeTab.value !== 'trash' || selectedDeletedIds.value.length === 0) return
    const ok = confirm(`Usunąć bezpowrotnie ${selectedDeletedIds.value.length} zleceń lokalnie? (Railway bez zmian)`)
    if (!ok) return
    const r = await fetch('http://localhost:5174/api/desktop/orders/hard-delete-by-ids?confirm=1', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedDeletedIds.value })
    })
    const j = await r.json().catch(()=>({}))
    if (!r.ok || !j.success) {
      alert('Nie udało się usunąć zaznaczonych zleceń')
      return
    }
    // Usuń z listy UI
    orders.value = (orders.value || []).filter(o => !selectedDeletedIds.value.includes(o.id))
    selectedDeletedIds.value = []
  } catch (e) {
    console.error('hardDeleteSelected error', e)
    alert('Wystąpił błąd: ' + (e?.message || 'unknown'))
  }
}
const clientRequests = ref([])
const requestLinkCache = reactive({})

const getCachedLinks = (requestId) => {
  if (!requestId) return null
  const key = String(requestId)
  return requestLinkCache[key] || null
}

const linkPersistQueue = new Map()

const schedulePersistRequestLink = (requestId) => {
  if (!requestId || !window.electronAPI?.database?.run) return
  const key = String(requestId)
  if (linkPersistQueue.has(key)) return
  linkPersistQueue.set(key, true)
  Promise.resolve().then(async () => {
    linkPersistQueue.delete(key)
    const snapshot = getCachedLinks(key)
    if (!snapshot) return
    try {
      await window.electronAPI.database.run(
        `INSERT INTO service_request_links (
           request_id,
           linked_client_id,
           linked_client_name,
           linked_device_id,
           linked_device_name,
           linked_device_model,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(request_id) DO UPDATE SET
           linked_client_id = excluded.linked_client_id,
           linked_client_name = excluded.linked_client_name,
           linked_device_id = excluded.linked_device_id,
           linked_device_name = excluded.linked_device_name,
           linked_device_model = excluded.linked_device_model,
           updated_at = CURRENT_TIMESTAMP`,
        [
          key,
          snapshot.linkedClientId != null ? Number(snapshot.linkedClientId) : null,
          snapshot.linkedClientName ?? null,
          snapshot.linkedDeviceId != null ? Number(snapshot.linkedDeviceId) : null,
          snapshot.linkedDeviceName ?? null,
          snapshot.linkedDeviceModel ?? null
        ]
      )
    } catch (error) {
      console.warn('[Orders] Persisting request link failed:', error)
    }
  })
}

const updateCachedLinks = (requestId, patch = {}, options = {}) => {
  if (!requestId) return
  const key = String(requestId)
  const existing = requestLinkCache[key] || {}
  requestLinkCache[key] = {
    ...existing,
    ...patch
  }
  if (options.persist !== false) {
    schedulePersistRequestLink(key)
  }
}

const hydrateRequestWithCache = (request) => {
  if (!request || request.id == null) return request
  const cache = getCachedLinks(request.id)
  if (!cache) return request
  if (cache.linkedClientId != null) {
    request.linked_client_id = cache.linkedClientId
    if (!request.linked_client_name && cache.linkedClientName) {
      request.linked_client_name = cache.linkedClientName
    }
  }
  if (cache.linkedDeviceId != null) {
    request.linked_device_id = cache.linkedDeviceId
    if (!request.linked_device_name && cache.linkedDeviceName) {
      request.linked_device_name = cache.linkedDeviceName
    }
    if (!request.linked_device_model && cache.linkedDeviceModel) {
      request.linked_device_model = cache.linkedDeviceModel
    }
  }
  if (cache.clientMessage) {
    request._clientAutomationMessage = cache.clientMessage
  }
  if (cache.deviceMessage) {
    request._deviceAutomationMessage = cache.deviceMessage
  }
  return request
}

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showBillingModal = ref(false)
const showAssignModal = ref(false) // Nowy modal do wyboru technika
const showRequestClientModal = ref(false)
const requestClientPrefill = ref(null)
const requestClientTarget = ref(null)
const showRequestDeviceModal = ref(false)
const requestDevicePrefill = ref(null)
const requestDeviceTarget = ref(null)
const requestDeviceDefaultClientId = ref(null)
const orderPrefill = ref(null)
const editingOrder = ref(null)
const deletingOrder = ref(null)
const billingOrder = ref(null)
const assigningOrder = ref(null) // Zlecenie do przypisania
const pendingConvertedRequest = ref(null)
const expandedRowId = ref(null)
const pendingChanges = ref([])

// Dodaj techników do reactive data
const technicians = ref([])

// Computed properties
const orderStats = computed(() => {
  const toSend = orders.value.filter(o => String(o.desktop_sync_status || '') !== 'sent' && ['new','assigned','in_progress','completed'].includes(o.status)).length
  return {
    new: toSend, // interpretujemy jako "Do wysłania"
    in_progress: orders.value.filter(o => o.status === 'in_progress').length,
    urgent: orders.value.filter(o => o.priority === 'urgent').length,
    completed: orders.value.filter(o => o.status === 'completed').length
  }
})

const hasFilters = computed(() => {
  return searchQuery.value || filterStatus.value || filterType.value || filterPriority.value || filterClient.value
})

const filteredOrders = computed(() => {
  let filtered = orders.value

  // Zakładki
  if (activeTab.value === 'active') {
    // Aktywne = tylko przypisane i w realizacji (opcjonalnie oczekuje na części)
    const activeStatuses = ['assigned','in_progress','waiting_for_parts']
    filtered = filtered.filter(o => activeStatuses.includes(String(o.status || '').toLowerCase()))
  } else if (activeTab.value === 'completed') {
    filtered = filtered.filter(o => (o.status === 'completed' || o.status === 'przed_czasem') && !o.has_invoice)
  } else if (activeTab.value === 'archived') {
    // Archiwum: wszystkie zakończone z fakturą ORAZ wszystkie zamknięte przed czasem (nawet bez faktury)
    filtered = filtered.filter(o => (o.status === 'completed' && o.has_invoice) || o.status === 'przed_czasem')
  } else if (activeTab.value === 'trash') {
    // Kosz: tylko usunięte (soft delete)
    filtered = filtered.filter(o => String(o.status||'').toLowerCase() === 'deleted')
  } else if (activeTab.value === 'toSync') {
    // Do wysłania: nie wysłane do firmy, ale tylko new/assigned/in_progress (bez completed/deleted/przed_czasem)
    const allowed = new Set(['new','assigned','in_progress'])
    filtered = filtered.filter(o => String(o.desktop_sync_status || '') !== 'sent' && allowed.has(String(o.status||'').toLowerCase()))
  } else if (activeTab.value === 'fromClient') {
    // Wyświetl wiersze syntetyczne dla clientRequests
    filtered = clientRequests.value.map((r) => {
      const rawCategoryId =
        r.service_category_id ??
        r.desktop_category_id ??
        r.desktopCategoryId ??
        null
      const numericCategoryId = Number(rawCategoryId)
      const hasNumericCategory = Number.isInteger(numericCategoryId) && numericCategoryId > 0
      const categoryRecord = hasNumericCategory ? categoryById.value.get(numericCategoryId) : null
      const categoryCode = categoryRecord?.code ? String(categoryRecord.code).trim() : null
      const categoryLabel = categoryRecord?.name ? String(categoryRecord.name).trim() : null
      const normalizedType = categoryCode || r.type || r.service_type || ''
      const titleSource = categoryLabel || normalizedType || r.description || 'Zgłoszenie klienta'
      const serviceCategories = []
      if (categoryCode) {
        serviceCategories.push(categoryCode)
      } else if (hasNumericCategory) {
        serviceCategories.push(String(numericCategoryId))
      }
      return {
      id: `REQ-${r.id}`,
      order_number: r.reference_number,
        title: `Zgłoszenie: ${titleSource}`,
      description: r.description,
      status: r.status || 'pending',
      priority: r.is_urgent ? 'high' : 'medium',
      scheduled_date: r.preferred_date,
      preferred_time: r.preferred_time,
      started_at: null,
      completed_at: null,
      estimated_hours: null,
      actual_hours: null,
      parts_cost: 0,
      labor_cost: 0,
      total_cost: 0,
      notes: null,
      created_at: r.created_at,
      updated_at: r.updated_at,
        type: normalizedType || null,
        service_type: r.service_type || normalizedType || null,
        service_category_id: hasNumericCategory ? numericCategoryId : null,
        service_categories: serviceCategories,
      is_urgent: !!r.is_urgent,
      autoReady: r.autoReady,
      autoMissing: r.autoMissing,
      autoClientReady: r.autoClientReady,
      autoClientMissing: r.autoClientMissing,
      autoDeviceReady: r.autoDeviceReady,
      autoDeviceMissing: r.autoDeviceMissing,
      autoWarnings: r.autoWarnings,
      client_name: r.contact_name,
      client_phone: r.phone,
      client_email: r.email,
      client_nip: r.nip,
      directions: r.directions,
      address: [r.address, r.city].filter(Boolean).join(', '),
      device_name: r.device_type || r.device_model || r.brand_model || r.model,
      device_type: r.device_type,
      device_brand: r.device_brand || r.brand || null,
      device_model: r.device_model || r.brand_model || r.model || null,
      device_year: r.device_year,
      device_serviced: r.device_serviced,
      linked_client_id: r.linked_client_id ?? null,
      linked_client_name: r.linked_client_name ?? null,
      linked_device_id: r.linked_device_id ?? null,
      linked_device_name: r.linked_device_name ?? null,
        linked_device_model: r.linked_device_model ?? null,
        _clientAutomationMessage: r._clientAutomationMessage || null,
        _deviceAutomationMessage: r._deviceAutomationMessage || null,
      device_serial: null,
      assigned_user_name: null
      }
    })
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(order => {
      const orderNumber = order.order_number?.toLowerCase() || ''
      const title = order.title?.toLowerCase() || ''
      const clientName = getClientName(getClientById(order.client_id))?.toLowerCase() || ''
      
      return orderNumber.includes(query) || title.includes(query) || clientName.includes(query)
    })
  }

  // Status filter
  if (filterStatus.value) {
    filtered = filtered.filter(order => order.status === filterStatus.value)
  }

  // Type filter
  if (filterType.value) {
    filtered = filtered.filter(order => order.type === filterType.value)
  }

  // Priority filter
  if (filterPriority.value) {
    filtered = filtered.filter(order => order.priority === filterPriority.value)
  }

  // Client filter
  if (filterClient.value) {
    filtered = filtered.filter(order => order.client_id === parseInt(filterClient.value))
  }

  return filtered
})

// Helpers: parsing kategorii i zdjęć oraz rozwiązywanie ścieżek obrazów
function getCompletedCategories(val) {
  try {
    if (!val) return []
    if (Array.isArray(val)) return val.filter(Boolean)
    if (typeof val === 'string') {
      // może być JSON lub CSV
      const txt = val.trim()
      if (!txt) return []
      if (txt.startsWith('[')) {
        const arr = JSON.parse(txt)
        return Array.isArray(arr) ? arr.filter(Boolean) : []
      }
      return txt.split(',').map(s => s.trim()).filter(Boolean)
    }
    return []
  } catch (_) { return [] }
}

// Słownik kategorii: code->obiekt oraz id->obiekt (dla parent->child)
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

const getOrderCategoryCodes = (order) => {
  if (!order) return []
  const primary = getCompletedCategories(order.completed_categories)
  if (primary.length) return primary
  const fallbackRaw = getCompletedCategories(order.service_categories)
  if (!fallbackRaw.length) return []
  return fallbackRaw
    .map(code => {
      const trimmed = String(code).trim()
      const numeric = Number(trimmed)
      if (Number.isFinite(numeric) && categoryById.value.has(numeric)) {
        const rec = categoryById.value.get(numeric)
        if (rec && rec.code) return String(rec.code).trim()
      }
      return trimmed
    })
    .filter(Boolean)
}

const getOrderCategoryLabels = (order) => {
  return getCompletedCategoryLabels(getOrderCategoryCodes(order))
}

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

function getCompletedCategoryLabels(val) {
  const codes = getCompletedCategories(val)
  const out = []
  for (const code of codes) {
    try {
      const codeStr = String(code).trim()
      let obj = categoryByCode.value.get(codeStr)
      if (!obj) {
        const maybeId = Number(code)
        if (Number.isFinite(maybeId)) obj = categoryById.value.get(maybeId)
      }
      // Fallback: użyj kategorii z mobile app jeśli baza danych nie ma
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
    } catch (_) {
      out.push(String(code))
    }
  }
  return out
}

function getWorkPhotos(val) {
  try {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      const txt = val.trim()
      if (!txt) return []
      return txt.startsWith('[') ? (JSON.parse(txt) || []) : []
    }
    return []
  } catch (_) { return [] }
}

function resolvePhotoSrc(ph) {
  // Obsługa obiektów { local, remote } lub { url/path }
  if (ph && typeof ph === 'object') {
    if (ph.local && typeof ph.local === 'string') {
      return ph.local.startsWith('/api/desktop/files') ? `http://localhost:5174${ph.local}` : ph.local
    }
    const vv = ph.url || ph.path || ph.remote || ''
    if (vv) {
      if (vv.startsWith('http://') || vv.startsWith('https://') || vv.startsWith('data:')) return vv
      if (vv.startsWith('/api/desktop/files')) return `http://localhost:5174${vv}`
      if (vv.startsWith('/uploads')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}${vv}`
      if (vv.startsWith('uploads/')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}/${vv}`
      return vv
    }
  }
  const v = typeof ph === 'string' ? ph : ''
  if (!v) return ''
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v
  // Lokalny plik serwowany przez Electron API
  if (v.startsWith('/api/desktop/files')) return `http://localhost:5174${v}`
  if (v.startsWith('/uploads')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}${v}`
  if (v.startsWith('uploads/')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}/${v}`
  return v
}

function resolveRemoteAbsolute(ph) {
  try {
    if (ph && typeof ph === 'object') {
      const v = ph.remote || ph.url || ph.path || ''
      if (!v) return ''
      if (v.startsWith('http://') || v.startsWith('https://')) return v
      if (v.startsWith('/uploads')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}${v}`
      if (v.startsWith('uploads/')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}/${v}`
      return v
    }
    const s = typeof ph === 'string' ? ph : ''
    if (!s) return ''
    if (s.startsWith('http://') || s.startsWith('https://')) return s
    if (s.startsWith('/uploads')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}${s}`
    if (s.startsWith('uploads/')) return `${railwayBase.value || 'https://web-production-fc58d.up.railway.app'}/${s}`
    return s
  } catch (_) { return '' }
}

function photoKey(orderId, idx) { return `${orderId}-${idx}` }
function isPhotoBroken(orderId, idx) { try { return !!brokenPhotos.value[photoKey(orderId, idx)] } catch (_) { return false } }
function markPhotoBroken(orderId, idx) { try { brokenPhotos.value[photoKey(orderId, idx)] = true } catch (_) {} }

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage.value))

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredOrders.value.slice(start, end)
})

const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push('...', total)
    } else if (current >= total - 3) {
      pages.push(1, '...')
      for (let i = total - 4; i <= total; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...', total)
    }
  }

  return pages.filter(page => page !== '...' || pages.indexOf(page) === pages.lastIndexOf(page))
})

// Helper methods
const getTypeIcon = (type) => {
  const icons = {
    breakdown: { icon: 'fas fa-exclamation-triangle', color: 'bg-red-500' },
    maintenance: { icon: 'fas fa-tools', color: 'bg-blue-500' },
    installation: { icon: 'fas fa-wrench', color: 'bg-green-500' },
    inspection: { icon: 'fas fa-search', color: 'bg-yellow-500' }
  }
  return icons[type] || { icon: 'fas fa-clipboard-list', color: 'bg-secondary-500' }
}

// Map kategorii usług (kod -> nazwa) ładowany dynamicznie z API Desktop/Railway
const serviceCategoryMap = ref({})
async function loadServiceCategoryMap() {
  try {
    if (Object.keys(serviceCategoryMap.value || {}).length > 0) return
    const candidates = [
      '/api/desktop/service-categories',
      '/api/service-categories'
    ]
    // spróbuj także baz Railway, jeśli dostępne
    try {
      const bases = await getPreferredBases()
      for (const b of bases) { candidates.push(`${b}/api/service-categories`) }
    } catch (_) {}
    for (const u of candidates) {
      try {
        const r = await fetch(u)
        if (!r.ok) continue
        const j = await r.json().catch(()=>({}))
        const arr = Array.isArray(j?.items) ? j.items : (Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []))
        const map = {}
        for (const it of arr) {
          const code = String(it?.code ?? it?.id ?? '').trim()
          const name = String(it?.name ?? '').trim()
          if (code && name) map[code] = name
        }
        if (Object.keys(map).length) { serviceCategoryMap.value = map; return }
      } catch (_) { /* try next */ }
    }
  } catch (_) { /* ignore */ }
}

onMounted(() => { loadServiceCategoryMap().catch(()=>{}) })

// Ujednolicone mapowanie typu (kody z mobilki i stare klucze) + dynamiczna mapa
function getTypeName(type) {
  const byKey = {
    breakdown: 'Awaria',
    maintenance: 'Konserwacja', 
    installation: 'Instalacja',
    inspection: 'Przegląd'
  }
  const byCode = {
    '02': 'AWARIA',
    '0201': 'AWARIA > Naprawa bez użycia części',
    '0202': 'AWARIA > Naprawa z użyciem części'
  }
  const key = String(type || '').trim()
  // najpierw dynamiczna mapa z Desktop/Railway
  const dyn = serviceCategoryMap.value && serviceCategoryMap.value[key]
  return dyn || byCode[key] || byKey[key] || key || '—'
}

function getOrderTypeLabel(order) {
  if (!order) return '—'
  const labels = getOrderCategoryLabels(order)
  if (Array.isArray(labels) && labels.length) {
    return labels.join(', ')
  }
  const fallback = getTypeName(order.type)
  const trimmedType = String(order.type || '').trim()
  return fallback && fallback !== trimmedType ? fallback : (trimmedType || '—')
}

const getPriorityName = (priority) => {
  const names = {
    low: 'Niski',
    medium: 'Średni',
    high: 'Wysoki',
    urgent: 'Pilny'
  }
  return names[priority] || priority
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

const getStatusName = (status) => {
  const names = {
    new: 'Nowe',
    in_progress: 'W realizacji',
    waiting_for_parts: 'Oczekuje na części',
    completed: 'Ukończone',
    cancelled: 'Anulowane',
    assigned: 'Przypisane',
    pending: 'Oczekujące',
    przed_czasem: 'Przed czasem'
  }
  return names[status] || status
}

// (mapa włączona w getTypeName powyżej)

const getStatusClass = (status) => {
  const classes = {
    new: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_for_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    assigned: 'bg-purple-100 text-purple-800',
    pending: 'bg-secondary-100 text-secondary-800',
    przed_czasem: 'bg-gray-200 text-gray-800'
  }
  return classes[status] || 'bg-secondary-100 text-secondary-800'
}

const getClientById = (clientId) => {
  return clients.value.find(c => c.id === clientId) || {}
}

const getDeviceDisplayName = (order) => {
  return (
    order.device_name ||
    (order.device_brand && order.device_model ? `${order.device_brand} ${order.device_model}` : null) ||
    humanizeDeviceType(order.device_type) ||
    'Brak nazwy urządzenia'
  )
}

const getClientDisplayName = (order) => {
  // 1) Jeśli zapisane w wierszu zlecenia — użyj
  if (order.client_name && String(order.client_name).trim()) return order.client_name
  if (order.company_name && String(order.company_name).trim()) return order.company_name

  // 2) Fallback: spróbuj z listy klientów po client_id
  if (order.client_id) {
    const client = getClientById(order.client_id)
    const name = getClientName(client)
    if (name && name !== 'Nieznany klient') return name
  }

  return 'Klient bez nazwy'
}

const getClientAddress = (order) => {
  const parts = []
  if (order.address_street) parts.push(order.address_street)
  if (order.address_postal_code && order.address_city) {
    parts.push(`${order.address_postal_code} ${order.address_city}`)
  }
  if (order.address_country && order.address_country !== 'Polska') {
    parts.push(order.address_country)
  }
  if (parts.length === 0 && order.address) return order.address
  return parts.length > 0 ? parts.join(', ') : null
}

const getClientName = (client) => {
  if (!client || !client.id) {
    return 'Nieznany klient'
  }
  // Firma ma pierwszeństwo tylko gdy typ to business
  if (client.type === 'business' && client.company_name) {
    return client.company_name
  }
  if (client.contact_person && String(client.contact_person).trim()) {
    return String(client.contact_person).trim()
  }
  const first = (client.first_name || '').trim()
  const last = (client.last_name || '').trim()
  const full = `${first} ${last}`.trim()
  if (full) return full
  if (client.email) {
    const emailName = client.email.split('@')[0]
    return emailName
      .split('.')
      .map(part => part ? (part.charAt(0).toUpperCase() + part.slice(1)) : '')
      .filter(Boolean)
      .join(' ')
  }
  if (client.address_city) return client.address_city
  return `Klient #${client.id}`
}

// Pomocnicze: różnica czasu w formacie Xh Ym
const humanDuration = (start, end) => {
  try {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return ''
    const mins = Math.round((e - s) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  } catch (_) { return '' }
}

// Liczy i formatuje czas pracy z started_at/completed_at, jeśli możliwe
function computedHumanDuration(order) {
  try {
    const s = order?.started_at || order?.actual_start_date
    const e = order?.completed_at || order?.actual_end_date
    if (!s || !e) return ''
    const ms = new Date(e).getTime() - new Date(s).getTime()
    if (!Number.isFinite(ms) || ms <= 0) return ''
    const mins = Math.round(ms / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  } catch (_) { return '' }
}

// Bezpieczne notatki technika – ukryj wartości, które wyglądają jak numer/ID
function getTechnicianNotes(order) {
  try {
    const t = String(order?.notes || '').trim()
    if (!t) return ''
    const looksLikeSrv = /^SRV\-\d{4}\-\d+/.test(t)
    const looksLikeId = /^\d+$/.test(t)
    const equalsOrder = t === String(order?.order_number || '')
    return (looksLikeSrv || looksLikeId || equalsOrder) ? '' : t
  } catch (_) { return '' }
}

const durationMinutes = (start, end) => {
  try {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return ''
    const mins = Math.round((e - s) / 60000)
    return mins
  } catch (_) { return '' }
}

const getClientFullInfo = (client) => {
  if (!client || !client.id) {
    return { name: 'Nieznany klient', phone: '', email: '', address: '' };
  }

  const foundClient = clients.value.find(c => c.id === client.id);
  if (!foundClient) {
    return { name: `Klient #${client.id}`, phone: '', email: '', address: '' };
  }

  const name = foundClient.company_name || `${foundClient.first_name} ${foundClient.last_name}`;
  const phone = foundClient.phone || '';
  const email = foundClient.email || '';
  const address = foundClient.address || '';

  return { name, phone, email, address };
};

const getDeviceName = (deviceId) => {
  if (!deviceId) return 'Brak urządzenia'
  
  const device = devices.value.find(d => d.id === deviceId)
  return device ? device.name : 'Nieznane urządzenie'
}

const getDeviceFullInfo = (deviceId) => {
  if (!deviceId) return { name: 'Brak urządzenia', brand: '', model: '', lastService: '', serial: '' };

  const foundDevice = devices.value.find(d => d.id === deviceId);
  if (!foundDevice) {
    return { name: `Urządzenie #${deviceId}`, brand: '', model: '', lastService: '', serial: '' };
  }

  const name = foundDevice.name;
  const brand = foundDevice.brand || '';
  const model = foundDevice.model || '';
  const lastService = foundDevice.last_service_date ? formatDate(foundDevice.last_service_date) : 'Brak danych';
  const serial = foundDevice.serial_number || '';

  return { name, brand, model, lastService, serial };
};

const getTechnicianName = (technicianId) => {
  if (!technicianId) return 'Nie przypisano'
  
  const technician = technicians.value.find(t => t.id === technicianId)
  return technician ? technician.full_name : `Technik #${technicianId}`
}

// Funkcja do liczenia aktywnych zleceń dla technika (tylko new/assigned/in_progress)
const ACTIVE_STATUSES = new Set(['new', 'assigned', 'in_progress'])
const getTechnicianOrderCount = (technicianId) => {
  try {
    return orders.value.filter(order => {
      const status = String(order.status || '').toLowerCase()
      return order.assigned_user_id === technicianId && ACTIVE_STATUSES.has(status)
    }).length
  } catch (_) {
    return 0
  }
}

// Methods
const loadOrders = async () => {
  isLoading.value = true
  error.value = ''

  try {
    if (!window.electronAPI) {
      // Demo data dla przeglądarki
      orders.value = [
        {
          id: 1,
          order_number: 'SRV-2024-001',
          client_id: 1,
          device_id: 1,
          assigned_user_id: 1,
          type: 'breakdown',
          status: 'in_progress',
          priority: 'high',
          title: 'Awaria kotła - brak ogrzewania',
          description: 'Klient zgłasza brak ciepłej wody i ogrzewania. Kocioł nie odpala.',
          scheduled_date: '2024-07-07T09:00:00Z',
          started_at: '2024-07-07T09:15:00Z',
          completed_at: null,
          estimated_hours: 3,
          actual_hours: 2.5,
          parts_cost: 150.00,
          labor_cost: 200.00,
          total_cost: 350.00,
          notes: 'Wymiana uszkodzonego termostatu',
          created_at: '2024-07-05T14:30:00Z'
        },
        {
          id: 2,
          order_number: 'SRV-2024-002',
          client_id: 2,
          device_id: 2,
          assigned_user_id: 1,
          type: 'maintenance',
          status: 'new',
          priority: 'medium',
          title: 'Przegląd okresowy klimatyzacji',
          description: 'Standardowy przegląd roczny klimatyzatora zgodnie z harmonogramem.',
          scheduled_date: '2024-07-10T10:00:00Z',
          started_at: null,
          completed_at: null,
          estimated_hours: 2,
          actual_hours: null,
          parts_cost: 0,
          labor_cost: 150.00,
          total_cost: 150.00,
          notes: 'Wymiana filtrów, czyszczenie jednostek',
          created_at: '2024-07-06T11:20:00Z'
        },
        {
          id: 3,
          order_number: 'SRV-2024-003',
          client_id: 1,
          device_id: null,
          assigned_user_id: 1,
          type: 'installation',
          status: 'completed',
          priority: 'low',
          title: 'Instalacja nowego termostatu',
          description: 'Montaż i konfiguracja programowanego termostatu pokojowego.',
          scheduled_date: '2024-07-01T14:00:00Z',
          started_at: '2024-07-01T14:00:00Z',
          completed_at: '2024-07-01T16:30:00Z',
          estimated_hours: 2,
          actual_hours: 2.5,
          parts_cost: 250.00,
          labor_cost: 150.00,
          total_cost: 400.00,
          notes: 'Instalacja zakończona pomyślnie, klient przeszkolony',
          created_at: '2024-06-28T09:15:00Z'
        }
      ]
      return
    }

    // Pobierz zlecenia z bazy danych
    await ensureLocalSchema()
    const result = await window.electronAPI.database.query(`
      SELECT o.*, 
             -- Preferowane dane klienta do wyświetlania (puste -> NULL)
             COALESCE(
               NULLIF(c.company_name, ''),
               NULLIF(TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')), ''),
               NULLIF(o.client_name, ''),
               'Klient bez nazwy'
             ) AS client_name,
             COALESCE(NULLIF(c.phone,''), NULLIF(o.client_phone,'')) AS client_phone,
             COALESCE(NULLIF(c.email,''), NULLIF(o.client_email,'')) AS client_email,
             COALESCE(
               NULLIF(TRIM(
                 COALESCE(c.address_street,'') ||
                 CASE WHEN c.address_postal_code IS NOT NULL OR c.address_city IS NOT NULL
                   THEN CASE WHEN c.address_street IS NOT NULL AND c.address_street <> '' THEN ', ' ELSE '' END ||
                        COALESCE(c.address_postal_code,'') || ' ' || COALESCE(c.address_city,'')
                   ELSE '' END ||
                 CASE WHEN c.address_country IS NOT NULL AND c.address_country <> 'Polska'
                   THEN CASE WHEN c.address_street IS NOT NULL OR c.address_city IS NOT NULL OR c.address_postal_code IS NOT NULL THEN ', ' ELSE '' END || c.address_country
                   ELSE '' END
               ), ''),
               NULLIF(c.address, ''),
               NULLIF(o.address, '')
             ) AS address,
             -- Dodatkowe kolumny klienta (dla szczegółów)
             c.first_name, c.last_name, c.company_name, c.contact_person,
             c.type as client_type, c.phone, c.email,
             c.address as client_address_raw,
             c.address_street, c.address_city, c.address_postal_code, c.address_country,
             -- Urządzenie
             d.name as device_name, d.manufacturer as brand, d.model, d.last_service_date, d.serial_number,
             -- Technik
             u.full_name as assigned_user_name,
             -- Faktury
             CASE WHEN inv.id IS NOT NULL OR si.id IS NOT NULL OR (CASE WHEN o.has_invoice IS NULL THEN 0 ELSE o.has_invoice END) = 1 THEN 1 ELSE 0 END AS has_invoice
      FROM service_orders o
      LEFT JOIN clients c ON o.client_id = c.id
      LEFT JOIN devices d ON o.device_id = d.id
      LEFT JOIN users u ON o.assigned_user_id = u.id
      LEFT JOIN invoices inv ON inv.order_id = o.id
      LEFT JOIN simple_invoices si ON si.order_id = o.id
      ORDER BY o.completed_at DESC, o.created_at DESC
    `)

    orders.value = (result || []).map(r => ({ ...r, has_invoice: !!r.has_invoice }))
    // Uzupełnij brakujące nazwy klientów w UI (bez zapisu do bazy / bez Railway)
    await hydrateClientNames()
  } catch (err) {
    console.error('Error loading orders:', err)
    error.value = 'Błąd podczas ładowania zleceń'
  } finally {
    isLoading.value = false
  }
}

// UI-only: uzupełnia o.client_name na podstawie clients.value lub pojedynczego SELECT-a
async function hydrateClientNames() {
  try {
    if (!Array.isArray(orders.value) || orders.value.length === 0) return
    for (const o of orders.value) {
      const namePresent = typeof o?.client_name === 'string' && o.client_name.trim() && o.client_name !== 'Klient bez nazwy'
      if (namePresent || !o?.client_id) continue
      // 1) Spróbuj z listy klientów w pamięci
      try {
        const c = (clients.value || []).find(c => c.id === o.client_id)
        if (c) {
          const nm = getClientName(c)
          if (nm && nm !== 'Nieznany klient') {
            o.client_name = nm
            continue
          }
        }
      } catch (_) { /* ignore */ }
      // 2) Fallback: pojedynczy SELECT po client_id (bezpieczny odczyt)
      try {
        if (window.electronAPI?.database) {
          const c = await window.electronAPI.database.get(
            'SELECT type, company_name, first_name, last_name, email, address_city FROM clients WHERE id = ?',
            [o.client_id]
          )
          if (c) {
            const nm = getClientName(c)
            if (nm && nm !== 'Nieznany klient') o.client_name = nm
          }
        }
      } catch (_) { /* soft-fail */ }
    }
  } catch (_) { /* no-op */ }
}

// Pending changes helpers
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

const hasPendingClientChange = (order) => {
  try {
    const cid = Number(order.client_id)
    return pendingChanges.value.some(pc => pc.entity === 'client' && Number(pc.local_entity_id ?? pc.entity_id) === cid)
  } catch (_) { return false }
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
    } else { pendingChanges.value = [] }
  } catch (error) {
    console.warn('[pending-change] load error:', error?.message || error)
    pendingChanges.value = []
  }
}

const hasPendingDeviceChange = (order) => {
  try {
    const did = Number(order.device_id)
    if (!did) return false
    return pendingChanges.value.some(pc => pc.entity === 'device' && Number(pc.local_entity_id ?? pc.entity_id) === did)
  } catch (_) { return false }
}

const loadClients = async () => {
  try {
    if (!window.electronAPI) {
      clients.value = [
        { id: 1, type: 'individual', first_name: 'Jan', last_name: 'Kowalski', phone: '123-456-789', email: 'jan.kowalski@example.com', address: 'ul. Przykładowa 1, 00-001 Warszawa' },
        { id: 2, type: 'business', company_name: 'ABC Sp. z o.o.', phone: '022 123 45 67', email: 'info@abc.pl', address: 'ul. Biznesowa 10, 00-002 Kraków' }
      ]
      return
    }

    // Użyj nowego endpointu API zamiast bezpośredniego dostępu do bazy
    const response = await fetch('http://localhost:5174/api/desktop/clients')
    if (response.ok) {
      const result = await response.json()
      // API zwraca bezpośrednio tablicę
      clients.value = (result || []).map(c => ({
        ...c,
        id: c.id != null ? Number(c.id) : c.id
      }))
      console.log('✅ Załadowano klientów z API:', clients.value.length)
    } else {
      console.error('❌ Błąd pobierania klientów z API:', response.status)
      // Fallback do bezpośredniego dostępu do bazy
      const result = await window.electronAPI.database.query(
        'SELECT id, type, first_name, last_name, company_name, phone, email, address FROM clients WHERE is_active = 1 ORDER BY created_at DESC'
      )
      clients.value = (result || []).map(c => ({ ...c, id: c.id != null ? Number(c.id) : c.id }))
    }
  } catch (err) {
    console.error('Error loading clients:', err)
    // Fallback do demo danych
    clients.value = [
      { id: 1, type: 'individual', first_name: 'Jan', last_name: 'Kowalski', phone: '123-456-789', email: 'jan.kowalski@example.com', address: 'ul. Przykładowa 1, 00-001 Warszawa' },
      { id: 2, type: 'business', company_name: 'ABC Sp. z o.o.', phone: '022 123 45 67', email: 'info@abc.pl', address: 'ul. Biznesowa 10, 00-002 Kraków' }
    ]
  }
}

const loadDevices = async () => {
  try {
    if (!window.electronAPI) {
      devices.value = [
        { id: 1, name: 'Kocioł gazowy', client_id: 1, brand: 'BOSCH', model: 'GAS 2000', last_service_date: '2023-06-01', serial_number: 'ABC123456789' },
        { id: 2, name: 'Klimatyzator', client_id: 2, brand: 'LG', model: 'R-420V', last_service_date: '2024-01-15', serial_number: 'XYZ987654321' }
      ]
      return
    }

    // Użyj nowego endpointu API zamiast bezpośredniego dostępu do bazy
    const response = await fetch('http://localhost:5174/api/desktop/devices')
    if (response.ok) {
      const result = await response.json()
      devices.value = (result || []).map(d => ({
        ...d,
        id: d.id != null ? Number(d.id) : d.id,
        client_id: d.client_id != null ? Number(d.client_id) : d.client_id
      }))
      console.log('✅ Załadowano urządzenia z API:', devices.value.length)
    } else {
      console.error('❌ Błąd pobierania urządzeń z API:', response.status)
      // Fallback do bezpośredniego dostępu do bazy
      const result = await window.electronAPI.database.query(`
        SELECT d.*, c.first_name, c.last_name, c.company_name, c.type as client_type, c.phone, c.email, c.address,
               cat.name as category_name, d.manufacturer as brand, d.model, d.last_service_date, d.serial_number
        FROM devices d
        LEFT JOIN clients c ON d.client_id = c.id
        LEFT JOIN device_categories cat ON d.category_id = cat.id
        WHERE d.is_active = 1 
        ORDER BY d.name ASC
      `)
      devices.value = result || []
    }
  } catch (err) {
    console.error('Error loading devices:', err)
    // Fallback do demo danych
    devices.value = [
      { id: 1, name: 'Kocioł gazowy', client_id: 1, brand: 'BOSCH', model: 'GAS 2000', last_service_date: '2023-06-01', serial_number: 'ABC123456789' },
      { id: 2, name: 'Klimatyzator', client_id: 2, brand: 'LG', model: 'R-420V', last_service_date: '2024-01-15', serial_number: 'XYZ987654321' }
    ]
  }
}

const loadTechnicians = async () => {
  try {
    if (!window.electronAPI) {
      technicians.value = [
        { id: 2, username: 'technik1', full_name: 'Jan Technik', email: 'technik1@serwis.pl' },
        { id: 4, username: 'kowalski', full_name: 'kowalski serwisant', email: '' }
      ]
      return
    }

    const result = await window.electronAPI.database.query(
      'SELECT id, username, full_name, email, role, is_active FROM users WHERE role IN (?, ?) ORDER BY full_name ASC',
      ['technician', 'installer']
    )
    technicians.value = result || []
  } catch (err) {
    console.error('Error loading technicians:', err)
  }
}

const viewOrder = (orderId) => router.push(`/orders/${orderId}`)

// Odbiór parametru ?edit=1 – otwórz modal edycji po wejściu
const _editQueryId = ref(null)
function tryOpenEditFromQuery() {
  if (!_editQueryId.value) return
  const id = Number(_editQueryId.value)
  if (!id) { _editQueryId.value = null; return }
  if (!Array.isArray(orders.value) || orders.value.length === 0) return
  const found = orders.value.find(o => Number(o.id) === id)
  if (found) { editOrder(found); _editQueryId.value = null }
}

onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    if (params.get('edit') === '1') {
      const id = parseInt(params.get('id') || '0')
      if (id) {
        _editQueryId.value = id
        // Domyślnie pokaż zakładkę Zakończone (tam użytkownik spodziewa się edycji kosztów)
        activeTab.value = 'completed'
        tryOpenEditFromQuery()
      }
    }
  } catch (_) {}
})

watch(orders, () => { tryOpenEditFromQuery() })

const goToOrder = (id) => router.push(`/orders/${id}`)

const editOrder = (order) => {
  editingOrder.value = { ...order }
  showEditModal.value = true
}

// Auto-refresh listy po imporcie (backend zapisuje work_photos i completion_notes)
let _refreshTimer = null
function ensureAutoRefresh() {
  if (_refreshTimer) return
  // Odświeżaj rzadziej i tylko na zakładce "Aktywne" – nie migaj na "Zakończone"
  _refreshTimer = setInterval(async () => {
    try {
      if (activeTab.value !== 'active') return
      // Lekki check statusu: pobierz hash/updated_at i porównaj
      const base = await getBase()
      const r = await fetch(`${base}/api/desktop/orders`)
      if (!r.ok) return
      const list = await r.json().catch(() => [])
      const latestRemote = Array.isArray(list) ? list.map(o => `${o.id}:${o.status}:${o.updated_at||o.completed_at||o.started_at||o.created_at}`).join('|') : ''
      const latestLocal = (orders.value || []).map(o => `${o.id}:${o.status}:${o.updated_at||o.completed_at||o.started_at||o.created_at}`).join('|')
      if (latestRemote !== latestLocal) {
        await loadOrders()
      }
    } catch (_) {}
  }, 15000) // co 15s
}
onMounted(() => { ensureAutoRefresh() })
onUnmounted(() => { try { if (_refreshTimer) clearInterval(_refreshTimer) } catch (_) {} _refreshTimer = null })

// Załaduj słownik kategorii (bezpiecznie; backend zwraca tablicę rekordów)
async function loadServiceCategories() {
  try {
    const r = await fetch('http://localhost:5174/api/desktop/service-categories')
    if (!r.ok) return
    const list = await r.json().catch(() => [])
    if (Array.isArray(list)) serviceCategories.value = list
  } catch (_) { /* silent */ }
}

const startOrder = async (order) => {
  // Zamiast od razu rozpoczynać pracę, otwórz modal wyboru technika
  assigningOrder.value = order
  showAssignModal.value = true
}

const assignOrderToTechnician = async (technicianId, notes = '') => {
  try {
    // Sprawdź czy assigningOrder jest ustawione
    if (!assigningOrder.value || !assigningOrder.value.id) {
      throw new Error('Brak zlecenia do przypisania')
    }
    
    console.log(`🚀 Wysyłam zlecenie ${assigningOrder.value.order_number} do technika ${technicianId}...`)

    // 🚀 RAILWAY PRE-SYNC: użytkownicy/urządzenia/klienci
    await preSyncRailway()

    // KROK 3: Wyślij do lokalnej bazy SQLite (desktop app)
    const localResponse = await fetch(`http://localhost:5174/api/desktop/orders/${assigningOrder.value.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        technicianId: technicianId,
        priority: assigningOrder.value.priority || 'medium',
        notes: notes
      })
    })

    if (!localResponse.ok) {
      throw new Error('Błąd podczas zapisywania lokalnie')
    }

    console.log('✅ Zlecenie zapisane lokalnie w desktop app')

    // KROK 4: Wyślij całe zlecenie do Railway (sync/orders)
  const orderData = {
      id: assigningOrder.value.id,
    order_number: assigningOrder.value.order_number || `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    client_id: assigningOrder.value.client_id != null ? Number(assigningOrder.value.client_id) : null,
    device_id: assigningOrder.value.device_id != null ? Number(assigningOrder.value.device_id) : null,
      assigned_user_id: technicianId,
      service_categories: assigningOrder.value.service_categories || [],
      status: assigningOrder.value.status || 'new',
      priority: assigningOrder.value.priority || 'medium',
      type: assigningOrder.value.type || 'maintenance',
      title: assigningOrder.value.title || assigningOrder.value.description || 'Zlecenie serwisowe',
      description: assigningOrder.value.description || '',
      scheduled_date: assigningOrder.value.scheduled_date || null,
      estimated_hours: assigningOrder.value.estimated_hours || 0,
      labor_cost: assigningOrder.value.labor_cost || 0,
      parts_cost: assigningOrder.value.parts_cost || 0,
      total_cost: assigningOrder.value.total_cost || 0,
      notes: notes || assigningOrder.value.notes || '',
    client_email: (() => { try { const cid = assigningOrder.value.client_id != null ? Number(assigningOrder.value.client_id) : null; return cid ? ((clients.value || []).find(c => c.id === cid)?.email || null) : null } catch (_) { return null } })(),
    client_name: (() => { try { const cid = assigningOrder.value.client_id != null ? Number(assigningOrder.value.client_id) : null; if (!cid) return null; const c = (clients.value || []).find(c => Number(c.id) === cid); if (!c) return null; return (c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()) || null } catch (_) { return null } })(),
    client_phone: (() => { try { const cid = assigningOrder.value.client_id != null ? Number(assigningOrder.value.client_id) : null; return cid ? ((clients.value || []).find(c => Number(c.id) === cid)?.phone || null) : null } catch (_) { return null } })(),
      device_serial: (() => { try { const did = assigningOrder.value.device_id != null ? Number(assigningOrder.value.device_id) : null; return did ? ((devices.value || []).find(d => Number(d.id) === did)?.serial_number || null) : null } catch (_) { return null } })()
    }

    const syncOrderResponse = await fetch(`${await getBase()}/api/sync/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([orderData]) // ZMIANA: Wysyłam jako tablicę
    })

    if (syncOrderResponse.ok) {
      const syncResult = await syncOrderResponse.json()
      console.log('✅ Zlecenie zsynchronizowane do Railway PostgreSQL:', syncResult)
    } else {
      const errorText = await syncOrderResponse.text()
      console.error('❌ Błąd synchronizacji zlecenia do Railway:', syncOrderResponse.status, errorText)
      throw new Error(`Railway sync failed: ${syncOrderResponse.status} - ${errorText}`)
    }

    // KROK 5: Wyślij przypisanie do Railway (sync/assign) - używaj order_number
    const assignBody = {
      // Preferowane pola zgodne z backendem Railway
      orderNumber: assigningOrder.value.order_number,
      technicianId: technicianId,
      status: 'assigned',
      // Kompatybilność wsteczna (jeśli istnieją starsze warianty)
      order_number: assigningOrder.value.order_number,
      assigned_user_id: technicianId
    }
    let railwayAssignResponse = await fetch(`${await getBase()}/api/sync/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignBody)
    })

    if (railwayAssignResponse.ok) {
      const railwayResult = await railwayAssignResponse.json()
      console.log('✅ Przypisanie zsynchronizowane do Railway PostgreSQL:', railwayResult)
    } else {
      const txt1 = await railwayAssignResponse.text().catch(()=> '')
      console.warn('⚠️ Błąd przypisania, ponawiam próbę za 2 sek...', railwayAssignResponse.status, txt1)
      await new Promise(r => setTimeout(r, 2000))
      railwayAssignResponse = await fetch(`${await getBase()}/api/sync/assign`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignBody)
      })
      if (!railwayAssignResponse.ok) {
        const txt2 = await railwayAssignResponse.text().catch(()=> '')
        console.error('❌ Błąd synchronizacji przypisania do Railway (retry):', railwayAssignResponse.status, txt2)
        alert('Nie udało się przypisać zlecenia w Railway. Spróbuj ponownie.')
      }
    }

    // Aktualizuj lokalnie w interfejsie
    let index = orders.value.findIndex(o => o.id === assigningOrder.value.id)
    if (index !== -1) {
      orders.value[index].assigned_user_id = technicianId
      orders.value[index].status = 'assigned' // po przypisaniu trafia do Aktywne
      // Natychmiast ukryj w zakładce "Do wysłania" (backend też ustawia to pole)
      orders.value[index].desktop_sync_status = 'sent'
      orders.value[index].desktop_synced_at = new Date().toISOString()
      // Uzupełnij dane klienta z pendingConvertedRequest (gdy brak powiązanego klienta)
      try {
        if (!orders.value[index].client_name && pendingConvertedRequest.value) {
          orders.value[index].client_name = pendingConvertedRequest.value.contact_name || orders.value[index].client_name || ''
        }
        if (!orders.value[index].client_phone && pendingConvertedRequest.value) {
          orders.value[index].client_phone = pendingConvertedRequest.value.phone || ''
        }
        if (!orders.value[index].client_email && pendingConvertedRequest.value) {
          orders.value[index].client_email = pendingConvertedRequest.value.email || ''
        }
        if (!orders.value[index].address && pendingConvertedRequest.value) {
          orders.value[index].address = [pendingConvertedRequest.value.address, pendingConvertedRequest.value.city].filter(Boolean).join(', ')
        }
      } catch (_) {}
    } else {
      // Spróbuj odnaleźć po numerze zlecenia (np. gdy id jest świeżo nadane)
      index = orders.value.findIndex(o => String(o.order_number) === String(assigningOrder.value.order_number))
      if (index !== -1) {
        orders.value[index].assigned_user_id = technicianId
        orders.value[index].status = 'assigned'
        orders.value[index].desktop_sync_status = 'sent'
        orders.value[index].desktop_synced_at = new Date().toISOString()
        try {
          if (!orders.value[index].client_name && pendingConvertedRequest.value) {
            orders.value[index].client_name = pendingConvertedRequest.value.contact_name || ''
          }
          if (!orders.value[index].client_phone && pendingConvertedRequest.value) {
            orders.value[index].client_phone = pendingConvertedRequest.value.phone || ''
          }
          if (!orders.value[index].client_email && pendingConvertedRequest.value) {
            orders.value[index].client_email = pendingConvertedRequest.value.email || ''
          }
          if (!orders.value[index].address && pendingConvertedRequest.value) {
            orders.value[index].address = [pendingConvertedRequest.value.address, pendingConvertedRequest.value.city].filter(Boolean).join(', ')
          }
        } catch (_) {}
      } else {
      // Fallback: jeżeli zlecenie nie jest jeszcze w liście (np. świeżo utworzone), dodaj je
      orders.value.unshift({
        id: assigningOrder.value.id,
        order_number: assigningOrder.value.order_number,
        client_id: assigningOrder.value.client_id || null,
        device_id: assigningOrder.value.device_id || null,
        assigned_user_id: technicianId,
        status: 'assigned',
        desktop_sync_status: 'sent',
        desktop_synced_at: new Date().toISOString(),
        priority: assigningOrder.value.priority || 'medium',
        type: assigningOrder.value.type || 'maintenance',
        title: assigningOrder.value.title || assigningOrder.value.description || 'Zlecenie serwisowe',
        description: assigningOrder.value.description || '',
        scheduled_date: assigningOrder.value.scheduled_date || null,
        estimated_hours: assigningOrder.value.estimated_hours || 0,
        labor_cost: assigningOrder.value.labor_cost || 0,
        parts_cost: assigningOrder.value.parts_cost || 0,
        total_cost: assigningOrder.value.total_cost || 0,
        notes: assigningOrder.value.notes || '',
        // Dane klienta z pendingConvertedRequest (jeśli zlecenie powstało ze zgłoszenia)
        client_name: pendingConvertedRequest.value ? (pendingConvertedRequest.value.contact_name || '') : '',
        client_phone: pendingConvertedRequest.value ? (pendingConvertedRequest.value.phone || '') : '',
        client_email: pendingConvertedRequest.value ? (pendingConvertedRequest.value.email || '') : '',
        address: pendingConvertedRequest.value ? [pendingConvertedRequest.value.address, pendingConvertedRequest.value.city].filter(Boolean).join(', ') : ''
      })
      }
    }

    // Znajdź technika
    const technician = technicians.value.find(t => t.id === technicianId)
    
    // Zamknij modal
    showAssignModal.value = false
    
    // Pokaż komunikat sukcesu
    alert(`✅ Zlecenie ${assigningOrder.value.order_number} zostało wysłane do technika ${technician?.full_name}!\n\n🏠 Zapisane lokalnie w desktop app\n☁️ Zsynchronizowane z Railway backend\n📱 Technik zobaczy zlecenie w aplikacji mobilnej.`)

    // Jeśli ta operacja pochodziła z konwersji zgłoszenia klienta, usuń zgłoszenie i przełącz na Aktywne
    if (pendingConvertedRequest.value) {
      await markRequestConverted(pendingConvertedRequest.value)
      pendingConvertedRequest.value = null
      activeTab.value = 'active'
      // Ustaw filtry, aby wiersz był widoczny
      filterStatus.value = ''
      searchQuery.value = ''
    }

    // Odśwież listę zleceń i zgłoszeń (w tej kolejności, aby Aktywne już widziało nowy rekord)
    await loadOrders()
    // Po odświeżeniu – upewnij się, że widok jest na Aktywne i rekord jest widoczny
    if (activeTab.value !== 'active') activeTab.value = 'active'
    currentPage.value = 1
    try {
      ensureOrderVisible(assigningOrder.value.order_number, technicianId)
    } catch (_) {}
    try { await fetchClientRequests() } catch (_) {}
    
  } catch (err) {
    console.error('❌ Error assigning order:', err)
    error.value = 'Błąd podczas wysyłania zlecenia do technika: ' + err.message
    
    // Pokaż szczegóły błędu
    alert(`❌ Błąd podczas wysyłania zlecenia:\n\n${err.message}\n\nSprawdź konsolę przeglądarki aby zobaczyć więcej szczegółów.`)
  }
}

const changeTechnician = async (order, technicianId) => {
  console.log('🔍 DEBUG changeTechnician START:')
  console.log('  - order.id:', order.id)
  console.log('  - order.assigned_user_id (before):', order.assigned_user_id, '(', typeof order.assigned_user_id, ')')
  console.log('  - technicianId:', technicianId, '(', typeof technicianId, ')')
  
  // Zapisz oryginalną wartość przed aktualizacją przez v-model
  const originalAssignedId = order.assigned_user_id
  
  // Konwertuj na liczby dla porównania
  const currentAssignedId = originalAssignedId ? parseInt(originalAssignedId) : null
  const newTechnicianId = technicianId ? parseInt(technicianId) : null
  
  console.log('  - originalAssignedId:', originalAssignedId)
  console.log('  - currentAssignedId:', currentAssignedId)
  console.log('  - newTechnicianId:', newTechnicianId)
  
  // Sprawdź czy to rzeczywiście zmiana
  if (currentAssignedId === newTechnicianId) {
    console.log('  - ❌ SAME TECHNICIAN - showing alert')
    alert('⚠️ Wybrany technik jest już przypisany do tego zlecenia.')
    // Przywróć oryginalną wartość
    order.assigned_user_id = originalAssignedId
    return
  }
  
  console.log('  - ✅ DIFFERENT TECHNICIAN - proceeding with update')
  
  try {
    // Zabezpieczenie: nie pozwól przypisywać z selecta dla REQ-* (użyj dedykowanego przycisku konwersji)
    if (isRequestRow(order)) {
      alert('To jest zgłoszenie klienta. Użyj przycisku z ikoną strzałki, aby utworzyć zlecenie i przypisać technika.')
      order.assigned_user_id = originalAssignedId
      return
    }
    // Aktualizuj w bazie danych lokalnej
    const response = await fetch(`http://localhost:5174/api/desktop/orders/${order.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        technicianId: newTechnicianId
      })
    })

    if (response.ok) {
      // Aktualizuj lokalny stan
      order.assigned_user_id = newTechnicianId
      order.status = 'assigned'
      console.log('  - ✅ Successfully updated order.assigned_user_id to:', order.assigned_user_id)
      
      // Jeśli to była konwersja ze zgłoszenia – archiwizuj zgłoszenie
      if (pendingConvertedRequest.value) {
        await markRequestConverted(pendingConvertedRequest.value)
        pendingConvertedRequest.value = null
        // Po konwersji i przypisaniu – przejdź do Aktywne i odśwież listę
        activeTab.value = 'active'
        try { await loadOrders() } catch (_) {}
      }

      // Pre-sync wymaganych encji na Railway (users/devices/clients)
      await preSyncRailway()

      // Synchronizuj z Railway
      await syncOrderToRailway(order)
      
      console.log('  - ✅ Local state updated and synced to Railway')
    } else {
      console.error('❌ Błąd aktualizacji technika:', response.statusText)
      alert('❌ Błąd podczas przypisywania technika')
      // Przywróć oryginalną wartość w przypadku błędu
      order.assigned_user_id = originalAssignedId
    }
  } catch (error) {
    console.error('❌ Błąd podczas przypisywania technika:', error)
    alert('❌ Błąd podczas przypisywania technika')
    // Przywróć oryginalną wartość w przypadku błędu
    order.assigned_user_id = originalAssignedId
  }
}

// Funkcja synchronizacji zlecenia z Railway
const syncOrderToRailway = async (order) => {
  try {
    console.log('🔄 Synchronizuję zlecenie z Railway:', order.id)
    // Circuit breaker: jeśli niedawno było 5xx — wstrzymaj próbę przez krótki czas
    if (Date.now() < _railwayBreakerUntil) {
      console.warn('⛔ Railway breaker active – skip sync attempt')
      return
    }

    // Bezpieczna konwersja order_parts → parts_used (tylko jeśli parts_used jest NULL/puste LUB jest tylko cyfrą 1-2 znaki - prawdopodobnie ID części)
    let partsUsedText = order.parts_used || null
    const partsUsedTrimmed = partsUsedText ? String(partsUsedText).trim() : ''
    if (!partsUsedText || partsUsedTrimmed === '' || /^\d{1,2}$/.test(partsUsedTrimmed)) {
      try {
        if (window.electronAPI?.database && order.id) {
          const orderParts = await window.electronAPI.database.query(
            `SELECT sp.name, sp.part_number, op.quantity 
             FROM order_parts op 
             JOIN spare_parts sp ON op.part_id = sp.id 
             WHERE op.order_id = ? AND sp.name IS NOT NULL
             ORDER BY sp.name`,
            [order.id]
          )
          if (orderParts && orderParts.length > 0) {
            partsUsedText = orderParts
              .map(p => {
                const name = p.name || ''
                const partNumber = p.part_number ? ` ${p.part_number}` : ''
                return `${name}${partNumber}`.trim()
              })
              .filter(Boolean)
              .join(', ')
          }
        }
      } catch (_) { 
        // Soft fail - zachowaj NULL jeśli błąd
        partsUsedText = null
      }
    }

  const payload = [{
    // external_id stabilizuje mapowanie na Railway – zachowujemy też id dla kompatybilności
    external_id: order.id,
    id: order.id,
      order_number: order.order_number || `SRV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      client_id: order.client_id != null ? Number(order.client_id) : null,
      device_id: order.device_id != null ? Number(order.device_id) : null,
      assigned_user_id: order.assigned_user_id || null,
      service_categories: order.service_categories || [],
      status: order.status || 'new',
      priority: order.priority || 'medium',
      type: order.type || 'maintenance',
      title: order.title || order.description || 'Zlecenie serwisowe',
      description: order.description || '',
      scheduled_date: order.scheduled_date || null,
      parts_used: partsUsedText,
      completed_at: order.completed_at || null,
      estimated_hours: order.estimated_hours || 0,
      labor_cost: order.labor_cost || 0,
      parts_cost: order.parts_cost || 0,
      total_cost: order.total_cost || 0,
      notes: order.notes || '',
      // Bezpieczne identyfikatory do mapowania po stronie Railway
      client_email: (() => { try { const cid = order.client_id != null ? Number(order.client_id) : null; return cid ? ((clients.value || []).find(c => Number(c.id) === cid)?.email || null) : null } catch (_) { return null } })(),
      device_serial: (() => { try { const did = order.device_id != null ? Number(order.device_id) : null; return did ? ((devices.value || []).find(d => Number(d.id) === did)?.serial_number || null) : null } catch (_) { return null } })()
    }]

    const base = await getBase()
    // Note: avoid custom headers to prevent CORS preflight issues on reverse proxies
    let response = await fetch(`${base}/api/sync/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log('✅ Zlecenie zsynchronizowane z Railway')
    } else {
      let errorText = ''
      try {
        errorText = await response.text()
      } catch (_) {
        errorText = ''
      }
      if (errorText && errorText.length > 0) {
        console.warn('⚠️ Błąd synchronizacji z Railway:', response.status, 'body:', errorText)
      } else {
        console.warn('⚠️ Błąd synchronizacji z Railway:', response.status)
      }
      // Retry once on alternate known base if 5xx
      if (response.status >= 500) {
        const alternates = (await getPreferredBases()).filter(u => u !== base)
        for (const alt of alternates) {
          try {
            const r2 = await fetch(`${alt}/api/sync/orders`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            })
            if (r2.ok) { console.log('✅ Retry success on', alt); return }
            try {
              const body2 = await r2.text()
              if (body2) console.warn('⚠️ Retry response', r2.status, 'body:', body2)
            } catch (_) {}
          } catch (e) { /* ignore */ }
        }
        // Activate short breaker (e.g. 30s)
        _railwayBreakerUntil = Date.now() + 30000
      }
    }
  } catch (error) {
    console.error('❌ Błąd synchronizacji z Railway:', error)
  }
}

// Reużywalny pre-sync użytkowników/urządzeń/klientów z fallbackiem formatu payloadu
async function preSyncRailway() {
  try {
    // Users – pomijamy w tej instancji (brak endpointu /api/sync/users). Zostawiamy tylko devices/clients.

    // Devices – spróbuj wrapper, potem fallback na czystą tablicę; mapuj brand -> manufacturer
    try {
      const devicesToSync = (devices.value || []).map(d => ({
        id: d.id,
        client_id: d.client_id,
        name: d.name,
        manufacturer: d.manufacturer || d.brand || null,
        model: d.model || null,
        serial_number: d.serial_number || null,
        production_year: d.production_year || null,
        power_rating: d.power_rating || null,
        fuel_type: d.fuel_type || null,
        installation_date: d.installation_date || d.installationDate || null,
        last_service_date: d.last_service_date || d.lastService || null,
        next_service_date: d.next_service_date || d.nextService || null,
        warranty_end_date: d.warranty_end_date || null,
        technical_data: d.technical_data || null,
        notes: d.notes || null,
        is_active: d.is_active !== false,
        created_at: d.created_at || null,
        updated_at: d.updated_at || null
      }))
      const payload = JSON.stringify(devicesToSync)
      let ok = false
      for (const base of await getPreferredBases()) {
        try {
          const r = await fetch(`${base}/api/sync/devices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
          if (r.ok) { ok = true; break }
          console.warn('⚠️ preSync devices not ok on', base, r.status)
        } catch (e) {
          console.warn('⚠️ preSync devices error on', base, e.message)
        }
      }
      if (!ok) console.warn('⚠️ preSync devices failed on all bases')
    } catch (e) {
      console.warn('⚠️ preSync devices failed:', e.message)
    }

    // Clients – spróbuj wrapper, potem fallback na czystą tablicę
    try {
      // Minimalny payload klientów – tylko akceptowane pola
      const clientsToSync = (clients.value || []).map(c => ({
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        company_name: c.company_name || null,
        type: c.type || 'individual',
        email: c.email || null,
        phone: c.phone || null,
        address: c.address || null,
        address_street: c.address_street || null,
        address_city: c.address_city || null,
        address_postal_code: c.address_postal_code || null,
        address_country: c.address_country || null,
        nip: c.nip || null,
        regon: c.regon || null,
        contact_person: c.contact_person || null,
        notes: c.notes || null,
        is_active: c.is_active !== false
      }))
      const payload = JSON.stringify(clientsToSync)
      let ok = false
      for (const base of await getPreferredBases()) {
        try {
          const r = await fetch(`${base}/api/sync/clients`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload })
          if (r.ok) { ok = true; break }
          console.warn('⚠️ preSync clients not ok on', base, r.status)
        } catch (e) {
          console.warn('⚠️ preSync clients error on', base, e.message)
        }
      }
      if (!ok) console.warn('⚠️ preSync clients failed on all bases')
    } catch (e) {
      console.warn('⚠️ preSync clients failed:', e.message)
    }
  } catch (_) {
    // soft-fail
  }
}

let _importInFlight = false
let _railwayBreakerUntil = 0
const refreshFromRailway = async () => {
  try {
    if (_importInFlight) {
      return;
    }
    _importInFlight = true
    // Pobierz wszystkie – importuj najnowsze zmienione (nie tylko zakończone),
    // aby złapać started_at po "Rozpocznij" oraz completed_at po "Zakończ".
    const resp = await fetch(`${await getBase()}/api/desktop/orders`)
    if (!resp.ok) throw new Error('Railway API error ' + resp.status)
    let remoteOrders = await resp.json()
    // Filtr: nie reimportuj zleceń oznaczonych lokalnie jako usunięte (tombstones + lokalny status='deleted')
    try {
      if (window.electronAPI) {
        const row = await window.electronAPI.database.get('SELECT GROUP_CONCAT(order_number, ",") AS list FROM deleted_tombstones')
        const row2 = await window.electronAPI.database.get('SELECT GROUP_CONCAT(order_number, ",") AS list FROM service_orders WHERE status = "deleted"')
        const list1 = row && row.list ? String(row.list).split(',').map(s => s.trim()).filter(Boolean) : []
        const list2 = row2 && row2.list ? String(row2.list).split(',').map(s => s.trim()).filter(Boolean) : []
        const all = new Set([...(list1||[]), ...(list2||[])].map(s => String(s)))
        if (all.size) {
          remoteOrders = (Array.isArray(remoteOrders) ? remoteOrders : []).filter(o => !all.has(String(o.order_number || '')))
        }
      }
    } catch (_) { /* soft-fail */ }
    // Weź 10 ostatnio aktualizowanych zleceń (dowolny status)
    const toImport = (Array.isArray(remoteOrders) ? remoteOrders : [])
      .sort((a,b) => new Date(b.updated_at || b.completed_at || b.started_at || b.created_at).getTime() - new Date(a.updated_at || a.completed_at || a.started_at || a.created_at).getTime())
      .slice(0, 10)

    if (toImport.length === 0) {
      return
    }

    if (window.electronAPI) {
      await ensureLocalSchema()
      let imported = 0
      for (const o of toImport) { // import batch
        // Upewnij się, że klucze obce istnieją lokalnie; w przeciwnym razie ustaw NULL, aby nie łamać FK
        // Strażnik: nie nadpisuj świeżych lokalnych rekordów przeznaczonych "Do wysłania"
        let localRow = null
        try {
          localRow = await window.electronAPI.database.get(
            'SELECT status, started_at, completed_at, desktop_sync_status FROM service_orders WHERE order_number = ?',
            [o.order_number]
          )
        } catch (_) { /* ignore */ }
        const isFreshLocal = !!localRow && (String(localRow.desktop_sync_status || '') !== 'sent') && (!localRow.started_at) && (['new','assigned','to_send'].includes(String(localRow.status || '').toLowerCase()))
        if (isFreshLocal) {
          // Pomiń import tego rekordu – zostaw lokalny do czasu wysłania
          continue
        }
        let safeClientId = o.client_id || null
        let safeDeviceId = o.device_id || null
        let safeAssignedUserId = o.assigned_user_id || null
        try {
          if (safeClientId) {
            const c = await window.electronAPI.database.get('SELECT id FROM clients WHERE id = ?', [safeClientId])
            if (!c || !c.id) safeClientId = null
          }
        } catch (_) { safeClientId = null }
        try {
          if (safeDeviceId) {
            const d = await window.electronAPI.database.get('SELECT id FROM devices WHERE id = ?', [safeDeviceId])
            if (!d || !d.id) safeDeviceId = null
          }
        } catch (_) { safeDeviceId = null }
        try {
          if (safeAssignedUserId) {
            const u = await window.electronAPI.database.get('SELECT id FROM users WHERE id = ?', [safeAssignedUserId])
            if (!u || !u.id) safeAssignedUserId = null
          }
        } catch (_) { safeAssignedUserId = null }
        // Najpierw aktualizuj po unikalnym order_number, aby uniknąć konfliktu UNIQUE(order_number)
        // Jeśli lokalnie rekord jest w koszu – nie nadpisuj go importem z Railway
        const existingRowCheck = await window.electronAPI.database.get('SELECT id, status FROM service_orders WHERE order_number = ?', [o.order_number])
        if (existingRowCheck && String(existingRowCheck.status || '').toLowerCase() === 'deleted') {
          continue // skip import for trashed order
        }
        const row = existingRowCheck
        if (row && row.id) {
          // UI-guard: nie nadpisuj na 'completed' świeżych lokalnych zleceń bez started_at
          const local = await window.electronAPI.database.get(
          'SELECT status, started_at, completed_at, completion_notes, parts_used, work_photos, notes, updated_at FROM service_orders WHERE order_number = ?',
            [o.order_number]
          )
          const localStatusLc = String(local?.status || '').toLowerCase()
          const remoteStatusLc = String(o.status || '').toLowerCase()
          const isFreshLocal = !local?.started_at && (localStatusLc === 'new' || localStatusLc === 'assigned' || localStatusLc === 'to_send')
          const blockCompleted = isFreshLocal && remoteStatusLc === 'completed'
          const blockDeleted = isFreshLocal && (remoteStatusLc === 'deleted' || remoteStatusLc === 'cancelled')
          // Dodatkowy UI-guard: dla świeżych lokalnych zleceń nie nadpisuj klienta/urządzenia/tytułu/opisu
          const clientIdToSet = isFreshLocal ? (await window.electronAPI.database.get('SELECT client_id FROM service_orders WHERE order_number = ?', [o.order_number]))?.client_id ?? safeClientId : safeClientId
          const deviceIdToSet = isFreshLocal ? (await window.electronAPI.database.get('SELECT device_id FROM service_orders WHERE order_number = ?', [o.order_number]))?.device_id ?? safeDeviceId : safeDeviceId
          const titleToSet = isFreshLocal ? (await window.electronAPI.database.get('SELECT title FROM service_orders WHERE order_number = ?', [o.order_number]))?.title || o.title : o.title
          const descriptionToSet = isFreshLocal ? (await window.electronAPI.database.get('SELECT description FROM service_orders WHERE order_number = ?', [o.order_number]))?.description || o.description : o.description
          const statusToSet = (blockCompleted || blockDeleted) ? (local?.status || o.status) : o.status
          const startedAtToSet = (blockCompleted || blockDeleted) ? (local?.started_at || null) : o.started_at
          const completedAtToSet = (blockCompleted || blockDeleted) ? (local?.completed_at || null) : o.completed_at

          // Nie nadpisuj szczegółów zakończenia pustymi wartościami z Railway;
          // jeśli oba niepuste – wybierz nowsze wg updated_at
          const remoteUpdatedAt = new Date(o.updated_at || o.completed_at || o.started_at || o.created_at || 0).getTime()
          const localUpdatedAt = new Date(local?.updated_at || 0).getTime()
          const remoteNewer = remoteUpdatedAt > localUpdatedAt
          const completionNotesToSet = (() => {
            const r = (o.completion_notes && String(o.completion_notes).trim() !== '') ? o.completion_notes : null
            const l = local?.completion_notes || null
            if (r && l) return remoteNewer ? r : l
            return r || l
          })()
          const partsUsedToSet = (() => {
            const r = (o.parts_used && String(o.parts_used).trim() !== '') ? o.parts_used : null
            const l = local?.parts_used || null
            if (r && l) return remoteNewer ? r : l
            return r || l
          })()
          const workPhotosToSet = (() => {
            try {
              const rArr = Array.isArray(o.work_photos) ? o.work_photos : JSON.parse(o.work_photos || '[]')
              const lRaw = local?.work_photos || '[]'
              const lArr = Array.isArray(lRaw) ? lRaw : JSON.parse(lRaw || '[]')
              if (rArr.length && lArr.length) return JSON.stringify(remoteNewer ? rArr : lArr)
              return JSON.stringify(rArr.length ? rArr : lArr)
            } catch (_) {
              return local?.work_photos || '[]'
            }
          })()

          await window.electronAPI.database.run(
            `UPDATE service_orders SET 
               client_id = ?, device_id = ?, assigned_user_id = ?, status = ?, priority = ?, type = ?, title = ?, description = ?,
               scheduled_date = ?, started_at = ?, completed_at = ?, estimated_hours = ?, actual_hours = ?, parts_cost = ?, labor_cost = ?, total_cost = ?,
               notes = ?, created_at = ?, updated_at = ?, client_name = ?, client_phone = ?, client_email = ?, address = ?,
               completion_notes = ?, parts_used = ?, work_photos = ?
             WHERE order_number = ?`,
            [
              clientIdToSet, deviceIdToSet, safeAssignedUserId, statusToSet, o.priority, o.type || 'maintenance', titleToSet, descriptionToSet,
              o.scheduled_date, startedAtToSet, completedAtToSet, o.estimated_hours, o.actual_hours, o.parts_cost, o.labor_cost, o.total_cost,
              o.notes, o.created_at, o.updated_at, o.client_name || null, o.client_phone || null, o.client_email || null, o.address || null,
              completionNotesToSet, partsUsedToSet, workPhotosToSet,
              o.order_number
            ]
          )
        } else {
          // Jeśli lokalnie istnieje w koszu – nie twórz nowego zapisu z Railway
          const maybeDeleted = await window.electronAPI.database.get('SELECT status FROM service_orders WHERE order_number = ?', [o.order_number])
          if (maybeDeleted && String(maybeDeleted.status || '').toLowerCase() === 'deleted') {
            continue
          }
          const completionNotesIns = (o.completion_notes && String(o.completion_notes).trim() !== '') ? o.completion_notes : null
          const partsUsedIns = (o.parts_used && String(o.parts_used).trim() !== '') ? o.parts_used : null
          const workPhotosIns = (() => { try { return (Array.isArray(o.work_photos) && o.work_photos.length>0) ? JSON.stringify(o.work_photos) : '[]' } catch (_) { return '[]' } })()

          await window.electronAPI.database.run(
            `INSERT INTO service_orders (
              id, order_number, client_id, device_id, assigned_user_id, status, priority, type, title, description,
              scheduled_date, started_at, completed_at, estimated_hours, actual_hours, parts_cost, labor_cost, total_cost,
              notes, created_at, updated_at, client_name, client_phone, client_email, address,
              completion_notes, parts_used, work_photos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              order_number=excluded.order_number, client_id=excluded.client_id, device_id=excluded.device_id,
              assigned_user_id=excluded.assigned_user_id, status=excluded.status, priority=excluded.priority,
              type=excluded.type, title=excluded.title, description=excluded.description, scheduled_date=excluded.scheduled_date,
              started_at=excluded.started_at, completed_at=excluded.completed_at, estimated_hours=excluded.estimated_hours,
              actual_hours=excluded.actual_hours, parts_cost=excluded.parts_cost, labor_cost=excluded.labor_cost,
              total_cost=excluded.total_cost, notes=excluded.notes,
                           client_name=excluded.client_name, client_phone=excluded.client_phone, client_email=excluded.client_email, address=excluded.address,
               completion_notes=CASE WHEN excluded.completion_notes IS NOT NULL AND excluded.completion_notes <> '' THEN excluded.completion_notes ELSE service_orders.completion_notes END,
               parts_used=CASE WHEN excluded.parts_used IS NOT NULL AND excluded.parts_used <> '' THEN excluded.parts_used ELSE service_orders.parts_used END,
               work_photos=CASE WHEN excluded.work_photos IS NOT NULL AND excluded.work_photos <> '[]' THEN excluded.work_photos ELSE service_orders.work_photos END,
               updated_at=CURRENT_TIMESTAMP`,
              [
              o.id, o.order_number, safeClientId, safeDeviceId, safeAssignedUserId, o.status, o.priority, o.type || 'maintenance', o.title, o.description,
                o.scheduled_date, o.started_at, o.completed_at, o.estimated_hours, o.actual_hours, o.parts_cost, o.labor_cost, o.total_cost,
                o.notes, o.created_at, o.updated_at, o.client_name || null, o.client_phone || null, o.client_email || null, o.address || null,
                completionNotesIns, partsUsedIns, workPhotosIns
              ]
            )
        }
        // Oznacz zamówienie na Railway jako ZAIMPORTOWANE (handshake desktop -> backend)
        try {
          await fetch(`${await getBase()}/api/orders/${o.id}/mark-imported`, { method: 'POST' })
        } catch (_) {}
        imported++
      }
      await loadOrders()
      console.log(`[Import] Zaimportowano z Railway: ${imported}`)
    } else {
      orders.value = toImport
      console.log(`[Import] Załadowano w trybie przeglądarkowym: ${toImport.length}`)
    }
  } catch (e) {
    console.error('Refresh-from-Railway error:', e)
    // Bez popupów – log do konsoli
  } finally {
    _importInFlight = false
  }
}

let _statusInFlight = false
const refreshStatusesFromRailway = async () => {

  try {
    if (_statusInFlight) return
    _statusInFlight = true
    const ids = orders.value.map(o => o.id).filter(Boolean)
    if (ids.length === 0) { _statusInFlight = false; return }
  // Bierz pod uwagę wyłącznie zlecenia wysłane do firmy – unikamy kolizji ID z Railway
  const sentIds = orders.value.filter(o => String(o.desktop_sync_status||'') === 'sent').map(o => o.id).filter(Boolean)
  if (sentIds.length === 0) { _statusInFlight = false; return }
    let updated = 0
    for (const ord of orders.value) {
      if (String(ord.desktop_sync_status||'') !== 'sent') continue
      try {
        // Użyj lokalnego proxy, aby uniknąć CORS
        const r = await fetch(`http://localhost:5174/api/railway/desktop/orders/by-number/${encodeURIComponent(ord.order_number)}`)
        if (!r.ok) continue
        const j = await r.json().catch(()=>({}))
        const row = j && j.order ? j.order : null
        if (!row) continue
        const changed = (row.status && row.status !== ord.status) || (!!row.completed_at && row.completed_at !== ord.completed_at) || (!!row.started_at && row.started_at !== ord.started_at)
        if (!changed) continue
        // Update local DB z tym samym strażnikiem co wcześniej
        const remoteHasStart = !!row.started_at
        if (window.electronAPI) {
          const local = await window.electronAPI.database.get(
            'SELECT status, started_at, completed_at FROM service_orders WHERE id = ?',
            [ord.id]
          )
          const localStatusLc = String(local?.status || '').toLowerCase()
          const remoteStatusLc = String(row.status || '').toLowerCase()
          const blockCompleted = !local?.started_at && !remoteHasStart && (localStatusLc === 'new' || localStatusLc === 'assigned' || localStatusLc === 'to_send') && remoteStatusLc === 'completed'
          const statusToSet = blockCompleted ? (local?.status || ord.status) : (row.status || ord.status)
          const completedAtToSet = blockCompleted ? (local?.completed_at || ord.completed_at || null) : (row.completed_at || ord.completed_at || null)
          const startedAtToSet = row.started_at || ord.started_at || local?.started_at || null
          await window.electronAPI.database.run(
            'UPDATE service_orders SET status = ?, started_at = COALESCE(?, started_at), completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [statusToSet, startedAtToSet, completedAtToSet, ord.id]
          )
        }
        const remoteStatusLc = String(row.status || '').toLowerCase()
        const blockUi = !ord.started_at && !remoteHasStart && (String(ord.status || '').toLowerCase() === 'new' || String(ord.status || '').toLowerCase() === 'assigned' || String(ord.status || '').toLowerCase() === 'to_send') && remoteStatusLc === 'completed'
        ord.status = blockUi ? ord.status : (row.status || ord.status)
        ord.started_at = row.started_at || ord.started_at
        ord.completed_at = blockUi ? ord.completed_at : (row.completed_at || ord.completed_at)
        updated++
        if ((row.status || '').toLowerCase() === 'completed' && !blockUi) {
          try { await updateOrderFromRailway(ord.id) } catch (_) {}
        }
      } catch (_) { /* ignore one */ }
    }
    console.log(`[Status] Zaktualizowano z Railway (by-number): ${updated}`)
  } catch (e) {
    console.error('Refresh statuses error:', e)
    // Bez popupów – log do konsoli
  } finally {
    _statusInFlight = false
  }
}

// Dociągnięcie pełnych danych pojedynczego zlecenia z Railway i upsert do SQLite
async function updateOrderFromRailway(orderId) {
  // Fallback na wiele baz Railway, jeśli jedna zwróci 404/5xx
  const bases = await getPreferredBases().catch(async () => [await getBase()])
  let data = null
  for (const b of bases) {
    try {
      const r = await fetch(`${b}/api/orders/${orderId}`)
      if (!r.ok) continue
      data = await r.json().catch(() => null)
      if (data) break
    } catch (_) { /* try next base */ }
  }
  if (!data) return
  const o = data.order
  if (!o) return
  if (window.electronAPI) {
    // Strażnik: jeśli lokalny rekord jest świeży i nie został wysłany – nie nadpisuj
    try {
      const local = await window.electronAPI.database.get(
        'SELECT status, started_at, completed_at, desktop_sync_status FROM service_orders WHERE id = ?',
        [orderId]
      )
      if (local && String(local.status || '').toLowerCase() === 'deleted') return
      const isFreshLocal = !!local && (String(local.desktop_sync_status || '') !== 'sent') && (!local.started_at) && (['new','assigned','to_send'].includes(String(local.status || '').toLowerCase()))
      if (isFreshLocal) {
        return
      }
      // Nowy strażnik: jeśli lokalnie NIE wysłane do firmy, nie nadpisuj statusem deleted/cancelled/completed z Railway
      const remoteStatusLc = String(o.status || '').toLowerCase()
      const localSent = String(local?.desktop_sync_status || '') === 'sent'
      if (!localSent && ['deleted','cancelled'].includes(remoteStatusLc)) {
        return
      }
      // Dodatkowo: nie zmieniaj completed -> deleted, jeśli nie wysłane
      if (!localSent && remoteStatusLc === 'deleted' && String(local?.status || '').toLowerCase() !== 'deleted') {
        return
      }
    } catch (_) { /* ignore */ }
    await window.electronAPI.database.run(
      `INSERT INTO service_orders (
        id, order_number, client_id, device_id, assigned_user_id, status, priority, type, title, description,
        scheduled_date, started_at, completed_at, estimated_hours, actual_hours, parts_cost, labor_cost, total_cost,
        notes, created_at, updated_at, completion_notes, parts_used, work_photos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_number) DO UPDATE SET
        client_id=excluded.client_id,
        device_id=excluded.device_id,
        assigned_user_id=excluded.assigned_user_id,
        status=excluded.status,
        priority=excluded.priority,
        type=excluded.type,
        title=excluded.title,
        description=excluded.description,
        scheduled_date=excluded.scheduled_date,
        started_at=excluded.started_at,
        completed_at=excluded.completed_at,
        estimated_hours=excluded.estimated_hours,
        actual_hours=excluded.actual_hours,
        parts_cost=excluded.parts_cost,
        labor_cost=excluded.labor_cost,
        total_cost=excluded.total_cost,
        notes=excluded.notes,
        completion_notes=CASE WHEN excluded.completion_notes IS NOT NULL AND excluded.completion_notes <> '' THEN excluded.completion_notes ELSE service_orders.completion_notes END,
        parts_used=CASE WHEN excluded.parts_used IS NOT NULL AND excluded.parts_used <> '' THEN excluded.parts_used ELSE service_orders.parts_used END,
        work_photos=CASE WHEN excluded.work_photos IS NOT NULL AND excluded.work_photos <> '[]' THEN excluded.work_photos ELSE service_orders.work_photos END,
        updated_at=CURRENT_TIMESTAMP`,
      [
        o.id, o.order_number, o.client_id || null, o.device_id || null, o.assigned_user_id || null, o.status, o.priority, o.type || 'maintenance', o.title, o.description,
        o.scheduled_date, o.started_at, o.completed_at, o.estimated_hours, o.actual_hours, o.parts_cost, o.labor_cost, o.total_cost,
        o.notes, o.created_at, o.updated_at, o.completion_notes || null, o.parts_used || null, JSON.stringify(o.work_photos || [])
      ]
    )
    await loadOrders()
  }
}

const completeOrder = async (order) => {
  // Otwórz modal rozliczenia zlecenia
  billingOrder.value = order
  showBillingModal.value = true
}

const generateInvoiceForOrder = async (order) => {
  if (!window.electronAPI) return

  try {
    // Sprawdź czy faktury dla tego zlecenia już nie ma
    const existingInvoice = await window.electronAPI.database.get(
      'SELECT id FROM invoices WHERE order_id = ?',
      [order.id]
    )

    if (existingInvoice) {
      console.log('Faktura dla tego zlecenia już istnieje')
      return
    }

    // Generuj numer faktury
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now().toString().slice(-4)
    const invoiceNumber = `FV-${year}-${month}-${timestamp}`

    // Przygotuj dane faktury
    const netAmount = order.total_cost || 0
    const taxRate = 0.23 // 23% VAT
    const taxAmount = netAmount * taxRate
    const grossAmount = netAmount + taxAmount

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14) // 14 dni na płatność

    // Zapisz fakturę
    const invoiceResult = await window.electronAPI.database.run(
      `INSERT INTO invoices 
       (invoice_number, order_id, client_id, issue_date, due_date, status, net_amount, tax_amount, gross_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceNumber, order.id, order.client_id, now.toISOString(), dueDate.toISOString(),
        'draft', netAmount, taxAmount, grossAmount, 'transfer'
      ]
    )

    // Dodaj pozycje faktury
    if (order.labor_cost > 0) {
      const laborNet = order.labor_cost
      const laborTax = laborNet * taxRate
      const laborGross = laborNet + laborTax

      await window.electronAPI.database.run(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, net_amount, tax_rate, tax_amount, gross_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceResult.lastID, 'Robocizna - ' + order.title, 1, laborNet,
          laborNet, taxRate, laborTax, laborGross
        ]
      )
    }

    if (order.parts_cost > 0) {
      const partsNet = order.parts_cost
      const partsTax = partsNet * taxRate
      const partsGross = partsNet + partsTax

      await window.electronAPI.database.run(
        `INSERT INTO invoice_items 
         (invoice_id, description, quantity, unit_price, net_amount, tax_rate, tax_amount, gross_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceResult.lastID, 'Części zamienne', 1, partsNet,
          partsNet, taxRate, partsTax, partsGross
        ]
      )
    }

    console.log(`Faktura ${invoiceNumber} została automatycznie wygenerowana dla zlecenia ${order.order_number}`)
    
    // Pokaż powiadomienie użytkownikowi
    alert(`✅ Zlecenie zakończone!\n\nAutomatycznie wygenerowano fakturę: ${invoiceNumber}\nMożesz ją znaleźć w zakładce "Faktury".`)

  } catch (error) {
    console.error('Błąd podczas generowania faktury:', error)
    alert('⚠️ Zlecenie zostało zakończone, ale wystąpił błąd podczas generowania faktury.')
  }
}

const deleteOrder = (order) => {
  deletingOrder.value = order
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  try {
    if (!deletingOrder.value || !deletingOrder.value.id) return
    const isAlreadyDeleted = String(deletingOrder.value.status) === 'deleted'
    if (isAlreadyDeleted) {
      // Usuń trwale lokalnie (Railway bez zmian) + usuń z listy
      const r = await fetch(`http://localhost:5174/api/desktop/orders/${deletingOrder.value.id}?confirm=1`, { method: 'DELETE' })
      if (!r.ok) { throw new Error('Hard delete failed ' + r.status) }
      const idx = orders.value.findIndex(o => o.id === deletingOrder.value.id)
      if (idx !== -1) orders.value.splice(idx, 1)
    } else {
      // Przenieś do kosza (soft delete) – zsynchronizuje 'deleted' do Railway
      const r2 = await fetch(`http://localhost:5174/api/desktop/orders/${deletingOrder.value.id}/trash`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } })
      if (!r2.ok) { throw new Error('Trash failed ' + r2.status) }
      // Zaktualizuj wiersz lokalnie
      const idx = orders.value.findIndex(o => o.id === deletingOrder.value.id)
      if (idx !== -1) {
        orders.value[idx].status = 'deleted'
        orders.value[idx].desktop_sync_status = 'sent'
        try { orders.value[idx].deleted_at = new Date().toISOString() } catch (_) {}
      }
      // Przełącz na zakładkę Usunięte, by użytkownik widział efekt
      activeTab.value = 'trash'
    }
    showDeleteModal.value = false
    deletingOrder.value = null
  } catch (err) {
    console.error('Error deleting order (trash):', err)
    error.value = 'Błąd podczas przenoszenia zlecenia do Usunięte'
  }
}

const openAddModal = () => {
  console.log('🔵 Przycisk "Nowe zlecenie" został kliknięty!')
  console.log('🔵 Przed: showAddModal =', showAddModal.value)
  console.log('🔵 Przed: showEditModal =', showEditModal.value)
  
  orderPrefill.value = null
  pendingConvertedRequest.value = null
  showAddModal.value = true
  editingOrder.value = null
  
  console.log('🔵 Po: showAddModal =', showAddModal.value)
  console.log('🔵 Po: showEditModal =', showEditModal.value)
  console.log('🔵 Modal warunek (showAddModal || showEditModal):', showAddModal.value || showEditModal.value)
  console.log('🔵 Ilość klientów:', clients.value.length)
  console.log('🔵 Ilość urządzeń:', devices.value.length)
  
  // Test czy modal się renderuje
  setTimeout(() => {
    const modal = document.querySelector('.fixed.inset-0.bg-black')
    console.log('🔵 Modal DOM element:', modal)
    if (modal) {
      console.log('🔵 Modal style:', window.getComputedStyle(modal).display)
    }
  }, 100)
}

const closeModal = () => {
  const hadPrefill = !!orderPrefill.value
  showAddModal.value = false
  showEditModal.value = false
  editingOrder.value = null
  orderPrefill.value = null
  if (hadPrefill && !showEditModal.value) {
    pendingConvertedRequest.value = null
  }
}

const closeBillingModal = () => {
  showBillingModal.value = false
  billingOrder.value = null
}

const onOrderBillingCompleted = async (billingData) => {
  try {
    // Aktualizuj status zlecenia lokalnie
    const index = orders.value.findIndex(o => o.id === billingData.orderId)
    if (index !== -1) {
      orders.value[index].status = 'completed'
      orders.value[index].completed_at = new Date().toISOString()
      orders.value[index].total_cost = billingData.totals.gross
    }

    // Zamknij modal
    closeBillingModal()

    // Pokaż powiadomienie
    alert(`✅ Zlecenie zostało pomyślnie rozliczone!\n\nWygenerowano fakturę na kwotę ${billingData.totals.gross.toFixed(2)} zł\nMożesz ją znaleźć w zakładce "Faktury".`)

  } catch (error) {
    console.error('Error handling billing completion:', error)
    alert('❌ Wystąpił błąd podczas finalizacji rozliczenia')
  }
}

const onOrderSaved = async (savedOrder) => {
  console.log('🔄 Odświeżam listę zleceń po zapisaniu...')
  
  // Odśwież listę zleceń z bazy danych i pokaż w Do wysłania
  await loadOrders()
  try {
    // Defensive fix: jeśli po zapisie status przypadkiem jest 'deleted' – odtwórz poprzedni
    const justSaved = (orders.value || []).find(o => o.id === savedOrder.id || String(o.order_number) === String(savedOrder.order_number))
    if (justSaved && String(justSaved.status || '').toLowerCase() === 'deleted' && window.electronAPI) {
      // Przywróć z kosza
      await fetch(`http://localhost:5174/api/desktop/orders/${justSaved.id}/restore`, { method: 'PUT' })
      await loadOrders()
    }
  } catch (_) { /* soft-fail */ }
  activeTab.value = 'toSync'
  
  const wasEdit = showEditModal.value
  const requestToFinalize = pendingConvertedRequest.value
  closeModal()
  if (requestToFinalize) {
    await markRequestConverted(requestToFinalize)
    pendingConvertedRequest.value = null
  }
  
  // Pokaż komunikat sukcesu
  if (wasEdit) {
    alert('✅ Zlecenie zostało zaktualizowane!')
  } else {
    alert('✅ Nowe zlecenie zostało utworzone!')
  }

  // 🔄 Nie importuj od razu z Railway dla świeżego zlecenia – daj UI szansę na przypisanie
  // (opcjonalny lekki refresh statusów, ale bez pełnego importu)
  // Wyłączone: po zapisie nie odświeżaj statusów z Railway, by uniknąć nadpisania na 'deleted'
}

// Watchers
watch(
  () => route.query?.tab,
  (nextTab) => {
    const resolved = resolveTabName(nextTab)
    if (resolved && resolved !== activeTab.value) {
      activeTab.value = resolved
    }
  }
)

watch([searchQuery, filterStatus, filterType, filterPriority, filterClient, activeTab], () => {
  currentPage.value = 1
})

// Auto-refresh: statusy co 30s niezależnie od zakładki; odśwież części klienta po wejściu
// status auto-refresh disabled per user request
watch(activeTab, (tab) => {
	if (tab === 'fromClient') {
		fetchClientRequests()
	}
})

// Lifecycle
onMounted(async () => {
  try { globalThis.fetchClientRequests = fetchClientRequests } catch (_) {}
  applyInitialTab()
  await loadServiceCategories().catch(() => {})
	await Promise.allSettled([
		loadClients(),
		loadDevices(),
		loadTechnicians()
	])
	await loadOrders()
	try { console.log('BULK-TRASH-UI v2 loaded', { tabs: true }) } catch (_) {}
	// Po starcie: dociągnij brakujące detale dla już zakończonych zleceń (bezpiecznie, limitowane)
	setTimeout(async () => {
		try {
			const missing = (orders.value || []).filter(o => String(o.status||'').toLowerCase() === 'completed' && (!o.completion_notes && !o.work_photos))
			for (const o of missing.slice(0, 5)) { try { await updateOrderFromRailway(o.id) } catch (_) {} }
		} catch (_) {}
	}, 500)
})

onUnmounted(() => {
  try {
    if (globalThis.fetchClientRequests === fetchClientRequests) {
      delete globalThis.fetchClientRequests
    }
  } catch (_) {}
})

async function switchToFromClient() {
	activeTab.value = 'fromClient'
	await fetchClientRequests()
}

function normalizePhone(rawPhone) {
  if (!rawPhone) return ''
  return String(rawPhone).replace(/[^\d]/g, '')
}

async function generateServiceOrderNumber() {
  const fallback = () => {
    const year = new Date().getFullYear()
    const suffix = String(Date.now()).slice(-6)
    return `SRV-${year}-${suffix}`
  }
  if (!window.electronAPI?.database) {
    return fallback()
  }
  const db = window.electronAPI.database
  const year = new Date().getFullYear()
  let candidateNumber = ''
  let sequence = 0
  try {
    const row = await db.get(
      'SELECT order_number FROM service_orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1',
      [`SRV-${year}-%`]
    )
    if (row && row.order_number) {
      const match = String(row.order_number).match(/^SRV-(\d{4})-(\d+)$/)
      if (match && Number(match[1]) === year) {
        sequence = Number(match[2]) || 0
      }
    }
  } catch (error) {
    console.warn('[generateServiceOrderNumber] lookup failed', error)
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    sequence += 1
    candidateNumber = `SRV-${year}-${sequence}`
    try {
      const exists = await db.get(
        'SELECT 1 FROM service_orders WHERE order_number = ? LIMIT 1',
        [candidateNumber]
      )
      if (!exists) {
        return candidateNumber
      }
    } catch (error) {
      console.warn('[generateServiceOrderNumber] collision check failed', error)
      break
    }
  }
  return fallback()
}

function splitContactName(rawName) {
  const name = String(rawName || '').trim()
  if (!name) return { firstName: '', lastName: '' }
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  const firstName = parts.shift()
  const lastName = parts.join(' ')
  return { firstName, lastName }
}

function parseRequestAddress(requestRow) {
  let street = (requestRow.address_street || requestRow.address || '').trim()
  let city = (requestRow.address_city || requestRow.city || '').trim()
  let postal = (requestRow.address_postal_code || '').trim()
  const combined = String(requestRow.address_city_postal || '').trim()
  if (combined) {
    const match = combined.match(/^(\d{2}-\d{3})\s*(.+)$/)
    if (match) {
      postal = postal || match[1]
      city = city || match[2]
    } else if (!city) {
      city = combined
    }
  }
  if ((!postal || !city) && requestRow.address) {
    const addressText = String(requestRow.address).trim()
    const segments = addressText.split(',').map(s => s.trim()).filter(Boolean)
    if (!street && segments.length) {
      street = segments[0]
    }
    const postalCandidate = segments.find(seg => /^\d{2}-\d{3}$/.test(seg))
    if (!postal && postalCandidate) {
      postal = postalCandidate
    }
    if (!city) {
      if (postalCandidate) {
        const idx = segments.indexOf(postalCandidate)
        const after = segments.slice(idx + 1).find(Boolean)
        if (after) city = after
      } else if (segments.length >= 2) {
        city = segments[segments.length - 1]
      }
    }
    if ((!postal || !city) && addressText) {
      const match = addressText.match(/(\d{2}-\d{3})[,\s]+([^,]+)/)
      if (match) {
        postal = postal || match[1]
        city = city || match[2].trim()
      }
    }
  }
  return {
    street: street || '',
    city: city || '',
    postalCode: postal || '',
    country: 'Polska'
  }
}

function evaluateRequestCompleteness(requestRow) {
  const clientMissing = []
  const deviceMissing = []
  const warnings = []

  const clientType = (() => {
    const declared = String(requestRow.client_type || '').toLowerCase()
    if (declared === 'business') return 'business'
    if ((requestRow.nip || requestRow.client_nip || '').trim()) return 'business'
    return 'individual'
  })()
  const companyName = (requestRow.company_name || '').trim()
  const rawFirstName = (requestRow.first_name || '').trim()
  const rawLastName = (requestRow.last_name || '').trim()
  const contactName = (requestRow.contact_name || '').trim()
  const splitFallback = splitContactName(contactName)
  const firstName = rawFirstName || splitFallback.firstName || ''
  const lastName = rawLastName || splitFallback.lastName || ''
  const phone = normalizePhone(requestRow.phone)
  const addressInfo = parseRequestAddress(requestRow)
  const hasAddress = !!(addressInfo.street && addressInfo.city)
  const deviceType = (requestRow.device_type || requestRow.deviceType || '').trim()
  const deviceBrand = (requestRow.device_brand || requestRow.brand || requestRow.deviceBrand || '').trim()
  const deviceModel = (
    requestRow.device_model ||
    requestRow.brand_model ||
    requestRow.deviceModel ||
    requestRow.brandModel ||
    requestRow.model ||
    ''
  ).trim()

  if (clientType === 'business') {
    if (!companyName) clientMissing.push('Nazwa firmy')
    if (!requestRow.nip) warnings.push('Brak numeru NIP')
    if (contactName && !firstName && !lastName) {
      // dane kontaktowe nie rozbite – potraktuj jako ostrzeżenie
      warnings.push('Osoba kontaktowa bez imienia i nazwiska')
    }
  } else {
    if (!firstName) clientMissing.push('Imię kontaktowe')
    if (!lastName) clientMissing.push('Nazwisko kontaktowe')
  }
  if (!phone) clientMissing.push('Telefon')
  if (!hasAddress) clientMissing.push('Adres instalacji')
  if (!deviceType) deviceMissing.push('Typ urządzenia')
  if (!deviceBrand) warnings.push('Brak marki urządzenia')
  if (!requestRow.description) warnings.push('Brak szczegółowego opisu')

  const combinedMissing = [...clientMissing, ...deviceMissing]
  const summaryParts = []
  if (clientMissing.length) summaryParts.push(`Klient: ${clientMissing.join(', ')}`)
  if (deviceMissing.length) summaryParts.push(`Urządzenie: ${deviceMissing.join(', ')}`)

  return {
    ready: combinedMissing.length === 0,
    missing: combinedMissing,
    clientReady: clientMissing.length === 0,
    clientMissing,
    deviceReady: deviceMissing.length === 0,
    deviceMissing,
    warnings,
    summary: summaryParts.length
      ? `Brakuje danych – ${summaryParts.join('; ')}`
      : 'Dane kompletne – można utworzyć klienta, urządzenie i zlecenie'
  }
}

function getRawRequestId(source) {
  if (!source) return null
  const raw = typeof source === 'object' ? source.id : source
  if (raw == null) return null
  return String(raw).replace(/^REQ-/, '')
}

function findClientRequestByIdentifier(orderRow) {
  if (!orderRow) return null
  const candidates = []
  const rawId = getRawRequestId(orderRow)
  if (rawId) candidates.push(rawId)
  const reference = String(orderRow.order_number || orderRow.reference_number || '').trim()
  if (reference) {
    const normalizedRef = reference.replace(/^REQ-/i, '').toLowerCase()
    candidates.push(normalizedRef)
  }
  for (const request of clientRequests.value) {
    const idMatch = candidates.some(candidate => candidate && String(request.id).toLowerCase() === candidate.toLowerCase())
    if (idMatch) return request
    const ref = String(request.reference_number || request.order_number || '').trim()
    if (ref && candidates.some(candidate => candidate && ref.replace(/^REQ-/i, '').toLowerCase() === candidate.toLowerCase())) {
      return request
    }
  }
  return null
}

function buildClientPrefillFromRequest(request) {
  const addressInfo = parseRequestAddress(request || {})
  const contactLabel = request?.contact_name || request?.client_name || request?.name || ''
  const fallbackName = splitContactName(contactLabel)
  const declaredType = String(request?.client_type || '').toLowerCase()
  const hasNip = (request?.nip || request?.client_nip || '').trim().length > 0
  const type = declaredType === 'business' || hasNip ? 'business' : 'individual'
  return {
    type,
    first_name: type === 'individual' ? (request?.first_name || fallbackName.firstName || '') : '',
    last_name: type === 'individual' ? (request?.last_name || fallbackName.lastName || '') : '',
    company_name: type === 'business' ? (request?.company_name || contactLabel || '') : '',
    nip: type === 'business' ? (request?.nip || request?.client_nip || '') : '',
    email: request?.email || '',
    phone: request?.phone || '',
    address_street: addressInfo.street || '',
    address_city: addressInfo.city || '',
    address_postal_code: addressInfo.postalCode || '',
    address_country: addressInfo.country || 'Polska',
    notes: request?.description ? `Opis zgłoszenia:\n${request.description}` : '',
    is_active: true
  }
}

function buildDevicePrefillFromRequest(request) {
  return {
    name: request?.device_type || request?.service_type || 'Urządzenie',
    manufacturer: request?.device_brand || request?.brand || '',
    model: request?.device_model || request?.brand_model || request?.deviceModel || request?.brandModel || request?.model || '',
    serial_number: request?.device_serial || '',
    fuel_type: request?.device_type || '',
    notes: request?.description || ''
  }
}

function normalizeDatePart(raw) {
  if (!raw) return ''
  const str = String(raw).trim()
  if (!str) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10)
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    const [day, month, year] = str.split('.')
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(str)
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return ''
}

function normalizeTimePart(raw) {
  if (!raw) return ''
  const str = String(raw).trim()
  if (!str) return ''
  const explicit = str.match(/(\d{1,2}):(\d{2})/)
  if (explicit) {
    const hours = Math.min(23, Math.max(0, parseInt(explicit[1], 10)))
    const minutes = Math.min(59, Math.max(0, parseInt(explicit[2], 10)))
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  const fallback = str.match(/(\d{1,2})/)
  if (fallback) {
    const hours = Math.min(23, Math.max(0, parseInt(fallback[1], 10)))
    return `${String(hours).padStart(2, '0')}:00`
  }
  return ''
}

function buildPreferredDateTime(request) {
  const datePart = normalizeDatePart(request?.preferred_date || request?.preferredDate || request?.scheduled_date)
  if (!datePart) return ''
  const timePart = normalizeTimePart(request?.preferred_time || request?.preferredTime)
  return `${datePart}T${timePart || '00:00'}`
}

function findMainCategoryIdForRequest(request) {
  const mains = (serviceCategories.value || []).filter(cat => !cat?.parent_id)
  if (!mains.length) return ''
  const candidates = []
  const pushCandidate = (value) => {
    if (!value) return
    const str = String(value).trim()
    if (str) candidates.push(str.toLowerCase())
  }
  pushCandidate(request?.service_type)
  pushCandidate(request?.type_label)
  pushCandidate(request?.type)
  pushCandidate(request?.device_type)
  const firstLine = (request?.description || '').split('\n')[0] || ''
  pushCandidate(firstLine.replace(/^Zakres:\s*/i, ''))

  for (const candidate of candidates) {
    for (const category of mains) {
      const name = String(category.name || '').toLowerCase()
      const code = String(category.code || '').toLowerCase()
      if (!name && !code) continue
      if (
        candidate === name ||
        candidate === code ||
        (name && (candidate.includes(name) || name.includes(candidate))) ||
        (code && candidate.includes(code))
      ) {
        return category.id
      }
    }
  }
  return ''
}

function buildOrderPrefillFromRequest(request) {
  const scheduled = buildPreferredDateTime(request)
  const explicitMainCategoryId = (() => {
    if (request == null) return null
    const raw = request.service_category_id ?? request.desktop_category_id ?? request.desktopCategoryId ?? null
    const numeric = Number(raw)
    if (Number.isInteger(numeric) && numeric > 0) {
      const exists = (serviceCategories.value || []).some(
        (cat) => cat && (cat.parent_id == null || cat.parent_id === 0) && Number(cat.id) === numeric
      )
      return exists ? numeric : null
    }
    return null
  })()
  const mainCategoryId = explicitMainCategoryId != null ? explicitMainCategoryId : findMainCategoryIdForRequest(request)
  const urgent = request?.is_urgent === true || String(request?.is_urgent || '').toLowerCase() === 'true'

  const categorySource = request?.service_categories ?? request?.selected_categories ?? request?.completed_categories ?? request?.completedCategories ?? null
  let serviceCategoryList = []
  if (Array.isArray(categorySource)) {
    serviceCategoryList = categorySource
  } else if (typeof categorySource === 'string') {
    serviceCategoryList = categorySource.split(',').map(item => item.trim()).filter(Boolean)
  }
  serviceCategoryList = serviceCategoryList.map(item => {
    if (item && typeof item === 'object') {
      return String(item.id ?? item.code ?? '')
    }
    return String(item ?? '')
  }).filter(Boolean)

  const baseTitle =
    request?.service_type ||
    request?.type_label ||
    request?.type ||
    request?.device_type ||
    'Zgłoszenie klienta'

  const notes = []
  if (request?.reference_number) {
    notes.push(`Źródło zgłoszenia: ${request.reference_number}`)
  }
  if (request?.phone) {
    notes.push(`Telefon zgłaszającego: ${request.phone}`)
  }
  if (request?.email) {
    notes.push(`Email zgłaszającego: ${request.email}`)
  }
  if (request?.address) {
    notes.push(`Adres instalacji: ${request.address}`)
  }

  const primaryDescription =
    typeof request?.description === 'string' ? request.description.trim() : ''
  const descriptionLines = primaryDescription
    ? primaryDescription.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : []

  const detailLines = []
  const metaLines = []
  const metaPrefixes = [
    'typ urządzenia:',
    'preferowany termin:',
    'adres:',
    'dojazd:',
    '⚠️'
  ]

  for (const line of descriptionLines) {
    const normalized = line.toLowerCase()
    if (metaPrefixes.some((prefix) => normalized.startsWith(prefix))) {
      metaLines.push(line)
    } else {
      detailLines.push(line)
    }
  }

  if (metaLines.length) {
    notes.push(...metaLines)
  }

  return {
    order_number: '',
    client_id: request?.linked_client_id != null ? String(request.linked_client_id) : '',
    device_id: request?.linked_device_id != null ? String(request.linked_device_id) : '',
    main_category_id: mainCategoryId ? String(mainCategoryId) : '',
    type: request?.type || '',
    status: 'new',
    priority: urgent ? 'urgent' : 'medium',
    title: `Zgłoszenie – ${baseTitle}`,
    description: detailLines.join('\n'),
    scheduled_date: scheduled,
    service_categories: serviceCategoryList,
    notes: notes.join('\n')
  }
}

function refreshRequestState(request) {
  if (!request) return
  const evaluation = evaluateRequestCompleteness(request)
  request.autoReady = evaluation.ready
  request.autoMissing = evaluation.missing
  request.autoClientReady = evaluation.clientReady
  request.autoClientMissing = evaluation.clientMissing
  request.autoDeviceReady = evaluation.deviceReady
  request.autoDeviceMissing = evaluation.deviceMissing
  request.autoWarnings = evaluation.warnings
  request.autoSummary = evaluation.summary
  const idx = clientRequests.value.findIndex(r => String(r.id) === String(request.id))
  if (idx > -1) {
    clientRequests.value[idx] = {
      ...clientRequests.value[idx],
      ...request
    }
    clientRequests.value = [...clientRequests.value]
  }
}

async function openOrderModalForRequest(requestRow) {
  try { await loadClients() } catch (_) {}
  try { await loadDevices() } catch (_) {}
  pendingConvertedRequest.value = requestRow
  orderPrefill.value = buildOrderPrefillFromRequest(requestRow)
  editingOrder.value = null
  showEditModal.value = false
  showAddModal.value = true
  showAssignModal.value = false
}

async function markRequestConverted(requestRow) {
  if (!requestRow) return
  const idCandidate = String(requestRow.id || '').replace(/^REQ-/, '')
  const reference = requestRow.reference_number || requestRow.order_number || ''
  const payload = JSON.stringify({ status: 'converted' })
  const headers = { 'Content-Type': 'application/json' }
  const bases = await getPreferredBases()
  let updated = false
  if (idCandidate) {
    for (const base of bases) {
      try {
        const resp = await fetch(`${base}/api/service-requests/${encodeURIComponent(idCandidate)}/status`, { method: 'PUT', headers, body: payload })
        if (resp.ok) {
          railwayBase.value = base
          updated = true
          break
        }
      } catch (_) {}
    }
  }
  if (!updated && reference) {
    for (const base of bases) {
      try {
        const resp = await fetch(`${base}/api/service-requests/${encodeURIComponent(reference)}/status`, { method: 'PUT', headers, body: payload })
        if (resp.ok) {
          railwayBase.value = base
          updated = true
          break
        }
      } catch (_) {}
    }
  }
  if (updated) {
    const rid = idCandidate || null
    const idx = clientRequests.value.findIndex(r => {
      const normalizedId = String(r.id || '').replace(/^REQ-/, '')
      return (rid && normalizedId === rid) || (reference && r.reference_number === reference)
    })
    if (idx > -1) {
      clientRequests.value.splice(idx, 1)
    }
  }
  try { await fetchClientRequests() } catch (_) {}
}

function openClientModalForRequest(order) {
  const request = findClientRequestByIdentifier(order)
  if (!request) {
    alert('Nie znaleziono danych zgłoszenia.')
    return
  }
  if (!request.autoClientReady) {
    alert('Uzupełnij dane klienta w zgłoszeniu zanim utworzysz rekord.')
    return
  }
  requestClientTarget.value = request
  requestClientPrefill.value = buildClientPrefillFromRequest(request)
  showRequestClientModal.value = true
}

function closeRequestClientModal() {
  showRequestClientModal.value = false
  requestClientPrefill.value = null
  requestClientTarget.value = null
}

async function handleRequestClientSaved(savedClient) {
  try {
    if (!requestClientTarget.value || !savedClient?.id) {
      if (requestClientTarget.value) {
        requestClientTarget.value._clientAutomationMessage = 'Nie udało się zapisać klienta – brak danych.'
        updateCachedLinks(requestClientTarget.value.id, {
          clientMessage: requestClientTarget.value._clientAutomationMessage
        })
      }
      return
    }
    const request = requestClientTarget.value
    Object.assign(request, {
      linked_client_id: Number(savedClient.id),
      linked_client_name: savedClient.type === 'business'
        ? (savedClient.company_name || '')
        : [savedClient.first_name, savedClient.last_name].filter(Boolean).join(' '),
      linked_client_phone: savedClient.phone || '',
      linked_client_email: savedClient.email || '',
      autoClientReady: true,
      autoClientMissing: []
    })
    const reqOrderId = `REQ-${request.id}`
    const reqOrder = orders.value.find(o => String(o.id) === reqOrderId)
    if (reqOrder) {
      Object.assign(reqOrder, {
        linked_client_id: Number(savedClient.id),
        linked_client_name: request.linked_client_name,
        linked_client_phone: request.linked_client_phone,
        linked_client_email: request.linked_client_email,
        autoClientReady: true,
        autoClientMissing: []
      })
    }
    refreshRequestState(request)
    const ensuredClient = await ensureClientForRequest(request).catch((error) => {
      request._clientAutomationMessage = `Błąd tworzenia klienta: ${error?.message || error}`
      const reqOrderIdInner = `REQ-${request.id}`
      const reqOrderInner = orders.value.find(o => String(o.id) === reqOrderIdInner)
      if (reqOrderInner) reqOrderInner._clientAutomationMessage = request._clientAutomationMessage
      return null
    })
    let clientMessage = ''
    if (ensuredClient?.id) {
      request.linked_client_id = Number(ensuredClient.id)
      if (reqOrder) reqOrder.linked_client_id = Number(ensuredClient.id)
      clientMessage = ensuredClient.existed
        ? `Powiązano z klientem (ID ${ensuredClient.id})`
        : `Dodano klienta (ID ${ensuredClient.id})`
      request._clientAutomationMessage = clientMessage
      if (reqOrder) reqOrder._clientAutomationMessage = clientMessage
      refreshRequestState(request)
    } else if (savedClient?.id) {
      clientMessage = `Dodano klienta (ID ${savedClient.id})`
      request._clientAutomationMessage = clientMessage
      if (reqOrder) reqOrder._clientAutomationMessage = clientMessage
    } else if (!request._clientAutomationMessage) {
      request._clientAutomationMessage = 'Klient został zapisany.'
      if (reqOrder) reqOrder._clientAutomationMessage = request._clientAutomationMessage
    } else if (reqOrder) {
      reqOrder._clientAutomationMessage = request._clientAutomationMessage
    }
    if (clientMessage) {
      request._clientAutomationMessage = clientMessage
      if (reqOrder) reqOrder._clientAutomationMessage = clientMessage
    }
    updateCachedLinks(request.id, {
      linkedClientId: request.linked_client_id ?? null,
      linkedClientName: request.linked_client_name || null,
      clientMessage: request._clientAutomationMessage || null
    })
    requestClientTarget.value = null
    await loadClients().catch(() => {})
    refreshRequestState(request)
  } finally {
    closeRequestClientModal()
  }
}

function openDeviceModalForRequest(order) {
  const request = findClientRequestByIdentifier(order)
  if (!request) {
    alert('Nie znaleziono danych zgłoszenia.')
    return
  }
  if (!request.autoDeviceReady) {
    alert('Uzupełnij dane urządzenia w zgłoszeniu zanim utworzysz rekord.')
    return
  }
  const linkedClientId = Number(request.linked_client_id)
  requestDeviceTarget.value = request
  requestDevicePrefill.value = buildDevicePrefillFromRequest(request)
  requestDeviceDefaultClientId.value = linkedClientId || null
  showRequestDeviceModal.value = true
}

function closeRequestDeviceModal() {
  showRequestDeviceModal.value = false
  requestDevicePrefill.value = null
  requestDeviceTarget.value = null
  requestDeviceDefaultClientId.value = null
}

async function handleRequestDeviceSaved(savedDevice) {
  try {
    if (!requestDeviceTarget.value || !savedDevice?.id) {
      if (requestDeviceTarget.value) {
        requestDeviceTarget.value._deviceAutomationMessage = 'Nie udało się zapisać urządzenia – brak danych.'
        updateCachedLinks(requestDeviceTarget.value.id, {
          deviceMessage: requestDeviceTarget.value._deviceAutomationMessage
        })
      }
      return
    }
    const request = requestDeviceTarget.value
    Object.assign(request, {
      linked_device_id: Number(savedDevice.id),
      linked_device_name: savedDevice.name || [savedDevice.manufacturer, savedDevice.model].filter(Boolean).join(' '),
      linked_device_model: savedDevice.model || '',
      autoDeviceReady: true,
      autoDeviceMissing: []
    })
    if (!request.device_type) {
      request.device_type = savedDevice.name || savedDevice.fuel_type || ''
    }
    if (!request.device_brand) {
      request.device_brand = savedDevice.manufacturer || request.device_brand || ''
    }
    if (!request.device_model) {
      request.device_model = savedDevice.model || request.device_model || ''
    }
    const reqOrderId = `REQ-${request.id}`
    const reqOrder = orders.value.find(o => String(o.id) === reqOrderId)
    if (reqOrder) {
      Object.assign(reqOrder, {
        linked_device_id: Number(savedDevice.id),
        linked_device_name: request.linked_device_name,
        linked_device_model: request.linked_device_model,
        autoDeviceReady: true,
        autoDeviceMissing: []
      })
      if (!reqOrder.device_type) {
        reqOrder.device_type = request.device_type
      }
      if (!reqOrder.device_brand) {
        reqOrder.device_brand = request.device_brand
      }
      if (!reqOrder.device_model) {
        reqOrder.device_model = request.device_model
      }
    }
    refreshRequestState(request)
    const ensuredDevice = await ensureDeviceForRequest(
      request.linked_client_id || Number(savedDevice.client_id || requestDeviceDefaultClientId.value),
      request
    ).catch((error) => {
      request._deviceAutomationMessage = `Błąd tworzenia urządzenia: ${error?.message || error}`
      const reqOrderIdInner = `REQ-${request.id}`
      const reqOrderInner = orders.value.find(o => String(o.id) === reqOrderIdInner)
      if (reqOrderInner) reqOrderInner._deviceAutomationMessage = request._deviceAutomationMessage
      return null
    })
    let deviceMessage = ''
    if (ensuredDevice?.id) {
      request.linked_device_id = Number(ensuredDevice.id)
      if (reqOrder) reqOrder.linked_device_id = Number(ensuredDevice.id)
      deviceMessage = ensuredDevice.existed
        ? `Powiązano urządzenie (ID ${ensuredDevice.id})`
        : `Dodano urządzenie (ID ${ensuredDevice.id})`
      request._deviceAutomationMessage = deviceMessage
      if (reqOrder) reqOrder._deviceAutomationMessage = deviceMessage
      refreshRequestState(request)
    } else if (savedDevice?.id) {
      deviceMessage = `Dodano urządzenie (ID ${savedDevice.id})`
      request._deviceAutomationMessage = deviceMessage
      if (reqOrder) reqOrder._deviceAutomationMessage = deviceMessage
    } else if (!request._deviceAutomationMessage) {
      request._deviceAutomationMessage = 'Urządzenie zostało zapisane.'
      if (reqOrder) reqOrder._deviceAutomationMessage = request._deviceAutomationMessage
    } else if (reqOrder) {
      reqOrder._deviceAutomationMessage = request._deviceAutomationMessage
    }
    if (deviceMessage) {
      request._deviceAutomationMessage = deviceMessage
      if (reqOrder) reqOrder._deviceAutomationMessage = deviceMessage
    }
    updateCachedLinks(request.id, {
      linkedDeviceId: request.linked_device_id ?? null,
      linkedDeviceName: request.linked_device_name || null,
      linkedDeviceModel: request.linked_device_model || null,
      deviceMessage: request._deviceAutomationMessage || null
    })
    requestDeviceTarget.value = null
    await loadDevices().catch(() => {})
    refreshRequestState(request)
  } finally {
    closeRequestDeviceModal()
  }
}

async function finalizeRequestConversion(order) {
  const request = findClientRequestByIdentifier(order)
  if (!request) {
    alert('Nie znaleziono danych zgłoszenia.')
    return
  }

  // Zanim otworzymy modal, upewnij się, że zgłoszenie ma powiązane rekordy – korzystamy z cache i bieżących danych wiersza.
  const ensuredRequest = hydrateRequestWithCache({ ...request })
  if (order?.linked_client_id && !ensuredRequest.linked_client_id) {
    ensuredRequest.linked_client_id = Number(order.linked_client_id)
    ensuredRequest.linked_client_name = order.linked_client_name || ensuredRequest.linked_client_name || ''
  }
  if (order?.linked_device_id && !ensuredRequest.linked_device_id) {
    ensuredRequest.linked_device_id = Number(order.linked_device_id)
    ensuredRequest.linked_device_name = order.linked_device_name || ensuredRequest.linked_device_name || ''
    ensuredRequest.linked_device_model = order.linked_device_model || ensuredRequest.linked_device_model || ''
  }

  const hasLinkedClient = ensuredRequest.linked_client_id != null && ensuredRequest.linked_client_id !== ''
  const hasLinkedDevice = ensuredRequest.linked_device_id != null && ensuredRequest.linked_device_id !== ''

  if (!ensuredRequest.autoClientReady || !hasLinkedClient || !ensuredRequest.autoDeviceReady || !hasLinkedDevice) {
    const proceed = window.confirm(
      'Wygląda na to, że zgłoszenie nie ma przypiętego klienta lub urządzenia.\n' +
      'Możesz kontynuować i uzupełnić dane ręcznie w formularzu. Czy chcesz kontynuować?'
    )
    if (!proceed) return
  }

  try {
    await openOrderModalForRequest(ensuredRequest)
  } catch (error) {
    console.error('[finalizeRequestConversion] failed', error)
    alert('Nie udało się otworzyć formularza zlecenia dla tego zgłoszenia.')
  }
}

async function fetchClientRequests() {
    try {
        const primary = await getBase()
        const candidates = await getPreferredBases()
        const bases = [primary, ...candidates].filter((v, i, a) => !!v && a.indexOf(v) === i)
        let lastErr = null, data = null
        for (const b of bases) {
            try {
                const resp = await fetch(`${b}/api/service-requests`)
                if (!resp.ok) { lastErr = new Error('HTTP '+resp.status); continue }
                try { data = await resp.json() } catch { data = { items: [] } }
                if (data) { railwayBase.value = b; break }
            } catch (e) { lastErr = e }
        }
        if (!data) throw lastErr || new Error('Brak odpowiedzi')
        let items = Array.isArray(data.items) ? data.items : []

        const persistedLinks = Object.create(null)
        if (window.electronAPI?.database?.query) {
          try {
            const rows = await window.electronAPI.database.query(`
              SELECT request_id, linked_client_id, linked_client_name,
                     linked_device_id, linked_device_name, linked_device_model
              FROM service_request_links
            `)
            if (Array.isArray(rows)) {
              for (const row of rows) {
                if (!row || row.request_id == null) continue
                persistedLinks[String(row.request_id)] = row
              }
            }
          } catch (error) {
            console.warn('[ClientRequests] Nie udało się pobrać lokalnych powiązań zgłoszeń:', error)
          }
        }
        // Normalizacja pól do oczekiwanego formatu UI
        items = items.map(r => {
          const normalized = {
            ...r,
            contact_name: r.contact_name || r.name || r.client_name || null,
            is_urgent: (r.is_urgent === true || String(r.is_urgent||'').toLowerCase() === 'true'),
            device_model: r.device_model || r.brand_model || r.deviceModel || r.brandModel || null,
            device_brand: r.device_brand || r.brand || null,
            client_type: r.client_type || r.clientType || null,
            first_name: r.first_name || r.firstName || null,
            last_name: r.last_name || r.lastName || null,
            company_name: r.company_name || r.companyName || null,
            address_postal_code: r.address_postal_code || r.postal_code || null,
            address_city: r.address_city || r.city || null
          }
          if (!normalized.client_type && (normalized.nip || normalized.client_nip)) {
            normalized.client_type = 'business'
          }

          const fallbackName = splitContactName(normalized.contact_name)
          if (!normalized.first_name && fallbackName.firstName) {
            normalized.first_name = fallbackName.firstName
          }
          if (!normalized.last_name && fallbackName.lastName) {
            normalized.last_name = fallbackName.lastName
          }

          const evaluation = evaluateRequestCompleteness(normalized)
          const displayName = (() => {
            if ((normalized.client_type || '').toLowerCase() === 'business') {
              return normalized.company_name || normalized.contact_name || normalized.name || 'Klient firmowy'
            }
            const combined = [normalized.first_name, normalized.last_name].filter(Boolean).join(' ').trim()
            return combined || normalized.contact_name || normalized.name || 'Klient prywatny'
          })()
          if (normalized.service_category_id != null) {
            const numericCategory = Number(normalized.service_category_id)
            normalized.service_category_id = Number.isInteger(numericCategory) && numericCategory > 0 ? numericCategory : null
          }
          const persistedLink = normalized.id != null ? persistedLinks[String(normalized.id)] : null
          if (persistedLink) {
            const persistedClientId = persistedLink.linked_client_id != null ? Number(persistedLink.linked_client_id) : null
            const persistedDeviceId = persistedLink.linked_device_id != null ? Number(persistedLink.linked_device_id) : null
            if (persistedClientId != null) {
              normalized.linked_client_id = persistedClientId
              normalized.linked_client_name = normalized.linked_client_name || persistedLink.linked_client_name || ''
            }
            if (persistedDeviceId != null) {
              normalized.linked_device_id = persistedDeviceId
              normalized.linked_device_name = normalized.linked_device_name || persistedLink.linked_device_name || ''
              normalized.linked_device_model = normalized.linked_device_model || persistedLink.linked_device_model || ''
            }
            updateCachedLinks(normalized.id, {
              linkedClientId: normalized.linked_client_id ?? null,
              linkedClientName: normalized.linked_client_name || null,
              linkedDeviceId: normalized.linked_device_id ?? null,
              linkedDeviceName: normalized.linked_device_name || null,
              linkedDeviceModel: normalized.linked_device_model || null
            }, { persist: false })
          }
          hydrateRequestWithCache(normalized)
          return {
            ...normalized,
            client_name: displayName,
            autoReady: evaluation.ready,
            autoMissing: evaluation.missing,
            autoClientReady: evaluation.clientReady,
            autoClientMissing: evaluation.clientMissing,
            autoDeviceReady: evaluation.deviceReady,
            autoDeviceMissing: evaluation.deviceMissing,
            autoWarnings: evaluation.warnings,
          autoSummary: evaluation.summary,
          linked_client_id: normalized.linked_client_id ?? null,
          linked_client_name: normalized.linked_client_name ?? null,
          linked_device_id: normalized.linked_device_id ?? null,
          linked_device_name: normalized.linked_device_name ?? null
          }
        })
        clientRequests.value = items.filter(r => String((r.status || 'pending')).toLowerCase() === 'pending')
        console.log('[ClientRequests] pobrano:', clientRequests.value.length, 'z', railwayBase.value)
    } catch (e) { console.warn('fetchClientRequests fail', e) }
}

async function ensureClientForRequest(requestRow) {
  if (!window.electronAPI?.database) {
    throw new Error('Automatyzacja dostępna jest tylko w aplikacji desktopowej.')
  }
  const phone = normalizePhone(requestRow.phone)
  if (!phone) throw new Error('Brak telefonu kontaktowego.')

  const database = window.electronAPI.database
  let existing = null
  try {
    existing = await database.get(
      `SELECT id, type, first_name, last_name, company_name, email, address_street, address_city, address_postal_code 
       FROM clients 
       WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')) = LOWER(?) 
       LIMIT 1`,
      [phone]
    )
  } catch (error) {
    console.warn('[ensureClientForRequest] lookup failed', error)
  }

  const addressInfo = parseRequestAddress(requestRow)
  const email = (requestRow.email || '').trim() || null
  const nip = (requestRow.nip || requestRow.client_nip || '').trim() || null
  const clientType = (() => {
    const declared = String(requestRow.client_type || '').toLowerCase()
    if (declared === 'business') return 'business'
    if (nip) return 'business'
    return 'individual'
  })()
  let firstName = (requestRow.first_name || '').trim()
  let lastName = (requestRow.last_name || '').trim()
  let companyName = (requestRow.company_name || '').trim()
  const fallbackContact = (requestRow.contact_name || requestRow.client_name || '').trim()
  if (clientType === 'business' && !companyName) {
    companyName = fallbackContact || 'Klient biznesowy'
  }
  if (!firstName && !lastName && fallbackContact) {
    const split = splitContactName(fallbackContact)
    firstName = firstName || split.firstName
    lastName = lastName || split.lastName
  }
  const notes = `Automatycznie utworzony ze zgłoszenia ${requestRow.reference_number || requestRow.order_number || ''}`.trim()

  if (existing && existing.id) {
    const updates = []
    const params = []
    if (!existing.email && email) {
      updates.push('email = ?')
      params.push(email)
    }
    if (!existing.address_street && addressInfo.street) {
      updates.push('address_street = ?')
      params.push(addressInfo.street)
    }
    if (!existing.address_city && addressInfo.city) {
      updates.push('address_city = ?')
      params.push(addressInfo.city)
    }
    if (!existing.address_postal_code && addressInfo.postalCode) {
      updates.push('address_postal_code = ?')
      params.push(addressInfo.postalCode)
    }
    if (updates.length) {
      updates.push('updated_at = CURRENT_TIMESTAMP')
      params.push(existing.id)
      try {
        await database.run(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, params)
      } catch (error) {
        console.warn('[ensureClientForRequest] update skipped', error)
      }
    }
    return { id: existing.id, existed: true }
  }

  const insertParams = [
    clientType,
    clientType === 'business' ? null : (firstName || fallbackContact || 'Klient'),
    clientType === 'business' ? null : (lastName || ''),
    clientType === 'business' ? (companyName || fallbackContact || 'Klient biznesowy') : null,
    nip || null,
    null,
    email,
    phone,
    addressInfo.street || null,
    addressInfo.city || null,
    addressInfo.postalCode || null,
    addressInfo.country || 'Polska',
    notes || null
  ]

  const insertSql = `
    INSERT INTO clients (
      type, first_name, last_name, company_name, nip, regon,
      email, phone, address_street, address_city, address_postal_code, address_country,
      notes, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
  const result = await database.run(insertSql, insertParams)
  if (!result || !result.lastID) {
    throw new Error('Nie udało się utworzyć klienta.')
  }
  return { id: result.lastID, existed: false }
}

async function ensureDeviceForRequest(clientId, requestRow) {
  if (!window.electronAPI?.database) {
    throw new Error('Automatyzacja dostępna jest tylko w aplikacji desktopowej.')
  }
  if (!clientId) throw new Error('Brak identyfikatora klienta.')

  const deviceType = (requestRow.device_type || '').trim()
  const deviceBrand = (requestRow.device_brand || '').trim()
  const deviceModel = (requestRow.device_model || '').trim()
  if (!deviceType) throw new Error('Brak typu urządzenia.')
  if (!deviceBrand) throw new Error('Brak marki urządzenia.')

  const deviceName = deviceType
  const database = window.electronAPI.database
  let existing = null
  try {
    existing = await database.get(
      `SELECT id FROM devices 
       WHERE client_id = ? AND LOWER(name) = LOWER(?) AND (LOWER(COALESCE(model,'')) = LOWER(?) OR ? = '') 
       LIMIT 1`,
      [clientId, deviceName, deviceModel, deviceModel]
    )
  } catch (error) {
    console.warn('[ensureDeviceForRequest] lookup failed', error)
  }
  if (existing && existing.id) {
    return { id: existing.id, existed: true }
  }

  const notes = `Automatycznie dodane ze zgłoszenia ${requestRow.reference_number || requestRow.order_number || ''}`.trim()
  const insertSql = `
    INSERT INTO devices (
      name, client_id, manufacturer, model, serial_number, production_year, power_rating, fuel_type,
      installation_date, last_service_date, next_service_date, warranty_end_date,
      technical_data, notes, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `
  const insertParams = [
    deviceName,
    clientId,
    deviceBrand || null,
    deviceModel || null,
    requestRow.device_serial || null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    requestRow.description || null,
    notes || null
  ]

  const result = await database.run(insertSql, insertParams)
  if (!result || !result.lastID) {
    throw new Error('Nie udało się utworzyć urządzenia.')
  }
  return { id: result.lastID, existed: false }
}

const toggleDetails = (order) => {
  // jeśli mamy nazwę technika, wymuś ustawienie selected value
  if (order.assigned_user_id && technicians.value?.length) {
    // no-op: select używa :value z assigned_user_id
  }

	expandedRowId.value = expandedRowId.value === order.id ? null : order.id

  // Jeśli właśnie otwieramy szczegóły – pobierz świeże DANE LOKALNE (desktop),
  // aby zduplikować to, co w kafelku, bez importu z Railway
  if (expandedRowId.value === order.id) {
    try {
      fetch(`http://localhost:5174/api/desktop/orders/by-id/${order.id}`)
        .then(r => r.json())
        .then(j => {
          if (j && j.success && j.order) {
            const o = j.order || {}
            // Uaktualnij tylko pola szczegółów wykonania – bez dotykania reszty
            order.completion_notes = o.completion_notes || order.completion_notes
            order.parts_used = o.parts_used || order.parts_used
            order.actual_hours = (o.actual_hours != null ? o.actual_hours : order.actual_hours)
            order.completed_at = o.completed_at || order.completed_at
            order.completed_categories = o.completed_categories || order.completed_categories
            order.notes = o.notes || order.notes
            order.created_at = o.created_at || order.created_at
          }
          // Fallback: jeśli nadal brakuje kluczowych pól, spróbuj po numerze zamówienia (SRV-...)
          const noDetails = !order.completion_notes && !order.completed_categories && !order.notes
          if (noDetails && order.order_number) {
            fetch(`http://localhost:5174/api/railway/desktop/orders/by-number/${encodeURIComponent(order.order_number)}`)
              .then(r => r.json()).then(j2 => {
                if (j2 && (j2.success || j2.order)) {
                  const o2 = j2.order || {}
                  order.completion_notes = o2.completion_notes || order.completion_notes
                  order.completed_categories = o2.completed_categories || order.completed_categories
                  order.notes = o2.notes || order.notes
                  order.actual_hours = (o2.actual_hours != null ? o2.actual_hours : order.actual_hours)
                  order.completed_at = o2.completed_at || order.completed_at
                  order.created_at = o2.created_at || order.created_at
                }
              }).catch(()=>{})
          }
        })
        .catch(()=>{})

      // Podsumowanie sesji pracy (work_sessions) — tylko do wyświetlenia
      fetch(`${config.RAILWAY_URL.replace(/\/$/, '')}/api/time/summary/${order.id}`)
        .then(r => r.json()).then(j => {
          if (j && j.success) {
            order._ws = {
              totalSeconds: Number(j.total_seconds || 0),
              sessionsCount: Number(j.sessions_count || 0)
            }
          }
        }).catch(()=>{})
    } catch (_) { /* soft-fail */ }
  }
}

const isRequestRow = (order) => {
	return typeof order?.id === 'string' && order.id.startsWith('REQ-')
}

// Gwarancja widoczności zamówienia w "Aktywne" po przypisaniu
function ensureOrderVisible(orderNumber, technicianId) {
  if (!orderNumber) return
  try {
    // Wymuś widok Aktywne i wyczyść filtry
    activeTab.value = 'active'
    filterStatus.value = ''
    filterType.value = ''
    filterPriority.value = ''
    filterClient.value = ''
    searchQuery.value = ''
    currentPage.value = 1

    // Spróbuj znaleźć po numerze; jeśli brak – dołóż lekki wiersz
    let idx = orders.value.findIndex(o => String(o.order_number) === String(orderNumber))
    if (idx === -1) {
      orders.value.unshift({
        id: undefined,
        order_number: orderNumber,
        status: 'assigned',
        assigned_user_id: technicianId || null,
        priority: 'medium',
        type: 'maintenance',
        title: 'Zlecenie serwisowe',
        description: ''
      })
    } else {
      orders.value[idx].status = 'assigned'
      if (technicianId) orders.value[idx].assigned_user_id = technicianId
    }
  } catch (_) { /* soft-fail */ }
}

// Helpers: humanize device type
const humanizeDeviceType = (type) => {
	const map = {
		kociol_gazowy: 'Kocioł gazowy',
		palnik_olejowy: 'Palnik olejowy',
		pompa_ciepla: 'Pompa ciepła',
		inne: 'Inne'
	}
	return map[type] || type || 'Brak danych'
}

// Konwersja zgłoszenia klienta do zlecenia i przypisanie technikowi
async function convertRequestToOrder(requestRow, options = {}) {
  try {
    const { clientId = null, deviceId = null } = options || {}
    const generatedOrderNumber = await generateServiceOrderNumber()
    const sourceReference = requestRow.order_number || requestRow.reference_number || ''
    // Stwórz realny rekord zlecenia w lokalnej bazie (SQLite), aby mieć numeryczne ID
    const baseOrder = {
      order_number: generatedOrderNumber,
      client_id: clientId,
      device_id: deviceId,
      title: requestRow.title || requestRow.description || `Zgłoszenie klienta`,
      description: requestRow.description || '',
      status: 'new',
      priority: (requestRow.is_urgent === true || String(requestRow.is_urgent||'').toLowerCase() === 'true') ? 'urgent' : 'medium',
      scheduled_date: requestRow.preferred_date || requestRow.scheduled_date || null,
      device_type: requestRow.device_type || requestRow.type || null,
      device_model: requestRow.device_model || null,
      device_year: requestRow.device_year || null,
      device_serviced: requestRow.device_serviced || null
    }
    let newId = Date.now()
    if (window.electronAPI?.database) {
      try {
      const res = await window.electronAPI.database.run(
        `INSERT INTO service_orders (
           order_number, client_id, device_id, title, description, status, priority, scheduled_date,
           client_name, client_phone, client_email, address,
           device_type, device_model, device_year, device_serviced,
           desktop_sync_status, created_at, updated_at
         ) VALUES (?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            baseOrder.order_number,
            baseOrder.client_id,
            baseOrder.device_id,
            baseOrder.title,
            baseOrder.description,
            baseOrder.status,
            baseOrder.priority,
            baseOrder.scheduled_date,
            (requestRow.contact_name || requestRow.client_name) || null,
            requestRow.phone || null,
            requestRow.email || null,
            [requestRow.address, requestRow.city].filter(Boolean).join(', ') || null,
            baseOrder.device_type,
            baseOrder.device_model,
            baseOrder.device_year,
            baseOrder.device_serviced
          ]
        )
        newId = res?.lastID || newId
        if (sourceReference) {
          const noteText = `Źródło zgłoszenia: ${sourceReference}`
          try {
            await window.electronAPI.database.run(
              `UPDATE service_orders
                 SET notes = CASE
                   WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
                   WHEN notes LIKE '%' || ? || '%' THEN notes
                   ELSE TRIM(notes || CHAR(10) || ?)
                 END
               WHERE id = ?`,
              [noteText, noteText, noteText, newId]
            )
          } catch (err) {
            console.warn('[convertRequestToOrder] note update failed', err)
          }
        }
      } catch (e) {
        const msg = String(e?.message || e)
        // Jeśli istnieje już zlecenie z tym numerem – pobierz jego ID i użyj
        if (msg.includes('UNIQUE constraint failed: service_orders.order_number')) {
          let row = null
          try { row = await window.electronAPI.database.get('SELECT id FROM service_orders WHERE order_number = ?', [baseOrder.order_number]) } catch (_) {}
          if (!row) {
            try { const arr = await window.electronAPI.database.query('SELECT id FROM service_orders WHERE order_number = ?', [baseOrder.order_number]); row = Array.isArray(arr) ? arr[0] : null } catch (_) {}
          }
          if (row && row.id) {
            newId = row.id
          } else {
            throw e
          }
        } else {
          throw e
        }
      }
    }
    // Wyświetl wybór technika dla właśnie utworzonego zlecenia
    assigningOrder.value = { id: newId, ...baseOrder, source_reference: sourceReference }
    pendingConvertedRequest.value = requestRow
    // Dodaj do lokalnej listy (widoczne w Aktywne po przypisaniu)
    if (!orders.value.some(o => o.id === newId || String(o.order_number) === String(baseOrder.order_number))) {
      orders.value.unshift({ id: newId, ...baseOrder })
    }
    // Nie przełączaj zakładki od razu – czekamy do faktycznego przypisania
    showAssignModal.value = true
  } catch (e) {
    console.error('convertRequestToOrder error', e)
    alert('Nie udało się rozpocząć konwersji zgłoszenia')
  }
}

function formatSeconds(sec) {
  try {
    const s = Number(sec || 0)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const rem = s % 60
    const parts = []
    if (h > 0) parts.push(`${h} h`)
    if (m > 0) parts.push(`${m} min`)
    if (h === 0 && m === 0) parts.push(`${rem} s`)
    return parts.join(' ')
  } catch (_) {
    return ''
  }
}

// Tworzy zlecenie w SQLite na podstawie zgłoszenia (REQ-*) i zwraca nowe id
async function materializeRequestAsOrder(requestRow) {
  if (!window.electronAPI?.database) return null
  const generatedOrderNumber = await generateServiceOrderNumber()
  const baseOrder = {
    order_number: generatedOrderNumber,
    client_id: null,
    device_id: null,
    title: requestRow.title || requestRow.description || `Zgłoszenie klienta`,
    description: requestRow.description || '',
    status: 'new',
    priority: requestRow.is_urgent ? 'urgent' : 'medium',
    scheduled_date: requestRow.preferred_date || requestRow.scheduled_date || null
  }
  try {
    const res = await window.electronAPI.database.run(
      `INSERT INTO service_orders (
         order_number, client_id, device_id, title, description, status, priority, scheduled_date,
         client_name, client_phone, client_email, address,
         desktop_sync_status, created_at, updated_at
       ) VALUES (?,?,?,?,?,?,?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        baseOrder.order_number,
        baseOrder.client_id,
        baseOrder.device_id,
        baseOrder.title,
        baseOrder.description,
        baseOrder.status,
        baseOrder.priority,
        baseOrder.scheduled_date,
        requestRow.contact_name || requestRow.client_name || null,
        requestRow.phone || null,
        requestRow.email || null,
        [requestRow.address, requestRow.city].filter(Boolean).join(', ') || null
      ]
    )
    const insertedId = res?.lastID || null
    if (insertedId && (requestRow.order_number || requestRow.reference_number)) {
      const noteText = `Źródło zgłoszenia: ${requestRow.order_number || requestRow.reference_number}`
      try {
        await window.electronAPI.database.run(
          `UPDATE service_orders
             SET notes = CASE
               WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
               WHEN notes LIKE '%' || ? || '%' THEN notes
               ELSE TRIM(notes || CHAR(10) || ?)
             END
           WHERE id = ?`,
          [noteText, noteText, noteText, insertedId]
        )
      } catch (err) {
        console.warn('[materializeRequestAsOrder] note update failed', err)
      }
    }
    return insertedId
  } catch (e) {
    const msg = String(e?.message || e)
    if (msg.includes('UNIQUE constraint failed: service_orders.order_number')) {
      let row = null
      try { row = await window.electronAPI.database.get('SELECT id FROM service_orders WHERE order_number = ?', [baseOrder.order_number]) } catch (_) {}
      if (!row) {
        try { const arr = await window.electronAPI.database.query('SELECT id FROM service_orders WHERE order_number = ?', [baseOrder.order_number]); row = Array.isArray(arr) ? arr[0] : null } catch (_) {}
      }
      return row?.id || null
    }
    throw e
  }
}

// Ensure local SQLite has display columns for imported Railway orders
async function ensureLocalSchema () {
	if (!window.electronAPI) return
	try {
		const cols = await window.electronAPI.database.query(`PRAGMA table_info('service_orders')`)
		const names = new Set((cols || []).map(c => (c.name || c.Name || c[1])))
		const toAdd = []
		if (!names.has('client_name')) toAdd.push("ALTER TABLE service_orders ADD COLUMN client_name TEXT")
		if (!names.has('client_phone')) toAdd.push("ALTER TABLE service_orders ADD COLUMN client_phone TEXT")
		if (!names.has('client_email')) toAdd.push("ALTER TABLE service_orders ADD COLUMN client_email TEXT")
		if (!names.has('address')) toAdd.push("ALTER TABLE service_orders ADD COLUMN address TEXT")
		// Dodatkowe kolumny urządzenia (dla zgłoszeń bez powiązanego urządzenia)
		if (!names.has('device_type')) toAdd.push("ALTER TABLE service_orders ADD COLUMN device_type TEXT")
		if (!names.has('device_model')) toAdd.push("ALTER TABLE service_orders ADD COLUMN device_model TEXT")
		if (!names.has('device_year')) toAdd.push("ALTER TABLE service_orders ADD COLUMN device_year TEXT")
		if (!names.has('device_serviced')) toAdd.push("ALTER TABLE service_orders ADD COLUMN device_serviced TEXT")
		if (!names.has('completion_notes')) toAdd.push("ALTER TABLE service_orders ADD COLUMN completion_notes TEXT")
		if (!names.has('parts_used')) toAdd.push("ALTER TABLE service_orders ADD COLUMN parts_used TEXT")
		if (!names.has('work_photos')) toAdd.push("ALTER TABLE service_orders ADD COLUMN work_photos TEXT")
		if (!names.has('has_invoice')) toAdd.push("ALTER TABLE service_orders ADD COLUMN has_invoice INTEGER DEFAULT 0")
		for (const sql of toAdd) {
			try { await window.electronAPI.database.run(sql) } catch (_) {}
		}
	} catch (e) {
		console.warn('Schema check failed:', e)
	}
}

async function deleteClientRequest(order, silent = false) {
	try {
		const id = String(order.id || '').replace('REQ-', '')
		if (!id) return
		if (!silent) {
			if (!confirm('Usunąć zgłoszenie klienta?')) return
		}
    const bases = await getPreferredBases()
    let resp = null
    for (const b of bases) {
        try { resp = await fetch(`${b}/api/service-requests/${id}`, { method: 'DELETE' }); if (resp.ok) { railwayBase.value = b; break } } catch (_) {}
    }
		if (!resp.ok) {
			// Spróbuj po numerze referencyjnym
			const ref = order.order_number || ''
			if (ref) {
            for (const b of bases) {
                try { resp = await fetch(`${b}/api/service-requests/by-ref/${encodeURIComponent(ref)}`, { method: 'DELETE' }); if (resp.ok) { railwayBase.value = b; break } } catch (_) {}
            }
			}
			if (!resp.ok) throw new Error('API error ' + resp.status)
		}
		await fetchClientRequests()
	} catch (e) {
		console.error('Delete client request error:', e)
		if (!silent) alert('Nie udało się usunąć zgłoszenia klienta')
	}
}

// Public helper for UI button (if needed)
async function forceImportCompleted() {
	await refreshStatusesFromRailway();
	await refreshFromRailway();
}

// Załaduj pending changes na starcie
onMounted(async () => {
  try { await loadPendingChanges() } catch (_) {}
  // SSE: odświeżanie badge na liście natychmiast po zmianach
  try {
    const base = await getBase()
    const es = new EventSource(`${base}/api/events`)
    es.onmessage = async (event) => {
      try {
        const payload = event.data ? JSON.parse(event.data) : null
        if (payload?.type === 'order.updated') {
          const orderId = payload?.data?.orderId
          const knownOrder = orderId ? orders.value.some(o => Number(o.id) === Number(orderId)) : true
          if (knownOrder) {
            await refreshStatusesFromRailway()
          }
        }
      } catch (_) { /* ignore */ }
      try { await loadPendingChanges() } catch (_) {}
    }
    es.onerror = () => { try { es.close() } catch (_) {} }
  } catch (_) {}
})

// ... existing code ...
</script> 