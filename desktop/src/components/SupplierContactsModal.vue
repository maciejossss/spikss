<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-4 border-b border-secondary-200">
        <h3 class="text-lg font-semibold text-secondary-900">Kontakty dostawcy</h3>
        <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600"><i class="fas fa-times"></i></button>
      </div>
      <div class="p-4">
        <div class="mb-4">
          <h4 class="text-sm font-medium text-secondary-700 mb-2">Dodaj osobę kontaktową</h4>
          <form @submit.prevent="addContact" class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-secondary-700 mb-1">Imię i nazwisko</label>
              <input v-model="form.full_name" type="text" class="input-field w-full" placeholder="np. Jan Kowalski" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-1">Telefon</label>
              <input v-model="form.phone" type="text" class="input-field w-full" placeholder="np. +48 600 000 000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary-700 mb-1">E‑mail</label>
              <input v-model="form.email" type="email" class="input-field w-full" placeholder="np. jan@firma.pl" />
            </div>
            <div class="md:col-span-4">
              <label class="block text-sm font-medium text-secondary-700 mb-1">Rola/opis (opcjonalnie)</label>
              <input v-model="form.role" type="text" class="input-field w-full" placeholder="np. handlowiec / opiekun" />
            </div>
            <div class="md:col-span-4 flex justify-end">
              <button type="submit" :disabled="loading" class="btn-primary">
                <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
                Dodaj kontakt
              </button>
            </div>
          </form>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th class="text-left py-2 px-3">Imię i nazwisko</th>
                <th class="text-left py-2 px-3">Telefon</th>
                <th class="text-left py-2 px-3">E‑mail</th>
                <th class="text-left py-2 px-3">Rola</th>
                <th class="text-right py-2 px-3">Akcje</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary-200">
              <tr v-for="c in contacts" :key="c.id">
                <td class="py-2 px-3">
                  <input v-if="editId===c.id" v-model="edit.full_name" class="input-field w-full" />
                  <span v-else>{{ c.full_name || '—' }}</span>
                </td>
                <td class="py-2 px-3">
                  <input v-if="editId===c.id" v-model="edit.phone" class="input-field w-full" />
                  <span v-else>{{ c.phone || '—' }}</span>
                </td>
                <td class="py-2 px-3">
                  <input v-if="editId===c.id" v-model="edit.email" class="input-field w-full" />
                  <span v-else>{{ c.email || '—' }}</span>
                </td>
                <td class="py-2 px-3">
                  <input v-if="editId===c.id" v-model="edit.role" class="input-field w-full" />
                  <span v-else>{{ c.role || '—' }}</span>
                </td>
                <td class="py-2 px-3 text-right">
                  <div class="flex items-center justify-end space-x-2">
                    <button v-if="editId!==c.id" class="btn-secondary btn-sm" @click="startEdit(c)"><i class="fas fa-edit"></i></button>
                    <button v-if="editId===c.id" class="btn-primary btn-sm" @click="saveEdit(c.id)"><i class="fas fa-check"></i></button>
                    <button v-if="editId===c.id" class="btn-secondary btn-sm" @click="cancelEdit"><i class="fas fa-times"></i></button>
                    <button class="btn-secondary btn-sm" @click="remove(c.id)"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
              <tr v-if="contacts.length===0">
                <td colspan="5" class="py-4 px-3 text-center text-secondary-600">Brak kontaktów</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const props = defineProps({ supplierId: { type: Number, required: true } })
const emit = defineEmits(['close'])

const contacts = ref([])
const loading = ref(false)
const form = reactive({ full_name: '', phone: '', email: '', role: '' })
const editId = ref(null)
const edit = ref({ full_name: '', phone: '', email: '', role: '' })

const load = async () => {
  const r = await fetch(`http://localhost:5174/api/desktop/suppliers/${props.supplierId}/contacts`)
  contacts.value = await r.json().catch(()=>[])
}

const addContact = async () => {
  if (!form.full_name.trim()) return
  loading.value = true
  try {
    await fetch(`http://localhost:5174/api/desktop/suppliers/${props.supplierId}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
    })
    form.full_name=''; form.phone=''; form.email=''; form.role=''
    await load()
  } finally { loading.value = false }
}

const startEdit = (c) => { editId.value = c.id; edit.value = { full_name: c.full_name || '', phone: c.phone || '', email: c.email || '', role: c.role || '' } }
const cancelEdit = () => { editId.value = null }
const saveEdit = async (id) => {
  await fetch(`http://localhost:5174/api/desktop/suppliers/${props.supplierId}/contacts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit.value) })
  editId.value = null
  await load()
}
const remove = async (id) => {
  await fetch(`http://localhost:5174/api/desktop/suppliers/${props.supplierId}/contacts/${id}`, { method: 'DELETE' })
  await load()
}

onMounted(load)
</script>


