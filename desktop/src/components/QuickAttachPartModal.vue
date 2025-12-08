<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
      <div class="flex items-center justify-between p-6 border-b border-secondary-200">
        <h2 class="text-xl font-bold text-secondary-900">Powiąż część z magazynu</h2>
        <button @click="$emit('close')" class="text-secondary-400 hover:text-secondary-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div>
          <input v-model="query" type="text" class="input-field w-full" placeholder="Szukaj po nazwie lub numerze..." />
        </div>

        <div class="flex items-center justify-between">
          <div class="text-sm text-secondary-600">
            Domyślnie widoczne są tylko części globalne (nieprzypięte).
          </div>
          <label class="inline-flex items-center space-x-2 text-sm">
            <input type="checkbox" v-model="showOtherDevices" />
            <span>Pokaż części z innych urządzeń</span>
          </label>
        </div>

        <div class="max-h-[50vh] overflow-y-auto border border-secondary-200 rounded">
          <table class="min-w-full bg-white rounded">
            <thead class="bg-secondary-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Nazwa</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Nr katalogowy</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500 uppercase">Cena</th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary-200">
              <tr v-for="p in visibleParts" :key="p.id">
                <td class="px-4 py-2 text-sm">
                  <div>{{ p.name }}</div>
                  <div v-if="showOtherDevices && p.device_id" class="text-xs text-secondary-500 mt-0.5">
                    Urządzenie: {{ p.device_name || 'inne' }}
                  </div>
                </td>
                <td class="px-4 py-2 text-sm font-mono text-secondary-600">{{ p.part_number || '-' }}</td>
                <td class="px-4 py-2 text-sm">{{ Number(p.price||0).toFixed(2) }} zł</td>
                <td class="px-4 py-2 text-right">
                  <button class="btn-primary btn-sm" @click="attach(p)">
                    <i class="fas fa-link mr-2"></i>{{ p.device_id ? 'Przenieś' : 'Powiąż' }}
                  </button>
                </td>
              </tr>
              <tr v-if="visibleParts.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-sm text-secondary-600">Brak wyników</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end pt-2">
          <button class="btn-secondary" @click="$emit('close')">Zamknij</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  deviceId: { type: Number, required: true }
})

const emit = defineEmits(['attached', 'close'])

const query = ref('')
const parts = ref([])
const showOtherDevices = ref(false)

const visibleParts = computed(() => {
  const q = query.value.trim().toLowerCase()
  const matchesQuery = (p) => !q || String(p.name || '').toLowerCase().includes(q) || String(p.part_number || '').toLowerCase().includes(q)
  return parts.value
    .filter(p => matchesQuery(p))
    .filter(p => {
      // Nie pokazuj części już przypiętych do bieżącego urządzenia
      if (p.device_id === props.deviceId) return false
      // Domyślnie tylko globalne (device_id null)
      if (!showOtherDevices.value) return p.device_id == null
      // Po włączeniu przełącznika: pokaż globalne i te z innych urządzeń
      return p.device_id == null || p.device_id !== props.deviceId
    })
})

const loadParts = async () => {
  try {
    if (window.electronAPI?.database) {
      const rows = await window.electronAPI.database.query(
        `SELECT sp.id, sp.name, sp.part_number, sp.price, sp.device_id,
                d.name AS device_name
           FROM spare_parts sp
           LEFT JOIN devices d ON sp.device_id = d.id
          ORDER BY sp.name`,
        []
      )
      parts.value = rows || []
    } else {
      parts.value = []
    }
  } catch (_) {
    parts.value = []
  }
}

onMounted(loadParts)

const attach = async (p) => {
  try {
    if (p.device_id && p.device_id !== props.deviceId) {
      const ok = confirm('Ta część jest przypisana do innego urządzenia. Czy przenieść ją do bieżącego?')
      if (!ok) return
    }
    await window.electronAPI.database.run(
      'UPDATE spare_parts SET device_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [props.deviceId, p.id]
    )
    emit('attached')
  } catch (e) {
    alert('Nie udało się powiązać części')
  }
}
</script>


