# ANALIZA PROBLEMU: Cyfra "9" zamiast nazwy części i data "2025-11-04 00:00"

## 🔍 SYMPTOMY

1. **Cyfra "9" zamiast nazwy części:**
   - Mobile app wyświetla "9" zamiast pełnej nazwy części (np. "Elektroda Jonizacyjna 19KW 7834038")
   - Wpis ma zlecenie: "SRV-2025-910688"
   - Data: "2025-11-04 00:00"

2. **Problem z datą:**
   - Pokazuje "2025-11-04 00:00" zamiast właściwej daty/godziny zlecenia
   - Brakuje informacji o czasie wykonania

---

## 📊 DIAGNOZA - Źródło problemu

### 1. **JAK MOBILE APP MAPUJE CZĘŚCI**

**Plik:** `public/js/app.js` (linia 698-714)

Mobile app używa funkcji `mapPartsTextToCatalog`:
```javascript
mapPartsTextToCatalog(raw) {
  const parts = String(raw||'')
    .split(/[,;\n]/)  // Dzieli po przecinku, średniku lub nowej linii
    .map(s=>s.trim())
    .filter(Boolean)
  if (!parts.length) return ''
  const mapped = parts.map(t => {
    const m = this._bestCatalogMatch(t, { brand: this.selectedOrder?.device_brand })
    return m ? this._displayPartName(m) : t  // Jeśli nie znajdzie → zwraca t (oryginalny tekst)
  })
  return uniq.join(', ')
}
```

**Jak działa `_bestCatalogMatch`:**
- Szuka części w katalogu `partsCatalog` po nazwie lub numerze
- Wymaga minimum 3 znaków (`if (!q || q.length < 3) return null`)
- Jeśli nie znajdzie → zwraca `null`
- Jeśli nie znajdzie → `mapPartsTextToCatalog` zwraca oryginalny tekst "9"

**WNIOSEK:** Mobile app otrzymuje "9" jako tekst `parts_used` i nie może tego zmapować do nazwy części, więc wyświetla "9".

---

### 2. **JAK DESKTOP ZAPISUJE CZĘŚCI**

**Plik:** `desktop/src/components/OrderBillingModal.vue` (linia 644-671)

Desktop **NIE ZAPISUJE** `parts_used` jako tekstu:
```javascript
const completeOrder = async () => {
  // Zaktualizuj zlecenie jako ukończone
  await window.electronAPI.database.run(
    'UPDATE service_orders SET status = ?, completed_at = ?, total_cost = ? WHERE id = ?',
    ['completed', new Date().toISOString(), totals.value.gross, props.order.id]
  )
  
  // Zapisz użyte części do order_parts (TABELA, NIE POLE TEKSTOWE)
  for (const part of selectedParts.value) {
    await window.electronAPI.database.run(
      'INSERT INTO order_parts (order_id, part_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [props.order.id, part.id, part.quantity, part.price]
    )
  }
  // ❌ BRAK aktualizacji parts_used jako tekstu!
}
```

**Problem:**
- Desktop zapisuje części do tabeli `order_parts` (z `part_id`)
- **NIE AKTUALIZUJE** pola `parts_used` jako tekstu z nazwami części
- `parts_used` pozostaje NULL lub stara wartość (może być ID części z poprzedniej synchronizacji)

---

### 3. **SYNCHRONIZACJA DESKTOP → RAILWAY**

**Plik:** `desktop/src/electron/api-server.js` (linia 1607-1622)

Desktop synchronizuje `parts_used` z bazy:
```javascript
const orderPayload = [{
  ...
  parts_used: o.parts_used || null,  // ← Pobiera z bazy (może być NULL lub stara wartość)
  ...
}]
```

**Problem:**
- Jeśli `parts_used` w bazie desktop jest NULL → synchronizuje NULL
- Jeśli `parts_used` w bazie desktop ma starą wartość (np. ID części "9") → synchronizuje "9"
- Desktop **NIE KONWERTUJE** `order_parts` do tekstu `parts_used` przed synchronizacją

---

### 4. **JAK MOBILE APP POBIERA DATĘ**

**Plik:** `public/js/app.js` (linia 383)

