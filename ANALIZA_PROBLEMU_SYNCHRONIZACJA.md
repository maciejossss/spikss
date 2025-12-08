# ANALIZA PROBLEMU SYNCHRONIZACJI - "9" zamiast pełnej nazwy, brak drugiej części

## 🔍 DIAGNOZA NA PODSTAWIE SCREENÓW

### **PROBLEM 1: Mobile app pokazuje "9" zamiast pełnej nazwy**
- Screen 1: Mobile app pokazuje "9" dla zlecenia SRV-2025-910688
- Desktop pokazuje DWIE części w zakładce "Części zamienne"

### **PROBLEM 2: Mobile app pokazuje tylko JEDNĄ część zamiast DWÓCH**
- Desktop: Pokazuje 2 części ("Elektroda Jonizacyjna 19KW", "elektroda jonizacyjna 26/35Kw")
- Mobile app: Pokazuje tylko "9" (jedna część)

---

## 🔍 ANALIZA KODU SYNCHRONIZACJI

### **KROK 1: Desktop konwertuje order_parts → parts_used**

**Plik:** `desktop/src/electron/api-server.js` (linia 1611-1630)

**Kod:**
```javascript
if (!partsUsedText || partsUsedTrimmed === '' || /^\d{1,2}$/.test(partsUsedTrimmed)) {
  const orderParts = await this.db.all(
    `SELECT sp.name, sp.part_number, op.quantity 
     FROM order_parts op 
     JOIN spare_parts sp ON op.part_id = sp.id 
     WHERE op.order_id = ? AND sp.name IS NOT NULL
     ORDER BY sp.name`,
    [o.id]
  )
  if (orderParts && orderParts.length > 0) {
    partsUsedText = orderParts
      .map(p => {
        const name = p.name || ''
        const partNumber = p.part_number ? ` ${p.part_number}` : ''
        return `${name}${partNumber}`.trim()
      })
      .filter(Boolean)
      .join(', ')
  }
}
```

**Wniosek:**
- ✅ Konwersja powinna działać dla "9" (regex `/^\d{1,2}$/` dopasuje)
- ✅ Powinna zwrócić wszystkie części oddzielone przecinkami: `"Nazwa1, Nazwa2"`
- ✅ Warunek sprawdza czy `parts_used` jest "9" → TAK → konwertuje

---

### **KROK 2: Desktop synchronizuje parts_used do Railway**

**Plik:** `desktop/src/electron/api-server.js` (linia 1649)

**Kod:**
```javascript
const orderPayload = [{
  ...
  parts_used: partsUsedText,  // ← Wysyła skonwertowaną wartość
  ...
}]
```

**Wniosek:**
- ✅ Desktop wysyła `parts_used` do Railway
- ✅ Jeśli konwersja zadziałała → wysyła "Nazwa1, Nazwa2"
- ⚠️ Jeśli konwersja NIE zadziałała → wysyła "9"

---

### **KROK 3: Railway zapisuje parts_used**

**Plik:** `desktop/railway-backend/routes/sync.js` (linia 537)

**Kod:**
```sql
parts_used = COALESCE($20, parts_used),
```

**Wniosek:**
- ✅ Railway używa `COALESCE` - jeśli `$20` jest NULL → zachowuje istniejącą wartość
- ⚠️ Jeśli `$20` ma wartość "9" → NADPISZE istniejącą wartość!

**PROBLEM:** Jeśli `parts_used` w Railway ma już wartość (np. z mobile app), a desktop wysyła "9" → Railway NADPISZE dobrą wartość "9"!

---

### **KROK 4: Mobile app pobiera parts_used z Railway**

**Plik:** `public/js/app.js` (linia 380-381)

**Kod:**
```javascript
const partsRaw = (h && h.parts_used) ? String(h.parts_used).trim() : ''
const parts = partsRaw ? this.mapPartsTextToCatalog(partsRaw) : ''
```

