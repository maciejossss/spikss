# ODPOWIEDŹ NA PYTANIE UŻYTKOWNIKA

## 🔍 PYTANIE UŻYTKOWNIKA

**Scenariusz:**
1. Kończę zlecenie
2. Dodaję część która trafia do historii urządzenia
3. Tworzę nowe zlecenie - przypisuję i wysyłam
4. Czy w tym momencie się synchronizuje i wysyła aktualne dane w tym dane z historii urządzenia?

---

## ✅ ODPOWIEDŹ NA PODSTAWIE KODU

### **NIE - synchronizacja zlecenia NIE wysyła części z historii urządzenia**

**Dlaczego:**

**Kod synchronizacji:** `desktop/src/electron/api-server.js` (linia 1613-1630)
```javascript
const orderParts = await this.db.all(
  `SELECT sp.name, sp.part_number, op.quantity 
   FROM order_parts op 
   JOIN spare_parts sp ON op.part_id = sp.id 
   WHERE op.order_id = ? AND sp.name IS NOT NULL  // ← TYLKO części z tego zlecenia!
   ORDER BY sp.name`,
  [o.id]  // ← ID bieżącego zlecenia
)
```

**Co to oznacza:**
- ✅ Synchronizuje TYLKO części z `order_parts` dla tego konkretnego zlecenia (`op.order_id = ?`)
- ❌ NIE synchronizuje części z historii urządzenia (z innych zleceń)
- ❌ NIE synchronizuje części przypisanych bezpośrednio do urządzenia (`spare_parts.device_id`)

---

## 🔍 JAK MOBILE APP POBIERA HISTORIĘ URZĄDZENIA?

**Endpoint:** `desktop/railway-backend/routes/devices.js` (linia 29-43)
```javascript
router.get('/:id/orders', async (req, res) => {
  const q = `
    SELECT id, order_number, status, title, description,
           completed_at, started_at, scheduled_date, created_at,
           parts_used, completed_categories, completion_notes, work_photos
      FROM service_orders
     WHERE device_id = $1
     ORDER BY COALESCE(completed_at, started_at, scheduled_date, created_at) DESC
     LIMIT 100
  `
})
```

**Co to oznacza:**
- ✅ Mobile app pobiera WSZYSTKIE zlecenia dla urządzenia z Railway
- ✅ Każde zlecenie ma swoje `parts_used` (części użyte w tym zleceniu)
- ✅ Mobile app wyświetla wszystkie `parts_used` z wszystkich zleceń = historia urządzenia

---

## 🎯 CO SIĘ DZIEJE W TWOIM SCENARIUSZU?

### **KROK 1: Kończysz zlecenie**

**Co się dzieje:**
- Zlecenie jest oznaczane jako `completed`
- Jeśli masz części w `order_parts` → konwertuje do `parts_used`
- Synchronizuje zlecenie do Railway (jeśli `desktop_sync_status <> 'sent'`)

**Rezultat:**
- Railway ma zlecenie z `parts_used` = "Część1, Część2"

---

### **KROK 2: Dodajesz część która trafia do historii urządzenia**

**Co się dzieje:**
- Część jest zapisywana do `order_parts` dla zakończonego zlecenia
- **ALE:** Zlecenie ma już `desktop_sync_status = 'sent'` → NIE synchronizuje się ponownie!
- **PROBLEM:** Railway NIE otrzymuje nowej części!

**Rezultat:**
- Desktop ma część w `order_parts`
- Railway NIE ma aktualnej części (bo nie synchronizuje się)

---

### **KROK 3: Tworzysz nowe zlecenie - przypisujesz i wysyłasz**

**Co się dzieje:**
- Nowe zlecenie ma `desktop_sync_status = NULL` → synchronizuje się
- Synchronizuje TYLKO części z tego nowego zlecenia (`order_parts` dla tego zlecenia)
- **NIE synchronizuje** części z poprzedniego zlecenia (historii urządzenia)

**Rezultat:**
- Railway otrzymuje nowe zlecenie z `parts_used` dla tego zlecenia
- Railway NIE otrzymuje części z poprzedniego zlecenia (bo było już zsynchronizowane)

---

## ❌ PROBLEM

**Mobile app wyświetla historię urządzenia z Railway:**
- Pobiera WSZYSTKIE zlecenia dla urządzenia
- Wyświetla `parts_used` z każdego zlecenia
- **ALE:** Railway nie ma aktualnych danych z poprzedniego zlecenia (bo nie zostało zsynchronizowane ponownie)

**Efekt:**
- Mobile app pokazuje stare dane (brak nowej części z kroku 2)

---

## ✅ ROZWIĄZANIE

**Po zapisaniu `order_parts` → resetować `desktop_sync_status` = NULL**

**To spowoduje:**
- ✅ Zlecenie będzie synchronizowane ponownie
- ✅ Railway otrzyma aktualne części z `order_parts`
- ✅ Mobile app wyświetli aktualną historię urządzenia

---

## 📋 PODSUMOWANIE

**Odpowiedź na pytanie:**
- ❌ NIE - synchronizacja nowego zlecenia NIE wysyła części z historii urządzenia
- ✅ Mobile app pobiera historię urządzenia z Railway (wszystkie zlecenia)
- ⚠️ Problem: Stare zlecenia nie synchronizują się ponownie po dodaniu części
- ✅ Rozwiązanie: Resetować `desktop_sync_status` po zapisaniu `order_parts`


