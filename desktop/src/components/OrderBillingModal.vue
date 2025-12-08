<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
      <!-- Header -->
      <div class="bg-primary-600 text-white px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Rozlicz zlecenie</h2>
            <p class="text-primary-100">{{ order.order_number }} - {{ clientName }}</p>
          </div>
          <button
            @click="$emit('close')"
            class="text-primary-200 hover:text-white"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>

      <div class="flex h-full max-h-[calc(95vh-80px)]">
        <!-- Lewa kolumna - Części i Usługi -->
        <div class="w-2/3 p-6 overflow-y-auto">
          <!-- Sekcja Części -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-cog mr-2 text-primary-600"></i>
              Użyte części
            </h3>
            
            <!-- Wyszukiwanie części -->
            <div class="mb-4">
              <div class="relative">
                <input
                  v-model="partSearchQuery"
                  type="text"
                  placeholder="Wyszukaj części..."
                  class="form-input pl-10"
                  @input="searchParts"
                />
                <i class="fas fa-search absolute left-3 top-3 text-secondary-400"></i>
              </div>
              <!-- Debug info -->
              <div v-if="partSearchQuery" class="text-xs text-secondary-500 mt-1">
                Wyszukujesz: "{{ partSearchQuery }}" | Znaleziono: {{ filteredParts.length }} części
              </div>
            </div>

            <!-- Lista dostępnych części -->
            <div v-if="partSearchQuery && filteredParts.length > 0" class="mb-4 max-h-40 overflow-y-auto border border-secondary-200 rounded-lg bg-white">
              <div
                v-for="part in filteredParts"
                :key="part.id"
                @click="addPart(part)"
                class="p-3 hover:bg-blue-50 cursor-pointer border-b border-secondary-100 last:border-b-0"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <div class="font-medium text-secondary-900">{{ part.name }}</div>
                    <div class="text-sm text-secondary-600">{{ part.manufacturer }} • {{ part.part_number }}</div>
                  </div>
                  <div class="text-sm font-medium text-primary-600">
                    {{ formatPrice(part.price) }} zł
                  </div>
                </div>
              </div>
            </div>

            <!-- Komunikat gdy brak wyników -->
            <div v-if="partSearchQuery && partSearchQuery.length >= 1 && filteredParts.length === 0" class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="text-sm text-yellow-800">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Nie znaleziono części pasujących do frazy "{{ partSearchQuery }}"
              </div>
            </div>

            <!-- Wybrane części -->
            <div class="space-y-2">
              <div
                v-for="(selectedPart, index) in selectedParts"
                :key="index"
                class="bg-secondary-50 border border-secondary-200 rounded-lg p-3"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="font-medium text-secondary-900">{{ selectedPart.name }}</div>
                    <div class="text-sm text-secondary-600">{{ selectedPart.manufacturer }}</div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <div class="flex items-center space-x-2">
                      <label class="text-sm text-secondary-600">Ilość:</label>
                      <input
                        v-model.number="selectedPart.quantity"
                        type="number"
                        min="1"
                        class="w-16 px-2 py-1 border border-secondary-300 rounded text-center"
                        @input="calculateTotals"
                      />
                    </div>
                    <div class="text-sm font-medium text-secondary-900 w-20 text-right">
                      {{ formatPrice(selectedPart.price * selectedPart.quantity) }} zł
                    </div>
                    <button
                      @click="removePart(index)"
                      class="text-red-500 hover:text-red-700"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
              
              <div v-if="selectedParts.length === 0" class="text-center text-secondary-500 py-4">
                Wyszukaj i wybierz części użyte w naprawie
              </div>
            </div>
          </div>

          <!-- Sekcja Usługi -->
          <div>
            <h3 class="text-lg font-semibold text-secondary-900 mb-4">
              <i class="fas fa-tools mr-2 text-primary-600"></i>
              Wykonane usługi
            </h3>
            
            <!-- Filtry kategorii -->
            <div class="mb-4">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="category in serviceCategories"
                  :key="category.id"
                  @click="toggleCategoryExpansion(category.id)"
                  :class="[
                    'px-3 py-1 text-sm rounded-full border transition-colors',
                    expandedCategories.includes(category.id)
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-secondary-100 border-secondary-300 text-secondary-700 hover:bg-secondary-200'
                  ]"
                >
                  {{ category.id }} - {{ category.name }}
                  <i :class="[
                    'fas ml-1',
                    expandedCategories.includes(category.id) ? 'fa-chevron-up' : 'fa-chevron-down'
                  ]"></i>
                </button>
              </div>
              
              <div class="mt-2 flex items-center space-x-4">
                <button
                  @click="expandAllCategories"
                  class="text-sm text-primary-600 hover:text-primary-800"
                >
                  <i class="fas fa-expand-alt mr-1"></i>
                  Rozwiń wszystkie
                </button>
                <button
                  @click="collapseAllCategories"
                  class="text-sm text-secondary-600 hover:text-secondary-800"
                >
                  <i class="fas fa-compress-alt mr-1"></i>
                  Zwiń wszystkie
                </button>
              </div>
            </div>
            
            <!-- Kategorie usług -->
            <div class="space-y-4">
              <div
                v-for="category in serviceCategories"
                :key="category.id"
                class="border border-secondary-200 rounded-lg overflow-hidden"
              >
                <!-- Nagłówek kategorii -->
                <div 
                  @click="toggleCategoryExpansion(category.id)"
                  class="bg-secondary-50 px-4 py-3 cursor-pointer hover:bg-secondary-100 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <span class="font-semibold text-secondary-900">{{ category.id }}</span>
                      <span class="font-medium text-secondary-700">{{ category.name }}</span>
                      <span class="text-sm text-secondary-500">({{ category.services.length }} usług)</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <span class="text-sm text-secondary-600">
                        {{ getSelectedServicesCount(category.id) }} wybranych
                      </span>
                      <i :class="[
                        'fas transition-transform',
                        expandedCategories.includes(category.id) ? 'fa-chevron-up' : 'fa-chevron-down'
                      ]"></i>
                    </div>
                  </div>
                </div>
                
                <!-- Usługi w kategorii -->
                <div v-if="expandedCategories.includes(category.id)" class="divide-y divide-secondary-100">
                  <div
                    v-for="service in category.services"
                    :key="service.id"
                    class="p-4 hover:bg-secondary-25 transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3 flex-1">
                        <input
                          v-model="service.selected"
                          type="checkbox"
                          class="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                          @change="calculateTotals"
                        />
                        <div class="flex-1">
                          <div class="font-medium text-secondary-900 leading-tight">{{ service.name }}</div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-3">
                        <div class="flex items-center space-x-2">
                          <label class="text-sm text-secondary-600">Cena:</label>
                          <input
                            v-model.number="service.price"
                            type="number"
                            min="0"
                            step="0.01"
                            class="w-24 px-2 py-1 border border-secondary-300 rounded text-right text-sm"
                            @input="calculateTotals"
                            placeholder="0.00"
                          />
                          <span class="text-sm text-secondary-600">zł</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Prawa kolumna - Podsumowanie -->
        <div class="w-1/3 bg-secondary-50 p-6 border-l border-secondary-200">
          <h3 class="text-lg font-semibold text-secondary-900 mb-4">
            <i class="fas fa-calculator mr-2 text-primary-600"></i>
            Podsumowanie
          </h3>

          <div class="space-y-4">
            <!-- Części -->
            <div>
              <div class="text-sm font-medium text-secondary-700 mb-2">Części</div>
              <div class="text-right text-lg font-semibold text-secondary-900">
                {{ formatPrice(totals.parts) }} zł
              </div>
            </div>

            <!-- Usługi -->
            <div>
              <div class="text-sm font-medium text-secondary-700 mb-2">Usługi</div>
              <div class="text-right text-lg font-semibold text-secondary-900">
                {{ formatPrice(totals.services) }} zł
              </div>
            </div>

            <hr class="border-secondary-300">

            <!-- Suma netto -->
            <div>
              <div class="text-sm font-medium text-secondary-700 mb-2">Suma netto</div>
              <div class="text-right text-lg font-semibold text-secondary-900">
                {{ formatPrice(totals.net) }} zł
              </div>
            </div>

            <!-- VAT -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-secondary-700">VAT</span>
                <select v-model="vatRate" @change="calculateTotals" class="text-sm border border-secondary-300 rounded px-2 py-1">
                  <option value="0">0%</option>
                  <option value="8">8%</option>
                  <option value="23">23%</option>
                </select>
              </div>
              <div class="text-right text-lg font-semibold text-secondary-900">
                {{ formatPrice(totals.vat) }} zł
              </div>
            </div>

            <hr class="border-secondary-300">

            <!-- Suma brutto -->
            <div>
              <div class="text-sm font-medium text-secondary-700 mb-2">Suma brutto</div>
              <div class="text-right text-xl font-bold text-primary-600">
                {{ formatPrice(totals.gross) }} zł
              </div>
            </div>

            <!-- Wybrane usługi - podsumowanie -->
            <div class="mt-6 pt-4 border-t border-secondary-300">
              <div class="text-sm font-medium text-secondary-700 mb-2">Wybrane usługi:</div>
              <div class="max-h-40 overflow-y-auto space-y-1">
                <div 
                  v-for="service in selectedServices" 
                  :key="service.id"
                  class="text-xs bg-white rounded px-2 py-1 border border-secondary-200"
                >
                  <div class="flex justify-between">
                    <span class="text-secondary-700 truncate">{{ service.name }}</span>
                    <span class="font-medium text-secondary-900 ml-2">{{ formatPrice(service.price) }} zł</span>
                  </div>
                </div>
              </div>
              <div v-if="selectedServices.length === 0" class="text-xs text-secondary-500 italic">
                Nie wybrano żadnych usług
              </div>
            </div>

            <!-- Notatki -->
            <div class="mt-6">
              <label class="text-sm font-medium text-secondary-700 mb-2 block">Notatki do faktury</label>
              <textarea
                v-model="invoiceNotes"
                rows="3"
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
                placeholder="Dodatkowe informacje..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-secondary-50 px-6 py-4 border-t border-secondary-200">
        <div class="flex justify-end space-x-3">
          <button
            @click="$emit('close')"
            class="btn-secondary"
          >
            Anuluj
          </button>
          <button
            @click="completeOrder"
            class="btn-primary"
            :disabled="isCompleting"
          >
            <i class="fas fa-check mr-2"></i>
            {{ isCompleting ? 'Rozliczam...' : 'Rozlicz i zamknij zlecenie' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'completed'])

