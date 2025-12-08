<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-4 border-b border-secondary-200">
        <h3 class="text-lg font-semibold text-secondary-900">Dostawcy</h3>
        <div class="flex items-center space-x-2">
          <button class="btn-primary btn-sm" @click="showAdd=true"><i class="fas fa-plus mr-2"></i>Dodaj dostawcę</button>
          <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="p-4">
        <div class="mb-3 flex items-center space-x-2">
          <input v-model="q" type="text" class="input-field w-full" placeholder="Szukaj po nazwie lub NIP" />
          <label class="text-sm text-secondary-700 flex items-center space-x-1"><input type="checkbox" v-model="activeOnly" class="mr-2"/>aktywni</label>
          <button class="btn-secondary" @click="load">Odśwież</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th class="text-left py-2 px-3">Nazwa</th>
                <th class="text-left py-2 px-3">NIP</th>
                <th class="text-left py-2 px-3">E‑mail</th>
                <th class="text-left py-2 px-3">Telefon</th>
                <th class="text-left py-2 px-3">Adres</th>
                <th class="text-left py-2 px-3">Status</th>
                <th class="text-left py-2 px-3">Akcje</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary-200">
              <tr v-for="s in filtered" :key="s.id">
                <td class="py-2 px-3">{{ s.name }}</td>
                <td class="py-2 px-3">{{ s.nip || '—' }}</td>
                <td class="py-2 px-3">{{ s.email || '—' }}</td>
                <td class="py-2 px-3">{{ s.phone || '—' }}</td>
                <td class="py-2 px-3">
                  <span v-if="s.address_street || s.address_city || s.address_postal_code">
                    {{ [s.address_street, [s.address_postal_code, s.address_city].filter(Boolean).join(' ')].filter(Boolean).join(', ') }}
                  </span>
                  <span v-else>—</span>
                </td>
                <td class="py-2 px-3">
                  <span :class="Number(s.is_active)===1 ? 'text-green-700' : 'text-secondary-500'">{{ Number(s.is_active)===1 ? 'aktywny' : 'archiwalny' }}</span>
                </td>
                <td class="py-2 px-3">
                  <div class="flex items-center space-x-2">
                    <button class="btn-secondary btn-sm" @click="openContacts(s.id)" title="Kontakty"><i class="fas fa-user-friends"></i></button>
                    <button class="btn-secondary btn-sm" @click="openEdit(s)" title="Edytuj"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary btn-sm" @click="toggleActive(s)" :title="Number(s.is_active)===1 ? 'Archiwizuj' : 'Przywróć'">
                      <i :class="Number(s.is_active)===1 ? 'fas fa-archive' : 'fas fa-undo' "></i>
                    </button>
                    <button class="btn-secondary btn-sm" @click="openReassign(s.id)" title="Przenieś części"><i class="fas fa-retweet"></i></button>
                  </div>
                </td>
              </tr>
              <tr v-if="filtered.length===0">
                <td colspan="7" class="py-4 px-3 text-center text-secondary-600">Brak dostawców</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <SupplierFormModal v-if="showAdd" @close="showAdd=false" @saved="onSaved" />
    <SupplierContactsModal v-if="showContacts" :supplier-id="contactSupplierId" @close="showContacts=false" />
    <SupplierFormModal v-if="showEdit" :supplier="editSupplier" @close="showEdit=false" @saved="onSaved" />
    <div v-if="showReassign" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-4">
        <h3 class="text-lg font-semibold text-secondary-900 mb-3">Przenieś części do innego dostawcy</h3>
        <div class="mb-3 text-sm text-secondary-700">Źródło: #{{ reassignSourceId }}</div>
        <label class="block text-sm font-medium text-secondary-700 mb-1">Docelowy dostawca</label>
        <select v-model="reassignTargetId" class="select-field w-full">
          <option :value="null">Wybierz...</option>
          <option v-for="s in suppliers.filter(x=>x.id!==reassignSourceId)" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <div class="mt-4 flex justify-end space-x-2">
          <button class="btn-secondary" @click="showReassign=false">Anuluj</button>
          <button class="btn-primary" :disabled="!reassignTargetId" @click="doReassign">Przenieś</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SupplierFormModal from './SupplierFormModal.vue'
import SupplierContactsModal from './SupplierContactsModal.vue'

const emit = defineEmits(['close'])
const suppliers = ref([])
const q = ref('')
const activeOnly = ref(true)
const showAdd = ref(false)
const showContacts = ref(false)
const contactSupplierId = ref(null)
const showEdit = ref(false)
const editSupplier = ref(null)
const showReassign = ref(false)
const reassignSourceId = ref(null)
const reassignTargetId = ref(null)

const load = async () => {
  const url = `http://localhost:5174/api/desktop/suppliers?active=${activeOnly.value ? 1 : 0}&query=${encodeURIComponent(q.value)}`
  const r = await fetch(url)
  suppliers.value = await r.json().catch(()=>[])
}
const filtered = computed(() => suppliers.value)
const onSaved = async () => { showAdd.value = false; await load() }
const openContacts = (id) => { contactSupplierId.value = id; showContacts.value = true }
const openEdit = (s) => { editSupplier.value = s; showEdit.value = true }
const toggleActive = async (s) => {
  const to = Number(s.is_active)===1 ? 0 : 1
  await fetch(`http://localhost:5174/api/desktop/suppliers/${s.id}/active`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ is_active: to }) })
  await load()
}
const openReassign = async (id) => { reassignSourceId.value = id; reassignTargetId.value = null; showReassign.value = true }
const doReassign = async () => {
  await fetch(`http://localhost:5174/api/desktop/suppliers/${reassignSourceId.value}/reassign`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ targetSupplierId: reassignTargetId.value }) })
  showReassign.value = false
}
onMounted(load)
</script>


