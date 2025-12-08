# PLAN BEZPIECZNEJ NAPRAWY - Na podstawie TWARDYCH DANYCH

## 🔍 DIAGNOZA NA PODSTAWIE KODU

### **PROBLEM 1: "9" zamiast nazwy części**

**FAKT z kodu:**
- `desktop/src/electron/api-server.js` linia 1610: Konwersja działa TYLKO gdy `parts_used` jest NULL/puste
- Jeśli `parts_used` = "9" → konwersja NIE DZIAŁA
- Desktop synchronizuje "9" do Railway
- Mobile app otrzymuje "9" z Railway
- `public/js/app.js` linia 669: `_bestCatalogMatch` wymaga min 3 znaki → "9" nie może być zmapowane

**ROZWIĄZANIE:**
1. Rozszerzyć warunek konwersji w desktop (działa też dla wartości <= 2 znaki - prawdopodobnie ID)
2. Dodać fallback w mobile app (mapowanie ID części gdy `partsCatalog` jest załadowany)

---

### **PROBLEM 2: "2025-11-04 00:00"**

**FAKT z kodu:**
- `public/js/app.js` linia 383: `completed_at || started_at || scheduled_date || created_at`
- Jeśli `completed_at` jest NULL → używa `scheduled_date`
- `scheduled_date` może być tylko datą (bez czasu) → formatuje jako "00:00"
- `completed_at` już jest synchronizowane (poprzednie zmiany)

**ROZWIĄZANIE:**
- To jest poprawne zachowanie - jeśli zlecenie nie zostało zakończone, używa daty zaplanowanej
- Problem może być że zlecenie zostało zakończone ale `completed_at` nie zostało zsynchronizowane
- Sprawdzić czy `completed_at` jest faktycznie w payload synchronizacji

---

## ✅ PLAN NAPRAWY

### **ZMIANA 1: Rozszerzyć konwersję `order_parts` → `parts_used` w desktop**

**Plik:** `desktop/src/electron/api-server.js` (linia 1610)

**Obecny kod:**
```javascript
if (!partsUsedText || String(partsUsedText).trim() === '') {
  // konwersja
}
```

**Nowy kod:**
```javascript
// Konwertuj jeśli parts_used jest NULL/puste LUB jest krótkim tekstem (1-2 znaki - prawdopodobnie ID części)
const partsUsedTrimmed = partsUsedText ? String(partsUsedText).trim() : ''
if (!partsUsedText || partsUsedTrimmed === '' || partsUsedTrimmed.length <= 2) {
  // konwersja
}
```

**Bezpieczeństwo:**
- ✅ Tylko rozszerza warunek - nie zmienia istniejącej logiki
- ✅ Konwertuje tylko podejrzane wartości (1-2 znaki)
- ✅ Nie zepsuje dobrych wartości (np. "Elektroda, Filtr")
- ✅ Soft fail - jeśli błąd, zachowuje oryginalną wartość

**Ryzyko:** NISKIE - tylko rozszerza warunek konwersji

---

### **ZMIANA 2: Rozszerzyć konwersję w OrdersList.vue**

**Plik:** `desktop/src/views/orders/OrdersList.vue` (linia ~2760)

**Taka sama zmiana jak w api-server.js**

**Bezpieczeństwo:** Taki sam jak ZMIANA 1

---

### **ZMIANA 3: Dodać fallback dla ID części w mobile app**

**Plik:** `public/js/app.js` (linia 698-714)

**Obecny kod:**
```javascript
mapPartsTextToCatalog(raw) {
  const parts = String(raw||'').split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)
  if (!parts.length) return ''
  const mapped = parts.map(t => {
    const m = this._bestCatalogMatch(t, { brand: this.selectedOrder?.device_brand })
    return m ? this._displayPartName(m) : t
  })
  return uniq.join(', ')
}
```

**Nowy kod:**
```javascript
mapPartsTextToCatalog(raw) {
  const parts = String(raw||'').split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)
  if (!parts.length) return ''
  const mapped = parts.map(t => {
    // Jeśli tekst jest tylko cyfrą (1-5 znaków) - prawdopodobnie ID części
    // Spróbuj znaleźć część po ID w katalogu
    if (/^\d{1,5}$/.test(t.trim())) {
      const catalog = Array.isArray(this.partsCatalog) ? this.partsCatalog : []
      const byId = catalog.find(p => String(p.id) === t.trim())
      if (byId) return this._displayPartName(byId)
    }
    // Standardowe mapowanie po nazwie/SKU
    const m = this._bestCatalogMatch(t, { brand: this.selectedOrder?.device_brand })
    return m ? this._displayPartName(m) : t
  })
  return uniq.join(', ')
}
```