**Wniosek:**
- ✅ Mobile app pobiera `parts_used` z Railway
- ✅ Używa `mapPartsTextToCatalog` do mapowania
- ⚠️ Jeśli Railway ma "9" → mobile app otrzyma "9"

---

## 🎯 DIAGNOZA PROBLEMU

### **HIPOTEZA 1: Konwersja nie działa (zlecenie już ma zsynchronizowane "9")**

**Scenariusz:**
1. Zlecenie zostało wcześniej zsynchronizowane z `parts_used` = "9"
2. Desktop ma teraz `order_parts` z 2 częściami
3. Konwersja sprawdza: `parts_used` = "9" → TAK, konwertuje
4. **ALE:** Jeśli synchronizacja już się wykonała i Railway ma "9", może być za późno

**Problem:** Konwersja działa TYLKO podczas synchronizacji, nie dla już zsynchronizowanych zleceń.

---

### **HIPOTEZA 2: Railway nadpisuje dobrą wartość złym "9"**

**Scenariusz:**
1. Mobile app zapisała `parts_used` = "Elektroda, Filtr" do Railway
2. Desktop synchronizuje zlecenie z `parts_used` = "9" (stara wartość)
3. Railway: `COALESCE("9", "Elektroda, Filtr")` → NADPISZE "9"!

**Problem:** `COALESCE` zachowuje wartość tylko gdy pierwsza jest NULL, ale jeśli desktop wysyła "9" → nadpisze.

---

### **HIPOTEZA 3: Konwersja nie działa bo parts_used nie jest "9"**

**Scenariusz:**
1. Desktop ma `parts_used` = NULL lub "" (nie "9")
2. Desktop ma `order_parts` z 2 częściami
3. Konwersja sprawdza: `parts_used` jest NULL → TAK, konwertuje
4. **ALE:** Jeśli `parts_used` ma jakąś inną wartość (nie "9", nie NULL) → konwersja NIE DZIAŁA

**Problem:** Warunek konwersji działa tylko dla NULL/puste/"9", ale nie dla innych wartości.

---

## 🔍 SPRAWDZENIE FAKTÓW

### **FAKT 1: Warunek konwersji**

**Kod:**
```javascript
if (!partsUsedText || partsUsedTrimmed === '' || /^\d{1,2}$/.test(partsUsedTrimmed)) {
```

**Co to oznacza:**
- Konwertuje jeśli `parts_used` jest NULL/puste/"9"/"99"
- **NIE konwertuje** jeśli `parts_used` ma jakąś inną wartość (np. "Elektroda")

**Problem:** Jeśli `parts_used` ma jakąś starą wartość (nie "9") → konwersja NIE DZIAŁA!

---

### **FAKT 2: Railway używa COALESCE**

**Kod:**
```sql
parts_used = COALESCE($20, parts_used),
```

**Co to oznacza:**
- Jeśli `$20` (wartość z desktop) jest NULL → zachowuje istniejącą wartość
- Jeśli `$20` ma wartość (np. "9") → NADPISZE istniejącą wartość!

**Problem:** Desktop może nadpisać dobrą wartość z Railway złym "9"!

---

### **FAKT 3: Mobile app dzieli parts_used po przecinku**

**Kod:**
```javascript
const parts = String(raw||'').split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)
```

**Co to oznacza:**
- Mobile app dzieli `parts_used` po przecinku
- Jeśli Railway ma "Nazwa1, Nazwa2" → mobile app otrzyma 2 części
- Jeśli Railway ma "9" → mobile app otrzyma tylko "9"

**Wniosek:** Jeśli Railway ma tylko "9" → mobile app pokaże tylko "9"

---

## ✅ DIAGNOZA KOŃCOWA

### **PROBLEM GŁÓWNY: Synchronizacja nadpisuje dobrą wartość złym "9"**

