<template>
  <div class="container mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Zarządzanie kategoriami usług</h1>
      <p class="text-gray-600">Dostosuj kategorie usług do swoich potrzeb</p>
    </div>

    <!-- Przycisk dodawania nowej kategorii -->
    <div class="mb-6">
      <button
        @click="showAddModal = true"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
      >
        <i class="fas fa-plus mr-2"></i>
        Dodaj nową kategorię
      </button>
    </div>

    <!-- Lista kategorii -->
    <div class="bg-white rounded-lg shadow">
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">Kategorie usług</h2>
        
        <div v-if="loading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p class="mt-2 text-gray-600">Ładowanie kategorii...</p>
        </div>

        <div v-else-if="categories.length === 0" class="text-center py-8">
          <i class="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">Brak kategorii usług</p>
          <button
            @click="showAddModal = true"
            class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Dodaj pierwszą kategorię
          </button>
        </div>

        <div v-else class="space-y-4">
          <!-- Przyciski Rozwiń/Zwiń wszystkie -->
          <div class="mb-4 flex items-center space-x-3 pb-3 border-b">
            <button @click="expandAllCategories" class="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              <i class="fas fa-expand-alt mr-1"></i>
              Rozwiń wszystkie
            </button>
            <button @click="collapseAllCategories" class="text-sm text-gray-600 hover:text-gray-800 flex items-center">
              <i class="fas fa-compress-alt mr-1"></i>
              Zwiń wszystkie
            </button>
          </div>
          
          <!-- Lista kategorii z expand/collapse -->
          <div
            v-for="category in flatCategories"
            :key="category.id"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center flex-1">
                <!-- Wcięcie wizualne dla poziomów -->
                <span :style="{ width: (category._level * 24) + 'px', display: 'inline-block' }"></span>
                
                <!-- Przycisk expand/collapse (tylko dla kategorii z dziećmi) - WIĘKSZY I BARDZIEJ WIDOCZNY -->
                <button 
                  v-if="hasChildren(category.id)"
                  @click.stop="toggleCategoryExpansion(category.id)"
                  class="mr-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-all"
                  :class="{ 'rotate-90': expandedCategories.has(category.id) }"
                  title="Kliknij aby rozwinąć/zwinąć podkategorie"
                >
                  <i class="fas fa-chevron-right text-sm font-bold"></i>
                </button>
                <span v-else class="mr-3 w-8"></span>
                
                <!-- Kod kategorii w kwadracie -->
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <span class="text-blue-600 font-semibold">{{ category.code }}</span>
                </div>
                
                <!-- Nazwa i szczegóły kategorii -->
                <div class="flex-1">
                  <h3 
                    v-if="hasChildren(category.id)"
                    @click="toggleCategoryExpansion(category.id)"
                    class="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                    title="Kliknij aby rozwinąć/zwinąć"
                  >
                    {{ category.name }}
                  </h3>
                  <h3 v-else class="font-semibold text-gray-900">
                    {{ category.name }}
                  </h3>
                  <p v-if="category.description" class="text-sm text-gray-600 mt-1">
                    {{ category.description }}
                  </p>
                  <div class="flex items-center space-x-4 mt-2">
                    <span class="text-xs bg-gray-100 px-2 py-1 rounded">
                      Sortowanie: {{ category.sort_order }}
                    </span>
                    <!-- Liczba dzieci (jeśli ma) - jako badge -->
                    <span v-if="hasChildren(category.id)" class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      {{ getChildrenCount(category.id) }} podkategorii
                    </span>
                    <span :class="category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="text-xs px-2 py-1 rounded">
                      {{ category.is_active ? 'Aktywna' : 'Nieaktywna' }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <button
                  @click.stop="editCategory(category)"
                  class="text-blue-600 hover:text-blue-800 p-2"
                  title="Edytuj kategorię"
                >
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  @click.stop="deleteCategory(category)"
                  class="text-red-600 hover:text-red-800 p-2"
                  title="Usuń kategorię"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dodawania/edycji kategorii -->
    <div v-if="showAddModal || showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            {{ showEditModal ? 'Edytuj kategorię' : 'Dodaj nową kategorię' }}
          </h3>
          
          <form @submit.prevent="saveCategory">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Kod kategorii *
                </label>
                <input
                  v-model="categoryForm.code"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="np. A, B, C..."
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Nazwa kategorii *
                </label>
                <input
                  v-model="categoryForm.name"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="np. Przeglądy i konserwacje"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  v-model="categoryForm.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Krótki opis kategorii..."
                ></textarea>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Kategoria nadrzędna (opcjonalnie)
                </label>
                <select
                  v-model="categoryForm.parent_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Brak (kategoria główna)</option>
                  <option
                    v-for="cat in parentCategories"
                    :key="cat.id"
                    :value="cat.id"
                  >
                    {{ cat.code }} - {{ cat.name }}
                  </option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Kolejność sortowania
                </label>
                <input
                  v-model.number="categoryForm.sort_order"
                  type="number"
                  min="0"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div v-if="showEditModal">
                <label class="flex items-center">
                  <input
                    v-model="categoryForm.is_active"
                    type="checkbox"
                    class="mr-2"
                  />
                  <span class="text-sm font-medium text-gray-700">Kategoria aktywna</span>
                </label>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Anuluj
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                <i v-if="saving" class="fas fa-spinner fa-spin mr-2"></i>
                {{ showEditModal ? 'Zapisz zmiany' : 'Dodaj kategorię' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingCategory = ref(null)

// Stan rozwiniętych kategorii
const expandedCategories = ref(new Set())

const categoryForm = ref({
  code: '',
  name: '',
  description: '',
  parent_id: '',
  sort_order: 0,
  is_active: true
})

const parentCategories = computed(() => {
  return categories.value.filter(cat => !cat.parent_id)
})

// Helper: sprawdź czy kategoria ma dzieci
const hasChildren = (categoryId) => {
  return categories.value.some(c => c.parent_id === categoryId)
}

// Helper: liczba dzieci
const getChildrenCount = (categoryId) => {
  return categories.value.filter(c => c.parent_id === categoryId).length
}

// Build flat tree with levels - tylko widoczne kategorie (główne + rozwinięte)
const flatCategories = computed(() => {
  const map = new Map()
  for (const c of categories.value) {
    const pid = c.parent_id || 0
    if (!map.has(pid)) map.set(pid, [])
    map.get(pid).push(c)
  }
  const res = []
  const walk = (pid, level) => {
    const arr = (map.get(pid) || []).sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || (a.code || '').localeCompare(b.code || ''))
    for (const it of arr) {
      res.push({ ...it, _level: level })
      // Rekurencyjnie dodaj dzieci tylko jeśli kategoria jest rozwinięta
      if (expandedCategories.value.has(it.id)) {
        walk(it.id, level+1)
      }
    }
  }
  walk(0, 0) // Zacznij od głównych kategorii (parent_id = 0)
  return res
})

// Funkcje expand/collapse
function toggleCategoryExpansion(categoryId) {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
  }
  // Force reactivity - Vue nie wykrywa zmian w Set bezpośrednio
  expandedCategories.value = new Set(expandedCategories.value)
}

function expandAllCategories() {
  // Rozwiń wszystkie kategorie główne (bez parent_id)
  const mainCategories = categories.value.filter(c => !c.parent_id).map(c => c.id)
  expandedCategories.value = new Set(mainCategories)
}

function collapseAllCategories() {
  expandedCategories.value = new Set()
}

const loadCategories = async () => {
  loading.value = true
  try {
    let loaded = []

    try {
      const localResp = await fetch('http://localhost:5174/api/desktop/service-categories')
      if (localResp.ok) {
        loaded = await localResp.json()
      } else {
        console.warn('[ServiceCategories] Local fetch failed', localResp.status)
      }
    } catch (error) {
      console.warn('[ServiceCategories] Local fetch error', error)
    }

    if (!Array.isArray(loaded) || loaded.length === 0) {
      try {
        const remoteResp = await fetch('https://web-production-fc58d.up.railway.app/api/service-categories')
        if (remoteResp.ok) {
          const remoteJson = await remoteResp.json().catch(() => ({}))
          const remoteData = Array.isArray(remoteJson?.data) ? remoteJson.data : []
          if (remoteData.length) {
            loaded = remoteData
          }
        }
      } catch (error) {
        console.warn('[ServiceCategories] Remote fetch error', error)
      }
    }

    categories.value = Array.isArray(loaded) ? loaded : []
  } catch (error) {
    console.error('Błąd pobierania kategorii:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  categoryForm.value = {
    code: '',
    name: '',
    description: '',
    parent_id: '',
    sort_order: 0,
    is_active: true
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingCategory.value = null
  resetForm()
}

const editCategory = (category) => {
  editingCategory.value = category
  categoryForm.value = {
    code: category.code,
    name: category.name,
    description: category.description || '',
    parent_id: category.parent_id || '',
    sort_order: category.sort_order,
    is_active: category.is_active
  }
  showEditModal.value = true
}

const buildPayload = (source) => {
  const payload = {
    code: source.code ? String(source.code).trim() : '',
    name: source.name ? String(source.name).trim() : '',
    description: source.description ? String(source.description).trim() : null,
    parent_id: source.parent_id === '' || source.parent_id == null ? null : Number(source.parent_id),
    sort_order: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : 0
  }

  if (showEditModal.value) {
    payload.is_active = !!source.is_active
  }

  return payload
}

const saveCategory = async () => {
  saving.value = true
  try {
    const base = 'http://localhost:5174/api/desktop/service-categories'
    const url = showEditModal.value 
      ? `${base}/${editingCategory.value.id}`
      : base
    
    const method = showEditModal.value ? 'PUT' : 'POST'
    const payload = buildPayload(categoryForm.value)
    if (!payload.code || !payload.name) {
      alert('Kod oraz nazwa kategorii są wymagane.')
      return
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (response.ok) {
      await loadCategories()
      closeModal()
    } else {
      let message = 'Wystąpił błąd podczas zapisywania kategorii'
      try {
        const error = await response.json()
        if (error?.error) message = `Błąd: ${error.error}`
      } catch (_) {}
      alert(message)
    }
  } catch (error) {
    console.error('Błąd zapisywania kategorii:', error)
    alert('Wystąpił błąd podczas zapisywania kategorii')
  } finally {
    saving.value = false
  }
}

const deleteCategory = async (category) => {
  if (!confirm(`Czy na pewno chcesz usunąć kategorię "${category.name}"?`)) {
    return
  }
  
  try {
    const response = await fetch(`http://localhost:5174/api/desktop/service-categories/${category.id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      await loadCategories()
    } else {
      let message = 'Wystąpił błąd podczas usuwania kategorii'
      try {
        const error = await response.json()
        if (error?.error) message = `Błąd: ${error.error}`
      } catch (_) {}
      alert(message)
    }
  } catch (error) {
    console.error('Błąd usuwania kategorii:', error)
    alert('Wystąpił błąd podczas usuwania kategorii')
  }
}

onMounted(() => {
  loadCategories()
})
</script> 