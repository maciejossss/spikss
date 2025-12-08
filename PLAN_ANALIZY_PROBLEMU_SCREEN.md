# PLAN ANALIZY PROBLEMU - Screen pokazuje "9" i "2025-11-04 00:00"

## 🔍 CO WIDZĘ NA SCREENIE

1. **"9" zamiast nazwy części:**
   - Zlecenie: SRV-2025-910688
   - Data: 2025-11-04 00:00
   - Część: "9" (cyfra zamiast pełnej nazwy)

2. **"2025-11-04 00:00" - data bez właściwej godziny:**
   - Data pokazuje "00:00" zamiast właściwej godziny wykonania

---

## 📋 PLAN ANALIZY - PROSTYMI SŁOWAMI

### **KROK 1: Sprawdzić co jest w bazie Railway**

**Co muszę sprawdzić:**
- Czy zlecenie SRV-2025-910688 ma `parts_used` w bazie Railway?
- Jaką wartość ma `parts_used`? (czy to "9" czy pełna nazwa?)
- Czy `completed_at` ma wartość? (czy jest NULL?)

**Jak sprawdzę:**
- Sprawdzę endpoint `/api/devices/:id/orders` - co zwraca dla tego urządzenia
- Sprawdzę bezpośrednio w bazie Railway (jeśli dostępne)

**Co chcę wiedzieć:**
- Czy problem jest w bazie Railway (dane są złe)?
- Czy problem jest w mobile app (źle wyświetla dobre dane)?

---

### **KROK 2: Sprawdzić czy synchronizacja działa**

**Co muszę sprawdzić:**
- Czy desktop ma poprawne dane dla zlecenia SRV-2025-910688?
- Czy `parts_used` w desktop ma pełną nazwę czy "9"?
- Czy synchronizacja wysłała dane do Railway?

**Jak sprawdzę:**
- Sprawdzę czy zlecenie w desktop ma `parts_used` w SQLite
- Sprawdzę czy konwersja `order_parts` → `parts_used` działa
- Sprawdzę logi synchronizacji (czy były błędy)

**Co chcę wiedzieć:**
- Czy desktop ma poprawne dane?
- Czy synchronizacja działa poprawnie?
- Czy problem jest w synchronizacji czy w źródle danych?

---

### **KROK 3: Sprawdzić dlaczego mobile app pokazuje "9"**

**Co muszę sprawdzić:**
- Czy mobile app otrzymuje "9" z Railway?
- Czy `mapPartsTextToCatalog` może zmapować "9" do nazwy części?
- Czy mobile app ma dostęp do katalogu części?

**Jak sprawdzę:**
- Sprawdzę co mobile app otrzymuje z API (`deviceHistory`)
- Sprawdzę czy `partsCatalog` jest załadowany
- Sprawdzę czy `_bestCatalogMatch` może znaleźć część po ID "9"

**Co chcę wiedzieć:**
- Czy problem jest w danych z Railway?
- Czy problem jest w mapowaniu części?
- Czy mobile app ma dostęp do katalogu części?

---

### **KROK 4: Sprawdzić dlaczego data pokazuje "00:00"**

**Co muszę sprawdzić:**
- Czy `completed_at` jest NULL w Railway?
- Czy mobile app używa `scheduled_date` jako fallback?
- Czy `scheduled_date` ma tylko datę bez czasu?

**Jak sprawdzę:**
- Sprawdzę wartości `completed_at`, `started_at`, `scheduled_date` w Railway
- Sprawdzę jak mobile app wybiera datę (linia 383: `completed_at || started_at || scheduled_date`)
- Sprawdzę jak `formatDateTimeLocal` formatuje datę

**Co chcę wiedzieć:**
- Czy `completed_at` jest NULL?
- Czy `scheduled_date` ma tylko datę bez czasu?
- Czy `formatDateTimeLocal` poprawnie formatuje datę?

