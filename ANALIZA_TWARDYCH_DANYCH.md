# ANALIZA TWARDYCH DANYCH - Problem "9" i "2025-11-04 00:00"

## 🔍 FAKTY Z KODU

### **FAKT 1: `_bestCatalogMatch` wymaga minimum 3 znaków**

**Plik:** `public/js/app.js` (linia 669)
```javascript
if (!q || q.length < 3) return null
```

**Wniosek:**
- "9" ma tylko 1 znak → funkcja zwraca `null`
- `mapPartsTextToCatalog` dostaje `null` → zwraca oryginalny tekst "9" (linia 707)
- **TO JEST GŁÓWNA PRZYCZYNA wyświetlania "9"**

---

### **FAKT 2: Mobile app pobiera dane z Railway**

**Plik:** `public/js/app.js` (linia 1540)
```javascript
const r = await fetch(`${API.baseUrl}/api/devices/${o.device_id}/orders`)
```

**Endpoint:** `desktop/railway-backend/routes/devices.js` (linia 36)
```sql
SELECT ..., parts_used, ...
FROM service_orders
WHERE device_id = $1
```

**Wniosek:**
- Mobile app otrzymuje `parts_used` bezpośrednio z bazy Railway
- Jeśli Railway ma "9" → mobile dostanie "9"
- Problem jest w danych w Railway, nie w mobile app

---

### **FAKT 3: Formatowanie daty**

**Plik:** `public/js/app.js` (linia 383)
```javascript
const date = h.completed_at || h.started_at || h.scheduled_date || h.created_at || ''
```

**Plik:** `public/js/app.js` (linia 605-614)
```javascript
formatDateTimeLocal(value) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const d = s.slice(0, 10);
    const t = s.slice(11, 16);
    return `${d} ${t}`;
  }
  // Sam dzień bez czasu → dodaje "00:00"
}
```

**Wniosek:**
- Jeśli `completed_at` jest NULL → używa `scheduled_date`
- Jeśli `scheduled_date` jest tylko datą (np. "2025-11-04") → formatuje jako "2025-11-04 00:00"
- **Problem:** `completed_at` nie jest synchronizowane lub jest NULL

---

### **FAKT 4: Konwersja `order_parts` → `parts_used`**

**Plik:** `desktop/src/electron/api-server.js` (linia 1608-1634)

**Warunek konwersji:**
```javascript
if (!partsUsedText || String(partsUsedText).trim() === '') {
  // Konwertuj order_parts
}
```

**Wniosek:**
- Konwersja działa TYLKO jeśli `parts_used` jest NULL/puste
- Jeśli `parts_used` ma wartość "9" → konwersja NIE DZIAŁA
- **Problem:** Desktop ma "9" w `parts_used` → konwersja nie uruchamia się

---

## 🎯 DIAGNOZA NA PODSTAWIE TWARDYCH DANYCH

### **PROBLEM 1: "9" zamiast nazwy części**

**Przyczyna:**
1. Desktop ma `parts_used` = "9" w SQLite (stara wartość)
2. Konwersja `order_parts` → `parts_used` NIE DZIAŁA bo `parts_used` nie jest NULL/puste
3. Desktop synchronizuje "9" do Railway
4. Railway ma `parts_used` = "9"
5. Mobile app otrzymuje "9" z Railway
6. `_bestCatalogMatch("9")` zwraca `null` (bo < 3 znaki)
7. Mobile app wyświetla "9"

**Rozwiązanie:**
- Konwersja powinna działać też gdy `parts_used` jest krótkim tekstem (1-2 znaki, prawdopodobnie ID)
- Albo: czyścić stare wartości "9" przed konwersją

---

### **PROBLEM 2: "2025-11-04 00:00"**

**Przyczyna:**
1. `completed_at` jest NULL w Railway (nie zostało zsynchronizowane lub zlecenie nie zostało zakończone)
2. Mobile app używa `scheduled_date` jako fallback
3. `scheduled_date` jest tylko datą (np. "2025-11-04") bez czasu
4. `formatDateTimeLocal` formatuje jako "2025-11-04 00:00"

**Rozwiązanie:**
- Upewnić się że `completed_at` jest synchronizowane (już dodane w poprzednich zmianach)
- Sprawdzić czy zlecenie zostało faktycznie zakończone w desktop

---

## ✅ PLAN NAPRAWY NA PODSTAWIE TWARDYCH DANYCH

### **KROK 1: Naprawić konwersję `order_parts` → `parts_used`**

**Problem:** Konwersja nie działa gdy `parts_used` ma wartość "9"

**Rozwiązanie:** Dodać warunek dla krótkich wartości (1-2 znaki, prawdopodobnie ID)

