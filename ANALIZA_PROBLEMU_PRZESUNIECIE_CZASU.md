# ANALIZA PROBLEMU: Przesunięcie czasu w zleceniach serwisowych

## 🔍 OPIS PROBLEMU

**Symptom:**
- Desktop app: użytkownik ustawia zlecenie na **4.11.2025 13:00**
- Mobile app: wyświetla się **2025-11-04 12:00** (przesunięcie o 1 godzinę)

## 📊 DIAGNOZA - Ścieżka danych

### 1. **DESKTOP APP - Tworzenie zlecenia**

**Plik:** `desktop/src/views/orders/OrderFormModal.vue`

**Linia 250-253:** Input `datetime-local`
```vue
<input
  v-model="form.scheduled_date"
  type="datetime-local"
  class="input-field"
/>
```
- Użytkownik wprowadza: `2025-11-04T13:00` (lokalny czas, bez timezone)

**Linia 721:** Konwersja przed zapisem
```javascript
scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null
```

**PROBLEM:**
- `new Date("2025-11-04T13:00")` → JavaScript traktuje jako **lokalny czas** (np. CET = UTC+1)
- `toISOString()` → konwertuje na **UTC**, odejmując offset
- **Rezultat:** `"2025-11-04T12:00:00.000Z"` (jeśli CET = UTC+1) lub `"2025-11-04T11:00:00.000Z"` (jeśli CEST = UTC+2)

**Zapis do SQLite:**
- Kolumna `scheduled_date` w SQLite otrzymuje: `"2025-11-04T12:00:00.000Z"` (lub `11:00:00.000Z`)

---

### 2. **SYNCHRONIZACJA DESKTOP → RAILWAY**

**Plik:** `desktop/railway-backend/routes/sync.js`

**Linia 491-492:** Przetwarzanie `scheduled_date`
```javascript
const scheduledDate = sanitizeDate(orderData && orderData.scheduled_date);
const scheduledTime = extractTime(orderData && orderData.scheduled_date);
```

**Funkcje helper:**

**Linia 41-51:** `sanitizeDate()`
```javascript
function sanitizeDate(value) {
  try {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);  // Wyciąga tylko datę
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10); // Wyciąga datę z ISO
    return null;
  } catch (_) { return null; }
}
```
- **Rezultat:** `"2025-11-04"` (tylko data)

**Linia 53-60:** `extractTime()`
```javascript
function extractTime(value) {
  try {
    if (!value) return null;
    const s = String(value).trim();
    const m = s.match(/T(\d{2}:\d{2})/);  // Wyciąga czas z ISO string
    return m ? m[1] + ':00' : null;
  } catch (_) { return null; }
}
```
- **Input:** `"2025-11-04T12:00:00.000Z"` (już UTC!)
- **Rezultat:** `"12:00:00"` (czas UTC, nie lokalny!)

**Zapis do PostgreSQL:**
- `scheduled_date` = `'2025-11-04'` (DATE)
- `scheduled_time` = `'12:00:00'` (TIME) ← **TO JEST CZAS UTC, NIE LOKALNY!**

---

### 3. **RAILWAY → MOBILE APP**

**Plik:** `desktop/railway-backend/routes/orders.js`

**Linia 182-186:** Budowanie `scheduled_datetime` dla mobile
```sql
COALESCE(
  CASE WHEN r.scheduled_time IS NOT NULL AND r.scheduled_date IS NOT NULL
       THEN to_char(r.scheduled_date, 'YYYY-MM-DD') || 'T' || r.scheduled_time
       ELSE NULL END,
  to_char(r.scheduled_date, 'YYYY-MM-DD')
) AS scheduled_datetime
```
- **Rezultat:** `"2025-11-04T12:00:00"` (bez timezone info, ale czas jest UTC)

**Mobile app otrzymuje:**
- `scheduled_datetime: "2025-11-04T12:00:00"`

---

### 4. **MOBILE APP - Wyświetlanie**

**Plik:** `public/js/app.js`

**Linia 605-623:** `formatDateTimeLocal()`
```javascript
formatDateTimeLocal(value) {
  try {
    if (!value) return 'Brak danych';
    const s = String(value);
    // Wzorzec z T na pozycji 10 – traktuj jako lokalny zapis i wytnij HH:MM
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
      const d = s.slice(0, 10);
      const t = s.slice(11, 16);
      return `${d} ${t}`;  // Wyciąga dokładnie to co jest w stringu
    }
    // ...
  }
}
```

**Rezultat wyświetlania:**
- Input: `"2025-11-04T12:00:00"`
- Output: `"2025-11-04 12:00"` ← **Wyświetla czas UTC jako lokalny!**

---

## 🎯 PRZYCZYNA PROBLEMU

**Główna przyczyna:** Konwersja lokalnego czasu na UTC podczas zapisu w desktop app.

**Kaskada błędów:**
1. Desktop: `new Date("2025-11-04T13:00").toISOString()` → konwertuje lokalny czas na UTC
2. Sync: `extractTime()` wyciąga czas z UTC stringa → `12:00:00` (UTC)
3. Railway: zapisuje `12:00:00` jako lokalny czas (ale to jest UTC!)
4. Mobile: wyświetla `12:00:00` jako lokalny czas (ale powinno być `13:00`)

