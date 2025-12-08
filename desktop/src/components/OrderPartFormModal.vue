<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto m-4">
      <div class="flex items-center justify-between p-6 border-b border-secondary-200">
        <h2 class="text-xl font-bold text-secondary-900">
          {{ isEdit ? 'Edytuj pozycję części' : 'Dodaj część do zlecenia' }}
        </h2>
        <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <form @submit.prevent="save" class="p-6 space-y-5">
        <div class="space-y-2">
          <!-- Filtry listy magazynowej (jak w pełnym formularzu) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Kategoria główna</label>
              <select v-model="filterMainId" class="select-field w-full">
                <option :value="null">Kategoria główna</option>
                <option v-for="opt in topLevelCategories" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Podkategoria (wyb.)</label>
              <select v-model="filterChildId" class="select-field w-full" :disabled="!filterMainId || childrenOfFilterMain.length===0">
                <option :value="null">Podkategoria (wyb.)</option>
                <option v-for="opt in childrenOfFilterMain" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Szukaj po nazwie lub nr</label>
              <input v-model="searchText" type="text" class="input-field w-full" placeholder="Szukaj po nazwie lub nr" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">
              Część z magazynu
            </label>
            <select v-model="selectedPartKey" class="select-field w-full">
              <option :value="null">Wybierz część</option>
              <option v-for="p in filteredSpareParts" :key="p.key" :value="p.key">
                {{ p.name }} ({{ p.part_number || 'brak nr' }}) — domyślna: {{ (p.price||0).toFixed(2) }} zł
              </option>
            </select>
          </div>
          <div class="text-xs text-secondary-600">lub dodaj nową część do katalogu i do tego zlecenia:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Nazwa nowej części</label>
              <input v-model="newPart.name" type="text" class="input-field w-full" placeholder="np. Uszczelka komory" />
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Nr katalogowy (opcjonalnie)</label>
              <input v-model="newPart.part_number" type="text" class="input-field w-full" placeholder="np. VIE-USZ-003" />
            </div>
          </div>
          <!-- Kategoria główna / Podkategoria jak w pełnym formularzu części -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Kategoria główna</label>
              <select v-model="mainCategoryId" class="select-field w-full">
                <option :value="null">(brak)</option>
                <option v-for="opt in topLevelCategories" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-2">Podkategoria (opcjonalnie)</label>
              <select v-model="childCategoryId" class="select-field w-full" :disabled="!mainCategoryId || childrenOfMain.length===0">
                <option :value="null">(brak podkategorii)</option>
                <option v-for="opt in childrenOfMain" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
              </select>
            </div>
          </div>
          <p v-if="formError" class="text-red-600 text-xs">{{ formError }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Ilość</label>
            <input v-model.number="quantity" type="number" min="1" class="input-field w-full" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Cena jedn. (zł)</label>
            <input v-model.number="unitPrice" type="number" step="0.01" min="0" class="input-field w-full" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-2">Wartość (zł)</label>
            <input :value="totalPrice.toFixed(2)" type="text" class="input-field w-full bg-secondary-50" disabled />
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
          <button type="button" @click="$emit('close')" class="btn-secondary">Anuluj</button>
          <button type="submit" :disabled="isSaving || (!selectedPartKey && !(newPart.name && newPart.name.trim()))" class="btn-primary">
            <i v-if="isSaving" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-save mr-2"></i>
            {{ isEdit ? 'Zapisz zmiany' : 'Dodaj część' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  orderId: { type: Number, required: true },
  deviceId: { type: Number, default: null },
  // If editing existing order_parts row
  partRow: { type: Object, default: null },
  isEdit: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'saved'])

const VAT_DEFAULT = 23
const spareParts = ref([])
const selectedPartKey = ref(null)
const quantity = ref(1)
const unitPrice = ref(0)
const isSaving = ref(false)
const formError = ref('')
const newPart = ref({ name: '', part_number: '' })

const totalPrice = computed(() => (Number(quantity.value || 0) * Number(unitPrice.value || 0)) || 0)

// Kategorie części (Railway) – takie same jak w PartFormModal
const categoriesRaw = ref([])
const mainCategoryId = ref(null)
const childCategoryId = ref(null)
const topLevelCategories = computed(() =>
  categoriesRaw.value
    .filter(c => !c.parent_id)
    .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
)
const childrenOfMain = computed(() =>
  categoriesRaw.value
    .filter(c => c.parent_id === mainCategoryId.value)
    .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
)
watch(mainCategoryId, () => { childCategoryId.value = null })

function resolveCategoryNameForSave(){
  const byId = new Map(categoriesRaw.value.map(c => [c.id, c]))
  if (childCategoryId.value && byId.get(childCategoryId.value)) return byId.get(childCategoryId.value).name
  if (mainCategoryId.value && byId.get(mainCategoryId.value)) return byId.get(mainCategoryId.value).name
  return ''
}

async function loadPartCategories(){
  // 1) Spróbuj lokalnego API (szybsze i offline)
  try{
    const r1 = await fetch('/api/part-categories')
    if(r1.ok){ const j=await r1.json(); categoriesRaw.value = j.data || [] }
  }catch{ /* ignore */ }
  // 2) Fallback – spróbuj Railway tylko jeśli lokalnie brak danych
  if(!Array.isArray(categoriesRaw.value) || categoriesRaw.value.length===0){
    try{
      const r2 = await fetch('https://web-production-fc58d.up.railway.app/api/part-categories')
      if(r2.ok){ const j=await r2.json(); categoriesRaw.value = j.data || [] }
    }catch{ /* ignore */ }
  }
  if(!Array.isArray(categoriesRaw.value)) categoriesRaw.value = []
}

// Filtry listy magazynowej
const filterMainId = ref(null)
const filterChildId = ref(null)
const searchText = ref('')
watch(filterMainId, () => { filterChildId.value = null })
const childrenOfFilterMain = computed(() =>
  categoriesRaw.value
    .filter(c => c.parent_id === filterMainId.value)
    .sort((a,b)=> (a.sort_order||0)-(b.sort_order||0) || a.name.localeCompare(b.name))
)

const filteredSpareParts = computed(() => {
  let list = [...(spareParts.value || [])]
  // Category filter by name (case-insensitive, trimmed)
  if (filterMainId.value || filterChildId.value) {
    const byId = new Map(categoriesRaw.value.map(c => [c.id, c]))
    const allowedNames = new Set()
    const norm = (s) => String(s||'').trim().toLowerCase()
    if (filterChildId.value && byId.get(filterChildId.value)) {
      // include child and its parent category name
      const child = byId.get(filterChildId.value)
      allowedNames.add(norm(child.name))
      const parent = child && child.parent_id ? byId.get(child.parent_id) : null
      if (parent && parent.name) allowedNames.add(norm(parent.name))
    } else if (filterMainId.value && byId.get(filterMainId.value)) {
      // include main and all children names
      const main = byId.get(filterMainId.value)
      allowedNames.add(norm(main.name))
      for (const c of categoriesRaw.value) {
        if (c.parent_id === filterMainId.value) allowedNames.add(norm(c.name))
      }
    }
    list = list.filter(p => {
      if (!allowedNames.size) return true
      return allowedNames.has(norm(p.category))
    })
  }
  if (searchText.value && String(searchText.value).trim()) {
    const q = String(searchText.value).trim().toLowerCase()
    list = list.filter(p => String(p.name||'').toLowerCase().includes(q) || String(p.part_number||'').toLowerCase().includes(q))
  }
  return list
})

const normalizeSparePart = (row = {}) => {
  const gross = Number(row.gross_price ?? row.price ?? 0)
  const vat = Number(row.vat_rate ?? VAT_DEFAULT)
  const net = row.net_price != null
    ? Number(row.net_price)
    : (vat === 0 ? gross : gross / (1 + vat / 100))
  return {
    ...row,
    gross_price: Number(gross.toFixed(2)),
    net_price: Number(net.toFixed(2)),
    vat_rate: vat,
    currency: row.currency || 'PLN',
    price: Number(gross.toFixed(2))
  }
}

const generateMagazineCode = async () => {
  try {
    const resp = await fetch('http://localhost:5174/api/desktop/spare-parts/generate-code')
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}))
      if (data?.code) return String(data.code).toUpperCase()
    }
  } catch (_) { /* ignore */ }
  return `MAG-${Date.now()}`
}

