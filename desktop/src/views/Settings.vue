<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold text-secondary-900 mb-6">Ustawienia</h1>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Menu boczne -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow p-4">
          <nav class="space-y-2">
            <button
              v-for="section in sections"
              :key="section.id"
              @click="activeSection = section.id"
              class="w-full flex items-center px-3 py-2 text-left rounded-md transition-colors"
              :class="activeSection === section.id 
                ? 'bg-primary-100 text-primary-700 font-medium' 
                : 'text-secondary-700 hover:bg-secondary-100'"
            >
              <i :class="section.icon" class="mr-3 text-sm"></i>
              {{ section.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Zawartość główna -->
      <div class="lg:col-span-3">
        <!-- Profil użytkownika -->
        <div v-if="activeSection === 'profile'" class="space-y-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-user mr-2 text-primary-600"></i>
              Profil użytkownika
            </h2>
            
            <form @submit.prevent="saveProfile" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-2">
                    Imię
                  </label>
                  <input
                    v-model="profile.firstName"
                    type="text"
                    class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary-700 mb-2">
                    Nazwisko
                  </label>
                  <input
                    v-model="profile.lastName"
                    type="text"
                    class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Email
                </label>
                <input
                  v-model="profile.email"
                  type="email"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Telefon
                </label>
                <input
                  v-model="profile.phone"
                  type="tel"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div class="flex justify-end">
                <button
                  type="submit"
                  class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                >
                  Zapisz profil
                </button>
              </div>
            </form>
          </div>

          <!-- Zmiana hasła -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-lock mr-2 text-orange-600"></i>
              Zmiana hasła
            </h3>
            
            <form @submit.prevent="changePassword" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Obecne hasło
                </label>
                <input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Nowe hasło
                </label>
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Potwierdź nowe hasło
                </label>
                <input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div class="flex justify-end">
                <button
                  type="submit"
                  class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                >
                  Zmień hasło
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Ustawienia firmy -->
        <div v-if="activeSection === 'company'" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-secondary-900 mb-4">
            <i class="fas fa-building mr-2 text-blue-600"></i>
            Dane firmy
          </h2>
          
          <form @submit.prevent="saveCompany" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Nazwa firmy
              </label>
              <input
                v-model="company.name"
                type="text"
                class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  NIP
                </label>
                <input
                  v-model="company.nip"
                  type="text"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  REGON
                </label>
                <input
                  v-model="company.regon"
                  type="text"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Adres
              </label>
              <input
                v-model="company.address"
                type="text"
                class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Email
                </label>
                <input
                  v-model="company.email"
                  type="email"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Telefon
                </label>
                <input
                  v-model="company.phone"
                  type="tel"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Strona internetowa
              </label>
              <input
                v-model="company.website"
                type="url"
                class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Szerokość geograficzna (lat)
                </label>
                <input
                  v-model="company.location_lat"
                  type="text"
                  inputmode="decimal"
                  placeholder="52.237049"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-secondary-700 mb-2">
                  Długość geograficzna (lng)
                </label>
                <input
                  v-model="company.location_lng"
                  type="text"
                  inputmode="decimal"
                  placeholder="21.017532"
                  class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div class="flex flex-col md:flex-row md:items-center gap-2 text-sm">
              <button
                type="button"
                @click="geocodeCompanyAddress"
                :disabled="companyGeocodeLoading"
                class="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <i class="fas fa-map-marked-alt"></i>
                {{ companyGeocodeLoading ? 'Pobieranie...' : 'Pobierz współrzędne z adresu' }}
              </button>
              <span
                v-if="companyGeocodeError"
                class="text-red-600"
              >
                {{ companyGeocodeError }}
              </span>
              <span
                v-else-if="companyGeocodeLoading"
                class="text-secondary-500 text-xs md:text-sm"
              >
                Pobieranie współrzędnych...
              </span>
              <span
                v-else
                class="text-secondary-500 text-xs md:text-sm"
              >
                Współrzędne są wykorzystywane do obliczania odległości klientów na mapie. Możesz je wprowadzić ręcznie lub pobrać automatycznie.
              </span>
            </div>

            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">
                Logo firmy (PNG/JPG)
              </label>
              <div class="flex items-center gap-4">
                <div v-if="companyLogoSrc" class="border border-secondary-200 rounded-lg p-2 bg-white">
                  <img :src="companyLogoSrc" alt="Logo firmy" class="max-h-16 max-w-[160px] object-contain" />
                </div>
                <div v-else class="text-sm text-secondary-500 italic">
                  Dodaj plik logo w formacie PNG lub JPG.
                </div>
              </div>
              <div class="flex items-center gap-3 mt-2">
                <label class="inline-flex items-center px-3 py-2 bg-secondary-100 hover:bg-secondary-200 text-sm font-medium text-secondary-700 rounded-lg cursor-pointer">
                  <i class="fas fa-upload mr-2"></i>
                  Wybierz plik
                  <input type="file" accept="image/png,image/jpeg" class="hidden" @change="onLogoSelected">
                </label>
                <button
                  v-if="companyLogoSrc"
                  type="button"
                  class="text-sm text-red-600 hover:text-red-700"
                  @click="clearLogo"
                >
                  <i class="fas fa-times mr-1"></i>
                  Usuń logo
                </button>
              </div>
              <p class="text-xs text-secondary-400 mt-1">
                Maksymalny rozmiar pliku: 512 KB.
              </p>
            </div>

            <div class="flex justify-end">
              <button
                type="submit"
                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Zapisz dane firmy
              </button>
            </div>
          </form>
        </div>

        <!-- Zarządzanie użytkownikami -->
        <div v-if="activeSection === 'users'" class="space-y-6">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-secondary-900">
                <i class="fas fa-users mr-2 text-blue-600"></i>
                Zarządzanie użytkownikami
              </h2>
              <button
                @click="showUserModal = true; editingUser = null"
                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                <i class="fas fa-plus mr-2"></i>
                Dodaj użytkownika
              </button>
            </div>

            <!-- Lista użytkowników -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-secondary-200">
                    <th class="text-left py-3 px-4 font-medium text-secondary-900">Użytkownik</th>
                    <th class="text-left py-3 px-4 font-medium text-secondary-900">Rola</th>
                    <th class="text-left py-3 px-4 font-medium text-secondary-900">Telefon</th>
                    <th class="text-left py-3 px-4 font-medium text-secondary-900">Status</th>
                    <th class="text-left py-3 px-4 font-medium text-secondary-900">Autoryzacja</th>
                    <th class="text-left py-3 px-4 font-medium text-secondary-900">Ostatnia aktywność</th>
                    <th class="text-right py-3 px-4 font-medium text-secondary-900">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="user in users"
                    :key="user.id"
                    class="border-b border-secondary-100 hover:bg-secondary-50"
                  >
                    <td class="py-3 px-4">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <i class="fas fa-user text-primary-600 text-sm"></i>
                        </div>
                        <div>
                          <p class="font-medium text-secondary-900">{{ user.full_name }}</p>
                          <p class="text-xs text-secondary-600">{{ user.username }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        :class="getRoleClass(user.role)"
                      >
                        {{ getRoleName(user.role) }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-secondary-600">{{ user.phone || '-' }}</td>
                    <td class="py-3 px-4">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        :class="user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      >
                        {{ user.is_active ? 'Aktywny' : 'Nieaktywny' }}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                        :class="(user.mobile_authorized ?? 1) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      >
                        {{ (user.mobile_authorized ?? 1) ? 'Autoryzowana' : 'Brak autoryzacji' }}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-secondary-600">{{ formatDate(user.updated_at) }}</td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <button
                          @click="editUser(user)"
                          class="text-blue-600 hover:text-blue-700"
                          title="Edytuj"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button
                          @click="toggleUserStatus(user)"
                          :class="user.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'"
                          :title="user.is_active ? 'Dezaktywuj' : 'Aktywuj'"
                        >
                          <i :class="user.is_active ? 'fas fa-user-slash' : 'fas fa-user-check'"></i>
                        </button>
                        <button
                          v-if="user.username !== 'admin'"
                          @click="deleteUser(user)"
                          class="text-red-600 hover:text-red-700"
                          title="Usuń"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Stan pusty -->
            <div v-if="users.length === 0" class="text-center py-8">
              <i class="fas fa-users text-4xl text-secondary-400 mb-4"></i>
              <p class="text-secondary-600">Brak użytkowników w systemie</p>
            </div>
          </div>

          <!-- Statystyki użytkowników -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-users text-blue-600"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-secondary-600">Łącznie</p>
                  <p class="text-lg font-semibold text-secondary-900">{{ users.length }}</p>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-user-check text-green-600"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-secondary-600">Aktywni</p>
                  <p class="text-lg font-semibold text-secondary-900">{{ users.filter(u => u.is_active).length }}</p>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-tools text-purple-600"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-secondary-600">Serwisanci</p>
                  <p class="text-lg font-semibold text-secondary-900">{{ users.filter(u => u.role === 'technician').length }}</p>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg shadow p-4">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i class="fas fa-hard-hat text-orange-600"></i>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-secondary-600">Instalatorzy</p>
                  <p class="text-lg font-semibold text-secondary-900">{{ users.filter(u => u.role === 'installer').length }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Konfiguracja systemu -->
        <div v-if="activeSection === 'system'" class="space-y-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-cogs mr-2 text-purple-600"></i>
              Konfiguracja systemu
            </h2>
            
            <div class="space-y-6">
              <!-- Numeracja dokumentów -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Numeracja dokumentów</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Prefiks zleceń
                    </label>
                    <input
                      v-model="systemConfig.orderPrefix"
                      type="text"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Prefiks faktur
                    </label>
                    <input
                      v-model="systemConfig.invoicePrefix"
                      type="text"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <!-- Powiadomienia -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Powiadomienia</h4>
                <div class="space-y-3">
                  <label class="flex items-center">
                    <input
                      v-model="systemConfig.notifications.email"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Powiadomienia email</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="systemConfig.notifications.desktop"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Powiadomienia desktop</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="systemConfig.notifications.invoiceReminders"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Przypomnienia o płatnościach</span>
                  </label>
                </div>
              </div>

              <!-- Domyślne wartości -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Domyślne wartości</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Stawka VAT (%)
                    </label>
                    <input
                      v-model="systemConfig.defaultVatRate"
                      type="number"
                      min="0"
                      max="100"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Termin płatności (dni)
                    </label>
                    <input
                      v-model="systemConfig.defaultPaymentTerm"
                      type="number"
                      min="1"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end mt-6">
              <button
                @click="saveSystemConfig"
                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Zapisz konfigurację
              </button>
            </div>
          </div>
        </div>

        <!-- Backup i restore -->
        <div v-if="activeSection === 'backup'" class="space-y-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-shield-alt mr-2 text-green-600"></i>
              Kopia zapasowa danych
            </h2>
            
            <div class="space-y-6">
              <!-- Automatyczne kopie -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Automatyczne kopie zapasowe</h4>
                <div class="space-y-3">
                  <label class="flex items-center">
                    <input
                      v-model="backupConfig.autoBackup"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Włącz automatyczne kopie zapasowe</span>
                  </label>
                  
                  <div v-if="backupConfig.autoBackup" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-secondary-700 mb-2">
                        Częstotliwość
                      </label>
                      <select
                        v-model="backupConfig.frequency"
                        class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="daily">Codziennie</option>
                        <option value="weekly">Co tydzień</option>
                        <option value="monthly">Co miesiąc</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-secondary-700 mb-2">
                        Godzina
                      </label>
                      <input
                        v-model="backupConfig.time"
                        type="time"
                        class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Ręczne kopie -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Ręczna kopia zapasowa</h4>
                <div class="flex space-x-4">
                  <button
                    @click="createBackup"
                    :disabled="backupLoading"
                    class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <i v-if="backupLoading" class="fas fa-spinner fa-spin mr-2"></i>
                    <i v-else class="fas fa-download mr-2"></i>
                    Utwórz kopię zapasową
                  </button>
                  
                  <button
                    @click="restoreBackup"
                    class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                  >
                    <i class="fas fa-upload mr-2"></i>
                    Przywróć z kopii
                  </button>
                </div>
              </div>

              <!-- Lista kopii zapasowych -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Istniejące kopie zapasowe</h4>
                <div class="space-y-2">
                  <div
                    v-for="backup in backupList"
                    :key="backup.id"
                    class="flex items-center justify-between p-3 border border-secondary-200 rounded-lg"
                  >
                    <div>
                      <p class="font-medium text-secondary-900">{{ backup.name }}</p>
                      <p class="text-sm text-secondary-600">{{ backup.date }} • {{ backup.size }}</p>
                    </div>
                    <div class="flex space-x-2">
                      <button
                        @click="downloadBackup(backup)"
                        class="text-blue-600 hover:text-blue-700"
                        title="Pobierz"
                      >
                        <i class="fas fa-download"></i>
                      </button>
                      <button
                        @click="restoreBackupFromList(backup)"
                        class="text-green-600 hover:text-green-700"
                        title="Przywróć"
                      >
                        <i class="fas fa-undo"></i>
                      </button>
                      <button
                        @click="deleteBackup(backup)"
                        class="text-red-600 hover:text-red-700"
                        title="Usuń"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bezpieczeństwo -->
        <div v-if="activeSection === 'security'" class="space-y-6">
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-lock mr-2 text-red-600"></i>
              Ustawienia bezpieczeństwa
            </h2>
            
            <div class="space-y-6">
              <!-- Polityka haseł -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Polityka haseł</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Minimalna długość hasła
                    </label>
                    <input
                      v-model="securityConfig.passwordPolicy.minLength"
                      type="number"
                      min="6"
                      max="20"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Wygaśnięcie hasła (dni)
                    </label>
                    <input
                      v-model="securityConfig.passwordPolicy.expireAfterDays"
                      type="number"
                      min="30"
                      max="365"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div class="mt-3 space-y-2">
                  <label class="flex items-center">
                    <input
                      v-model="securityConfig.passwordPolicy.requireUppercase"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Wymagaj wielkich liter</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="securityConfig.passwordPolicy.requireNumbers"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Wymagaj cyfr</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="securityConfig.passwordPolicy.requireSpecialChars"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Wymagaj znaków specjalnych</span>
                  </label>
                </div>
              </div>

              <!-- Sesje użytkowników -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Zarządzanie sesjami</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Czas wygaśnięcia sesji (minuty)
                    </label>
                    <input
                      v-model="securityConfig.sessionTimeout"
                      type="number"
                      min="15"
                      max="480"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-secondary-700 mb-2">
                      Maksymalne próby logowania
                    </label>
                    <input
                      v-model="securityConfig.maxLoginAttempts"
                      type="number"
                      min="3"
                      max="10"
                      class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <!-- Logi aktywności -->
              <div>
                <h4 class="font-medium text-secondary-900 mb-3">Logowanie aktywności</h4>
                <div class="space-y-3">
                  <label class="flex items-center">
                    <input
                      v-model="securityConfig.logging.userActions"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Loguj działania użytkowników</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="securityConfig.logging.loginAttempts"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Loguj próby logowania</span>
                  </label>
                  <label class="flex items-center">
                    <input
                      v-model="securityConfig.logging.dataChanges"
                      type="checkbox"
                      class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span class="ml-2 text-sm text-secondary-700">Loguj zmiany danych</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="flex justify-between items-center mt-6">
              <button
                @click="viewSecurityLogs"
                class="bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 transition-colors"
              >
                <i class="fas fa-eye mr-2"></i>
                Podgląd logów
              </button>
              <button
                @click="saveSecurityConfig"
                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Zapisz ustawienia
              </button>
            </div>
          </div>

          <!-- Aktywne sesje -->
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-users-cog mr-2 text-green-600"></i>
              Aktywne sesje użytkowników
            </h3>
            
            <div class="space-y-3">
              <div
                v-for="session in activeSessions"
                :key="session.id"
                class="flex items-center justify-between p-3 border border-secondary-200 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-green-600 text-sm"></i>
                  </div>
                  <div>
                    <p class="font-medium text-secondary-900">{{ session.username }}</p>
                    <p class="text-sm text-secondary-600">
                      IP: {{ session.ip_address }} • {{ formatDate(session.last_activity) }}
                    </p>
                  </div>
                </div>
                <button
                  v-if="session.username !== currentUser.username"
                  @click="terminateSession(session)"
                  class="text-red-600 hover:text-red-700 px-3 py-1 rounded border border-red-200 hover:bg-red-50"
                >
                  <i class="fas fa-sign-out-alt mr-1"></i>
                  Zakończ
                </button>
              </div>
            </div>

            <div v-if="activeSessions.length === 0" class="text-center py-8">
              <i class="fas fa-user-slash text-4xl text-secondary-400 mb-4"></i>
              <p class="text-secondary-600">Brak aktywnych sesji</p>
            </div>
          </div>
        </div>

        <!-- O aplikacji -->
        <div v-if="activeSection === 'about'" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-secondary-900 mb-4">
            <i class="fas fa-info-circle mr-2 text-blue-600"></i>
            O aplikacji
          </h2>
          
          <div class="space-y-6">
            <!-- Informacje o aplikacji -->
            <div class="text-center">
              <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-tools text-primary-600 text-2xl"></i>
              </div>
              <h3 class="text-xl font-bold text-secondary-900">System Serwisowy</h3>
              <p class="text-secondary-600">Wersja {{ appInfo.version }}</p>
            </div>

            <!-- Szczegóły -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-medium text-secondary-900 mb-2">Informacje techniczne</h4>
                <ul class="text-sm text-secondary-600 space-y-1">
                  <li>Wersja: {{ appInfo.version }}</li>
                  <li>Build: {{ appInfo.build }}</li>
                  <li>Electron: {{ appInfo.electronVersion }}</li>
                  <li>Node.js: {{ appInfo.nodeVersion }}</li>
                </ul>
              </div>
              
              <div>
                <h4 class="font-medium text-secondary-900 mb-2">Wsparcie</h4>
                <ul class="text-sm text-secondary-600 space-y-1">
                  <li>Email: support@serwis.pl</li>
                  <li>Telefon: +48 123 456 789</li>
                  <li>Dokumentacja: docs.serwis.pl</li>
                  <li>GitHub: github.com/serwis</li>
                </ul>
              </div>
            </div>

            <!-- Przyciski akcji -->
            <div class="flex flex-wrap gap-3 justify-center">
              <button
                @click="checkForUpdates"
                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                <i class="fas fa-sync mr-2"></i>
                Sprawdź aktualizacje
              </button>
              
              <button
                @click="openLogs"
                class="bg-secondary-600 text-white px-4 py-2 rounded-md hover:bg-secondary-700 transition-colors"
              >
                <i class="fas fa-file-alt mr-2"></i>
                Pokaż logi
              </button>
              
              <button
                @click="exportDiagnostics"
                class="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
              >
                <i class="fas fa-bug mr-2"></i>
                Eksportuj diagnostykę
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal potwierdzenia -->
    <ConfirmModal
      v-if="showConfirmModal"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :confirm-text="confirmModal.confirmText"
      :confirm-class="confirmModal.confirmClass"
      @confirm="confirmModal.onConfirm"
      @cancel="showConfirmModal = false"
    />

    <!-- Modal użytkownika -->
    <div v-if="showUserModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold text-secondary-900 mb-4">
          {{ editingUser ? 'Edytuj użytkownika' : 'Dodaj użytkownika' }}
        </h3>
        
        <form @submit.prevent="saveUser" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Nazwa użytkownika *
            </label>
            <input
              v-model="userForm.username"
              type="text"
              required
              :disabled="!!editingUser"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              :class="editingUser ? 'bg-secondary-100' : ''"
              @focus="console.log('🔍 Input focus - editingUser:', editingUser, 'disabled:', !!editingUser)"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Imię i nazwisko *
            </label>
            <input
              v-model="userForm.full_name"
              type="text"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Email
            </label>
            <input
              v-model="userForm.email"
              type="email"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Telefon (wyświetlany w mobilce)
            </label>
            <input
              v-model="userForm.phone"
              type="tel"
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Rola *
            </label>
            <select
              v-model="userForm.role"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="admin">Administrator</option>
              <option value="manager">Kierownik</option>
              <option value="technician">Serwisant</option>
              <option value="installer">Instalator</option>
            </select>
          </div>

          <div v-if="!editingUser">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Hasło *
            </label>
            <input
              v-model="userForm.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div v-if="!editingUser">
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Potwierdź hasło *
            </label>
            <input
              v-model="userForm.confirmPassword"
              type="password"
              required
              class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <!-- Zmiana hasła dla istniejącego użytkownika -->
          <div v-if="editingUser" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Nowe hasło</label>
              <input v-model="userForm.password" type="password" placeholder="pozostaw puste bez zmiany"
                     class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Potwierdź nowe hasło</label>
              <input v-model="userForm.confirmPassword" type="password" placeholder="powtórz nowe hasło"
                     class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"/>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">PIN do aplikacji mobilnej (4–8 cyfr)</label>
            <input v-model="userForm.mobile_pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8"
                   placeholder="pozostaw puste bez zmiany"
                   class="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"/>
            <p class="text-xs text-secondary-500 mt-1">PIN jest zapisywany jako hash; nie przechowujemy go wprost.</p>
            <div class="mt-2">
              <button type="button" @click="showPin(editingUser || null)" class="text-blue-600 hover:text-blue-700 text-sm">
                <i class="fas fa-eye mr-1"></i> Pokaż PIN
              </button>
            </div>
          </div>

          <div class="flex items-center">
            <input
              v-model="userForm.is_active"
              type="checkbox"
              class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="ml-2 text-sm text-secondary-700">Konto aktywne</span>
          </div>

          <div class="flex items-center">
            <input
              v-model="userForm.mobile_authorized"
              type="checkbox"
              class="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="ml-2 text-sm text-secondary-700">Autoryzuj do aplikacji mobilnej</span>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showUserModal = false"
              class="px-4 py-2 text-secondary-600 border border-secondary-300 rounded-md hover:bg-secondary-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              {{ editingUser ? 'Zapisz' : 'Dodaj' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { getMapConfig, buildGeocodeAddress } from '../services/mapService'

const activeSection = ref('profile')
const backupLoading = ref(false)
const showConfirmModal = ref(false)

const sections = [
  { id: 'profile', name: 'Profil', icon: 'fas fa-user' },
  { id: 'users', name: 'Użytkownicy', icon: 'fas fa-users' },
  { id: 'company', name: 'Firma', icon: 'fas fa-building' },
  { id: 'system', name: 'System', icon: 'fas fa-cogs' },
  { id: 'backup', name: 'Backup', icon: 'fas fa-shield-alt' },
  { id: 'security', name: 'Bezpieczeństwo', icon: 'fas fa-lock' },
  { id: 'about', name: 'O aplikacji', icon: 'fas fa-info-circle' }
]

const profile = ref({
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'admin@serwis.pl',
  phone: '+48 123 456 789'
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const mapConfig = getMapConfig()
const companyGeocodeLoading = ref(false)
const companyGeocodeError = ref('')

const DEFAULT_COMPANY_PROFILE = {
  name: 'SERWIS PALNIKÓW I KOTŁÓW A. JÓZEFIAK SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
  nip: '763-215-68-23',
  regon: '542796410',
  address: 'SIKORSKIEGO 47, 64-700 Czarnków',
  email: 'SPIK@INTERIA.PL',
  phone: '+48 67 255 49 30',
  website: '',
  location_lat: '52.902350',
  location_lng: '16.573610',
  logo_base64: '',
  logo_mime: ''
}

const LOCAL_COMPANY_KEY = 'serwis-company-profile'
const LOCAL_LOCATION_KEY = 'serwis-company-location'

const cleanString = (value, fallback = '') => {
  if (value == null) return fallback
  const str = String(value).trim()
  return str.length ? str : fallback
}

const sanitizeCoordinateString = (value) => {
  if (value == null) return ''
  const str = String(value).replace(',', '.').trim()
  if (!str.length) return ''
  const num = Number(str)
  if (!Number.isFinite(num)) return ''
  return num.toFixed(6)
}

const sanitizeCompanyProfile = (profile = {}) => {
  const merged = {
    ...DEFAULT_COMPANY_PROFILE,
    ...(profile || {})
  }

  const locationLat =
    merged.location_lat ?? merged.locationLat ?? merged.lat ?? merged.latitude
  const locationLng =
    merged.location_lng ?? merged.locationLng ?? merged.lng ?? merged.longitude

  let sanitizedLat = sanitizeCoordinateString(locationLat)
  let sanitizedLng = sanitizeCoordinateString(locationLng)

  const invalidPairs = [
    { lat: '52.237049', lng: '21.017532' }, // dawny domyślny (Warszawa)
    { lat: '51.919438', lng: '19.145136' }, // środek Polski z geokoderów
    { lat: '0.000000', lng: '0.000000' }
  ]

  const isInvalidPair = (latVal, lngVal) =>
    invalidPairs.some(
      pair =>
        Math.abs(Number(latVal) - Number(pair.lat)) < 1e-6 &&
        Math.abs(Number(lngVal) - Number(pair.lng)) < 1e-6
    )

  if (!sanitizedLat || !sanitizedLng || isInvalidPair(sanitizedLat, sanitizedLng)) {
    sanitizedLat = DEFAULT_COMPANY_PROFILE.location_lat
    sanitizedLng = DEFAULT_COMPANY_PROFILE.location_lng
  }

  return {
    name: cleanString(merged.name, DEFAULT_COMPANY_PROFILE.name),
    nip: cleanString(merged.nip, DEFAULT_COMPANY_PROFILE.nip),
    regon: cleanString(merged.regon, DEFAULT_COMPANY_PROFILE.regon),
    address: cleanString(merged.address, DEFAULT_COMPANY_PROFILE.address),
    email: cleanString(merged.email, DEFAULT_COMPANY_PROFILE.email),
    phone: cleanString(merged.phone, DEFAULT_COMPANY_PROFILE.phone),
    website: cleanString(merged.website, DEFAULT_COMPANY_PROFILE.website),
    location_lat: sanitizedLat,
    location_lng: sanitizedLng,
    logo_base64: cleanString(merged.logo_base64, ''),
    logo_mime: cleanString(merged.logo_mime, '')
  }
}

const prepareApiPayload = (profile) => ({
  name: profile.name,
  nip: profile.nip,
  regon: profile.regon,
  address: profile.address,
  email: profile.email,
  phone: profile.phone,
  website: profile.website,
  logo_base64: profile.logo_base64 || null,
  logo_mime: profile.logo_mime || null,
  location_lat: profile.location_lat ? Number(profile.location_lat) : null,
  location_lng: profile.location_lng ? Number(profile.location_lng) : null
})

const loadLocalCompany = () => {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(LOCAL_COMPANY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return sanitizeCompanyProfile(parsed)
  } catch (error) {
    console.warn('[Settings] loadLocalCompany failed:', error)
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_COMPANY_KEY)
    }
  }
  return null
}

const persistLocalCompany = (data) => {
  const sanitized = sanitizeCompanyProfile(data)
  if (typeof localStorage === 'undefined') {
    return sanitized
  }
  try {
    const storedAt = new Date().toISOString()
    localStorage.setItem(
      LOCAL_COMPANY_KEY,
      JSON.stringify({
        ...sanitized,
        storedAt
      })
    )
    if (sanitized.location_lat && sanitized.location_lng) {
      localStorage.setItem(
        LOCAL_LOCATION_KEY,
        JSON.stringify({
          lat: sanitized.location_lat,
          lng: sanitized.location_lng,
          storedAt
        })
      )
    } else {
      localStorage.removeItem(LOCAL_LOCATION_KEY)
    }
  } catch (error) {
    console.warn('[Settings] persistLocalCompany failed:', error)
  }
  return sanitized
}

const loadLocalLocation = () => {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(LOCAL_LOCATION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const lat = sanitizeCoordinateString(parsed.lat)
        const lng = sanitizeCoordinateString(parsed.lng)
        if (lat && lng) {
          return {
            lat: Number(lat),
            lng: Number(lng)
          }
        }
      }
    }
    const companyFallback = loadLocalCompany()
    if (
      companyFallback &&
      companyFallback.location_lat &&
      companyFallback.location_lng
    ) {
      return {
        lat: Number(companyFallback.location_lat),
        lng: Number(companyFallback.location_lng)
      }
    }
  } catch (error) {
    console.warn('[Settings] loadLocalLocation failed:', error)
  }
  return null
}

const createDefaultCompany = () => {
  const localProfile = loadLocalCompany()
  return sanitizeCompanyProfile(localProfile || DEFAULT_COMPANY_PROFILE)
}

const company = ref(createDefaultCompany())

const persistLocalLocation = (lat, lng) => {
  const sanitizedLat = sanitizeCoordinateString(lat)
  const sanitizedLng = sanitizeCoordinateString(lng)
  const updated = sanitizeCompanyProfile({
    ...company.value,
    location_lat: sanitizedLat,
    location_lng: sanitizedLng
  })
  company.value.location_lat = updated.location_lat
  company.value.location_lng = updated.location_lng
  persistLocalCompany(updated)
}

const LOGO_MAX_SIZE = 512 * 1024

const companyLogoSrc = computed(() => {
  if (!company.value.logo_base64) return null
  const mime = company.value.logo_mime || 'image/png'
  return `data:${mime};base64,${company.value.logo_base64}`
})

const onLogoSelected = async (event) => {
  try {
    const file = event?.target?.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('Dozwolone są tylko pliki PNG lub JPG.')
      return
    }
    if (file.size > LOGO_MAX_SIZE) {
      alert('Logo jest zbyt duże. Maksymalny rozmiar to 512 KB.')
      return
    }
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    company.value.logo_base64 = base64
    company.value.logo_mime = file.type
  } catch (error) {
    console.error('Błąd podczas wczytywania logo:', error)
    alert('Nie udało się wczytać pliku logo.')
  } finally {
    if (event?.target) {
      event.target.value = ''
    }
  }
}

const clearLogo = () => {
  company.value.logo_base64 = ''
  company.value.logo_mime = ''
}

const systemConfig = ref({
  orderPrefix: 'SRV',
  invoicePrefix: 'FV',
  defaultVatRate: 23,
  defaultPaymentTerm: 14,
  notifications: {
    email: true,
    desktop: true,
    invoiceReminders: true
  }
})

const backupConfig = ref({
  autoBackup: true,
  frequency: 'daily',
  time: '02:00'
})

const backupList = ref([
  {
    id: 1,
    name: 'backup_2024-07-07_02-00.db',
    date: '2024-07-07 02:00',
    size: '2.3 MB'
  },
  {
    id: 2,
    name: 'backup_2024-07-06_02-00.db',
    date: '2024-07-06 02:00',
    size: '2.1 MB'
  },
  {
    id: 3,
    name: 'backup_2024-07-05_02-00.db',
    date: '2024-07-05 02:00',
    size: '2.0 MB'
  }
])

const appInfo = ref({
  version: '1.0.0',
  build: '20240707',
  electronVersion: '28.0.0',
  nodeVersion: '18.17.0'
})

const confirmModal = ref({
  title: '',
  message: '',
  confirmText: '',
  confirmClass: '',
  onConfirm: null
})

// Zmienne dla zarządzania użytkownikami
const showUserModal = ref(false)
const editingUser = ref(null)
const users = ref([
  {
    id: 1,
    username: 'admin',
    full_name: 'Administrator',
    email: 'admin@serwis.pl',
    role: 'admin',
    is_active: 1,
    created_at: '2024-01-01',
    updated_at: '2024-07-08'
  }
])

const userForm = ref({
  username: '',
  full_name: '',
  email: '',
  phone: '',
  role: 'technician',
  password: '',
  confirmPassword: '',
  is_active: true,
  mobile_authorized: true,
  mobile_pin: ''
})

const currentUser = ref({
  username: 'admin',
  role: 'admin'
})

// Zmienne dla bezpieczeństwa
const securityConfig = ref({
  passwordPolicy: {
    minLength: 8,
    expireAfterDays: 90,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  },
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  logging: {
    userActions: true,
    loginAttempts: true,
    dataChanges: true
  }
})

const activeSessions = ref([
  {
    id: 1,
    username: 'admin',
    ip_address: '192.168.1.100',
    last_activity: '2024-07-08 10:30:00'
  }
])

const saveProfile = async () => {
  try {
    if (window.electronAPI?.settings) {
      await window.electronAPI.settings.saveProfile(profile.value)
    }
    alert('Profil został zapisany pomyślnie!')
  } catch (error) {
    console.error('Błąd podczas zapisywania profilu:', error)
    alert('Wystąpił błąd podczas zapisywania profilu')
  }
}

const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Nowe hasła nie są identyczne!')
    return
  }
  
  if (passwordForm.value.newPassword.length < 6) {
    alert('Nowe hasło musi mieć co najmniej 6 znaków!')
    return
  }

  try {
    if (window.electronAPI?.auth) {
      await window.electronAPI.auth.changePassword(
        passwordForm.value.currentPassword,
        passwordForm.value.newPassword
      )
    }
    
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    alert('Hasło zostało zmienione pomyślnie!')
  } catch (error) {
    console.error('Błąd podczas zmiany hasła:', error)
    alert('Wystąpił błąd podczas zmiany hasła')
  }
}

