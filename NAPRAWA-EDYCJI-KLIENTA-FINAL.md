# ✅ KOD EDYCJI KLIENTA ISTNIEJE - Analiza problemu

## ✅ SPRAWDZONE - Wszystko jest na miejscu:

### 1. Frontend (`public/index.html`):
- **Linia 456**: Przycisk "✏️ Edytuj dane klienta" → `@click="openEditClient"` ✅
- **Linia 872-897**: Modal edycji klienta ✅
- **Linia 894**: Przycisk "Zapisz" → `@click="updateClient(editClient)"` ✅

### 2. JavaScript (`public/js/app.js`):
- **Linia 581-588**: `openEditClient()` - otwiera modal ✅
- **Linia 589-591**: `closeEditClient()` - zamyka modal ✅
- **Linia 703-742**: `updateClient(payload)` z **`propose: true`** (linia 714) ✅

### 3. Backend Railway (`desktop/railway-backend/routes/clients.js`):
- **Linia 5-55**: PUT `/api/clients/:id` obsługuje `propose` ✅
- **Linia 19-33**: Tworzy `pending_changes` dla klientów ✅

### 4. Backend Railway (`desktop/railway-backend/routes/events.js`):
- **Linia 57-111**: Accept/Reject dla `entity === 'client'` (linia 64-75) ✅

### 5. Desktop App (`desktop/src/views/orders/OrderDetails.vue`):
- **Linia 194-206**: Banner "Proponowana zmiana danych klienta" ✅
- **Linia 800-855**: Modal do akceptacji/odrzucenia ✅
- **Linia 1526-1554**: `acceptPending()` - akceptacja zmian klienta ✅

---

## 🔍 MOŻLIWE PRZYCZYNY PROBLEMU:

### Teoria 1: Błąd w wysyłaniu requesta
Sprawdzę console.log czy request jest wysyłany poprawnie.

### Teoria 2: Konflikt port API
`public/js/app.js` linia 732:
```javascript
fetch(`http://localhost:5174/api/railway/import-client/${this.selectedOrder.client_id}`, ...
```

To próbuje wywołać desktop API, ale może desktop nie działa?

### Teoria 3: Błąd w zapisie do pending_changes
Może backend Railway nie zapisuje do bazy?

---

## 🎯 PLAN DIAGNOSTYCZNY:

1. ✅ Sprawdzić logi Railway - czy request dochodzi do `/api/clients/:id`
2. ✅ Sprawdzić czy `propose: true` jest w body requesta
3. ✅ Sprawdzić czy pending_changes jest zapisywany do bazy
4. ✅ Sprawdzić czy Desktop app odbiera powiadomienie

---

## 🔧 CO SPRAWDZIĆ TERAZ:

### Dodaj console.log do monitoringu:

W `public/js/app.js` linia 717 (przed fetch):
```javascript
console.log('🔍 SENDING CLIENT UPDATE:', {
  client_id: this.selectedOrder.client_id,
  body: body,
  url: `${API.baseUrl}/api/clients/${this.selectedOrder.client_id}`
});
```

Potem w console przeglądarki sprawdź czy:
1. Request jest wysyłany
2. Odpowiedź jest `{success: true, pending: true}`
3. Czy jest błąd 400/500

---

## 💡 NAJPRAWDOPODOBNIEJSZA PRZYCZYNA:

Na podstawie screena użytkownika: **Modal się otwiera**, więc frontend działa.

**Sprawdzić trzeba** czy:
- Request dochodzi do Railway
- Railway zapisuje do pending_changes
- Desktop odbiera powiadomienie
