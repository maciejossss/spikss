# ANALIZA PROBLEMU: Brak wyświetlania części wymienianych w szczegółach urządzenia

## 🔍 OPIS PROBLEMU

**Symptom:**
- Zakładka: **URZĄDZENIA / ZOBACZ SZCZEGÓŁY / Części zamienne**
- Problem: Nie wyświetlają się części, które były wymieniane przy okazji zakończonych zleceń
- Kontekst: Te części były źródłem informacji dla aplikacji mobilnej - technik widział jakie części były wymieniane i kiedy

## 📊 DIAGNOZA - Jak działają części

### 1. **MOBILE APP - Jak zapisuje części**

**Plik:** `public/js/app.js` (linia 1983-1990)

Mobile app zapisuje części jako **TEKST** w kolumnie `parts_used`:
```javascript
partsUsed: [partsFromSelect, this.completionData.partsUsed]
  .filter(Boolean)
  .join(', ')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .filter((v, i, a) => a.indexOf(v) === i)
  .join(', ')
```

**Przykład:** `"Filtr paliwa, Świeca zapłonowa, Olej"`

**Zapis do Railway:**
- Kolumna `parts_used` w tabeli `service_orders` → tekst (string)
- **NIE zapisuje** do tabeli `order_parts`!

---

### 2. **DESKTOP APP - Jak zapisuje części**

**Plik:** `desktop/src/components/OrderBillingModal.vue` (linia 666-671)

Desktop app zapisuje części do tabeli `order_parts`:
```javascript
for (const part of selectedParts.value) {
  await window.electronAPI.database.run(
    'INSERT INTO order_parts (order_id, part_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
    [props.order.id, part.id, part.quantity, part.price]
  )
}
```

**Struktura tabeli `order_parts`:**
- `order_id` → link do `service_orders`
- `part_id` → link do `spare_parts` (katalog części)
- `quantity` → ilość
- `unit_price` → cena jednostkowa

**To działa tylko gdy:**
- Desktop app uzupełnia fakturę przez OrderBillingModal
- Części są wybrane z katalogu `spare_parts`

---

### 3. **DEVICE DETAILS - Jak pobiera części**

**Plik:** `desktop/src/views/devices/DeviceDetails.vue` (linia 837-873)

Funkcja `loadDeviceParts()`:

**Krok 1:** Pobiera części bezpośrednio przypisane do urządzenia
```sql
SELECT id, name, part_number, manufacturer, brand, category, price, 
       stock_quantity, min_stock_level, device_id 
FROM spare_parts 
WHERE device_id = ?
```

**Krok 2:** Pobiera części z tabeli `order_parts` (linia 848-856)
```sql
SELECT sp.id, sp.name, sp.part_number, sp.manufacturer, sp.brand, 
       sp.category, sp.price, NULL as stock_quantity, NULL as min_stock_level, 
       so.device_id
FROM order_parts op
JOIN service_orders so ON so.id = op.order_id
LEFT JOIN spare_parts sp ON sp.id = op.part_id
WHERE so.device_id = ? AND op.part_id IS NOT NULL
```

**PROBLEM:**
- Ta kwerenda wymaga, żeby części były w tabeli `order_parts` z `part_id`
- Mobile app **NIE zapisuje** do `order_parts`!
- Mobile app zapisuje tylko tekst w `parts_used`
- **Wynik:** Części z mobile app nie są widoczne!

---

## 🎯 PRZYCZYNA PROBLEMU

**Główna przyczyna:** `loadDeviceParts()` sprawdza tylko tabelę `order_parts`, a mobile app zapisuje części jako tekst w `parts_used`.

**Kaskada:**
1. Mobile app → zapisuje `parts_used = "Filtr, Świeca"` (tekst)
2. Desktop import → zapisuje `parts_used` do SQLite (tekst)
3. DeviceDetails → sprawdza tylko `order_parts` (pusta dla mobile)
4. **Wynik:** Części nie są widoczne!

---

## ✅ PLAN NAPRAWY

### **ROZWIĄZANIE: Dodać trzecią ścieżkę pobierania części**

**Zasada:** Wyświetlać części z trzech źródeł:
1. ✅ Części bezpośrednio przypisane do urządzenia (już działa)
2. ✅ Części z tabeli `order_parts` (już działa)
3. ❌ **NOWE:** Części z kolumny `parts_used` w zakończonych zleceniach

---

### **KROK 1: Rozszerzyć funkcję `loadDeviceParts()`**

**Plik:** `desktop/src/views/devices/DeviceDetails.vue`

**Zmiana w linii 847-856:**

**PRZED:**
```javascript
// 2) Części użyte historycznie w zleceniach tego urządzenia (bez konieczności przypisania do device_id)
const hist = await window.electronAPI.database.query(
  `SELECT sp.id, sp.name, sp.part_number, sp.manufacturer, sp.brand, sp.category, sp.price, NULL as stock_quantity, NULL as min_stock_level, so.device_id
   FROM order_parts op
   JOIN service_orders so ON so.id = op.order_id
   LEFT JOIN spare_parts sp ON sp.id = op.part_id
   WHERE so.device_id = ? AND op.part_id IS NOT NULL
   ORDER BY sp.name`,
  [device.value.id]
).catch(()=>[])
```