const loadSpareParts = async () => {
  try {
    if (window.electronAPI?.database) {
      let rows = []
      if (props.deviceId != null) {
        rows = await window.electronAPI.database.query(
          `SELECT id, name, part_number, manufacturer, brand, category,
                  COALESCE(gross_price, price, 0) AS price,
                  gross_price, net_price, vat_rate, currency
           FROM spare_parts
           WHERE (device_id = ? OR device_id IS NULL)
           ORDER BY name`,
          [props.deviceId]
        )
      } else {
        rows = await window.electronAPI.database.query(
          `SELECT id, name, part_number, manufacturer, brand, category,
                  COALESCE(gross_price, price, 0) AS price,
                  gross_price, net_price, vat_rate, currency
           FROM spare_parts
           WHERE device_id IS NULL
           ORDER BY name`
        )
      }
      spareParts.value = Array.isArray(rows) ? rows.map(normalizeSparePart) : []
    } else {
      spareParts.value = []
    }
  } catch (_) {
    spareParts.value = []
  }

  spareParts.value = (spareParts.value || []).map(r => ({ ...r, key: `local:${r.id}`, _source: 'local' }))
}

watch(selectedPartKey, () => {
  const found = spareParts.value.find(p => p.key === selectedPartKey.value)
  if (found && !props.isEdit) {
    unitPrice.value = Number(found.gross_price ?? found.price ?? 0)
  }
})