Mobile app używa:
```javascript
const date = h.completed_at || h.started_at || h.scheduled_date || h.created_at || ''
```

**Problem z datą "2025-11-04 00:00":**
- Jeśli `completed_at` jest NULL → używa `scheduled_date`
- `scheduled_date` może być tylko datą bez czasu (np. "2025-11-04")
- Mobile app wyświetla "2025-11-04 00:00" (domyślny czas)

---

## 🎯 PRZYCZYNY PROBLEMU

### **Problem 1: Cyfra "9" zamiast nazwy**

**Główna przyczyna:** Desktop **NIE KONWERTUJE** `order_parts` do tekstu `parts_used` przed synchronizacją.

**Kaskada błędów:**
1. Desktop kończy zlecenie przez `OrderBillingModal` ✅
2. Desktop zapisuje części do `order_parts` (z `part_id`) ✅
3. Desktop **NIE AKTUALIZUJE** `parts_used` jako tekstu ❌
4. `parts_used` pozostaje NULL lub stara wartość (np. ID "9") ❌
5. Desktop synchronizuje NULL lub "9" do Railway ❌
6. Mobile app otrzymuje "9" ❌
7. Mobile app nie może zmapować "9" do nazwy części ❌
8. Mobile app wyświetla "9" ❌

**Dodatkowa możliwość:**
- Jeśli `parts_used` w bazie desktop ma wartość "9" (ID części z jakiegoś starego rekordu), to synchronizuje się "9"

---

### **Problem 2: Data "2025-11-04 00:00"**

**Główna przyczyna:** Desktop **NIE SYNCHRONIZUJE** `completed_at` do Railway lub `scheduled_date` jest tylko datą bez czasu.

**Możliwe przyczyny:**
1. `completed_at` jest NULL w Railway → mobile używa `scheduled_date`
2. `scheduled_date` jest tylko datą (np. "2025-11-04") bez czasu
3. Desktop nie synchronizuje `completed_at` poprawnie

---

## ✅ ROZWIĄZANIE

### **ROZWIĄZANIE 1: Konwersja `order_parts` → `parts_used` w desktop**

**Problem:** Desktop nie konwertuje `order_parts` do tekstu `parts_used` przed synchronizacją.

**Rozwiązanie:** Przed synchronizacją zlecenia, jeśli `parts_used` jest NULL lub puste, skonwertuj `order_parts` do tekstu.

**Miejsce:** `desktop/src/electron/api-server.js` (linia 1607-1622)

**Zmiana:**
```javascript
// Przed tworzeniem payload:
let partsUsedText = o.parts_used || null

// Jeśli parts_used jest NULL/puste, spróbuj skonwertować order_parts
if (!partsUsedText || String(partsUsedText).trim() === '') {
  try {
    const orderParts = await this.db.all(
      `SELECT sp.name, sp.part_number, op.quantity 
       FROM order_parts op 
       JOIN spare_parts sp ON op.part_id = sp.id 
       WHERE op.order_id = ?`,
      [o.id]
    )
    if (orderParts && orderParts.length > 0) {
      partsUsedText = orderParts
        .map(p => `${p.name}${p.part_number ? ' ' + p.part_number : ''}`)
        .join(', ')
    }
  } catch (_) { /* ignore */ }
}

const orderPayload = [{
  ...
  parts_used: partsUsedText,
  ...
}]
```

**To samo w:** `desktop/src/views/orders/OrdersList.vue` (funkcja `syncOrderToRailway`)

---

### **ROZWIĄZANIE 2: Synchronizacja `completed_at`**

**Problem:** `completed_at` może nie być synchronizowane lub `scheduled_date` jest tylko datą.

**Sprawdzenie:** Czy desktop synchronizuje `completed_at`?

**Miejsce:** `desktop/src/electron/api-server.js` (linia 1607-1622)

**Zmiana:**
```javascript
const orderPayload = [{
  ...
  scheduled_date: o.scheduled_date || null,
  completed_at: o.completed_at || null,  // ← DODAĆ jeśli brakuje
  parts_used: partsUsedText,
  ...
}]
```