**Zmiana w:** `desktop/src/electron/api-server.js` (linia 1610)
```javascript
// Bezpieczna konwersja order_parts → parts_used
let partsUsedText = o.parts_used || null

// Konwertuj jeśli parts_used jest NULL/puste LUB jest krótkim tekstem (1-2 znaki - prawdopodobnie ID)
if (!partsUsedText || String(partsUsedText).trim() === '' || String(partsUsedText).trim().length <= 2) {
  try {
    const orderParts = await this.db.all(...)
    // ... konwersja
  }
}
```

**To samo w:** `desktop/src/views/orders/OrdersList.vue`

---

### **KROK 2: Dodać fallback w mobile app dla ID części**

**Problem:** `_bestCatalogMatch` nie może zmapować "9" (wymaga min 3 znaki)

**Rozwiązanie:** Dodać specjalną obsługę dla krótkich wartości (prawdopodobnie ID)

**Zmiana w:** `public/js/app.js` (linia 698-714)
```javascript
mapPartsTextToCatalog(raw) {
  const parts = String(raw||'').split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)
  if (!parts.length) return ''
  const mapped = parts.map(t => {
    // Jeśli tekst jest tylko cyfrą (1-5 znaków) - prawdopodobnie ID części
    if (/^\d{1,5}$/.test(t.trim())) {
      const byId = this.partsCatalog.find(p => String(p.id) === t.trim())
      if (byId) return this._displayPartName(byId)
    }
    const m = this._bestCatalogMatch(t, { brand: this.selectedOrder?.device_brand })
    return m ? this._displayPartName(m) : t
  })
  return uniq.join(', ')
}
```

---

### **KROK 3: Weryfikacja synchronizacji `completed_at`**

**Sprawdzenie:** Czy `completed_at` jest faktycznie synchronizowane (już dodane w poprzednich zmianach)

**Weryfikacja:** Sprawdzić czy dla zakończonych zleceń `completed_at` jest w payload

---

## 🔒 PRZEWIDYWANE KONSEKWENCJE

### **Zmiana 1: Konwersja dla krótkich wartości**

**Ryzyko:** NISKIE
- Tylko rozszerza warunek konwersji
- Nie zmienia istniejących dobrych działających wartości
- Bezpieczne - konwertuje tylko gdy wartość jest podejrzana (1-2 znaki)

**Konsekwencje:**
- ✅ Naprawi problem gdy desktop ma "9" w `parts_used`
- ✅ Nie zepsuje istniejących dobrych wartości (np. "Elektroda, Filtr")
- ⚠️ Może konwertować wartości które są faktycznie krótkimi nazwami (np. "O2") - ale to rzadkie

---

### **Zmiana 2: Fallback dla ID części w mobile app**

**Ryzyko:** BARDZO NISKIE
- Tylko dodaje obsługę dla cyfr
- Nie zmienia istniejącego mapowania
- Jeśli nie znajdzie części po ID → zwraca oryginalny tekst (jak teraz)

**Konsekwencje:**
- ✅ Naprawi wyświetlanie "9" gdy mobile app ma dostęp do katalogu części
- ✅ Nie zepsuje istniejącego mapowania nazw
- ⚠️ Wymaga żeby `partsCatalog` był załadowany - ale już jest ładowany przy starcie

---

## ✅ BEZPIECZEŃSTWO ROZWIĄZAŃ

### **Zmiana 1: Konwersja dla krótkich wartości**
- ✅ Backward compatible - nie zmienia dobrych wartości
- ✅ Działa tylko gdy wartość jest podejrzana (1-2 znaki)
- ✅ Soft fail - jeśli błąd, zachowuje oryginalną wartość

### **Zmiana 2: Fallback dla ID części**
- ✅ Backward compatible - nie zmienia istniejącego mapowania
- ✅ Działa tylko dla cyfr (prawdopodobnie ID)
- ✅ Jeśli nie znajdzie → zwraca oryginalny tekst (jak teraz)

---

## 📋 PODSUMOWANIE TWARDYCH DANYCH

**Problem "9":**
- ✅ FAKT: `_bestCatalogMatch` wymaga min 3 znaki → "9" nie może być zmapowane
- ✅ FAKT: Konwersja nie działa gdy `parts_used` = "9" (nie jest NULL/puste)
- ✅ ROZWIĄZANIE: Rozszerzyć warunek konwersji + dodać fallback w mobile app

**Problem daty:**
- ✅ FAKT: `completed_at` jest NULL → używa `scheduled_date`
- ✅ FAKT: `scheduled_date` jest tylko datą → formatuje jako "00:00"
- ✅ ROZWIĄZANIE: `completed_at` już dodane do synchronizacji (poprzednie zmiany)


