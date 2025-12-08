<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-4 border-b border-secondary-200">
        <h3 class="text-lg font-semibold text-secondary-900">Dodaj dostawcę</h3>
        <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600"><i class="fas fa-times"></i></button>
      </div>
      <form @submit.prevent="save" class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-1">Nazwa firmy *</label>
          <input v-model="form.name" type="text" class="input-field w-full" required placeholder="np. Hurtownia ABC" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-1">NIP</label>
            <input v-model="form.nip" type="text" class="input-field w-full" placeholder="10 cyfr" />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-1">REGON</label>
            <input v-model="form.regon" type="text" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-1">E‑mail</label>
            <input v-model="form.email" type="email" class="input-field w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-1">Telefon</label>
            <input v-model="form.phone" type="text" class="input-field w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-secondary-700 mb-1">Ulica</label>
          <input v-model="form.address_street" type="text" class="input-field w-full" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-secondary-700 mb-1">Kod pocztowy</label>
            <input v-model="form.address_postal_code" type="text" class="input-field w-full" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-secondary-700 mb-1">Miasto</label>
            <input v-model="form.address_city" type="text" class="input-field w-full" />
          </div>
        </div>
        <div class="flex justify-end space-x-2 border-t border-secondary-200 pt-4">
          <button type="button" @click="$emit('close')" class="btn-secondary">Anuluj</button>
          <button type="submit" :disabled="loading" class="btn-primary">
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            Zapisz dostawcę
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'

const props = defineProps({ supplier: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const form = reactive({
  name: '', nip: '', regon: '', email: '', phone: '',
  address_street: '', address_city: '', address_postal_code: ''
})

onMounted(() => {
  if (props.supplier) {
    Object.assign(form, {
      name: props.supplier.name || '', nip: props.supplier.nip || '', regon: props.supplier.regon || '',
      email: props.supplier.email || '', phone: props.supplier.phone || '',
      address_street: props.supplier.address_street || '', address_city: props.supplier.address_city || '', address_postal_code: props.supplier.address_postal_code || ''
    })
  }
})

const save = async () => {
  if (!form.name.trim()) return
  loading.value = true
  try {
    if (props.supplier && props.supplier.id) {
      const r = await fetch(`http://localhost:5174/api/desktop/suppliers/${props.supplier.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const j = await r.json().catch(()=>({}))
      if (!r.ok || j?.error) throw new Error('Supplier update failed')
      emit('saved')
    } else {
      const r = await fetch('http://localhost:5174/api/desktop/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const j = await r.json().catch(()=>({}))
      if (!r.ok || !j.success) throw new Error('Supplier create failed')
      emit('saved', { id: j.id, name: form.name })
    }
    emit('close')
  } catch (_) { /* keep modal open */ }
  finally { loading.value = false }
}
</script>