---

## 🎯 HIPOTEZY PROBLEMU

### **Hipoteza 1: Dane w Railway są złe**
- `parts_used` ma wartość "9" (ID części zamiast nazwy)
- `completed_at` jest NULL
- Przyczyna: Synchronizacja nie działa lub wysyła złe dane

### **Hipoteza 2: Desktop nie ma dobrych danych**
- Desktop ma `parts_used` = "9" w SQLite
- Konwersja `order_parts` → `parts_used` nie działa
- Przyczyna: Zlecenie nie ma części w `order_parts` lub konwersja nie działa

### **Hipoteza 3: Mobile app nie może zmapować "9"**
- Railway ma "9" i to jest poprawne (ID części)
- Mobile app nie może znaleźć części po ID "9" w katalogu
- Przyczyna: `mapPartsTextToCatalog` nie obsługuje ID części

### **Hipoteza 4: Data - zlecenie nie zostało zakończone**
- `completed_at` jest NULL bo zlecenie nie zostało zakończone
- Mobile app używa `scheduled_date` który ma tylko datę
- Przyczyna: Zlecenie jest zaplanowane ale nie zakończone

---

## ✅ PLAN DZIAŁANIA

### **KROK 1: Sprawdzić dane w Railway**
- Sprawdzić endpoint `/api/devices/:id/orders` dla urządzenia z SRV-2025-910688
- Sprawdzić wartości `parts_used` i `completed_at` w odpowiedzi

### **KROK 2: Sprawdzić dane w desktop**
- Sprawdzić czy zlecenie SRV-2025-910688 ma `parts_used` w SQLite
- Sprawdzić czy ma części w `order_parts`
- Sprawdzić czy konwersja działa

### **KROK 3: Sprawdzić synchronizację**
- Sprawdzić czy synchronizacja wysłała dane do Railway
- Sprawdzić logi czy były błędy

### **KROK 4: Naprawić źródło problemu**
- Jeśli problem w synchronizacji → naprawić synchronizację
- Jeśli problem w danych desktop → naprawić konwersję
- Jeśli problem w mobile app → dodać obsługę ID części

---

## 🔍 CO MUSZĘ NAJPIERW SPRAWDZIĆ

**Priorytet 1:** Sprawdzić co jest w bazie Railway dla zlecenia SRV-2025-910688
- Czy `parts_used` ma wartość "9"?
- Czy `completed_at` jest NULL?

**Priorytet 2:** Sprawdzić czy synchronizacja działa
- Czy desktop wysłał dane do Railway?
- Czy były błędy synchronizacji?

**Priorytet 3:** Sprawdzić czy konwersja działa
- Czy desktop ma części w `order_parts`?
- Czy konwersja `order_parts` → `parts_used` działa?

---

## 📝 PYTANIA DO ODPOWIEDZI

1. **Czy zlecenie SRV-2025-910688 zostało zsynchronizowane do Railway?**
   - Jeśli NIE → problem w synchronizacji
   - Jeśli TAK → sprawdzić dane w Railway

2. **Czy `parts_used` w Railway ma wartość "9"?**
   - Jeśli TAK → problem w synchronizacji (wysyła złe dane)
   - Jeśli NIE → problem w mobile app (źle wyświetla)

3. **Czy `completed_at` w Railway jest NULL?**
   - Jeśli TAK → problem w synchronizacji (nie wysyła `completed_at`)
   - Jeśli NIE → problem w mobile app (źle wybiera datę)

4. **Czy desktop ma poprawne dane dla tego zlecenia?**
   - Jeśli TAK → problem w synchronizacji
   - Jeśli NIE → problem w desktop (konwersja nie działa)

---

## ✅ DOPIERO PO ODPOWIEDZIACH NA TE PYTANIA MOGĘ NAPRAWIĆ

**Nie mogę naprawić bez odpowiedzi na pytania powyżej!**


