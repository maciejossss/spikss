<template>
  <div class="container mx-auto p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Zarządzanie kategoriami części</h1>
      <p class="text-gray-600">Twórz, edytuj i porządkuj kategorie części zamiennych</p>
    </div>

    <div class="mb-6 flex items-center space-x-3">
      <button @click="openAdd()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center">
        <i class="fas fa-plus mr-2"></i>
        Dodaj nową kategorię
      </button>
      <span class="text-xs text-secondary-500">Przeciągnij i upuść dostępne w kolejnym wydaniu — na razie przenoszenie przez edycję nadrzędnej kategorii</span>
    </div>

    <div class="bg-white rounded-lg shadow">
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">Kategorie części</h2>

        <div v-if="loading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p class="mt-2 text-gray-600">Ładowanie kategorii...</p>
        </div>

        <div v-else-if="flatCategories.length === 0" class="text-center py-8">
          <i class="fas fa-folder-open text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">Brak kategorii części</p>
          <button @click="openAdd()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Dodaj pierwszą kategorię
          </button>
        </div>

        <div v-else class="space-y-2">
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
          <div v-for="cat in flatCategories" :key="cat.id" class="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
            <div class="flex items-center justify-between">
              <div class="flex items-center flex-1">
                <!-- Wcięcie wizualne dla poziomów -->
                <span :style="{ width: (cat._level * 24) + 'px', display: 'inline-block' }"></span>
                
                <!-- Przycisk expand/collapse (tylko dla kategorii z dziećmi) - WIĘKSZY I BARDZIEJ WIDOCZNY -->
                <button 
                  v-if="hasChildren(cat.id)"
                  @click.stop="toggleCategoryExpansion(cat.id)"
                  class="mr-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-all"
                  :class="{ 'rotate-90': expandedCategories.has(cat.id) }"
                  title="Kliknij aby rozwinąć/zwinąć podkategorie"
                >
                  <i class="fas fa-chevron-right text-sm font-bold"></i>
                </button>
                <span v-else class="mr-3 w-8"></span>
                
                <!-- Nazwa kategorii - możliwość kliknięcia dla kategorii z dziećmi -->
                <div class="flex items-center flex-1">
                  <span 
                    v-if="hasChildren(cat.id)"
                    @click="toggleCategoryExpansion(cat.id)"
                    class="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                    title="Kliknij aby rozwinąć/zwinąć"
                  >
                    {{ cat.name }}
                  </span>
                  <span v-else class="font-semibold text-gray-900">
                    {{ cat.name }}
                  </span>
                  
                  <span class="ml-3 text-xs bg-gray-100 px-2 py-1 rounded">Sort: {{ cat.sort_order || 0 }}</span>
                  <span :class="cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" class="ml-2 text-xs px-2 py-1 rounded">
                    {{ cat.is_active ? 'Aktywna' : 'Nieaktywna' }}
                  </span>
                  <!-- Liczba dzieci (jeśli ma) - jako badge -->
                  <span v-if="hasChildren(cat.id)" class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    {{ getChildrenCount(cat.id) }} podkategorii
                  </span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button @click.stop="editCategory(cat)" class="text-blue-600 hover:text-blue-800 p-2" title="Edytuj">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click.stop="deleteCategory(cat)" class="text-red-600 hover:text-red-800 p-2" title="Usuń">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal dodawania/edycji -->
    <div v-if="showAddModal || showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">{{ showEditModal ? 'Edytuj kategorię' : 'Dodaj nową kategorię' }}</h3>
          <form @submit.prevent="saveCategory">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nazwa kategorii *</label>
                <input v-model="form.name" type="text" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="np. Filtry i eksploatacja" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Opis (opcjonalnie)</label>
                <textarea v-model="form.description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Krótki opis kategorii..."></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kategoria nadrzędna</label>
                <select v-model="form.parent_id" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option :value="null">(brak — kategoria główna)</option>
                  <option v-for="opt in parentOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
                <p class="text-xs text-secondary-500 mt-1">Wybierz nadrzędną, aby ułożyć kategorie w drzewie</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kolejność sortowania</label>
                <input v-model.number="form.sort_order" type="number" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div v-if="showEditModal">
                <label class="flex items-center">
                  <input v-model="form.is_active" type="checkbox" class="mr-2" />
                  <span class="text-sm font-medium text-gray-700">Kategoria aktywna</span>
                </label>
              </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button type="button" @click="closeModal" class="px-4 py-2 text-gray-600 hover:text-gray-800">Anuluj</button>
              <button type="submit" :disabled="saving" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50">
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
import { ref, computed, onMounted } from 'vue'

const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const editing = ref(null)

const form = ref({ name: '', description: '', sort_order: 0, is_active: true, parent_id: null })

const RAILWAY_BASE = 'https://web-production-fc58d.up.railway.app/api/part-categories'

// Stan rozwiniętych kategorii (Set dla lepszej wydajności)
const expandedCategories = ref(new Set())

// Helper: sprawdź czy kategoria ma dzieci
const hasChildren = (categoryId) => {
  return categories.value.some(c => c.parent_id === categoryId)
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
    const arr = (map.get(pid) || []).sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
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

// Options for parent select (exclude current editing node)
const parentOptions = computed(() => flatCategories.value
  .filter(c => !editing.value || c.id !== editing.value.id)
  .map(c => ({ value: c.id, label: `${'  '.repeat(c._level)}${c.name}` })))

async function loadCategories() {
  loading.value = true
  try {
    const r = await fetch(RAILWAY_BASE)
    if (r.ok) { const j = await r.json(); categories.value = j.data || [] } else { categories.value = [] }
  } finally { loading.value = false }
}

function openAdd(){ showAddModal.value = true; showEditModal.value=false; editing.value=null; form.value={ name:'', description:'', sort_order:0, is_active:true, parent_id:null } }
function closeModal(){ showAddModal.value=false; showEditModal.value=false; editing.value=null }

function editCategory(cat){
  editing.value = cat
  form.value = { name:cat.name, description:cat.description||'', sort_order:cat.sort_order||0, is_active:!!cat.is_active, parent_id: cat.parent_id || null }
  showEditModal.value = true
}

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

function getChildrenCount(categoryId) {
  return categories.value.filter(c => c.parent_id === categoryId).length
}

async function saveCategory(){
  saving.value = true
  try{
    const method = showEditModal.value ? 'PUT' : 'POST'
    const url = showEditModal.value ? `${RAILWAY_BASE}/${editing.value.id}` : RAILWAY_BASE
    const payload = { ...form.value }
    const r = await fetch(url, { method, headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    if(!r.ok){ const e = await r.text(); alert('Błąd: '+e); return }
    await loadCategories(); closeModal()
  }catch(e){ console.error('Save error', e); alert('Błąd zapisu kategorii') } finally{ saving.value=false }
}

async function deleteCategory(cat){
  if(!confirm(`Usunąć kategorię "${cat.name}"?`)) return
  try{ const r = await fetch(`${RAILWAY_BASE}/${cat.id}`, { method:'DELETE' }); if(!r.ok){ const e=await r.text(); alert('Błąd: '+e); return } await loadCategories() }catch(e){ console.error('Delete error', e); alert('Błąd usuwania kategorii') }
}

onMounted(loadCategories)
</script> 