const saveCompany = async () => {
  try {
    const sanitized = sanitizeCompanyProfile(company.value)
    if (window.electronAPI?.settings) {
      const payload = prepareApiPayload(sanitized)
      const resp = await window.electronAPI.settings.saveCompany(payload)
      if (!resp?.success) {
        throw new Error(resp?.error || 'Nie udało się zapisać danych firmy')
      }
    }
    company.value = sanitized
    persistLocalCompany(sanitized)
    if (sanitized.location_lat && sanitized.location_lng) {
      persistLocalLocation(sanitized.location_lat, sanitized.location_lng)
    }
    await loadSettings()
    alert('Dane firmy zostały zapisane pomyślnie!')
  } catch (error) {
    console.error('Błąd podczas zapisywania danych firmy:', error)
    alert('Wystąpił błąd podczas zapisywania danych firmy')
  }
}

const geocodeCompanyAddress = async () => {
  if (companyGeocodeLoading.value) return
  companyGeocodeError.value = ''

  const addressInput = (company.value.address || '').trim()
  if (!addressInput) {
    companyGeocodeError.value = 'Uzupełnij adres firmy przed pobraniem współrzędnych.'
    return
  }

  companyGeocodeLoading.value = true
  try {
    const lookupSource = {
      address: addressInput,
      address_street: null,
      address_city: null,
      address_postal_code: null,
      address_country: 'Polska'
    }

    const query =
      buildGeocodeAddress(lookupSource) ||
      addressInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const url = new URL(mapConfig.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('q', query)
    url.searchParams.set('addressdetails', '0')

    const headers = {
      'User-Agent': 'SerwisDesktop/1.0 (settings module)',
      'Accept-Language': 'pl'
    }

    if (mapConfig.GEOCODER_EMAIL) {
      headers['From'] = mapConfig.GEOCODER_EMAIL
    }

    const response = await fetch(url.toString(), { headers })
    if (!response.ok) {
      throw new Error(`Geocoder response ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data) || !data.length) {
      companyGeocodeError.value = 'Geokoder nie zwrócił współrzędnych dla podanego adresu.'
      return
    }

    const { lat, lon } = data[0]
    const updated = sanitizeCompanyProfile({
      ...company.value,
      location_lat: lat,
      location_lng: lon
    })
    company.value = updated
    persistLocalLocation(updated.location_lat, updated.location_lng)
    persistLocalCompany(updated)
  } catch (error) {
    console.error('[Settings] geocodeCompanyAddress failed:', error)
    companyGeocodeError.value =
      'Nie udało się pobrać współrzędnych. Sprawdź adres lub spróbuj ponownie.'
  } finally {
    companyGeocodeLoading.value = false
  }
}

const saveSystemConfig = async () => {
  try {
    if (window.electronAPI?.settings) {
      await window.electronAPI.settings.saveSystemConfig(systemConfig.value)
    }
    alert('Konfiguracja systemu została zapisana pomyślnie!')
  } catch (error) {
    console.error('Błąd podczas zapisywania konfiguracji:', error)
    alert('Wystąpił błąd podczas zapisywania konfiguracji')
  }
}

const createBackup = async () => {
  backupLoading.value = true
  
  try {
    if (window.electronAPI?.backup) {
      const backupPath = await window.electronAPI.backup.createBackup()
      alert(`Kopia zapasowa została utworzona: ${backupPath}`)
      loadBackupList()
    } else {
      // Symulacja dla przeglądarki
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Kopia zapasowa została utworzona pomyślnie!')
    }
  } catch (error) {
    console.error('Błąd podczas tworzenia kopii zapasowej:', error)
    alert('Wystąpił błąd podczas tworzenia kopii zapasowej')
  } finally {
    backupLoading.value = false
  }
}

const restoreBackup = async () => {
  if (!window.electronAPI?.backup) {
    alert('Funkcja przywracania dostępna tylko w aplikacji desktop')
    return
  }
  try {
    const selection = await window.electronAPI.backup.selectBackupFile()
    if (!selection?.success || !Array.isArray(selection.files) || selection.files.length === 0) {
      return
    }
    const filePath = selection.files[0]
    await window.electronAPI.backup.restoreBackup(filePath)
    alert('Kopia zapasowa została przywrócona. Uruchom ponownie aplikację, aby wczytać dane.')
  } catch (error) {
    console.error('Błąd podczas przywracania kopii zapasowej:', error)
    alert('Wystąpił błąd podczas przywracania kopii zapasowej')
  }
}

const downloadBackup = async (backup) => {
  if (!window.electronAPI?.backup) {
    alert('Funkcja pobierania dostępna tylko w aplikacji desktop')
    return
  }
  try {
    const result = await window.electronAPI.backup.downloadBackup(backup.path, backup.name)
    if (result?.success) {
      alert(`Kopia została zapisana w: ${result.path}`)
    }
  } catch (error) {
    console.error('Błąd podczas pobierania kopii zapasowej:', error)
    alert('Nie udało się pobrać kopii zapasowej')
  }
}

const deleteBackup = (backup) => {
  confirmModal.value = {
    title: 'Usuń kopię zapasową',
    message: `Czy na pewno chcesz usunąć kopię zapasową "${backup.name}"?`,
    confirmText: 'Usuń',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: async () => {
      try {
        if (window.electronAPI?.backup) {
          await window.electronAPI.backup.deleteBackup(backup.id)
          loadBackupList()
        }
        alert('Kopia zapasowa została usunięta')
        showConfirmModal.value = false
      } catch (error) {
        console.error('Błąd podczas usuwania kopii zapasowej:', error)
        alert('Wystąpił błąd podczas usuwania kopii zapasowej')
      }
    }
  }
  showConfirmModal.value = true
}

const restoreBackupFromList = (backup) => {
  confirmModal.value = {
    title: 'Przywróć kopię zapasową',
    message: `Czy na pewno chcesz przywrócić kopię "${backup.name}"? Aktualne dane zostaną zastąpione.`,
    confirmText: 'Przywróć',
    confirmClass: 'bg-green-600 hover:bg-green-700',
    onConfirm: async () => {
      try {
        if (window.electronAPI?.backup) {
          await window.electronAPI.backup.restoreBackup(backup.path)
          alert('Kopia została przywrócona. Uruchom ponownie aplikację, aby załadować dane.')
        }
        showConfirmModal.value = false
      } catch (error) {
        console.error('Błąd podczas przywracania kopii zapasowej:', error)
        alert('Wystąpił błąd podczas przywracania kopii zapasowej')
      }
    }
  }
  showConfirmModal.value = true
}

const checkForUpdates = async () => {
  try {
    if (window.electronAPI?.updater) {
      const hasUpdate = await window.electronAPI.updater.checkForUpdates()
      if (hasUpdate) {
        alert('Dostępna jest nowa wersja aplikacji!')
      } else {
        alert('Aplikacja jest w najnowszej wersji')
      }
    } else {
      alert('Sprawdzanie aktualizacji dostępne tylko w aplikacji desktop')
    }
  } catch (error) {
    console.error('Błąd podczas sprawdzania aktualizacji:', error)
    alert('Wystąpił błąd podczas sprawdzania aktualizacji')
  }
}

const openLogs = () => {
  if (window.electronAPI?.logs) {
    window.electronAPI.logs.openLogsFolder()
  } else {
    alert('Dostęp do logów dostępny tylko w aplikacji desktop')
  }
}

const exportDiagnostics = async () => {
  try {
    if (window.electronAPI?.diagnostics) {
      const diagnosticsPath = await window.electronAPI.diagnostics.export()
      alert(`Dane diagnostyczne zostały wyeksportowane: ${diagnosticsPath}`)
    } else {
      alert('Eksport diagnostyki dostępny tylko w aplikacji desktop')
    }
  } catch (error) {
    console.error('Błąd podczas eksportu diagnostyki:', error)
    alert('Wystąpił błąd podczas eksportu diagnostyki')
  }
}

const loadBackupList = async () => {
  try {
    if (window.electronAPI?.backup) {
      const backups = await window.electronAPI.backup.getBackupList()
      backupList.value = backups
    }
  } catch (error) {
    console.error('Błąd podczas ładowania listy kopii zapasowych:', error)
  }
}

const loadSettings = async () => {
  try {
    let remoteCompany = null
    if (window.electronAPI?.settings) {
      const companyResp = await window.electronAPI.settings.getCompany()
      if (companyResp?.success && companyResp.data) {
        remoteCompany = companyResp.data
      }
    }

    const localCompany = loadLocalCompany()
    const locationFallback = loadLocalLocation()

    const baseSource = {
      ...(remoteCompany || {}),
      ...(localCompany || {})
    }

    if (!baseSource.location_lat && locationFallback?.lat != null) {
      baseSource.location_lat = locationFallback.lat
    }
    if (!baseSource.location_lng && locationFallback?.lng != null) {
      baseSource.location_lng = locationFallback.lng
    }

    const normalizedCompany = sanitizeCompanyProfile(baseSource)

    company.value = normalizedCompany

    persistLocalCompany(normalizedCompany)
    if (company.value.location_lat && company.value.location_lng) {
      persistLocalLocation(
        company.value.location_lat,
        company.value.location_lng
      )
    }

    companyGeocodeError.value = ''
  } catch (error) {
    console.error('Błąd podczas ładowania ustawień:', error)
  }
}

// Funkcje zarządzania użytkownikami
const loadUsers = async () => {
  try {
    if (window.electronAPI?.users) {
      const usersList = await window.electronAPI.users.getAllUsers()
      users.value = usersList
    }
  } catch (error) {
    console.error('Błąd podczas ładowania użytkowników:', error)
  }
}

const saveUser = async () => {
  console.log('🔍 DEBUGOWANIE: saveUser wywołane');
  console.log('🔍 userForm.value:', userForm.value);
  console.log('🔍 editingUser.value:', editingUser.value);
  console.log('🔍 window.electronAPI?.users:', !!window.electronAPI?.users);

  if (!editingUser.value && userForm.value.password !== userForm.value.confirmPassword) {
    alert('Hasła nie są identyczne!')
    return
  }

  if (!editingUser.value && userForm.value.password.length < securityConfig.value.passwordPolicy.minLength) {
    alert(`Hasło musi mieć co najmniej ${securityConfig.value.passwordPolicy.minLength} znaków!`)
    return
  }

  if (editingUser.value && userForm.value.password) {
    if (userForm.value.password !== userForm.value.confirmPassword) {
      alert('Nowe hasła nie są identyczne!')
      return
    }
    if (userForm.value.password.length < securityConfig.value.passwordPolicy.minLength) {
      alert(`Hasło musi mieć co najmniej ${securityConfig.value.passwordPolicy.minLength} znaków!`)
      return
    }
  }

  // Sprawdź czy wszystkie wymagane pola są wypełnione
  if (!userForm.value.username.trim()) {
    alert('Nazwa użytkownika jest wymagana!')
    return
  }

  if (!userForm.value.full_name.trim()) {
    alert('Imię i nazwisko jest wymagane!')
    return
  }

  try {
    console.log('🔍 Próba utworzenia/aktualizacji użytkownika...');
    
    if (window.electronAPI?.users) {
      // Konwertuj Vue proxy na plain object dla IPC (dla obu przypadków)
      const plainUserData = JSON.parse(JSON.stringify(userForm.value));
      console.log('🔍 Plain user data:', plainUserData);
      
      if (editingUser.value) {
        console.log('🔍 Aktualizacja użytkownika ID:', editingUser.value.id);
        const payload = { ...plainUserData }
        // jeśli podano nowe hasło, wyślij w polu 'password' (backend zasoli i zahashuje)
        if (!payload.password) delete payload.password
        if (!payload.confirmPassword) delete payload.confirmPassword
        if (!payload.mobile_pin) delete payload.mobile_pin
        const result = await window.electronAPI.users.updateUser(editingUser.value.id, payload)
        console.log('🔍 Wynik aktualizacji:', result);
      } else {
        console.log('🔍 Tworzenie nowego użytkownika...');
        const result = await window.electronAPI.users.createUser(plainUserData)
        console.log('🔍 Wynik tworzenia:', result);
      }
      
      // 🔄 AUTOMATYCZNA SYNCHRONIZACJA Z RAILWAY
      try {
        console.log('🔄 Synchronizacja z Railway...');
        const users = await window.electronAPI.database.query('SELECT id, username, full_name, email, phone, role, is_active, password_hash, mobile_authorized FROM users');
        
        const response = await fetch('https://web-production-fc58d.up.railway.app/api/sync/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(users.map(u => ({
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            is_active: u.is_active,
            mobile_pin: (plainUserData.mobile_pin && /^(\d){4,8}$/.test(String(plainUserData.mobile_pin))) ? String(plainUserData.mobile_pin) : undefined
          })))
        });
        
        const syncResult = await response.json();
        console.log('✅ Synchronizacja z Railway:', syncResult);
        
        if (syncResult.success) {
          console.log(`✅ ${syncResult.syncedCount} użytkowników zsynchronizowanych z Railway`);
        } else {
          console.warn('⚠️ Błąd synchronizacji z Railway:', syncResult.error);
        }
      } catch (syncError) {
        console.error('❌ Błąd synchronizacji z Railway:', syncError);
        // Nie blokujemy zapisywania użytkownika jeśli synchronizacja się nie udała
      }
      
      showUserModal.value = false
      resetUserForm()
      await loadUsers()
      alert('Użytkownik został zapisany pomyślnie!')
    } else {
      console.error('❌ window.electronAPI.users nie jest dostępne!');
      alert('Błąd: API użytkowników nie jest dostępne')
    }
  } catch (error) {
    console.error('❌ Błąd podczas zapisywania użytkownika:', error)
    alert(`Wystąpił błąd podczas zapisywania użytkownika: ${error.message}`)
  }
}

const editUser = (user) => {
  editingUser.value = user
  userForm.value = {
    username: user.username,
    full_name: user.full_name,
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    password: '',
    confirmPassword: '',
    is_active: user.is_active,
    mobile_authorized: user.mobile_authorized ? true : false
  }
  showUserModal.value = true
}

const toggleUserStatus = async (user) => {
  try {
    if (window.electronAPI?.users) {
      await window.electronAPI.users.updateUser(user.id, { 
        is_active: !user.is_active 
      })
      
      // 🔄 AUTOMATYCZNA SYNCHRONIZACJA Z RAILWAY
      try {
        console.log('🔄 Synchronizacja z Railway po zmianie statusu...');
        const users = await window.electronAPI.database.query('SELECT id, username, full_name, email, role, is_active, mobile_authorized, password_hash FROM users');
        
        const response = await fetch('https://web-production-fc58d.up.railway.app/api/sync/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(users)
        });
        
        const syncResult = await response.json();
        console.log('✅ Synchronizacja z Railway:', syncResult);
        
        if (syncResult.success) {
          console.log(`✅ ${syncResult.syncedCount} użytkowników zsynchronizowanych z Railway`);
        } else {
          console.warn('⚠️ Błąd synchronizacji z Railway:', syncResult.error);
        }
      } catch (syncError) {
        console.error('❌ Błąd synchronizacji z Railway:', syncError);
        // Nie blokujemy zmiany statusu jeśli synchronizacja się nie udała
      }
      
      loadUsers()
      alert(`Użytkownik został ${!user.is_active ? 'aktywowany' : 'dezaktywowany'}`)
    }
  } catch (error) {
    console.error('Błąd podczas zmiany statusu użytkownika:', error)
    alert('Wystąpił błąd podczas zmiany statusu użytkownika')
  }
}

const deleteUser = (user) => {
  confirmModal.value = {
    title: 'Usuń użytkownika',
    message: `Czy na pewno chcesz usunąć użytkownika "${user.full_name}"?`,
    confirmText: 'Usuń',
    confirmClass: 'bg-red-600 hover:bg-red-700',
    onConfirm: async () => {
      try {
        if (window.electronAPI?.users) {
          await window.electronAPI.users.deleteUser(user.id)
          
          // 🔄 AUTOMATYCZNA SYNCHRONIZACJA Z RAILWAY
          try {
            console.log('🔄 Usuwanie użytkownika z Railway...');
            
            // Najpierw usuń użytkownika z Railway
            const deleteResponse = await fetch(`https://web-production-fc58d.up.railway.app/api/sync/users/${user.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            const deleteResult = await deleteResponse.json();
            console.log('🗑️ Wynik usuwania z Railway:', deleteResult);
            
            if (deleteResult.success) {
              console.log(`✅ Użytkownik ${user.full_name} (ID: ${user.id}) usunięty z Railway`);
            } else {
              console.warn('⚠️ Błąd usuwania z Railway:', deleteResult.error);
            }
          } catch (syncError) {
            console.error('❌ Błąd usuwania z Railway:', syncError);
            // Nie blokujemy usuwania użytkownika jeśli synchronizacja się nie udała
          }
          
          loadUsers()
        }
        alert('Użytkownik został usunięty')
        showConfirmModal.value = false
      } catch (error) {
        console.error('Błąd podczas usuwania użytkownika:', error)
        alert('Wystąpił błąd podczas usuwania użytkownika')
      }
    }
  }
  showConfirmModal.value = true
}