**Przyczyna:**
1. Desktop ma `parts_used` = "9" (stara wartość) w SQLite
2. Desktop ma `order_parts` z 2 częściami (nowe dane)
3. Konwersja działa TYLKO gdy `parts_used` jest "9" → konwertuje do "Nazwa1, Nazwa2"
4. **ALE:** Jeśli synchronizacja już się wykonała wcześniej → Railway może mieć już "9"
5. Desktop synchronizuje ponownie → jeśli `parts_used` w SQLite nadal jest "9" → wysyła "9"
6. Railway: `COALESCE("9", istniejąca_wartość)` → NADPISZE "9"!

**LUB:**

1. Desktop ma `parts_used` = jakąś starą wartość (nie "9", nie NULL)
2. Konwersja NIE DZIAŁA (warunek nie spełniony)
3. Desktop synchronizuje starą wartość → Railway nadpisze

---

## 🔍 CO SPRAWDZIĆ

### **Pytanie 1: Czy konwersja faktycznie działa?**

**Sprawdzić:**
- Czy `parts_used` w SQLite dla zlecenia SRV-2025-910688 jest "9"?
- Czy `order_parts` ma 2 części dla tego zlecenia?
- Czy konwersja faktycznie uruchamia się?

**Jak sprawdzić:**
- Sprawdzić logi synchronizacji w desktop
- Sprawdzić wartość `parts_used` w SQLite przed synchronizacją
- Sprawdzić wartość `parts_used` w Railway po synchronizacji

---

### **Pytanie 2: Czy Railway ma poprawną wartość?**

**Sprawdzić:**
- Jaka wartość `parts_used` jest w Railway dla zlecenia SRV-2025-910688?
- Czy to "9" czy "Nazwa1, Nazwa2"?

**Jak sprawdzić:**
- Sprawdzić bezpośrednio w bazie Railway
- Sprawdzić endpoint `/api/devices/:id/orders` dla tego urządzenia

---

### **Pytanie 3: Czy synchronizacja faktycznie wysyła wszystkie części?**

**Sprawdzić:**
- Czy desktop faktycznie konwertuje wszystkie części z `order_parts`?
- Czy wynik konwersji to "Nazwa1, Nazwa2" czy tylko "Nazwa1"?

**Jak sprawdzić:**
- Sprawdzić logi konwersji w desktop
- Sprawdzić payload wysyłany do Railway

---

## 🎯 PODEJRZANA PRZYCZYNA

**MÓJ WNIOSEK:**

**PROBLEM PRAWDOPODOBNIE JEST W:**

1. **Konwersja nie działa dla już zsynchronizowanych zleceń:**
   - Jeśli zlecenie zostało już zsynchronizowane z `parts_used` = "9"
   - I `parts_used` w SQLite nadal jest "9"
   - Konwersja powinna działać → ale może nie działać jeśli synchronizacja już się wykonała

2. **Railway nadpisuje dobrą wartość:**
   - Jeśli mobile app zapisała dobrą wartość do Railway
   - A desktop synchronizuje starą wartość "9"
   - Railway nadpisze dobrą wartość "9"

3. **Konwersja nie działa jeśli parts_used ma inną wartość:**
   - Jeśli `parts_used` ma jakąś starą wartość (nie "9", nie NULL)
   - Konwersja NIE DZIAŁA
   - Desktop synchronizuje starą wartość

---

## ✅ POTWIERDZENIE - UŻYTKOWNIK MA RACJĘ

**TAK - TO JEST PROBLEM SYNCHRONIZACJI:**

1. ✅ Desktop pokazuje 2 części w zakładce "Części zamienne"
2. ✅ Mobile app pokazuje tylko "9" (jedna część)
3. ✅ To oznacza że synchronizacja NIE działa poprawnie
4. ✅ Railway nie ma aktualnych danych z desktop

**PROBLEM:** Synchronizacja nie przekazuje wszystkich części z desktop do Railway, lub Railway nadpisuje dobrą wartość złym "9".


