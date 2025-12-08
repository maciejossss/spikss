-- 🚀 SZYBKA NAPRAWA - Dodaj brakujące kolumny do service_orders
-- Wykonaj ten SQL w Railway Dashboard → PostgreSQL → Query

-- 1. Sprawdź aktualne kolumny
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
ORDER BY column_name;

-- 2. Dodaj brakujące kolumny (IF NOT EXISTS jest bezpieczne - nie zepsuje niczego)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS scheduled_time VARCHAR(8);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS parts_used TEXT;

-- 3. Sprawdź czy kolumny zostały dodane
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
  AND column_name IN ('scheduled_time', 'started_at', 'completed_at', 'parts_used');

-- Powinieneś zobaczyć:
-- scheduled_time    | character varying
-- started_at        | timestamp without time zone  
-- completed_at      | timestamp without time zone
-- parts_used        | text
