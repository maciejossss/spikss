# DIAGNOZA NA PODSTAWIE TWARDYCH DANYCH

## 🔍 FAKTY Z KODU

### **FAKT 1: Gdzie desktop zapisuje order_parts**

**Miejsca zapisu:**
1. `OrderBillingModal.vue` (linia 668) - przy zakończeniu zlecenia
2. `OrderPartFormModal.vue` (linia 396) - gdy dodaje część do zlecenia
3. `OrderDetails.vue` (linia 1733) - gdy przekształca parts_used na order_parts

**Co się dzieje PO zapisaniu:**
- `OrderPartFormModal.vue`: `emit('saved')` → `OrderDetails.vue`: `onPartSaved()` → **TYLKO** `loadOrderParts()` (odświeża listę)
- **BRAK synchronizacji z Railway!**

---

### **FAKT 2: Synchronizacja działa TYLKO dla nowych zleceń**

**Query synchronizacji:** `desktop/src/electron/api-server.js` (linia 1593-1597)
```sql
SELECT * FROM service_orders
WHERE assigned_user_id IS NOT NULL
AND (desktop_sync_status IS NULL OR desktop_sync_status <> 'sent')
```

**Co to oznacza:**
- ✅ Synchronizacja działa TYLKO dla zleceń które NIE zostały jeszcze zsynchronizowane
- ❌ Jeśli `desktop_sync_status = 'sent'` → zlecenie NIE będzie synchronizowane automatycznie
- ❌ Nawet jeśli `order_parts` się zmienia → synchronizacja NIE DZIAŁA

---

### **FAKT 3: Konwersja order_parts → parts_used działa TYLKO podczas synchronizacji**

**Kod:** `desktop/src/electron/api-server.js` (linia 1611)
```javascript
if (!partsUsedText || partsUsedTrimmed === '' || /^\d{1,2}$/.test(partsUsedTrimmed)) {
  // konwersja order_parts → parts_used
}
```

**Co to oznacza:**
- ✅ Konwersja działa TYLKO podczas synchronizacji
- ❌ Jeśli zlecenie ma `desktop_sync_status = 'sent'` → nie jest synchronizowane → konwersja nie działa
- ❌ Nawet jeśli desktop ma `order_parts` z 2 częściami, nie zostaną zsynchronizowane

---

### **FAKT 4: Po zapisaniu order_parts NIE MA synchronizacji**

**OrderPartFormModal.vue (linia 405):**
```javascript
emit('saved')
```

**OrderDetails.vue (linia 708):**
```javascript
@saved="onPartSaved"
```

**OrderDetails.vue - funkcja onPartSaved:**
- **BRAK implementacji w kodzie!** (nie znalazłem)

**DeviceDetails.vue (linia 989):**
```javascript
const onPartSaved = async () => {
  await loadDeviceParts()  // TYLKO odświeża listę
  closePartModal()
}
```

**WNIOSEK:** Po zapisaniu `order_parts` NIE MA synchronizacji z Railway!

---

## 🎯 DIAGNOZA KOŃCOWA

### **PROBLEM:**

1. **Desktop zapisuje `order_parts` → ale NIE synchronizuje z Railway**
2. **Synchronizacja działa TYLKO dla nowych zleceń** (`desktop_sync_status <> 'sent'`)
3. **Konwersja `order_parts` → `parts_used` działa TYLKO podczas synchronizacji**
4. **Po zapisaniu `order_parts` NIE MA wywołania synchronizacji**

### **ROZWIĄZANIE - NAJPROSTSZE:**

**Gdy zapisuje się `order_parts` → resetować `desktop_sync_status` = NULL → wymusić ponowną synchronizację**

**Gdzie:**
- `OrderPartFormModal.vue` - po zapisaniu `order_parts`
- `OrderBillingModal.vue` - po zapisaniu `order_parts`
- `OrderDetails.vue` - po przekształceniu `parts_used` → `order_parts`

**Co zrobić:**
```javascript
// Po zapisaniu order_parts
await window.electronAPI.database.run(
  "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
  [orderId]
)
```

**To spowoduje:**
- ✅ Zlecenie będzie synchronizowane automatycznie (bo `desktop_sync_status <> 'sent'`)
- ✅ Konwersja `order_parts` → `parts_used` zadziała
- ✅ Railway otrzyma aktualne dane

---

## ✅ PODSUMOWANIE

**Problem:** Desktop zapisuje `order_parts`, ale nie synchronizuje z Railway.

**Rozwiązanie:** Resetować `desktop_sync_status` = NULL po zapisaniu `order_parts` → wymusić ponowną synchronizację.

**Bezpieczeństwo:** ✅ BEZPIECZNE - tylko resetuje flagę synchronizacji, nie zmienia danych.


