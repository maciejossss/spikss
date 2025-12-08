# PLAN AUTOMATYCZNEJ SYNCHRONIZACJI - Za każdym razem gdy zmienia się order_parts

## 🎯 WYMAGANIE

**Za każdym razem gdy dochodzi część do historii urządzenia → automatycznie synchronizować z Railway**

**Scenariusze:**
1. Dodanie części do zlecenia (order_parts)
2. Usunięcie części z zlecenia
3. Zmiana części w zleceniu
4. Przekształcenie parts_used → order_parts

**Rezultat:**
- Railway otrzyma aktualne dane
- Mobile app wyświetli aktualną historię urządzenia

---

## 🔍 MIEJSCA GDZIE ZAPISUJE SIĘ/USUWA order_parts

### **1. OrderPartFormModal.vue - zapisanie części**
**Linia:** 405 - `emit('saved')`
**Obsługa:** `OrderDetails.vue` - `onPartSaved()` (linia 1658)

### **2. OrderDetails.vue - usunięcie części**
**Linia:** 1673 - `DELETE FROM order_parts WHERE id = ?`
**Funkcja:** `removePart()` (linia 1664)

### **3. OrderDetails.vue - przekształcenie parts_used → order_parts**
**Linia:** 1733 - `INSERT INTO order_parts`
**Funkcja:** `transformPartsUsed()` (linia 1683)

### **4. OrderBillingModal.vue - zakończenie zlecenia z częściami**
**Linia:** 668 - `INSERT INTO order_parts`
**Funkcja:** `completeOrder()` (linia 644)

---

## ✅ ROZWIĄZANIE - AUTOMATYCZNA SYNCHRONIZACJA

### **KROK 1: Funkcja resetująca desktop_sync_status i synchronizująca**

**Dodać w OrderDetails.vue:**
```javascript
const syncOrderPartsToRailway = async () => {
  if (!order.value?.id || !window.electronAPI?.database) return
  try {
    // Reset desktop_sync_status = NULL → wymusza ponowną synchronizację
    await window.electronAPI.database.run(
      "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
      [order.value.id]
    )
    
    // Natychmiastowa synchronizacja zlecenia
    await fetch(`http://localhost:5174/api/railway/export-order/${order.value.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {}) // Soft fail - jeśli błąd, nie blokuj użytkownika
  } catch (e) {
    console.error('Sync order parts error:', e)
    // Soft fail - nie blokuj użytkownika
  }
}
```

---

### **KROK 2: Wywołać po zapisaniu części**

**Zmiana w OrderDetails.vue - onPartSaved():**
```javascript
const onPartSaved = async () => {
  await loadOrderParts()
  await recalcAndPersistPartsCost()
  await syncOrderPartsToRailway() // ← DODAĆ
  closePartModal()
}
```

---

### **KROK 3: Wywołać po usunięciu części**

**Zmiana w OrderDetails.vue - removePart():**
```javascript
const removePart = async (part) => {
  try {
    if (window.electronAPI?.database) {
      // ... istniejący kod usuwania ...
      await window.electronAPI.database.run('DELETE FROM order_parts WHERE id = ?', [part.id])
      await loadOrderParts()
      await recalcAndPersistPartsCost()
      await syncOrderPartsToRailway() // ← DODAĆ
    }
  } catch (e) {
    // ... istniejący kod obsługi błędów ...
  }
}
```

---

### **KROK 4: Wywołać po przekształceniu parts_used → order_parts**

**Zmiana w OrderDetails.vue - transformPartsUsed():**
```javascript
const transformPartsUsed = async () => {
  try {
    // ... istniejący kod przekształcania ...
    await loadOrderParts()
    await recalcAndPersistPartsCost()
    await syncOrderPartsToRailway() // ← DODAĆ
    alert('Przekształcono części na pozycje zlecenia')
  } catch (e) {
    // ... istniejący kod obsługi błędów ...
  }
}
```

---

### **KROK 5: Wywołać po zakończeniu zlecenia z częściami**

**Zmiana w OrderBillingModal.vue - completeOrder():**
```javascript
const completeOrder = async () => {
  // ... istniejący kod zapisywania order_parts ...
  
  // Po zapisaniu order_parts
  for (const part of selectedParts.value) {
    await window.electronAPI.database.run(
      'INSERT INTO order_parts (order_id, part_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [props.order.id, part.id, part.quantity, part.price]
    )
  }
  
  // DODAĆ: Reset desktop_sync_status i synchronizacja
  try {
    await window.electronAPI.database.run(
      "UPDATE service_orders SET desktop_sync_status = NULL WHERE id = ?",
      [props.order.id]
    )
    await fetch(`http://localhost:5174/api/railway/export-order/${props.order.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {})
  } catch (_) { /* soft fail */ }
  
  // ... reszta kodu ...
}
```

---

## 🔒 BEZPIECZEŃSTWO

### **Co robi rozwiązanie:**
1. ✅ Resetuje `desktop_sync_status` = NULL → wymusza ponowną synchronizację
2. ✅ Natychmiastowa synchronizacja przez `/api/railway/export-order/:orderId`
3. ✅ Konwersja `order_parts` → `parts_used` zadziała automatycznie (już jest w kodzie)

### **Ryzyko:**
- ✅ MINIMALNE - tylko resetuje flagę i synchronizuje
- ✅ Soft fail - jeśli błąd, nie blokuje użytkownika
- ✅ Nie zmienia danych - tylko synchronizuje

### **Backward compatible:**
- ✅ TAK - nie zmienia istniejącej logiki
- ✅ Tylko dodaje synchronizację po zmianach

---

## 📋 PODSUMOWANIE

**Zmiany:**
1. OrderDetails.vue - dodać funkcję `syncOrderPartsToRailway()`
2. OrderDetails.vue - wywołać po zapisaniu/usunięciu/przekształceniu części
3. OrderBillingModal.vue - wywołać po zakończeniu zlecenia z częściami

**Efekt:**
- ✅ Za każdym razem gdy zmienia się `order_parts` → automatyczna synchronizacja z Railway
- ✅ Mobile app wyświetli aktualną historię urządzenia
- ✅ Nie trzeba ręcznie synchronizować