**To samo w:** `desktop/src/views/orders/OrdersList.vue`

**W Railway sync.js:** Dodać `completed_at` do UPDATE/INSERT jeśli brakuje

---

### **ROZWIĄZANIE 3: Fallback w mobile app**

**Problem:** Mobile app nie może zmapować "9" do nazwy części.

**Rozwiązanie:** Jeśli `mapPartsTextToCatalog` zwraca krótki tekst (np. 1-2 znaki), spróbuj zinterpretować jako ID części i wyszukać w katalogu.

**Miejsce:** `public/js/app.js` (linia 698-714)

**Zmiana:**
```javascript
mapPartsTextToCatalog(raw) {
  ...
  const mapped = parts.map(t => {
    // Jeśli tekst jest tylko cyfrą (prawdopodobnie ID części)
    if (/^\d+$/.test(t.trim()) && t.trim().length <= 5) {
      // Spróbuj znaleźć część po ID
      const byId = this.partsCatalog.find(p => String(p.id) === t.trim())
      if (byId) return this._displayPartName(byId)
    }
    const m = this._bestCatalogMatch(t, { brand: this.selectedOrder?.device_brand })
    return m ? this._displayPartName(m) : t
  })
  ...
}
```

**UWAGA:** To jest tylko fallback - główny problem jest w desktop, który nie konwertuje `order_parts` do tekstu.

---

## 📋 PLAN IMPLEMENTACJI

### **KROK 1: Konwersja `order_parts` → `parts_used` w desktop**

**Priorytet:** WYSOKI (główny problem)

**Miejsce 1:** `desktop/src/electron/api-server.js` (linia 1602-1623)
- Przed synchronizacją sprawdź czy `parts_used` jest NULL/puste
- Jeśli tak → pobierz `order_parts` i skonwertuj do tekstu
- Użyj nazwy części + numer części (jeśli istnieje)

**Miejsce 2:** `desktop/src/views/orders/OrdersList.vue` (funkcja `syncOrderToRailway`)
- To samo co wyżej

---

### **KROK 2: Synchronizacja `completed_at`**

**Priorytet:** ŚREDNI

**Miejsce 1:** `desktop/src/electron/api-server.js`
- Dodać `completed_at` do payload jeśli brakuje

**Miejsce 2:** `desktop/src/views/orders/OrdersList.vue`
- Dodać `completed_at` do payload jeśli brakuje

**Miejsce 3:** `desktop/railway-backend/routes/sync.js`
- Dodać `completed_at` do UPDATE/INSERT jeśli brakuje

---

### **KROK 3: Fallback w mobile app**

**Priorytet:** NISKI (tylko dla bezpieczeństwa)

**Miejsce:** `public/js/app.js` (linia 698-714)
- Dodać logikę rozpoznawania ID części (cyfra 1-5 znaków)
- Wyszukać część po ID w katalogu

---

## 🔒 BEZPIECZEŃSTWO

### **Ryzyko: ŚREDNIE**
- Konwersja `order_parts` → `parts_used` może być kosztowna (dodatkowe zapytanie SQL)
- Musimy sprawdzić czy `order_parts` istnieje przed konwersją
- Musimy zachować istniejące wartości `parts_used` jeśli nie są puste

### **Testowanie:**
1. Utworzyć zlecenie w desktop
2. Zakończyć zlecenie przez `OrderBillingModal` z częściami
3. Sprawdzić czy `parts_used` w bazie desktop ma tekst z nazwami części
4. Sprawdzić synchronizację do Railway
5. Sprawdzić czy mobile app widzi pełne nazwy części
6. Sprawdzić czy data/godzina są poprawne

---

## ✅ PODSUMOWANIE

**Główny problem:** Desktop **NIE KONWERTUJE** `order_parts` do tekstu `parts_used` przed synchronizacją.

**Rozwiązanie:**
1. Przed synchronizacją konwertuj `order_parts` → `parts_used` (nazwy części)
2. Synchronizuj `completed_at` do Railway
3. Dodaj fallback w mobile app dla ID części

**Bezpieczeństwo:** Średnie ryzyko - wymaga dodatkowych zapytań SQL i dokładności przy konwersji.