const resetUserForm = () => {
  userForm.value = {
    username: '',
    full_name: '',
    email: '',
    role: 'technician',
    password: '',
    confirmPassword: '',
    is_active: true,
    mobile_authorized: true
  }
  editingUser.value = null
}

const showPin = async (user) => {
  try {
    const id = user?.id
    if (!id) {
      alert('Najpierw wybierz istniejącego użytkownika (edycja), aby podejrzeć PIN.');
      return;
    }
    if (!window.electronAPI?.users?.getUserPin) {
      alert('Podgląd PIN dostępny tylko w aplikacji desktop.');
      return;
    }
    const pin = await window.electronAPI.users.getUserPin(id)
    if (!pin) {
      alert('Brak zapisanego PIN dla tego użytkownika. Ustaw PIN i zapisz zmiany.');
      return;
    }
    if (confirm('Czy na pewno chcesz wyświetlić PIN?')) {
      alert(`PIN użytkownika: ${pin}`)
    }
  } catch (e) {
    console.error('Błąd pobierania PIN:', e)
    alert('Nie udało się pobrać PIN')
  }
}

// Funkcje dla ról
const getRoleName = (role) => {
  const roles = {
    admin: 'Administrator',
    manager: 'Kierownik',
    technician: 'Serwisant',
    installer: 'Instalator'
  }
  return roles[role] || role
}