onMounted(async () => {
  await loadSpareParts()
  await loadPartCategories()
  if (props.isEdit && props.partRow) {
    selectedPartKey.value = props.partRow.part_id ? `local:${props.partRow.part_id}` : null
    quantity.value = Number(props.partRow.quantity || 1)
    unitPrice.value = Number(props.partRow.unit_price || 0)
  }
})

const save = async () => {
  formError.value = ''
  if (!quantity.value || unitPrice.value == null) {
    formError.value = 'Podaj ilość i cenę'
    return
  }
  isSaving.value = true
  try {
    if (props.isEdit && props.partRow) {
      const oldPartId = Number(props.partRow.part_id)
      const oldQty = Number(props.partRow.quantity || 0)
      const newPartId = selectedPartKey.value && String(selectedPartKey.value).startsWith('local:')
        ? Number(String(selectedPartKey.value).split(':')[1])
        : 0
      const newQty = Number(quantity.value)

      // Walidacja dostępności magazynowej dla nowej części
      if (newPartId && (newPartId !== oldPartId || newQty > oldQty)) {
        try {
          const rows = await window.electronAPI.database.query('SELECT stock_quantity FROM spare_parts WHERE id = ?', [newPartId])
          const stock = Number(rows?.[0]?.stock_quantity || 0)
          const needed = newPartId === oldPartId ? Math.max(newQty - oldQty, 0) : newQty
          if (stock < needed) {
            formError.value = 'Brak wystarczającej ilości na stanie'
            isSaving.value = false
            return
          }
        } catch (_) { /* soft fail -> kontynuuj */ }
      }

      await window.electronAPI.database.run(
        `UPDATE order_parts SET part_id = ?, quantity = ?, unit_price = ?, total_price = ? WHERE id = ?`,
        [newPartId || null, newQty, Number(unitPrice.value), totalPrice.value, props.partRow.id]
      )

      // Aktualizacja stanów magazynowych po edycji
      try {
        if (newPartId !== oldPartId) {
          // Zwróć stary stan
          if (oldPartId) {
            await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) + ? WHERE id = ?', [oldQty, oldPartId])
          }
          // Zdejmij nowy stan
          if (newPartId) {
            await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) - ? WHERE id = ?', [newQty, newPartId])
          }
        } else if (newQty !== oldQty && newPartId) {
          const delta = newQty - oldQty
          if (delta !== 0) {
            // delta>0 zdejmujemy, delta<0 dokładamy
            await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) - ? WHERE id = ?', [Math.max(delta,0), newPartId])
            await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) + ? WHERE id = ?', [Math.max(-delta,0), newPartId])
          }
        }
      } catch (_) { /* soft fail */ }
    } else {
      // Rozwiąż wybór lokalny/zdalny
      let partId = null
      const selected = (spareParts.value || []).find(p => p.key === selectedPartKey.value) || null
      if (selected && selected._source === 'local') {
        partId = Number(String(selected.key).split(':')[1])
      }
      // If no existing part selected but new name provided, create part in catalog first
      if (!partId && newPart.value.name.trim()) {
        const code = await generateMagazineCode()
        const gross = Number(unitPrice.value) || 0
        const vat = VAT_DEFAULT
        const net = vat === 0 ? gross : Number((gross / (1 + vat / 100)).toFixed(2))
        const timestamp = new Date().toISOString()
        const created = await window.electronAPI.database.run(
          `INSERT INTO spare_parts (
             magazine_code, name, part_number, manufacturer, brand, category,
             gross_price, net_price, vat_rate, currency, price,
             stock_quantity, min_stock_level, device_id, created_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
          [
            code,
            newPart.value.name.trim(),
            (newPart.value.part_number || '').trim() || null,
            'Nieznany',
            null,
            resolveCategoryNameForSave(),
            gross,
            net,
            vat,
            'PLN',
            gross,
            props.deviceId || null,
            timestamp,
            timestamp
          ]
        )
        partId = created.lastID || created.insertId || created.id
      }

      if (!partId && selected && selected._source === 'remote') {
        const code = await generateMagazineCode()
        const gross = Number(selected.price || 0)
        const vat = Number(selected.vat_rate ?? VAT_DEFAULT)
        const net = vat === 0 ? gross : Number((gross / (1 + vat / 100)).toFixed(2))
        const timestamp = new Date().toISOString()
        // Utwórz lokalny rekord na podstawie katalogu z backendu
        const created = await window.electronAPI.database.run(
          `INSERT INTO spare_parts (
             magazine_code, name, part_number, manufacturer, brand, category,
             description, gross_price, net_price, vat_rate, currency, price,
             stock_quantity, min_stock_level, device_id, created_at, updated_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
          [
            code,
            selected.name,
            selected.part_number || null,
            selected.manufacturer || 'Nieznany',
            selected.brand || null,
            selected.category || '',
            selected.description || null,
            gross,
            net,
            vat,
            selected.currency || 'PLN',
            gross,
            props.deviceId || null,
            timestamp,
            timestamp
          ]
        )
        partId = created.lastID || created.insertId || created.id
      }

      if (!partId) {
        formError.value = 'Wybierz część z magazynu lub wpisz nazwę nowej części'
        isSaving.value = false
        return
      }

      // Walidacja dostępności magazynowej
      try {
        const rows = await window.electronAPI.database.query('SELECT stock_quantity FROM spare_parts WHERE id = ?', [partId])
        const stock = Number(rows?.[0]?.stock_quantity || 0)
        if (stock < Number(quantity.value)) {
          formError.value = 'Brak wystarczającej ilości na stanie'
          isSaving.value = false
          return
        }
      } catch (_) { /* soft fail */ }

      await window.electronAPI.database.run(
        `INSERT INTO order_parts (order_id, part_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)`,
        [props.orderId, partId, Number(quantity.value), Number(unitPrice.value), totalPrice.value]
      )

      // Zdejmij stan magazynowy
      try {
        await window.electronAPI.database.run('UPDATE spare_parts SET stock_quantity = COALESCE(stock_quantity,0) - ? WHERE id = ?', [Number(quantity.value), partId])
      } catch (_) { /* soft fail */ }
    }
    emit('saved')
  } catch (e) {
    formError.value = 'Nie udało się zapisać pozycji części'
  } finally {
    isSaving.value = false
  }
}
</script>


