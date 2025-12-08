# DIAGNOZA PROBLEMU - Części nie pokazują się w zakładce urządzenia

## 🔍 ANALIZA QUERY

**Kod:** `desktop/src/views/devices/DeviceDetails.vue` (linia 852-860)

**Query:**
```sql
SELECT sp.id, sp.name, sp.part_number, sp.manufacturer, sp.brand, sp.category, sp.price, NULL as stock_quantity, NULL as min_stock_level, so.device_id
FROM order_parts op
JOIN service_orders so ON so.id = op.order_id
LEFT JOIN spare_parts sp ON sp.id = op.part_id
WHERE so.device_id = ? AND op.part_id IS NOT NULL
ORDER BY sp.name
```

**PROBLEM 1: LEFT JOIN może zwrócić NULL**

**Scenariusz:**
- `order_parts` ma wpis z `part_id = 9`
- `spare_parts` NIE MA części z `id = 9` (lub część została usunięta)
- LEFT JOIN zwróci `sp.name = NULL`, `sp.id = NULL`, itd.
- Rekord z NULL name może być nie wyświetlany lub filtrowany

**PROBLEM 2: Query wymaga żeby część istniała w spare_parts**

**Scenariusz:**
- Część została dodana do `order_parts` z `part_id`
- Część nie istnieje w `spare_parts` (np. została usunięta)
- Query zwróci rekord z NULL wartościami
- Lista może nie wyświetlać części z NULL name

**PROBLEM 3: Brak odświeżania po powrocie z zlecenia**

**Scenariusz:**
- Użytkownik dodaje część w zleceniu
- Wraca do DeviceDetails
- Lista nie jest odświeżana (brak watch na activeTab)

---

## ✅ ROZWIĄZANIE

### **ROZWIĄZANIE 1: Obsłużyć przypadki gdy spare_parts nie ma części**

**Zmiana query:**
```sql
SELECT 
  COALESCE(sp.id, op.part_id) as id,
  COALESCE(sp.name, 'Nieznana część') as name,
  COALESCE(sp.part_number, '') as part_number,
  sp.manufacturer,
  sp.brand,
  sp.category,
  COALESCE(sp.price, 0) as price,
  NULL as stock_quantity,
  NULL as min_stock_level,
  so.device_id
FROM order_parts op
JOIN service_orders so ON so.id = op.order_id
LEFT JOIN spare_parts sp ON sp.id = op.part_id
WHERE so.device_id = ? AND op.part_id IS NOT NULL
ORDER BY COALESCE(sp.name, 'Nieznana część')
```

**LUB prościej - użyć danych z order_parts jeśli spare_parts nie ma:**

**Lepsze rozwiązanie:** Dodać fallback do danych z order_parts jeśli spare_parts nie ma części

---

### **ROZWIĄZANIE 2: Dodać watch na activeTab żeby odświeżać listę**

**Zmiana:**
```javascript
watch(activeTab, (newTab) => {
  if (newTab === 'parts' && device.value) {
    loadDeviceParts() // Odśwież listę części przy przełączeniu na zakładkę
  }
})
```

---

### **ROZWIĄZANIE 3: Sprawdzić czy części faktycznie są w order_parts**

**Możliwe że:**
- Części nie są zapisywane do `order_parts`
- Części są zapisywane, ale z błędnym `part_id`
- Części są zapisywane, ale `spare_parts` nie ma tych części

---

## 🎯 DIAGNOZA - CO MOŻE BYĆ ŹLE

### **HIPOTEZA 1: LEFT JOIN zwraca NULL**

**Problem:** Jeśli `spare_parts` nie ma części, LEFT JOIN zwraca NULL dla wszystkich pól

**Sprawdzenie:** Czy query powinno obsługiwać przypadki gdy `spare_parts` nie ma części?

**Rozwiązanie:** Dodać COALESCE lub fallback do danych z `order_parts`

---

### **HIPOTEZA 2: Części nie są zapisywane do order_parts**

**Problem:** Części są dodawane do zlecenia, ale nie są zapisywane do `order_parts`

**Sprawdzenie:** Czy `OrderPartFormModal` faktycznie zapisuje do `order_parts`?

**Rozwiązanie:** Sprawdzić czy INSERT działa poprawnie

---

### **HIPOTEZA 3: Lista nie jest odświeżana**

**Problem:** Po powrocie z zlecenia do DeviceDetails, lista nie jest odświeżana

**Sprawdzenie:** Czy `loadDeviceParts()` jest wywoływane po powrocie?

**Rozwiązanie:** Dodać watch na activeTab lub odświeżać przy montowaniu komponentu

---

## 🔍 CO SPRAWDZIĆ NAJPIERW

1. **Czy części faktycznie są w order_parts?**
   - Sprawdzić bezpośrednio w bazie SQLite
   - Sprawdzić czy INSERT działa

2. **Czy spare_parts ma te części?**
   - Sprawdzić czy części z order_parts istnieją w spare_parts

3. **Czy query zwraca wyniki?**
   - Sprawdzić czy query faktycznie zwraca części
   - Sprawdzić czy LEFT JOIN nie zwraca NULL

4. **Czy lista jest odświeżana?**
   - Sprawdzić czy loadDeviceParts jest wywoływane po powrocie z zlecenia