// Reactive data
const isCompleting = ref(false)
const partSearchQuery = ref('')
const filteredParts = ref([])
const selectedParts = ref([])
const vatRate = ref(23)
const invoiceNotes = ref('')
const expandedCategories = ref(['A']) // Domyślnie rozwinięta pierwsza kategoria

// Dostępne usługi - nowa hierarchiczna struktura
const serviceCategories = ref([
  {
    id: 'A',
    name: 'Przeglądy i konserwacje',
    services: [
      { id: 'A1', name: 'Czyszczenie palnika (mechaniczne)', selected: false, price: 0 },
      { id: 'A2', name: 'Czyszczenie palnika (chemiczne)', selected: false, price: 0 },
      { id: 'A3', name: 'Czyszczenie wymiennika ciepła (mechaniczne)', selected: false, price: 0 },
      { id: 'A4', name: 'Czyszczenie wymiennika ciepła (chemiczne)', selected: false, price: 0 },
      { id: 'A5', name: 'Wymiana filtrów paliwa (gaz)', selected: false, price: 0 },
      { id: 'A6', name: 'Wymiana filtrów paliwa (olej)', selected: false, price: 0 },
      { id: 'A7', name: 'Kontrola szczelności instalacji gazowej', selected: false, price: 0 },
      { id: 'A8', name: 'Kontrola szczelności instalacji olejowej', selected: false, price: 0 },
      { id: 'A9', name: 'Smarowanie elementów ruchomych palnika', selected: false, price: 0 },
      { id: 'A10', name: 'Kontrola i wymiana uszczelek', selected: false, price: 0 },
      { id: 'A11', name: 'Kontrola izolacji termicznej', selected: false, price: 0 },
      { id: 'A12', name: 'Płukanie chemiczne instalacji CO/CWU', selected: false, price: 0 },
      { id: 'A13', name: 'Demontaż wymiennika ciepła', selected: false, price: 0 }
    ]
  },
  {
    id: 'B',
    name: 'Diagnostyka i naprawy',
    services: [
      { id: 'B1', name: 'Diagnostyka usterek automatyki (sterowniki, panele)', selected: false, price: 0 },
      { id: 'B2', name: 'Diagnostyka usterek elektrycznych', selected: false, price: 0 },
      { id: 'B3', name: 'Diagnostyka usterek hydraulicznych', selected: false, price: 0 },
      { id: 'B4', name: 'Wymiana elektrody zapłonowej', selected: false, price: 0 },
      { id: 'B5', name: 'Wymiana elektrody jonizacyjnej', selected: false, price: 0 },
      { id: 'B6', name: 'Wymiana dyszy paliwowej (gaz)', selected: false, price: 0 },
      { id: 'B7', name: 'Wymiana dyszy paliwowej (olej)', selected: false, price: 0 },
      { id: 'B8', name: 'Wymiana czujnika temperatury', selected: false, price: 0 },
      { id: 'B9', name: 'Wymiana czujnika ciśnienia', selected: false, price: 0 },
      { id: 'B10', name: 'Wymiana zaworu bezpieczeństwa', selected: false, price: 0 },
      { id: 'B11', name: 'Regeneracja pompy obiegowej', selected: false, price: 0 },
      { id: 'B12', name: 'Wymiana pompy obiegowej', selected: false, price: 0 },
      { id: 'B13', name: 'Wymiana wentylatora palnika', selected: false, price: 0 },
      { id: 'B14', name: 'Naprawa lub wymiana modułu sterującego', selected: false, price: 0 },
      { id: 'B15', name: 'Kalibracja zaworów i czujników', selected: false, price: 0 }
    ]
  },
  {
    id: 'C',
    name: 'Pomiary i regulacje',
    services: [
      { id: 'C1', name: 'Pomiar i analiza spalin (CO, CO₂, O₂, NOₓ)', selected: false, price: 0 },
      { id: 'C2', name: 'Pomiar ciśnienia gazu (wejście)', selected: false, price: 0 },
      { id: 'C3', name: 'Pomiar ciśnienia gazu (wyjście)', selected: false, price: 0 },
      { id: 'C4', name: 'Pomiar podciśnienia w komorze spalania', selected: false, price: 0 },
      { id: 'C5', name: 'Ocena wartości jonizacji płomienia', selected: false, price: 0 },
      { id: 'C6', name: 'Regulacja stosunku powietrze/paliwo', selected: false, price: 0 },
      { id: 'C7', name: 'Regulacja mocy palnika', selected: false, price: 0 },
      { id: 'C8', name: 'Regulacja sterowników i automatyki', selected: false, price: 0 }
    ]
  },
  {
    id: 'D',
    name: 'Stacje uzdatniania wody i badania',
    services: [
      { id: 'D1', name: 'Montaż stacji uzdatniania wody', selected: false, price: 0 },
      { id: 'D2', name: 'Serwis stacji uzdatniania wody (wymiana wkładów filtracyjnych)', selected: false, price: 0 },
      { id: 'D3', name: 'Badanie twardości wody', selected: false, price: 0 },
      { id: 'D4', name: 'Badanie pH wody', selected: false, price: 0 },
      { id: 'D5', name: 'Badanie zawartości żelaza/manganu', selected: false, price: 0 },
      { id: 'D6', name: 'Badanie parametrów sanitarnych (bakteriologia)', selected: false, price: 0 },
      { id: 'D7', name: 'Odkamienianie instalacji wodnej (chemiczne)', selected: false, price: 0 },
      { id: 'D8', name: 'Czyszczenie i dezynfekcja zbiorników wodnych', selected: false, price: 0 }
    ]
  },
  {
    id: 'E',
    name: 'Usługi hydrauliczne',
    services: [
      { id: 'E1', name: 'Montaż lub wymiana zaworów kulowych', selected: false, price: 0 },
      { id: 'E2', name: 'Montaż lub wymiana grzejników', selected: false, price: 0 },
      { id: 'E3', name: 'Montaż armatury łazienkowej (baterie, prysznice)', selected: false, price: 0 },
      { id: 'E4', name: 'Montaż przyłączy wodno-kanalizacyjnych', selected: false, price: 0 },
      { id: 'E5', name: 'Usuwanie wycieków w instalacji wodnej', selected: false, price: 0 },
      { id: 'E6', name: 'Udrażnianie rur (mechaniczne)', selected: false, price: 0 },
      { id: 'E7', name: 'Udrażnianie rur (WUKO / ciśnieniowe)', selected: false, price: 0 },
      { id: 'E8', name: 'Monitoring kamerą instalacji kanalizacyjnej', selected: false, price: 0 }
    ]
  },
  {
    id: 'F',
    name: 'Serwis przemysłowy',
    services: [
      { id: 'F1', name: 'Serwis palnika przemysłowego (gaz)', selected: false, price: 0 },
      { id: 'F2', name: 'Serwis palnika przemysłowego (olej)', selected: false, price: 0 },
      { id: 'F3', name: 'Serwis kotła parowego', selected: false, price: 0 },
      { id: 'F4', name: 'Próba ciśnieniowa instalacji (do 60 bar)', selected: false, price: 0 },
      { id: 'F5', name: 'Modernizacja sterowników PLC', selected: false, price: 0 },
      { id: 'F6', name: 'Instalacja systemu zdalnego monitoringu kotłowni', selected: false, price: 0 },
      { id: 'F7', name: 'Optymalizacja procesu spalania', selected: false, price: 0 }
    ]
  },
  {
    id: 'G',
    name: 'Pogotowie serwisowe',
    services: [
      { id: 'G1', name: 'Awaryjne wyłączenie urządzenia', selected: false, price: 0 },
      { id: 'G2', name: 'Usunięcie awarii instalacji gazowej', selected: false, price: 0 },
      { id: 'G3', name: 'Usunięcie awarii instalacji wodnej', selected: false, price: 0 },
      { id: 'G4', name: 'Zabezpieczenie miejsca awarii', selected: false, price: 0 },
      { id: 'G5', name: 'Tymczasowa naprawa do czasu wymiany części', selected: false, price: 0 }
    ]
  },
  {
    id: 'H',
    name: 'Części i materiały',
    services: [
      { id: 'H1', name: 'Dostawa części zamiennych (oryginalnych)', selected: false, price: 0 },
      { id: 'H2', name: 'Dostawa części zamiennych (zamienniki)', selected: false, price: 0 },
      { id: 'H3', name: 'Uzupełnienie materiałów eksploatacyjnych (filtry, olej, smar)', selected: false, price: 0 }
    ]
  },
  {
    id: 'I',
    name: 'Usługi specjalistyczne i techniczne',
    services: [
      { id: 'I1', name: 'Przygotowanie kotłowni do odbioru przez UDT', selected: false, price: 0 },
      { id: 'I2', name: 'Opracowanie i kompletowanie dokumentacji technicznej dla UDT', selected: false, price: 0 },
      { id: 'I3', name: 'Spotkanie z inspektorem UDT – udział w odbiorze', selected: false, price: 0 },
      { id: 'I4', name: 'Montaż i uruchomienie sprężarkowni przemysłowej', selected: false, price: 0 },
      { id: 'I5', name: 'Montaż przemysłowych filtrów powietrza/wody (cyklonowych, workowych, kasetowych)', selected: false, price: 0 },
      { id: 'I6', name: 'Instalacja systemu odciągów i odpylania w kotłowni', selected: false, price: 0 },
      { id: 'I7', name: 'Modernizacja kotłowni pod wymagania przepisów prawa (PN-EN, UDT)', selected: false, price: 0 },
      { id: 'I8', name: 'Montaż i konfiguracja systemów BMS (Building Management System)', selected: false, price: 0 },
      { id: 'I9', name: 'Wykonanie pomiarów i raportów zgodnych z wymogami UDT', selected: false, price: 0 },
      { id: 'I10', name: 'Konsultacje techniczne z inwestorem lub projektantem', selected: false, price: 0 },
      { id: 'I11', name: 'Prace projektowe – przygotowanie koncepcji modernizacji kotłowni', selected: false, price: 0 },
      { id: 'I12', name: 'Nadzór inwestorski nad realizacją instalacji grzewczych/kotłowni', selected: false, price: 0 }
    ]
  }
])