**Dodatkowe czynniki:**
- `datetime-local` nie zawiera informacji o timezone
- `toISOString()` zawsze konwertuje na UTC
- Railway przechowuje czas bez timezone info (kolumna TIME, nie TIMESTAMP)
- Mobile app traktuje czas jako lokalny bez konwersji

---

## ✅ PLAN NAPRAWY

### **OPCJA 1: Zachować czas lokalny (REKOMENDOWANA)**

**Zasada:** Traktować czas wprowadzony przez użytkownika jako **lokalny czas** i zapisywać go bez konwersji na UTC.

#### **Krok 1: Poprawić OrderFormModal.vue (desktop)**

**Zmiana w linii 721:**
```javascript
// PRZED:
scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null

// PO:
scheduled_date: form.scheduled_date ? form.scheduled_date + ':00' : null
```

**Alternatywnie (bezpieczniej):**
```javascript
scheduled_date: form.scheduled_date 
  ? (form.scheduled_date.includes('T') 
      ? form.scheduled_date + ':00'  // Dodaj sekundy jeśli brakuje
      : form.scheduled_date)
  : null
```

**Efekt:** Zapisuje `"2025-11-04T13:00:00"` (bez `Z`, bez konwersji UTC)

---

#### **Krok 2: Sprawdzić sync.js (Railway)**

**Funkcja `extractTime()` już działa poprawnie** - wyciąga czas z stringa ISO.

**Upewnić się że `sanitizeDate()` też działa:**
- ✅ Wyciąga tylko datę: `"2025-11-04"`
- ✅ Wyciąga czas: `"13:00:00"` (z lokalnego stringa, nie UTC)

**Kod jest OK** - problem jest w źródle danych (desktop).

---

#### **Krok 3: Sprawdzić OrderDetails.vue (desktop)**

**Linia 1477:** Edycja terminu już używa poprawnego podejścia:
```javascript
const iso = `${scheduleDate.value}T${timePart}:00`
```
- ✅ Zapisuje bez konwersji UTC
- ✅ Używa lokalnego czasu

**TO DZIAŁA POPRAWNIE** - tylko OrderFormModal wymaga poprawki.

---

#### **Krok 4: Zweryfikować mobile app**

**`formatDateTimeLocal()` już działa poprawnie:**
- Wyciąga czas bezpośrednio z stringa
- Nie wykonuje konwersji timezone

**Kod jest OK** - problem był w źródle danych.

---

### **OPCJA 2: Przechowywać UTC i konwertować przy wyświetlaniu**

**Nie rekomendowane** - wymaga:
- Zmiany w mobile app (konwersja UTC → lokalny)
- Zmiany w Railway (przechowywanie timezone)
- Większej złożoności

---

## 📋 CHECKLIST NAPRAWY

### **Plik 1: `desktop/src/views/orders/OrderFormModal.vue`**
- [ ] **Linia 721:** Zmienić konwersję `scheduled_date`
  - Usunąć `new Date(...).toISOString()`
  - Użyć bezpośrednio wartości z `datetime-local` input
  - Dodać `:00` dla sekund jeśli brakuje

### **Plik 2: Testy**
- [ ] Utworzyć zlecenie z czasem `13:00` w desktop
- [ ] Sprawdzić wartość w SQLite (powinno być `2025-11-04T13:00:00`)
- [ ] Sprawdzić synchronizację do Railway
- [ ] Sprawdzić wyświetlanie w mobile app (powinno być `13:00`)

### **Plik 3: Backward compatibility**
- [ ] Sprawdzić czy istniejące zlecenia z UTC czasem będą działać
- [ ] Jeśli nie - rozważyć migrację danych (opcjonalnie)

---

## 🔒 BEZPIECZEŃSTWO ZMIAN

### **Ryzyko: NISKIE**
- Zmiana tylko w jednym miejscu (OrderFormModal.vue)
- Nie zmienia struktury bazy danych
- Nie zmienia API endpoints
- Backward compatible - istniejące zlecenia będą działać (tylko nowe będą poprawne)

### **Testowanie:**
1. Utworzyć nowe zlecenie z czasem `13:00`
2. Sprawdzić wartość w SQLite
3. Sprawdzić synchronizację do Railway
4. Sprawdzić wyświetlanie w mobile app
5. Sprawdzić czy edycja terminu działa (OrderDetails.vue już ma poprawne podejście)

---

## 📝 DODATKOWE UWAGI

### **Obserwacja:**
W `OrderDetails.vue` (linia 1477) już używa się poprawnego podejścia:
```javascript
const iso = `${scheduleDate.value}T${timePart}:00`
```
- Nie używa `toISOString()`
- Zapisuje lokalny czas bez konwersji

**Wniosek:** Problem dotyczy tylko tworzenia nowych zleceń w `OrderFormModal.vue`.

### **Kompatybilność:**
- Istniejące zlecenia z UTC czasem będą nadal działać
- Mobile app wyświetli je z przesunięciem (ale to już jest znany problem)
- Nowe zlecenia będą poprawne

---

## ✅ PODSUMOWANIE

**Problem:** Konwersja lokalnego czasu na UTC podczas zapisu zlecenia.

**Rozwiązanie:** Usunąć `toISOString()` i zapisywać lokalny czas bezpośrednio.

**Zmiana:** Tylko jedna linia w `OrderFormModal.vue` (linia 721).

**Bezpieczeństwo:** Niskie ryzyko, backward compatible.

**Testowanie:** Utworzyć nowe zlecenie i sprawdzić całą ścieżkę danych.


