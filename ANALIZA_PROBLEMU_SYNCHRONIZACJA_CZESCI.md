# ANALIZA PROBLEMU: Brak synchronizacji `parts_used` do Railway

## 🔍 OPIS PROBLEMU

**Symptom:**
- Mobile app (Railway) pokazuje stare części w sekcji "Użyte części"
- Desktop app ma aktualne części w zakładce "URZĄDZENIA/ZOBACZ SZCZEGÓŁY/CZĘŚCI"
- Brak synchronizacji - mobile app nie widzi nowych części

## 📊 DIAGNOZA - Ścieżka danych

### 1. **MOBILE APP - Jak pobiera części**

**Plik:** `public/js/app.js` (linia 1536-1548)

Mobile app wywołuje:
```javascript
async loadDeviceHistory() {
  const r = await fetch(`${API.baseUrl}/api/devices/${o.device_id}/orders`)
  const j = await r.json()
  this.deviceHistory = j.items || []
}
```

**Endpoint:** `/api/devices/:id/orders`

**Computed property `devicePartsTimeline`** (linia 374-408):
- Pobiera dane z `deviceHistory`
- Wyciąga `parts_used` z każdego zlecenia
- Tworzy chronologiczną listę części

---

### 2. **RAILWAY ENDPOINT - Co zwraca**

**Plik:** `desktop/railway-backend/routes/devices.js` (linia 29-48)

Endpoint `/api/devices/:id/orders`:
```sql
SELECT id, order_number, status, title, description,
       completed_at, started_at, scheduled_date, created_at,
       parts_used, completed_categories, completion_notes, work_photos
FROM service_orders
WHERE device_id = $1
ORDER BY COALESCE(completed_at, started_at, scheduled_date, created_at) DESC
LIMIT 100
```

**✅ DZIAŁA POPRAWNIE** - Endpoint zwraca `parts_used`!

---

### 3. **SYNCHRONIZACJA DESKTOP → RAILWAY - PROBLEM!**

**Plik:** `desktop/railway-backend/routes/sync.js`

**Problem:** Synchronizacja NIE wysyła `parts_used` do Railway!

**Miejsce 1 - Linia 513-555:** UPDATE przez `external_id`
```sql
UPDATE service_orders SET
  external_id = COALESCE($1, external_id),
  client_id = COALESCE($2, client_id),
  ...
  notes = $17,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```
**❌ BRAK `parts_used`!**

**Miejsce 2 - Linia 573-615:** UPDATE przez `order_number` (mismatch case)
```sql
UPDATE service_orders SET
  external_id = COALESCE($1, external_id),
  ...
  notes = $17,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```
**❌ BRAK `parts_used`!**

**Miejsce 3 - Linia 627-653:** INSERT nowe zlecenie (unik kolizji)
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  assigned_user_id
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
```
**❌ BRAK `parts_used` w INSERT!**

**Miejsce 4 - Linia 658-699:** UPDATE przez `order_number` (normal case)
```sql
UPDATE service_orders SET
  external_id = COALESCE($1, external_id),
  ...
  notes = $17,
  updated_at = CURRENT_TIMESTAMP
WHERE order_number = $18
```
**❌ BRAK `parts_used`!**

**Miejsce 5 - Linia 704-730:** INSERT nowe zlecenie (normal case)
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  assigned_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
```
**❌ BRAK `parts_used` w INSERT!**

---

### 4. **DESKTOP APP - Jak wysyła dane**

**Plik:** `desktop/src/electron/api-server.js` (linia 1607-1622)

Desktop wysyła payload:
```javascript
const orderPayload = [{
  id: o.id,
  order_number: o.order_number,
  ...
  scheduled_date: o.scheduled_date || null,
  ...
}]
```

**❌ BRAK `parts_used` w payload!**

**Plik:** `desktop/src/views/orders/OrdersList.vue` (linia 2278-2300)

Funkcja `syncOrderToRailway`:
```javascript
const payload = [{
  ...
  description: order.description || '',
  scheduled_date: order.scheduled_date || null,
  ...
  notes: order.notes || '',
  ...
}]
```

**❌ BRAK `parts_used` w payload!**

---

## 🎯 PRZYCZYNA PROBLEMU

**Główna przyczyna:** Desktop app **NIE WYSYŁA** `parts_used` do Railway podczas synchronizacji.

**Kaskada błędów:**
1. Desktop ma `parts_used` w SQLite ✅
2. Desktop synchronizuje zlecenia do Railway ❌ (bez `parts_used`)
3. Railway nie ma aktualnych `parts_used` ❌
4. Mobile app pobiera stare dane z Railway ❌
5. Mobile app wyświetla stare części ❌