**PO:**
```javascript
// 2) Części użyte historycznie w zleceniach - z tabeli order_parts (desktop faktury)
const histFromOrderParts = await window.electronAPI.database.query(
  `SELECT sp.id, sp.name, sp.part_number, sp.manufacturer, sp.brand, sp.category, sp.price, NULL as stock_quantity, NULL as min_stock_level, so.device_id, so.completed_at
   FROM order_parts op
   JOIN service_orders so ON so.id = op.order_id
   LEFT JOIN spare_parts sp ON sp.id = op.part_id
   WHERE so.device_id = ? AND op.part_id IS NOT NULL
   ORDER BY so.completed_at DESC, sp.name`,
  [device.value.id]
).catch(()=>[])

// 3) Części użyte historycznie - z kolumny parts_used (mobile app)
const histFromPartsUsed = await window.electronAPI.database.query(
  `SELECT id, order_number, parts_used, completed_at
   FROM service_orders
   WHERE device_id = ? 
     AND status = 'completed'
     AND parts_used IS NOT NULL 
     AND parts_used != ''
   ORDER BY completed_at DESC`,
  [device.value.id]
).catch(()=>[])

// Parsuj parts_used i utwórz obiekty części
const partsFromText = []
for (const order of (histFromPartsUsed || [])) {
  try {
    const partsText = String(order.parts_used || '').trim()
    if (!partsText) continue
    
    // Rozdziel części po przecinku
    const partsList = partsText.split(',')
      .map(s => s.trim())
      .filter(Boolean)
    
    for (const partName of partsList) {
      // Sprawdź czy część już istnieje w katalogu
      const existingPart = await window.electronAPI.database.get(
        'SELECT id, name, part_number, manufacturer, brand, category, price FROM spare_parts WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [partName]
      ).catch(()=>null)
      
      if (existingPart) {
        // Jeśli część jest w katalogu, użyj jej danych
        partsFromText.push({
          id: existingPart.id,
          name: existingPart.name,
          part_number: existingPart.part_number,
          manufacturer: existingPart.manufacturer,
          brand: existingPart.brand,
          category: existingPart.category,
          price: existingPart.price,
          stock_quantity: null,
          min_stock_level: null,
          device_id: device.value.id,
          _source: 'mobile',
          _order_number: order.order_number,
          _completed_at: order.completed_at
        })
      } else {
        // Jeśli części nie ma w katalogu, utwórz obiekt z nazwy
        partsFromText.push({
          id: null,
          name: partName,
          part_number: null,
          manufacturer: null,
          brand: null,
          category: null,
          price: null,
          stock_quantity: null,
          min_stock_level: null,
          device_id: device.value.id,
          _source: 'mobile',
          _order_number: order.order_number,
          _completed_at: order.completed_at
        })
      }
    }
  } catch (err) {
    console.error('Error parsing parts_used for order', order.order_number, err)
  }
}

// Połącz wszystkie źródła
const hist = [...(histFromOrderParts || []), ...partsFromText]
```

---

### **KROK 2: Ulepszyć wyświetlanie części**

**Zmiana w template (linia 386-430):**

Dodać informację o źródle części (desktop vs mobile) i dacie wymiany:

```vue
<div
  v-for="part in deviceParts"
  :key="part.id || part.name + part._order_number"
  class="bg-white border border-secondary-200 rounded-lg p-4 hover:shadow-md transition-shadow"
>
  <div class="flex items-start justify-between">
    <div class="flex-1">
      <h4 class="font-medium text-secondary-900">{{ part.name }}</h4>
      <!-- Pokaż źródło i datę wymiany -->
      <div v-if="part._source === 'mobile'" class="text-xs text-blue-600 mt-1">
        <i class="fas fa-mobile-alt mr-1"></i>
        Wymienione: {{ formatDate(part._completed_at) }}
        <span v-if="part._order_number" class="text-gray-500">
          ({{ part._order_number }})
        </span>
      </div>
      <p v-if="part.part_number" class="text-sm text-secondary-600 font-mono">Nr: {{ part.part_number }}</p>
      <p v-if="part.manufacturer" class="text-sm text-secondary-500">{{ part.manufacturer }}</p>
      <!-- Reszta kodu bez zmian -->
    </div>
  </div>
</div>
```

---

## 🔒 BEZPIECZEŃSTWO ZMIAN

### **Ryzyko: NISKIE**
- Dodaje tylko nową ścieżkę pobierania danych
- Nie zmienia istniejących zapytań
- Nie zmienia struktury bazy danych
- Backward compatible - istniejące części będą działać

### **Testowanie:**
1. Utworzyć zlecenie w mobile app z częściami (np. "Filtr, Świeca")
2. Zakończyć zlecenie w mobile app
3. Zsynchronizować z desktop
4. Sprawdzić szczegóły urządzenia → zakładka "Części zamienne"
5. Powinny być widoczne części z mobile app

---

## 📝 DODATKOWE UWAGI

### **Alternatywne podejście (prostsze):**

Jeśli parsowanie tekstu jest zbyt skomplikowane, można wyświetlić części jako listę tekstową:

```javascript
// Pobierz zlecenia z parts_used
const ordersWithParts = await window.electronAPI.database.query(
  `SELECT order_number, parts_used, completed_at
   FROM service_orders
   WHERE device_id = ? 
     AND status = 'completed'
     AND parts_used IS NOT NULL 
     AND parts_used != ''
   ORDER BY completed_at DESC`,
  [device.value.id]
)

// Wyświetl jako sekcja "Historia wymian części"
```

**Plusy:** Prostsze, szybsze
**Minusy:** Nie integruje się z katalogiem części

---

## ✅ PODSUMOWANIE

**Problem:** `loadDeviceParts()` sprawdza tylko `order_parts`, a mobile app zapisuje części jako tekst w `parts_used`.

**Rozwiązanie:** Dodać trzecią ścieżkę - parsować `parts_used` z zakończonych zleceń i wyświetlać jako części.

**Zmiana:** Rozszerzyć funkcję `loadDeviceParts()` w `DeviceDetails.vue`.

**Bezpieczeństwo:** Niskie ryzyko, backward compatible.

**Testowanie:** Utworzyć zlecenie w mobile, zakończyć, sprawdzić szczegóły urządzenia.