// Computed
const clientName = computed(() => {
  if (props.order.client_type === 'business') {
    return props.order.client_company_name || 'Firma'
  }
  return `${props.order.client_first_name || ''} ${props.order.client_last_name || ''}`.trim()
})

const selectedServices = computed(() => {
  const selected = []
  serviceCategories.value.forEach(category => {
    category.services.forEach(service => {
      if (service.selected) {
        selected.push(service)
      }
    })
  })
  return selected
})

const totals = computed(() => {
  const partsTotal = selectedParts.value.reduce((sum, part) => sum + (part.price * part.quantity), 0)
  const servicesTotal = selectedServices.value.reduce((sum, service) => sum + (service.price || 0), 0)
  
  const net = partsTotal + servicesTotal
  const vat = net * (vatRate.value / 100)
  const gross = net + vat

  return {
    parts: partsTotal,
    services: servicesTotal,
    net,
    vat,
    gross
  }
})

// Methods
const toggleCategoryExpansion = (categoryId) => {
  const index = expandedCategories.value.indexOf(categoryId)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(categoryId)
  }
}

const expandAllCategories = () => {
  expandedCategories.value = serviceCategories.value.map(cat => cat.id)
}

const collapseAllCategories = () => {
  expandedCategories.value = []
}

const getSelectedServicesCount = (categoryId) => {
  const category = serviceCategories.value.find(cat => cat.id === categoryId)
  if (!category) return 0
  return category.services.filter(service => service.selected).length
}