const getRoleClass = (role) => {
  const classes = {
    admin: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    technician: 'bg-purple-100 text-purple-800',
    installer: 'bg-orange-100 text-orange-800'
  }
  return classes[role] || 'bg-gray-100 text-gray-800'
}

// Funkcje bezpieczeństwa
const saveSecurityConfig = async () => {
  try {
    if (window.electronAPI?.security) {
      await window.electronAPI.security.saveConfig(securityConfig.value)
    }
    alert('Ustawienia bezpieczeństwa zostały zapisane!')
  } catch (error) {
    console.error('Błąd podczas zapisywania ustawień bezpieczeństwa:', error)
    alert('Wystąpił błąd podczas zapisywania ustawień bezpieczeństwa')
  }
}

const viewSecurityLogs = () => {
  if (window.electronAPI?.security) {
    window.electronAPI.security.openLogsViewer()
  } else {
    alert('Podgląd logów dostępny tylko w aplikacji desktop')
  }
}

const terminateSession = async (session) => {
  try {
    if (window.electronAPI?.security) {
      await window.electronAPI.security.terminateSession(session.id)
      loadActiveSessions()
    }
    alert('Sesja została zakończona')
  } catch (error) {
    console.error('Błąd podczas kończenia sesji:', error)
    alert('Wystąpił błąd podczas kończenia sesji')
  }
}

const loadActiveSessions = async () => {
  try {
    if (window.electronAPI?.security) {
      const sessions = await window.electronAPI.security.getActiveSessions()
      activeSessions.value = sessions
    }
  } catch (error) {
    console.error('Błąd podczas ładowania aktywnych sesji:', error)
  }
}

// Funkcja formatowania daty
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadSettings()
  loadBackupList()
  loadUsers()
  loadActiveSessions()
  
  // Pobierz informacje o aplikacji
  if (window.electronAPI?.app) {
    window.electronAPI.app.getVersion().then(version => {
      appInfo.value.version = version
    })
  }
})
</script> 