// Komponent szczegółów zlecenia z interfejsem kafelków
const OrderDetail = {
  props: ['order', 'categories'],
  emits: ['back', 'order-updated'],

  setup(props, { emit }) {
    const completedCategories = ref(new Set());
    const photos = ref([]);
    const notes = ref('');
    const isSubmitting = ref(false);
    const showCamera = ref(false);
    const showRejectModal = ref(false);
    const rejectReason = ref('');

    // Parsuj kategorie z zlecenia
    const orderCategories = computed(() => {
      try {
        const categoryIds = JSON.parse(props.order.service_categories || '[]');
        return categoryIds.map(id => ({
          id,
          ...props.categories[id],
          completed: completedCategories.value.has(id)
        }));
      } catch (error) {
        console.error('Błąd parsowania kategorii:', error);
        return [];
      }
    });

    // Grupy kategorii dla lepszej organizacji
    const categoryGroups = computed(() => {
      const groups = {};
      orderCategories.value.forEach(category => {
        const group = category.group || 'Inne';
        if (!groups[group]) {
          groups[group] = [];
        }
        groups[group].push(category);
      });
      return groups;
    });

    // Toggle kategoria
    const toggleCategory = (categoryId) => {
      if (completedCategories.value.has(categoryId)) {
        completedCategories.value.delete(categoryId);
      } else {
        completedCategories.value.add(categoryId);
      }
    };

    // Dodaj zdjęcie
    const addPhoto = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Preferuj tylną kamerę
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            photos.value.push({
              id: Date.now(),
              data: e.target.result,
              filename: file.name,
              size: file.size,
              timestamp: new Date().toISOString()
            });
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    };

    // Usuń zdjęcie
    const removePhoto = (photoId) => {
      photos.value = photos.value.filter(p => p.id !== photoId);
    };

    // State dla rozpoczynania pracy
    const isStarting = ref(false);

    // Rozpocznij pracę
    const startWork = async () => {
      if (isStarting.value) return; // Zapobiegaj wielokrotnym kliknięciom
      
      isStarting.value = true;
      
      try {
        console.log('🚀 Rozpoczynam pracę dla zlecenia:', props.order.id);
        
        const success = await API.updateOrderStatus(
          props.order.id, 
          'in_progress', 
          [], 
          [], 
          'Rozpoczęcie pracy'
        );
        
        if (success) {
          // Nie mutuj props bezpośrednio - emituj event
          console.log('✅ Praca rozpoczęta pomyślnie');
          emit('order-updated');
          alert('✅ Rozpoczęto pracę!');
        } else {
          console.log('❌ Błąd podczas rozpoczynania pracy');
          alert('❌ Nie udało się rozpocząć pracy. Spróbuj ponownie.');
        }
      } catch (error) {
        console.error('❌ Błąd:', error);
        alert('❌ Błąd podczas rozpoczynania pracy');
      } finally {
        isStarting.value = false;
      }
    };

    // Zlecenie nie zrealizowane
    const rejectOrder = async () => {
      if (!rejectReason.value.trim()) {
        alert('Wprowadź powód nie zrealizowania zlecenia');
        return;
      }

      isSubmitting.value = true;
      
      try {
        const success = await API.updateOrderStatus(
          props.order.id,
          'rejected',
          [],
          [],
          `Zlecenie nie zrealizowane: ${rejectReason.value}`
        );

        if (success) {
          alert('✅ Zlecenie oznaczone jako nie zrealizowane');
          emit('order-updated');
          emit('back');
        } else {
          alert('❌ Błąd podczas oznaczania zlecenia');
        }
      } catch (error) {
        alert('❌ Błąd podczas oznaczania zlecenia');
      } finally {
        isSubmitting.value = false;
        showRejectModal.value = false;
        rejectReason.value = '';
      }
    };

    // Zakończ zlecenie
    const completeOrder = async () => {
      if (completedCategories.value.size === 0) {
        alert('Zaznacz przynajmniej jedną wykonaną pracę');
        return;
      }

      isSubmitting.value = true;
      
      try {
        const success = await API.updateOrderStatus(
          props.order.id,
          'completed',
          Array.from(completedCategories.value),
          photos.value,
          notes.value
        );

        if (success) {
          alert('✅ Zlecenie zostało ukończone!');
          emit('order-updated');
          emit('back');
        } else {
          alert('❌ Błąd podczas kończenia zlecenia');
        }
      } catch (error) {
        alert('❌ Błąd podczas kończenia zlecenia');
      } finally {
        isSubmitting.value = false;
      }
    };

    // Zadzwoń do klienta
    const callClient = () => {
      if (props.order.client_phone) {
        window.location.href = `tel:${props.order.client_phone}`;
      }
    };

    // Otwórz nawigację
    const openNavigation = () => {
      if (props.order.address) {
        const encodedAddress = encodeURIComponent(props.order.address);
        window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
      }
    };

    // Formatuj datę
    const formatDateTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return {
      completedCategories,
      photos,
      notes,
      isSubmitting,
      showCamera,
      showRejectModal,
      rejectReason,
      orderCategories,
      categoryGroups,
      toggleCategory,
      addPhoto,
      removePhoto,
      startWork,
      rejectOrder,
      completeOrder,
      callClient,
      openNavigation,
      formatDateTime
    };
  },

  template: `
    <div class="bg-gray-50 min-h-screen">
      <!-- Header zlecenia -->
      <div class="bg-white shadow-sm border-b p-4">
        <div class="space-y-3">
          <!-- Numer i status -->
          <div class="flex items-center justify-between">
            <span class="font-mono text-sm text-gray-500">{{ order.order_number }}</span>
            <span 
              class="px-3 py-1 text-sm rounded-full text-white"
              :class="{
                'bg-blue-500': order.status === 'new',
                'bg-yellow-500': order.status === 'in_progress', 
                'bg-green-500': order.status === 'completed',
                'bg-red-500': order.status === 'rejected'
              }"
            >
              {{ order.status === 'new' ? 'Nowe' : order.status === 'in_progress' ? 'W trakcie' : order.status === 'completed' ? 'Ukończone' : 'Nie zrealizowane' }}
            </span>
          </div>

          <!-- Tytuł -->
          <h1 class="text-xl font-bold text-gray-900">{{ order.title }}</h1>

          <!-- Termin -->
          <div class="flex items-center text-gray-600">
            <i class="fas fa-calendar-alt mr-2"></i>
            <span>{{ formatDateTime(order.scheduled_date) }}</span>
          </div>
        </div>
      </div>

      <!-- Informacje o kliencie -->
      <div class="bg-white mt-2 p-4">
        <h3 class="font-semibold text-gray-900 mb-3">Klient</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="fas fa-user w-5 mr-3 text-gray-400"></i>
              <span class="font-medium">{{ order.client_name }}</span>
            </div>
            <button 
              @click="callClient"
              class="p-2 bg-green-600 text-white rounded-lg"
              v-if="order.client_phone"
            >
              <i class="fas fa-phone"></i>
            </button>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <i class="fas fa-map-marker-alt w-5 mr-3 text-gray-400"></i>
              <span class="text-gray-700">{{ order.address }}</span>
            </div>
            <button 
              @click="openNavigation"
              class="p-2 bg-blue-600 text-white rounded-lg"
            >
              <i class="fas fa-directions"></i>
            </button>
          </div>

          <div class="flex items-center">
            <i class="fas fa-cog w-5 mr-3 text-gray-400"></i>
            <span class="text-gray-700">{{ order.device_name }}</span>
          </div>
        </div>
      </div>

      <!-- Opis zlecenia -->
      <div class="bg-white mt-2 p-4" v-if="order.description">
        <h3 class="font-semibold text-gray-900 mb-2">Opis zlecenia</h3>
        <p class="text-gray-700 leading-relaxed">{{ order.description }}</p>
      </div>

      <!-- Kategorie prac do wykonania - WIDOCZNE TYLKO PO ROZPOCZĘCIU PRACY -->
      <div class="bg-white mt-2 p-4" v-if="order.status === 'in_progress'">
        <h3 class="font-semibold text-gray-900 mb-4">Czynności wykonane</h3>
        
        <div class="space-y-4">
          <div v-for="(categories, groupName) in categoryGroups" :key="groupName">
            <h4 class="font-medium text-gray-800 mb-2">{{ groupName }}</h4>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="category in categories"
                :key="category.id"
                @click="toggleCategory(category.id)"
                class="mobile-tile p-4 rounded-xl border-2 text-left transition-all"
                :class="{
                  'bg-green-100 border-green-500 text-green-800': category.completed,
                  'bg-gray-50 border-gray-200 text-gray-700': !category.completed
                }"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3">
                      <span class="font-mono text-sm bg-gray-200 px-2 py-1 rounded">{{ category.id }}</span>
                      <i 
                        class="text-xl"
                        :class="{
                          'fas fa-check-circle text-green-600': category.completed,
                          'far fa-circle text-gray-400': !category.completed
                        }"
                      ></i>
                    </div>
                    <p class="mt-2 font-medium">{{ category.name }}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Zdjęcia - WIDOCZNE TYLKO PO ROZPOCZĘCIU PRACY -->
      <div class="bg-white mt-2 p-4" v-if="order.status === 'in_progress'">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Zdjęcia ({{ photos.length }})</h3>
          <button 
            @click="addPhoto"
            class="p-2 bg-blue-600 text-white rounded-lg"
          >
            <i class="fas fa-camera mr-2"></i>
            Dodaj
          </button>
        </div>

        <div v-if="photos.length === 0" class="text-center py-8 text-gray-500">
          <i class="fas fa-camera text-3xl mb-2"></i>
          <p>Brak zdjęć</p>
        </div>

        <div v-else class="grid grid-cols-3 gap-2">
          <div 
            v-for="photo in photos" 
            :key="photo.id"
            class="relative aspect-square"
          >
            <img 
              :src="photo.data" 
              class="w-full h-full object-cover rounded-lg"
              :alt="photo.filename"
            >
            <button
              @click="removePhoto(photo.id)"
              class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <!-- Uwagi - WIDOCZNE TYLKO PO ROZPOCZĘCIU PRACY -->
      <div class="bg-white mt-2 p-4" v-if="order.status === 'in_progress'">
        <h3 class="font-semibold text-gray-900 mb-3">Notatki z pracy</h3>
        <textarea
          v-model="notes"
          placeholder="Dodaj notatki z wykonanej pracy..."
          class="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows="3"
        ></textarea>
      </div>

      <!-- Akcje -->
      <div class="p-4 pb-8">
        <!-- Rozpocznij pracę -->
        <button
          v-if="order.status === 'new'"
          @click="startWork"
          :disabled="isStarting"
          class="w-full mb-3 py-4 font-bold rounded-xl text-lg transition-colors"
          :class="{
            'bg-yellow-600 text-white hover:bg-yellow-700': !isStarting,
            'bg-gray-400 text-gray-600 cursor-not-allowed': isStarting
          }"
        >
          <i v-if="isStarting" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-play mr-2"></i>
          {{ isStarting ? 'Rozpoczynam...' : 'Rozpocznij pracę' }}
        </button>

        <!-- Zlecenie nie zrealizowane -->
        <button
          v-if="order.status === 'new'"
          @click="showRejectModal = true"
          class="w-full mb-3 py-4 font-bold rounded-xl text-lg bg-red-600 text-white hover:bg-red-700"
        >
          <i class="fas fa-times mr-2"></i>
          Zlecenie nie zrealizowane
        </button>

        <!-- Zakończ zlecenie -->
        <button
          v-if="order.status === 'in_progress'"
          @click="completeOrder"
          :disabled="isSubmitting || completedCategories.size === 0"
          class="w-full py-4 font-bold rounded-xl text-lg"
          :class="{
            'bg-green-600 text-white': completedCategories.size > 0 && !isSubmitting,
            'bg-gray-400 text-gray-600': completedCategories.size === 0 || isSubmitting
          }"
        >
          <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
          <i v-else class="fas fa-check mr-2"></i>
          {{ isSubmitting ? 'Zapisywanie...' : 'Zakończ zlecenie' }}
        </button>

        <!-- Zlecenie ukończone -->
        <div v-if="order.status === 'completed'" class="text-center py-4">
          <i class="fas fa-check-circle text-4xl text-green-600 mb-2"></i>
          <p class="text-green-600 font-semibold">Zlecenie ukończone</p>
        </div>

        <!-- Zlecenie nie zrealizowane -->
        <div v-if="order.status === 'rejected'" class="text-center py-4">
          <i class="fas fa-times-circle text-4xl text-red-600 mb-2"></i>
          <p class="text-red-600 font-semibold">Zlecenie nie zrealizowane</p>
        </div>

        <!-- Statystyki -->
        <div class="mt-4 text-center text-sm text-gray-500" v-if="order.status === 'in_progress'">
          Zaznaczone prace: {{ completedCategories.size }} / {{ orderCategories.length }}
        </div>
      </div>

      <!-- Modal zlecenie nie zrealizowane -->
      <div v-if="showRejectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl p-6 m-4 max-w-md w-full">
          <h3 class="text-lg font-bold mb-4">Zlecenie nie zrealizowane</h3>
          <textarea
            v-model="rejectReason"
            placeholder="Wprowadź powód nie zrealizowania zlecenia..."
            class="w-full p-3 border border-gray-300 rounded-lg resize-none mb-4"
            rows="3"
          ></textarea>
          <div class="flex space-x-3">
            <button
              @click="showRejectModal = false"
              class="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg"
            >
              Anuluj
            </button>
            <button
              @click="rejectOrder"
              :disabled="isSubmitting || !rejectReason.trim()"
              class="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg"
              :class="{ 'opacity-50': isSubmitting || !rejectReason.trim() }"
            >
              {{ isSubmitting ? 'Zapisywanie...' : 'Potwierdź' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
};

// Dodaj komponent do aplikacji
if (typeof app !== 'undefined') {
  app.component('order-detail', OrderDetail);
} 