const searchParts = async () => {
  console.log('Searching parts for:', partSearchQuery.value)
  
  if (partSearchQuery.value.length < 1) {
    filteredParts.value = []
    return
  }

  try {
    if (window.electronAPI) {
      console.log('Using Electron API for parts search')
      const parts = await window.electronAPI.database.query(
        'SELECT * FROM spare_parts WHERE name LIKE ? OR part_number LIKE ? LIMIT 10',
        [`%${partSearchQuery.value}%`, `%${partSearchQuery.value}%`]
      )
      filteredParts.value = parts || []
      console.log('Found parts from DB:', filteredParts.value)
    } else {
      console.log('Using demo data for parts search')
      // Demo części
      const demoParts = [
        { id: 1, name: 'Filtr powietrza', manufacturer: 'Bosch', part_number: 'F026400123', price: 45.99 },
        { id: 2, name: 'Uszczelka', manufacturer: 'Viessmann', part_number: 'VS-789456', price: 23.50 },
        { id: 3, name: 'Zawór gazowy', manufacturer: 'Honeywell', part_number: 'HW-555111', price: 189.00 },
        { id: 4, name: 'Pompa cyrkulacyjna', manufacturer: 'Grundfos', part_number: 'GF-UPS25', price: 320.00 }
      ]
      
      filteredParts.value = demoParts.filter(part => 
        part.name.toLowerCase().includes(partSearchQuery.value.toLowerCase()) ||
        part.part_number.toLowerCase().includes(partSearchQuery.value.toLowerCase())
      )
      console.log('Filtered demo parts:', filteredParts.value)
    }
  } catch (error) {
    console.error('Error searching parts:', error)
    filteredParts.value = []
  }
}