**Bezpieczeństwo:**
- ✅ Tylko dodaje obsługę dla cyfr (prawdopodobnie ID)
- ✅ Nie zmienia istniejącego mapowania po nazwie/SKU
- ✅ Jeśli nie znajdzie części po ID → zwraca oryginalny tekst (jak teraz)
- ✅ Wymaga żeby `partsCatalog` był załadowany - ale już jest ładowany przy starcie

**Ryzyko:** BARDZO NISKIE - tylko dodaje fallback, nie zmienia istniejącej logiki

---

## 🔒 PRZEWIDYWANE KONSEKWENCJE

### **ZMIANA 1 i 2: Konwersja dla krótkich wartości**

**Pozytywne:**
- ✅ Naprawi problem gdy desktop ma "9" w `parts_used`
- ✅ Automatycznie naprawi stare zlecenia z ID części
- ✅ Nie zepsuje istniejących dobrych wartości

**Negatywne:**
- ⚠️ Może konwertować wartości które są faktycznie krótkimi nazwami (np. "O2", "A1") - ale to rzadkie
- ⚠️ Jeśli `order_parts` nie ma części → pozostawi NULL/puste (jak teraz)

**Mitigacja:**
- Warunek `<= 2` znaki jest bezpieczny - większość prawdziwych nazw części ma więcej znaków
- Jeśli konwersja nie znajdzie części → pozostawi oryginalną wartość (soft fail)

---

### **ZMIANA 3: Fallback dla ID części**

**Pozytywne:**
- ✅ Naprawi wyświetlanie "9" gdy mobile app ma dostęp do katalogu części
- ✅ Nie zmienia istniejącego mapowania po nazwie/SKU
- ✅ Działa nawet jeśli desktop nie zsynchronizował nazw części

**Negatywne:**
- ⚠️ Wymaga żeby `partsCatalog` był załadowany - ale już jest ładowany przy starcie
- ⚠️ Jeśli część o ID "9" nie istnieje w katalogu → zwróci "9" (jak teraz)

**Mitigacja:**
- Fallback tylko dla cyfr (1-5 znaków) - bezpieczne
- Jeśli nie znajdzie → zwraca oryginalny tekst (jak teraz)

---

## ✅ WERYFIKACJA BEZPIECZEŃSTWA

### **Test 1: Czy konwersja nie zepsuje dobrych wartości?**

**Scenariusz:** Desktop ma `parts_used` = "Elektroda, Filtr"

**Oczekiwany wynik:** Nie konwertuje (długość > 2 znaki) → pozostawia "Elektroda, Filtr"

**Status:** ✅ BEZPIECZNE

---

### **Test 2: Czy konwersja naprawi "9"?**

**Scenariusz:** Desktop ma `parts_used` = "9", ma części w `order_parts`

**Oczekiwany wynik:** Konwertuje "9" → "Nazwa części"

**Status:** ✅ BEZPIECZNE

---

### **Test 3: Czy mobile app zmapuje "9" do nazwy?**

**Scenariusz:** Railway ma `parts_used` = "9", mobile app ma `partsCatalog` załadowany

**Oczekiwany wynik:** Zmapuje "9" → "Nazwa części" (jeśli istnieje w katalogu)

**Status:** ✅ BEZPIECZNE

---

### **Test 4: Czy nie zepsuje istniejącego mapowania?**

**Scenariusz:** Mobile app ma `parts_used` = "Elektroda", katalog ma część "Elektroda"

**Oczekiwany wynik:** Zmapuje "Elektroda" → "Elektroda" (istniejące mapowanie działa)

**Status:** ✅ BEZPIECZNE

---

## 📋 PODSUMOWANIE

**Zmiany:**
1. Rozszerzyć warunek konwersji w `desktop/src/electron/api-server.js` (linia 1610)
2. Rozszerzyć warunek konwersji w `desktop/src/views/orders/OrdersList.vue` (linia ~2760)
3. Dodać fallback dla ID części w `public/js/app.js` (linia 698-714)

**Bezpieczeństwo:**
- ✅ Wszystkie zmiany są backward compatible
- ✅ Nie zmieniają istniejącej działającej logiki
- ✅ Tylko rozszerzają obsługę problematycznych przypadków
- ✅ Soft fail - jeśli błąd, zachowują oryginalne wartości

**Ryzyko:** NISKIE - tylko rozszerza istniejącą funkcjonalność


