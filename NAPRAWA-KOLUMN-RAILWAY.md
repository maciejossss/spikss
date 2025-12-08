# 🛠️ NAPRAWA KOLUMN W BAZIE RAILWAY

## Problem
Baza Railway nie ma kolumn `scheduled_time`, `started_at`, `completed_at`, `parts_used` w tabeli `service_orders`, co powoduje błąd 500 przy synchronizacji zleceń.

## ✅ ROZWIĄZANIE - WYKONANE

Dodałem kod do pliku `desktop/railway-backend/database/migrate.js` który automatycznie sprawdza i dodaje brakujące kolumny:
- `scheduled_time` (VARCHAR(8))
- `started_at` (TIMESTAMP)  
- `completed_at` (TIMESTAMP)
- `parts_used` (TEXT)

## 🚀 JAK ZASTOSOWAĆ NAPRAWĘ

### OPCJA 1: Automatyczny redeploy Railway (ZALECANE)

Railway automatycznie wykryje zmiany w repozytorium i zrobi redeploy:

1. **Commit i push zmian do Git:**
   ```bash
   git add desktop/railway-backend/database/migrate.js
   git commit -m "fix: Add missing columns to service_orders table in Railway migration"
   git push origin main
   ```

2. **Railway automatycznie zrobi redeploy** (ok. 2-3 minuty)

3. **Sprawdź logi Railway** na https://railway.app/
   - Powinieneś zobaczyć logi:
     ```
     ✅ Added scheduled_time column to service_orders table
     ✅ Added started_at column to service_orders table
     ✅ Added completed_at column to service_orders table
     ✅ Added parts_used column to service_orders table
     ```

4. **Po redeployu uruchom synchronizację:**
   ```bash
   node sync-orders-to-railway.js
   ```

### OPCJA 2: Ręczne uruchomienie migracji (jeśli nie używasz Git)

Jeśli nie chcesz commitować do Git, możesz:

1. **Zaloguj się do Railway CLI:**
   ```bash
   railway login
   railway link
   ```

2. **Uruchom migrację:**
   ```bash
   railway run node desktop/railway-backend/database/migrate.js
   ```

### OPCJA 3: Bezpośrednie SQL (najszybsze, ale wymaga dostępu do bazy)

Jeśli masz dostęp do Railway Dashboard:

1. Otwórz **Railway Dashboard** → **PostgreSQL** → **Query**
2. Wykonaj poniższe SQL:

```sql
-- Sprawdź czy kolumny istnieją
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
  AND column_name IN ('scheduled_time', 'started_at', 'completed_at', 'parts_used');

-- Dodaj brakujące kolumny
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(8);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS parts_used TEXT;

-- Sprawdź ponownie
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'service_orders';
```

## 🎯 PO NAPRAWIE

1. **Uruchom pełną synchronizację:**
   ```bash
   node sync-orders-to-railway.js
   ```

2. **Sprawdź aplikację mobilną:**
   - Otwórz https://web-production-fc58d.up.railway.app
   - Zaloguj się jako Radosław Cichorek
   - Wprowadź PIN
   - Zlecenia powinny się załadować! ✅

## 📊 STATUS

- [x] Użytkownik ID 13 zsynchronizowany
- [x] Użytkownik ma ustawiony PIN
- [x] Kod naprawy kolumn dodany do migrate.js
- [ ] Railway redeploy (czeka na wykonanie)
- [ ] Zlecenia zsynchronizowane
- [ ] Aplikacja mobilna działa

## ⚠️ UWAGA

Railway automatycznie uruchamia migrację przy każdym deployu, więc kolumny zostaną dodane automatycznie po redeployu backendu!
