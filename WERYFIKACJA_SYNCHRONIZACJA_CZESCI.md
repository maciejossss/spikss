# ✅ WERYFIKACJA - Synchronizacja `parts_used`

## 🔍 SPRAWDZENIE WSZYSTKICH MIEJSC

### 1. ✅ DESKTOP WYSYŁA DANE - BRAK `parts_used`

**Miejsce 1:** `desktop/src/electron/api-server.js` (linia 1607-1622)
```javascript
const orderPayload = [{
  id: o.id,
  order_number: o.order_number,
  title: o.title || o.description || `Zlecenie ${o.order_number || o.id}`,
  client_id: o.client_id || null,
  device_id: o.device_id || null,
  client_email: ...,
  device_serial: ...,
  assigned_user_id: o.assigned_user_id || null,
  priority: o.priority || 'medium',
  status: o.status || 'new',
  description: o.description || null,
  scheduled_date: o.scheduled_date || null,
  created_at: o.created_at || null,
  updated_at: o.updated_at || null
  // ❌ BRAK parts_used
}]
```

**Miejsce 2:** `desktop/src/views/orders/OrdersList.vue` (linia 2278-2301)
```javascript
const payload = [{
  external_id: order.id,
  id: order.id,
  order_number: order.order_number || ...,
  client_id: order.client_id != null ? Number(order.client_id) : null,
  device_id: order.device_id != null ? Number(order.device_id) : null,
  assigned_user_id: order.assigned_user_id || null,
  service_categories: order.service_categories || [],
  status: order.status || 'new',
  priority: order.priority || 'medium',
  type: order.type || 'maintenance',
  title: order.title || order.description || 'Zlecenie serwisowe',
  description: order.description || '',
  scheduled_date: order.scheduled_date || null,
  estimated_hours: order.estimated_hours || 0,
  labor_cost: order.labor_cost || 0,
  parts_cost: order.parts_cost || 0,
  total_cost: order.total_cost || 0,
  notes: order.notes || '',
  client_email: ...,
  device_serial: ...
  // ❌ BRAK parts_used
}]
```

**WNIOSEK:** Desktop NIE WYSYŁA `parts_used` do Railway ✅ (potwierdzone)

---

### 2. ✅ RAILWAY SYNCHRONIZACJA - BRAK `parts_used`

**Plik:** `desktop/railway-backend/routes/sync.js`

**Miejsce 1 - Linia 513-555:** UPDATE przez `external_id`
```sql
UPDATE service_orders SET
  external_id = COALESCE($1, external_id),
  client_id = COALESCE($2, client_id),
  device_id = COALESCE($3, device_id),
  assigned_user_id = COALESCE($4, assigned_user_id),
  type = $5,
  service_categories = $6,
  status = $7,
  priority = $8,
  title = $9,
  description = $10,
  scheduled_date = $11,
  scheduled_time = COALESCE($19, scheduled_time),
  estimated_hours = $12,
  parts_cost = $13,
  labor_cost = $14,
  total_cost = $15,
  estimated_cost_note = COALESCE($16, estimated_cost_note),
  notes = $17,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```
**❌ BRAK `parts_used`**
**Parametry:** $1-$17, $19 (scheduled_time), $18 (id)
**Nowy parametr:** `parts_used` będzie $20

**Miejsce 2 - Linia 573-615:** UPDATE przez `order_number` (mismatch case)
```sql
UPDATE service_orders SET
  external_id = COALESCE($1, external_id),
  ...
  notes = $17,
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```
**❌ BRAK `parts_used`**
**Nowy parametr:** `parts_used` będzie $20

**Miejsce 3 - Linia 627-653:** INSERT nowe zlecenie (unik kolizji)
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  assigned_user_id
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
```
**❌ BRAK `parts_used` w INSERT**
**Parametry:** $1-$17, $18 (assigned_user_id)
**Nowy parametr:** `parts_used` będzie $19 (przed assigned_user_id)
**Zmiana:** VALUES ($1,$2,...,$17,$19,$18) - parts_used przed assigned_user_id

**Miejsce 4 - Linia 658-699:** UPDATE przez `order_number` (normal case)
```sql
UPDATE service_orders SET
  external_id = COALESCE($1, external_id),
  ...
  notes = $17,
  updated_at = CURRENT_TIMESTAMP