---

## ✅ PLAN NAPRAWY

### **ROZWIĄZANIE: Dodać `parts_used` do synchronizacji**

**Zasada:** Wszędzie gdzie synchronizujemy zlecenia, musimy uwzględnić `parts_used`.

---

### **KROK 1: Dodać `parts_used` do payload z desktop**

**Plik 1:** `desktop/src/electron/api-server.js` (linia 1607-1622)

**Zmiana:**
```javascript
const orderPayload = [{
  ...
  scheduled_date: o.scheduled_date || null,
  parts_used: o.parts_used || null,  // ← DODAĆ
  created_at: o.created_at || null,
  ...
}]
```

**Plik 2:** `desktop/src/views/orders/OrdersList.vue` (linia 2278-2300)

**Zmiana:**
```javascript
const payload = [{
  ...
  description: order.description || '',
  scheduled_date: order.scheduled_date || null,
  parts_used: order.parts_used || null,  // ← DODAĆ
  estimated_hours: order.estimated_hours || 0,
  ...
}]
```

---

### **KROK 2: Dodać `parts_used` do wszystkich miejsc synchronizacji w Railway**

**Plik:** `desktop/railway-backend/routes/sync.js`

**Zmiana 1 - Linia 513-555:** UPDATE przez `external_id`
```sql
UPDATE service_orders SET
  ...
  notes = $17,
  parts_used = COALESCE($20, parts_used),  -- ← DODAĆ
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```

**Zmiana 2 - Linia 573-615:** UPDATE przez `order_number` (mismatch)
```sql
UPDATE service_orders SET
  ...
  notes = $17,
  parts_used = COALESCE($20, parts_used),  -- ← DODAĆ
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```

**Zmiana 3 - Linia 627-653:** INSERT nowe zlecenie (unik kolizji)
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  parts_used,  -- ← DODAĆ
  assigned_user_id
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)  -- ← ZMIENIĆ NA $19
```

**Zmiana 4 - Linia 658-699:** UPDATE przez `order_number` (normal)
```sql
UPDATE service_orders SET
  ...
  notes = $17,
  parts_used = COALESCE($20, parts_used),  -- ← DODAĆ
  updated_at = CURRENT_TIMESTAMP
WHERE order_number = $18
```

**Zmiana 5 - Linia 704-730:** INSERT nowe zlecenie (normal)
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  parts_used,  -- ← DODAĆ
  assigned_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)  -- ← ZMIENIĆ NA $19
```

**WAŻNE:** Musimy też dodać `parts_used` do wartości w każdym miejscu:
```javascript
const partsUsed = (orderData.parts_used && String(orderData.parts_used).trim() !== '') 
  ? String(orderData.parts_used).trim() 
  : null
```

I dodać do tablicy wartości `[..., partsUsed]` w odpowiednim miejscu.

---

## 🔒 BEZPIECZEŃSTWO ZMIAN

### **Ryzyko: ŚREDNIE**
- Zmiany w wielu miejscach synchronizacji
- Musimy zachować kolejność parametrów ($1, $2, ...)
- Musimy użyć `COALESCE` dla UPDATE (nie nadpisujemy NULL jeśli brak danych)
- Backward compatible - istniejące zlecenia będą działać

### **Testowanie:**
1. Utworzyć zlecenie w desktop z częściami
2. Zakończyć zlecenie w desktop
3. Sprawdzić synchronizację do Railway
4. Sprawdzić czy mobile app widzi nowe części
5. Sprawdzić czy stare części nadal działają

---

## 📝 DODATKOWE UWAGI

### **Wzorzec COALESCE:**
- Dla UPDATE: `parts_used = COALESCE($N, parts_used)` - aktualizuje tylko jeśli nowa wartość nie jest NULL
- Dla INSERT: `parts_used` - wstawia wartość (może być NULL)

### **Kolejność parametrów:**
- Musimy zachować kolejność $1, $2, $3...
- Ostatni parametr to `scheduledTime` ($19), więc `parts_used` będzie $20 dla UPDATE
- Dla INSERT `parts_used` będzie $19 (przed `assigned_user_id` który jest $18 lub $19)

---

## ✅ PODSUMOWANIE

**Problem:** Desktop NIE WYSYŁA `parts_used` do Railway podczas synchronizacji.

**Rozwiązanie:** Dodać `parts_used` do:
1. Payload z desktop (2 miejsca)
2. Wszystkich UPDATE/INSERT w sync.js (5 miejsc)

**Bezpieczeństwo:** Średnie ryzyko - wymaga dokładności przy numeracji parametrów.

**Testowanie:** Sprawdzić synchronizację i wyświetlanie w mobile app.


