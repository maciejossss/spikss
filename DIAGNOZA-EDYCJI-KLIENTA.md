# 🔍 DIAGNOZA PROBLEMU: Edycja klienta nie tworzy pending_changes

## ✅ CO DZIAŁA (urządzenia):

### Backend Railway (`desktop/railway-backend/routes/devices.js`):
```javascript
router.put('/:id', async (req, res) => {
  // ...
  const { propose, proposed_by } = req.body || {}
  
  if (propose) {
    // Zapisz propozycję do pending_changes ✅
    await db.query(
      `INSERT INTO pending_changes(entity, entity_id, payload, fields, proposed_by)
       VALUES ($1, $2, $3::jsonb, $4, $5)`,
      ['device', id, JSON.stringify(desired), fields, proposed_by || null]
    )
    return res.json({ success: true, pending: true })
  }
})
```

### Backend Railway (`desktop/railway-backend/routes/clients.js`):
```javascript
router.put('/:id', async (req, res) => {
  // ...
  const { phone, email, address, propose, proposed_by } = req.body || {}
  
  if (propose) {
    // Zapisz propozycję do pending_changes ✅
    await db.query(
      `INSERT INTO pending_changes(entity, entity_id, payload, fields, proposed_by)
       VALUES ($1, $2, $3::jsonb, $4, $5)`,
      ['client', id, JSON.stringify(payload), fields, proposed_by || null]
    )
    return res.json({ success: true, pending: true })
  }
})
```

**✅ OBA ENDPOINTY SĄ PRAWIDŁOWE!**

### Accept/Reject w Railway (`desktop/railway-backend/routes/events.js`):
- Linie 57-111: Akceptacja zmian klienta i urządzenia ✅
- Linie 64-75: Obsługa `entity === 'client'` ✅
- Linie 76-100: Obsługa `entity === 'device'` ✅

**✅ MECHANIZM AKCEPTACJI DZIAŁA DLA OBUDOSTRON!**

---

## 🔴 PODEJRZENIE - Brak interfejsu edycji klienta w aplikacji mobilnej

### Problem:
W aplikacji mobilnej Railway (`desktop/railway-backend/public/`) **BRAK KO DU** do edycji klienta!

### Sprawdzone pliki:
- ❌ `/js/app.js` - tylko wyświetlanie danych klienta, brak edycji
- ❌ `/js/order-detail.js` - tylko wyświetlanie, brak formularza edycji

### W aplikacji mobilnej są tylko:
1. Wyświetlanie danych klienta (imię, telefon, email, adres)
2. Przycisk "Zadzwoń" (otwiera tel:)
3. Przycisk "Nawigacja" (otwiera mapy)

**BRAK:** Przycisku "Edytuj dane klienta" lub formularza!

---

## 🎯 ROZWIĄZANIE

Muszę znaleźć lub dodać kod edycji klienta w aplikacji mobilnej.

### Sprawdzenie w desktop app:

Na screenach użytkownik pokazuje **desktop app** (System Serwisowy), nie mobilną Railway!

Screen 1 pokazuje:
- URL: `https://web-production-fc58d.up.railway.app`
- Ale interface to desktop app (System Serwisowy)
- Modal "Edytuj dane klienta" z polem Email: "Brakemail@gmail.com"

**To znaczy że:** Desktop app otworzył okno aplikacji mobilnej Railway w przeglądarce, a ta aplikacja mobilna ma gdzieś formularz edycji klienta.

Albo użytkownik miał otwarte dwa okna i pokazuje mi desktop app gdzie edytuje klienta, ale mówi że to "aplikacja mobilna".

---

## 🔍 DALSZA ANALIZA - Gdzie jest formularz edycji klienta?

### Screen 1:
```
URL: https://web-production-fc58d.up.railway.app
Modal: "Edytuj dane klienta"
Pola:
  - Telefon: 786985926 Tomasz Jurczyński
  - Email: Brakemail@gmail.com (z ikoną edycji)
  - Adres: ul. Srzymierzonych 71, 78-650 Mirosławiec, Polska
```

To jest aplikacja mobilna Railway! Więc tam JEST formularz edycji!

Muszę znaleźć gdzie w kodzie mobilnym jest ten modal "Edytuj dane klienta".

---

## 📋 PLAN NAPRAWY:

1. ✅ Sprawdzić czy backend Railway obsługuje `propose` dla klientów → **TAK**
2. ✅ Sprawdzić czy pending_changes/accept działa dla klientów → **TAK**
3. ⏳ Znaleźć kod edycji klienta w aplikacji mobilnej Railway
4. ⏳ Sprawdzić czy wysyła `propose: true`
5. ⏳ Jeśli nie wysyła - dodać parametr `propose: true`