WHERE order_number = $18
```
**❌ BRAK `parts_used`**
**Nowy parametr:** `parts_used` będzie $20

**Miejsce 5 - Linia 704-730:** INSERT nowe zlecenie (normal case)
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  assigned_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
```
**❌ BRAK `parts_used` w INSERT**
**Nowy parametr:** `parts_used` będzie $19 (przed assigned_user_id)
**Zmiana:** VALUES ($1,$2,...,$17,$19,$18) - parts_used przed assigned_user_id

**WNIOSEK:** Railway NIE ZAPISUJE `parts_used` podczas synchronizacji ✅ (potwierdzone)

---

### 3. ✅ RAILWAY ENDPOINT DZIAŁA POPRAWNIE

**Plik:** `desktop/railway-backend/routes/devices.js` (linia 29-48)
```sql
SELECT id, order_number, status, title, description,
       completed_at, started_at, scheduled_date, created_at,
       parts_used, completed_categories, completion_notes, work_photos
FROM service_orders
WHERE device_id = $1
```
**✅ ZWRACA `parts_used`** ✅ (potwierdzone)

---

### 4. ✅ MOBILE APP DZIAŁA POPRAWNIE

**Plik:** `public/js/app.js` (linia 1536-1548)
```javascript
async loadDeviceHistory() {
  const r = await fetch(`${API.baseUrl}/api/devices/${o.device_id}/orders`)
  const j = await r.json()
  this.deviceHistory = j.items || []
}
```

**Computed property `devicePartsTimeline`** (linia 374-408):
```javascript
devicePartsTimeline() {
  const hist = Array.isArray(this.deviceHistory) ? this.deviceHistory : []
  for (const h of hist) {
    const partsRaw = (h && h.parts_used) ? String(h.parts_used).trim() : ''
    const parts = partsRaw ? this.mapPartsTextToCatalog(partsRaw) : ''
    // ...
  }
}
```
**✅ UŻYWA `parts_used`** ✅ (potwierdzone)

---

### 5. ✅ DESKTOP ODBIERA `parts_used` Z RAILWAY

**Plik:** `desktop/src/electron/api-server.js`
- Linia 1010: `parts_used: remote.parts_used ?? null`
- Linia 1054: `parts_used = COALESCE(?, parts_used)`
- Linia 1083: `parts_used` w INSERT
- Linia 1090: `fields.parts_used` w VALUES
- Linia 2852: `parts_used = COALESCE(?, parts_used)`
- Linia 2862: `o.parts_used || null`

**WNIOSEK:** Desktop ODBIERA `parts_used` z Railway ✅ (potwierdzone)

---

## 🎯 DIAGNOZA KOŃCOWA

### ✅ PROBLEM JEST REALNY:
1. Desktop MA `parts_used` w SQLite ✅
2. Desktop NIE WYSYŁA `parts_used` do Railway ❌
3. Railway NIE ZAPISUJE `parts_used` podczas synchronizacji ❌
4. Railway endpoint ZWRACA `parts_used` ✅ (ale puste stare dane)
5. Mobile app POBERA `parts_used` ✅ (ale dostaje stare puste dane)

### ✅ ROZWIĄZANIE JEST BEZPIECZNE:
1. Desktop już używa `parts_used` lokalnie ✅
2. Railway endpoint już zwraca `parts_used` ✅
3. Mobile app już używa `parts_used` ✅
4. Dodanie synchronizacji NIE zepsuje istniejących funkcji ✅
5. Użycie `COALESCE` dla UPDATE zachowa istniejące wartości ✅

---

## 📋 PLAN NAPRAWY - ZWERYFIKOWANY

### **KROK 1: Desktop - Dodaj `parts_used` do payload**