const addPart = (part) => {
  // Sprawdź czy część już nie została dodana
  const existingIndex = selectedParts.value.findIndex(p => p.id === part.id)
  
  if (existingIndex >= 0) {
    // Zwiększ ilość
    selectedParts.value[existingIndex].quantity += 1
  } else {
    // Dodaj nową część
    selectedParts.value.push({
      ...part,
      quantity: 1
    })
  }
  
  partSearchQuery.value = ''
  filteredParts.value = []
  calculateTotals()
}

const removePart = (index) => {
  selectedParts.value.splice(index, 1)
  calculateTotals()
}

const calculateTotals = () => {
  // Totals są automatycznie wyliczane przez computed property
}

const formatPrice = (price) => {
  return parseFloat(price || 0).toFixed(2)
}

const completeOrder = async () => {
  isCompleting.value = true

  try {
    // Przygotuj dane rozliczenia
    const billingData = {
      orderId: props.order.id,
      parts: selectedParts.value,
      services: selectedServices.value,
      totals: totals.value,
      vatRate: vatRate.value,
      notes: invoiceNotes.value
    }

    if (window.electronAPI) {
      // Zaktualizuj zlecenie jako ukończone
      await window.electronAPI.database.run(
        'UPDATE service_orders SET status = ?, completed_at = ?, total_cost = ? WHERE id = ?',
        ['completed', new Date().toISOString(), totals.value.gross, props.order.id]
      )

      // Zapisz użyte części
      for (const part of selectedParts.value) {
        await window.electronAPI.database.run(
          'INSERT INTO order_parts (order_id, part_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [props.order.id, part.id, part.quantity, part.price]
        )
      }

      // Automatyczna synchronizacja z Railway gdy zmienia się order_parts
      if (props.order?.id && window.electronAPI?.database) {
        try {
          await window.electronAPI.database.run(
            "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
            [props.order.id]
          )
          await fetch(`http://localhost:5174/api/railway/export-order/${props.order.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).catch(() => {}) // Soft fail - jeśli błąd, nie blokuj użytkownika
        } catch (_) { /* soft fail */ }
      }

      // Zapisz wykonane usługi jako pozycje faktury
      for (const service of selectedServices.value) {
        await window.electronAPI.database.run(
          'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, net_amount, tax_rate, tax_amount, gross_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            invoiceResult.lastID, 
            service.name, 
            1, 
            service.price, 
            service.price, 
            vatRate.value, 
            service.price * (vatRate.value / 100), 
            service.price * (1 + vatRate.value / 100)
          ]
        )
      }

      // Generuj fakturę
      const invoice = {
        order_id: props.order.id,
        client_id: props.order.client_id,
        invoice_number: `FV/${new Date().getFullYear()}/${Date.now()}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 dni
        net_amount: totals.value.net,
        tax_amount: totals.value.vat,
        gross_amount: totals.value.gross,
        notes: invoiceNotes.value,
        status: 'draft'
      }

      const invoiceResult = await window.electronAPI.database.run(
        `INSERT INTO invoices (
          order_id, client_id, invoice_number, issue_date, due_date,
          net_amount, tax_amount, gross_amount, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice.order_id, invoice.client_id, invoice.invoice_number, invoice.issue_date, invoice.due_date,
          invoice.net_amount, invoice.tax_amount, invoice.gross_amount, 
          invoice.notes, invoice.status
        ]
      )
    }

    emit('completed', billingData)
    
  } catch (error) {
    console.error('Error completing order:', error)
    alert('Błąd podczas rozliczania zlecenia')
  } finally {
    isCompleting.value = false
  }
}

onMounted(() => {
  // Możemy tutaj załadować części specyficzne dla urządzenia
  console.log('OrderBillingModal mounted')
  
  // Test demo części - pokaż je na starcie
  if (!window.electronAPI) {
    console.log('Loading demo parts for testing')
    const demoParts = [
      { id: 1, name: 'Filtr powietrza', manufacturer: 'Bosch', part_number: 'F026400123', price: 45.99 },
      { id: 2, name: 'Uszczelka', manufacturer: 'Viessmann', part_number: 'VS-789456', price: 23.50 },
      { id: 3, name: 'Zawór gazowy', manufacturer: 'Honeywell', part_number: 'HW-555111', price: 189.00 },
      { id: 4, name: 'Pompa cyrkulacyjna', manufacturer: 'Grundfos', part_number: 'GF-UPS25', price: 320.00 }
    ]
    
    // Dla testu pokaż wszystkie części na start
    setTimeout(() => {
      partSearchQuery.value = 'f'
      filteredParts.value = demoParts.filter(part => 
        part.name.toLowerCase().includes('f') ||
        part.part_number.toLowerCase().includes('f')
      )
      console.log('Demo parts set:', filteredParts.value)
    }, 500)
  }
})
</script> 