**Miejsce 1:** `desktop/src/electron/api-server.js` (linia 1619)
```javascript
scheduled_date: o.scheduled_date || null,
parts_used: o.parts_used || null,  // ← DODAĆ
created_at: o.created_at || null,
```

**Miejsce 2:** `desktop/src/views/orders/OrdersList.vue` (linia 2292)
```javascript
scheduled_date: order.scheduled_date || null,
parts_used: order.parts_used || null,  // ← DODAĆ
estimated_hours: order.estimated_hours || 0,
```

---

### **KROK 2: Railway - Dodaj `parts_used` do synchronizacji**

**Przygotowanie wartości (linia 497):**
```javascript
const partsUsed = (orderData.parts_used && String(orderData.parts_used).trim() !== '') 
  ? String(orderData.parts_used).trim() 
  : null
```

**Miejsce 1 - UPDATE external_id (linia 513-555):**
```sql
UPDATE service_orders SET
  ...
  notes = $17,
  parts_used = COALESCE($20, parts_used),  -- ← DODAĆ
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```
**Wartości:** `[..., orderData.notes, recId, scheduledTime, partsUsed]`

**Miejsce 2 - UPDATE order_number mismatch (linia 573-615):**
```sql
UPDATE service_orders SET
  ...
  notes = $17,
  parts_used = COALESCE($20, parts_used),  -- ← DODAĆ
  updated_at = CURRENT_TIMESTAMP
WHERE id = $18
```
**Wartości:** `[..., orderData.notes, targetId, scheduledTime, partsUsed]`

**Miejsce 3 - INSERT unik kolizji (linia 627-653):**
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  parts_used,  -- ← DODAĆ
  assigned_user_id
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$19,$18)  -- ← ZMIENIĆ NA $19
```
**Wartości:** `[..., orderData.notes, partsUsed, assignedUserResolved || null]`

**Miejsce 4 - UPDATE order_number normal (linia 658-699):**
```sql
UPDATE service_orders SET
  ...
  notes = $17,
  parts_used = COALESCE($20, parts_used),  -- ← DODAĆ
  updated_at = CURRENT_TIMESTAMP
WHERE order_number = $18
```
**Wartości:** `[..., orderData.notes, orderData.order_number, scheduledTime, partsUsed]`

**Miejsce 5 - INSERT normal (linia 704-730):**
```sql
INSERT INTO service_orders (
  order_number, external_id, client_id, device_id, type, service_categories,
  status, priority, title, description, scheduled_date,
  estimated_hours, parts_cost, labor_cost, total_cost, estimated_cost_note, notes,
  parts_used,  -- ← DODAĆ
  assigned_user_id
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $19, $18)  -- ← ZMIENIĆ NA $19
```
**Wartości:** `[..., orderData.notes, partsUsed, assignedUserResolved || null]`

---

## ✅ BEZPIECZEŃSTWO - POTWIERDZONE

### **Kolejność parametrów SQL:**
- ✅ UPDATE: $1-$17, $19 (scheduled_time), $18 (id/order_number), $20 (parts_used) - **PRAWIDŁOWA**
- ✅ INSERT: $1-$17, $19 (parts_used), $18 (assigned_user_id) - **PRAWIDŁOWA**

### **Wzorzec COALESCE:**
- ✅ `COALESCE($20, parts_used)` - NIE nadpisuje NULL jeśli brak danych
- ✅ Zachowa istniejące wartości jeśli nowa wartość jest NULL

### **Backward compatibility:**
- ✅ Istniejące zlecenia będą działać (puste `parts_used` pozostanie puste)
- ✅ Nowe zlecenia z częściami będą synchronizowane
- ✅ Desktop nadal będzie odbierał `parts_used` z Railway (gdy mobile kończy zlecenie)

---

## ✅ PODSUMOWANIE WERYFIKACJI

**Założenia:** ✅ WSZYSTKIE PRAWIDŁOWE
**Bezpieczeństwo:** ✅ BEZPIECZNE
**Kolejność parametrów:** ✅ PRAWIDŁOWA
**Backward compatibility:** ✅ ZACHOWANA
**Gotowość do implementacji:** ✅ GOTOWE


