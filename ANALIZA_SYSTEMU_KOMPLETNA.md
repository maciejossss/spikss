# KOMPLEKSOWA ANALIZA SYSTEMU SERWISOWEGO
## Dokumentacja Techniczna - Analiza Linia po Linii

**Data analizy**: 2025-01-07  
**Autor**: Analiza AI dla bezpiecznej modernizacji i naprawy  
**Wersja**: 1.0

---

## SPIS TREŚCI

1. [Przegląd Systemu](#1-przegląd-systemu)
2. [Architektura - Struktura Projektu](#2-architektura---struktura-projektu)
3. [Aplikacja Desktop](#3-aplikacja-desktop)
4. [Aplikacja Mobilna (Railway)](#4-aplikacja-mobilna-railway)
5. [Synchronizacja Danych](#5-synchronizacja-danych)
6. [Bazy Danych](#6-bazy-danych)
7. [System Plików](#7-system-plików)
8. [Bezpieczeństwo](#8-bezpieczeństwo)
9. [Przepływ Danych - Mapa Zależności](#9-przepływ-danych---mapa-zależności)
10. [Potencjalne Problemy](#10-potencjalne-problemy)
11. [Rekomendacje](#11-rekomendacje)

---

## 1. PRZEGLĄD SYSTEMU

### 1.1 Co To Jest?
System zarządzania serwisem - kompletne rozwiązanie do obsługi zleceń serwisowych, klientów, urządzeń i techników.

### 1.2 Komponenty Główne

```
┌─────────────────────────────────────────────────────────┐
│                  SYSTEM SERWISOWY                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │ DESKTOP APP      │◄────────┤ MOBILE APP         │   │
│  │ (Electron+Vue)   │  sync   │ (PWA na Railway)   │   │
│  │                  ├────────►│                    │   │
│  │ SQLite (lokalna) │         │ PostgreSQL (cloud) │   │
│  └──────────────────┘         └────────────────────┘   │
│         ▲                              ▲                │
│         │                              │                │
│         └──────────┬───────────────────┘                │
│                    │                                     │
│              ┌─────▼──────┐                             │
│              │ BAZA_ZDJEC │                             │
│              │ (C:\...)   │                             │
│              └────────────┘                             │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Technologie

**Desktop**:
- Electron 28 (framework okien)
- Vue 3 + Pinia (interfejs)
- SQLite (baza lokalna)
- Express (wewnętrzny serwer API na porcie 5174)
- Vite (bundler)

**Mobile (Railway)**:
- Node.js + Express (backend)
- PostgreSQL (baza w chmurze)
- PWA (Progressive Web App)
- Vanilla JavaScript + Vue.js

---

## 2. ARCHITEKTURA - STRUKTURA PROJEKTU

### 2.1 Struktura Katalogów

```
C:\programy\serwis\
│
├── desktop\                          # Aplikacja desktopowa
│   ├── src\
│   │   ├── electron\                 # Kod Electron
│   │   │   ├── main.js              # Punkt wejścia (2491 linii)
│   │   │   ├── api-server.js        # API dla mobilki (port 5174)
│   │   │   ├── database.js          # SQLite service
│   │   │   └── preload.js           # Bridge: Electron↔Renderer
│   │   ├── views\                    # Vue komponenty (ekrany)
│   │   ├── components\               # Vue komponenty (reużywalne)
│   │   ├── stores\                   # Pinia stores (stan)
│   │   └── router\                   # Vue Router
│   │
│   ├── railway-backend\              # Backend dla Railway
│   │   ├── server.js                # Express server
│   │   ├── database\
│   │   │   ├── connection.js        # PostgreSQL pool
│   │   │   └── migrate.js           # Migracje DB
│   │   └── routes\                  # Endpointy API
│   │       ├── auth.js              # Autentykacja
│   │       ├── orders.js            # Zlecenia
│   │       ├── sync.js              # Synchronizacja
│   │       ├── clients.js           # Klienci
│   │       └── ...
│   │
│   └── package.json                 # Zależności desktop
│
├── public\                          # Pliki mobilnej PWA
│   ├── index.html                   # HTML aplikacji mobilnej
│   ├── js\
│   │   ├── app.js                  # Główna logika PWA
│   │   └── ...
│   └── uploads\                     # Uploaded files
│
├── server.js                        # Entry point dla Railway
├── package.json                     # Zależności Railway
├── BAZA_ZDJEC\                     # Lokalne archiwum plików
└── README.md
```

### 2.2 Jak To Się Uruchamia

**Desktop**:
```batch
START-DESKTOP-APP.bat  →  npm run electron  →  Electron main.js
                                               ↓
                                    1. Inicjalizuje SQLite
                                    2. Uruchamia Vue app (localhost:5173)
                                    3. Uruchamia API server (port 5174)
                                    4. Otwiera okno Electron
```

**Railway (Mobile)**:
```
Railway Deploy  →  server.js  →  desktop/railway-backend/server.js
                                  ↓
                       1. Łączy z PostgreSQL
                       2. Uruchamia migracje
                       3. Nasłuchuje na port (env PORT lub 3000)
                       4. Serwuje PWA z /public
```

---

## 3. APLIKACJA DESKTOP

### 3.1 Electron - Proces Główny (main.js)

**Plik**: `desktop/src/electron/main.js`  
**Rozmiar**: 940 linii  
**Co robi**:

1. **Inicjalizacja bazy SQLite** (linie 162-175)
   ```javascript
   await databaseService.initialize()
   // Tworzy: C:\Users\[user]\AppData\Roaming\serwis-desktop\serwis.db
   ```

2. **Tworzy okno aplikacji** (linie 177-232)
   ```javascript
   BrowserWindow({
     width: 1400,
     height: 900,
     preload: 'preload.js'  // Most bezpieczeństwa
   })
   ```

3. **Uruchamia API Server** (linie 314-321)
   ```javascript
   apiServer = new APIServer(databaseService)
   await apiServer.start(5174)  // Port dla mobilki
   ```

4. **System Kopii Zapasowych** (linie 869-940)
   - Auto-backup co 24h
   - Przechowuje 7 ostatnich kopii
   - Ścieżka: `userData/backups/auto/`

5. **Zarządzanie Plikami** (linie 406-560)
   - Wybór plików przez dialog
   - Zapis do `userData/device-files/`
   - Kopiowanie do BAZA_ZDJEC
   - Upload do Railway

6. **BAZA_ZDJEC System** (linie 13-121)
   ```javascript
   // Domyślna lokalizacja
   C://programy//serwis//BAZA_ZDJEC
   
   // Struktura:
   device-{id}/
     ├── photos/  (JPG, PNG, PDF)
     └── docs/    (inne)
   ```

### 3.2 API Server dla Mobilki (api-server.js)

**Plik**: `desktop/src/electron/api-server.js`  
**Rozmiar**: 2491 linii  
**Port**: 5174  
**Co robi**:

#### Główne Endpointy:

1. **GET /api/desktop/orders/:userId** (linie 164-200)
   - Pobiera zlecenia przypisane do technika
   - Łączy dane klienta, urządzenia, użytkownika
   - Sortuje i filtruje według statusu

2. **POST /api/desktop/orders/:orderId/complete** (linie 500-700)
   - Kompletuje zlecenie z mobilki
   - Zapisuje zdjęcia, czas pracy, kategorie
   - Synchronizuje z Railway

3. **POST /api/railway/sync/users** (linie 850-950)
   - Synchronizuje użytkowników Desktop→Railway
   - Obsługuje PINy mobilne
   - Upsert (insert/update)

4. **Proxy do Railway** (linie 1800-2100)
   - `/api/railway/*` → forward do Railway API
   - Umożliwia mobilce komunikację przez desktop

5. **Import z Railway** (linie 2200-2400)
   - Auto-import co 30s
   - Pobiera ukończone zlecenia z Railway
   - Importuje do lokalnej bazy

#### Timery Pracy:
```javascript
// Mapuje aktywne zlecenia
activeOrders = new Map()
// Struktura: { orderId: { startTime, timer } }
```

### 3.3 Database Service (database.js)

**Plik**: `desktop/src/electron/database.js`  
**Rozmiar**: 1026 linii

**Tabele (33-350)**:

1. **clients** - Klienci
   ```sql
   id, first_name, last_name, company_name, type, 
   email, phone, address, nip, regon, ...
   ```

2. **devices** - Urządzenia
   ```sql
   id, client_id, category_id, name, manufacturer, 
   model, serial_number, brand, ...
   ```

3. **service_orders** - Zlecenia
   ```sql
   id, order_number, client_id, device_id, 
   assigned_user_id, status, priority, 
   scheduled_date, estimated_hours, ...
   ```

4. **users** - Użytkownicy/Technicy
   ```sql
   id, username, password_hash, full_name, 
   role, mobile_pin_hash, mobile_authorized, ...
   ```

5. **spare_parts, order_parts, invoices, device_files, time_entries**

**Migracje (369-703)**:
- Automatyczne dodawanie kolumn
- Idempotentne (bezpieczne wielokrotne uruchomienie)
- Indeksy dla wydajności

---

## 4. APLIKACJA MOBILNA (RAILWAY)

### 4.1 Backend Server

**Plik**: `desktop/railway-backend/server.js`  
**Rozmiar**: 298 linii

**Konfiguracja**:
```javascript
PORT = process.env.PORT || 3000
DATABASE_URL = process.env.DATABASE_URL  // PostgreSQL
```

**Middleware** (34-85):
1. Helmet (bezpieczeństwo)
2. CORS (origin: '*' dla globalnego dostępu)
3. Rate limiting (1000 req/min)
4. Body parsing (limit: 50MB dla zdjęć)
5. Logging (timestamp, IP, User-Agent)

**Routing** (206-221):
```
/api/health          → healthRoutes
/api/auth            → authRoutes
/api/orders          → ordersCompatRoutes
/api/desktop/orders  → ordersRoutes
/api/sync            → syncRoutes
/api/clients         → clientsRoutes
/api/technicians     → techniciansRoutes
/api/device-files    → deviceFilesRoutes
```

### 4.2 PostgreSQL Connection

**Plik**: `desktop/railway-backend/database/connection.js`  
**Rozmiar**: 137 linii

**Pool Config**:
```javascript
{
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,                      // Maksymalnie 20 połączeń
  idleTimeoutMillis: 30000,     // 30s timeout
  connectionTimeoutMillis: 2000  // 2s na połączenie
}
```

**Metody**:
- `query(text, params)` - Wykonaj zapytanie
- `get(text, params)` - Pobierz jeden wiersz
- `all(text, params)` - Pobierz wszystkie
- `beginTransaction()` - Rozpocznij transakcję
- `commitTransaction()` - Zatwierdź
- `rollbackTransaction()` - Cofnij

### 4.3 Migracje Bazy

**Plik**: `desktop/railway-backend/database/migrate.js`  
**Rozmiar**: 987 linii

**Proces** (953-985):
1. Test połączenia PostgreSQL
2. Tworzenie tabel (38-242)
3. Migracja danych z SQLite (373-951)
4. Dodanie brakujących kolumn (248-366)
5. Tworzenie indeksów (674-693)

**Upsert Logic**:
```sql
ON CONFLICT (unique_column) DO UPDATE SET ...
```

### 4.4 Routes - Synchronizacja

**Plik**: `desktop/railway-backend/routes/sync.js`  
**Rozmiar**: 904 linie

**Kluczowe Endpointy**:

1. **POST /api/sync/users** (62-149)
   - Przyjmuje tablicę użytkowników
   - Upsert based on username
   - Hashuje PINy mobilne (bcrypt)
   - Mapuje external_id (desktop ID)

2. **POST /api/sync/clients** (197-307)
   - Przyjmuje tablicę klientów
   - Upsert based on email
   - Normalizuje adresy

3. **POST /api/sync/orders** (425-750)
   - Najbardziej skomplikowany!
   - Mapuje client_id przez email
   - Mapuje device_id przez serial_number
   - Mapuje assigned_user_id przez username/external_id
   - Obsługuje duplikaty order_number
   - Transakcje (rollback on error)

4. **POST /api/sync/orders/attach** (752-803)
   - Podpina klienta/urządzenie do istniejącego zlecenia
   - Bezpieczne mapowanie

**Helper Functions**:
```javascript
resolveUserIdSafe(maybeIdOrUsername)  // Mapuje desktop ID → Railway ID
sanitizeNumber(value)                  // Waliduje liczby
sanitizeDate(value)                    // Waliduje daty
extractTime(value)                     // Ekstraktuje czas z datetime
```

### 4.5 Routes - Orders

**Plik**: `desktop/railway-backend/routes/orders.js`  
**Rozmiar**: 475 linii

**GET /api/desktop/orders** (14-49):
```sql
SELECT o.*, c.company_name AS client_name, d.name AS device_name
FROM service_orders o
LEFT JOIN clients c ON o.client_id = c.id
LEFT JOIN devices d ON o.device_id = d.id
ORDER BY o.updated_at DESC
LIMIT 200
```

**GET /api/desktop/orders/:userId** (95-475):
- Deduplikacja przez ROW_NUMBER() PARTITION BY order_number
- Zwraca tylko najnowszy rekord per order_number
- Łączy z clients, devices, users

---

## 5. SYNCHRONIZACJA DANYCH

### 5.1 Kierunki Synchronizacji

```
┌──────────────┐              ┌──────────────┐
│   DESKTOP    │              │   RAILWAY    │
│   (SQLite)   │              │ (PostgreSQL) │
└──────────────┘              └──────────────┘
       │                              │
       │  ┌────────────────────────┐  │
       ├─►│ 1. Sync Users          │──┤
       │  │    POST /api/sync/users│  │
       │  └────────────────────────┘  │
       │                              │
       │  ┌────────────────────────┐  │
       ├─►│ 2. Sync Clients        │──┤
       │  │POST /api/sync/clients  │  │
       │  └────────────────────────┘  │
       │                              │
       │  ┌────────────────────────┐  │
       ├─►│ 3. Sync Devices        │──┤
       │  │POST /api/sync/devices  │  │
       │  └────────────────────────┘  │
       │                              │
       │  ┌────────────────────────┐  │
       ├─►│ 4. Sync Orders (NEW)   │──┤
       │  │  POST /api/sync/orders │  │
       │  └────────────────────────┘  │
       │                              │
       │  ┌────────────────────────┐  │
       │◄─│ 5. Import Completed    │──┤
       │  │    GET /api/orders     │  │
       │  │  Auto-import co 30s    │  │
       │  └────────────────────────┘  │
       └──────────────────────────────┘
```

### 5.2 Mapowanie ID

**Problem**: Desktop używa SQLite (autoincrement), Railway PostgreSQL (serial) - ID mogą się różnić!

**Rozwiązanie**:

1. **Users**: Mapowanie przez `username` + `external_id`
   ```javascript
   // Railway stores desktop ID
   users.external_id = desktop_users.id
   ```

2. **Clients**: Mapowanie przez `email`
   ```javascript
   // Email is unique identifier
   WHERE email = $1
   ```

3. **Devices**: Mapowanie przez `serial_number`
   ```javascript
   // Serial number is unique
   WHERE serial_number = $1
   ```

4. **Orders**: Mapowanie przez `order_number` + `external_id`
   ```javascript
   // Order number is unique
   WHERE order_number = $1
   // OR external_id = desktop_order.id
   ```

### 5.3 Auto-Sync

**Desktop → Railway** (co 5 minut):
```javascript
// api-server.js linie 2290-2310
setInterval(async () => {
  // 1. Sync users
  const users = await db.all('SELECT * FROM users')
  await fetch(`${RAILWAY_API}/sync/users`, { 
    method: 'POST', 
    body: JSON.stringify(users) 
  })
  
  // 2. Sync devices, clients (podobnie)
}, 5 * 60 * 1000)
```

**Railway → Desktop** (co 30s):
```javascript
// api-server.js linie 2236-2288
setInterval(async () => {
  // Pobierz zlecenia do importu
  const r = await fetch(`${RAILWAY_API}/orders/pending-import`)
  const orders = await r.json()
  
  // Import każdego zlecenia
  for (const order of orders) {
    await importOrder(order.id)
  }
}, 30 * 1000)
```

---

## 6. BAZY DANYCH

### 6.1 SQLite (Desktop)

**Lokalizacja**: `C:\Users\[user]\AppData\Roaming\serwis-desktop\serwis.db`

**Schemat Główny**:

```sql
-- KLIENCI
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  type TEXT DEFAULT 'individual',  -- 'individual' | 'business'
  email TEXT,
  phone TEXT,
  address TEXT,
  address_street TEXT,
  address_city TEXT,
  address_postal_code TEXT,
  address_country TEXT DEFAULT 'Polska',
  nip TEXT,              -- NIP firmy
  regon TEXT,            -- REGON firmy
  contact_person TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- URZĄDZENIA
CREATE TABLE devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  category_id INTEGER,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  brand TEXT,
  serial_number TEXT,
  production_year INTEGER,
  power_rating TEXT,
  fuel_type TEXT,
  installation_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  warranty_end_date DATE,
  technical_data TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (category_id) REFERENCES device_categories(id)
);

-- ZLECENIA SERWISOWE
CREATE TABLE service_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  client_id INTEGER,
  device_id INTEGER,
  assigned_user_id INTEGER,
  service_categories TEXT,         -- JSON array
  status TEXT DEFAULT 'new',       -- 'new','assigned','in_progress','completed','cancelled'
  priority TEXT DEFAULT 'medium',  -- 'low','medium','high'
  type TEXT DEFAULT 'maintenance', -- 'maintenance','repair','installation'
  title TEXT,
  description TEXT,
  scheduled_date DATETIME,
  started_at DATETIME,
  completed_at DATETIME,
  estimated_hours REAL DEFAULT 0,
  actual_hours REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  parts_cost REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  estimated_cost_note TEXT,
  notes TEXT,
  actual_start_date DATETIME,
  actual_end_date DATETIME,
  completed_categories TEXT,       -- JSON array
  work_photos TEXT,                -- JSON array
  parts_used TEXT,                 -- JSON array
  rejected_reason TEXT,
  desktop_sync_status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (device_id) REFERENCES devices(id),
  FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

-- UŻYTKOWNICY (TECHNICY)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'technician',    -- 'admin','technician','installer'
  mobile_pin_hash TEXT,              -- PIN dla mobilki (bcrypt)
  mobile_pin_encrypted TEXT,         -- PIN dla admina (AES-256-GCM)
  mobile_authorized INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CZĘŚCI ZAMIENNE
CREATE TABLE spare_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  part_number TEXT,
  manufacturer TEXT,
  brand TEXT,
  price REAL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 1,
  description TEXT,
  model_compatibility TEXT,
  device_id INTEGER,
  location TEXT,
  supplier TEXT,
  supplier_part_number TEXT,
  lead_time_days INTEGER DEFAULT 0,
  last_order_date TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

-- PLIKI URZĄDZEŃ
CREATE TABLE device_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,         -- 'image','document','other'
  file_category TEXT DEFAULT 'other',
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  title TEXT,
  description TEXT,
  is_primary INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- CZAS PRACY
CREATE TABLE time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  duration REAL DEFAULT 0,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES service_orders(id) ON DELETE CASCADE
);
```

### 6.2 PostgreSQL (Railway)

**Connection String**: `process.env.DATABASE_URL`

**Główne Różnice od SQLite**:

1. **Typy Danych**:
   ```sql
   -- SQLite                 PostgreSQL
   INTEGER PRIMARY KEY   →   SERIAL PRIMARY KEY
   REAL                  →   DECIMAL(10,2)
   TEXT                  →   VARCHAR(255) lub TEXT
   DATETIME              →   TIMESTAMP
   INTEGER (boolean)     →   BOOLEAN
   ```

2. **Dodatkowe Kolumny**:
   ```sql
   -- W tabelach Railway:
   external_id INTEGER  -- Mapuje desktop ID
   ```

3. **Indeksy**:
   ```sql
   CREATE INDEX idx_service_orders_external_id 
     ON service_orders(external_id);
   
   CREATE UNIQUE INDEX ux_service_orders_order_number_active
     ON service_orders(order_number)
     WHERE status IS DISTINCT FROM 'archived';
   ```

### 6.3 Relacje i Klucze Obce

```
clients (1) ─────┬────── (N) devices
                 │
                 └────── (N) service_orders
                               │
                               ├────── (N) order_parts
                               ├────── (N) time_entries
                               └────── (1) invoices

devices (1) ───────────── (N) device_files

users (1) ─────────────── (N) service_orders (assigned_user_id)

spare_parts (1) ───────── (N) order_parts
```

---

## 7. SYSTEM PLIKÓW

### 7.1 BAZA_ZDJEC - Lokalne Archiwum

**Lokalizacja**: `C://programy//serwis//BAZA_ZDJEC`  
**Konfiguracja**: ENV `BAZA_ZDJEC_DIR` (opcjonalna)

**Struktura**:
```
BAZA_ZDJEC/
├── device-12/
│   ├── photos/
│   │   ├── IMG_20250105_123456.jpg
│   │   ├── protokol.pdf
│   │   └── ...
│   └── docs/
│       └── manual.pdf
├── device-13/
│   ├── photos/
│   └── docs/
└── ...
```

**Funkcje** (main.js linie 33-121):

1. **copyToBazaZdjec(deviceId, fileName, sourcePath, mimeType)**
   - Kopiuje plik do odpowiedniego katalogu
   - PDF trafia do `photos/` (razem ze zdjęciami)
   - Inne dokumenty do `docs/`
   - Unika duplikatów przez timestamp

2. **scanAndSyncBazaZdjec()**
   - Skanuje wszystkie katalogi device-*
   - Uploaduje pliki do Railway
   - Throttling: pomija pliki młodsze niż 60s
   - Uruchamiane co 24h

3. **uploadOneFileToRailway(deviceId, filePath, fileName, mimeType, fileType)**
   - Deduplikacja przez klucz: `${deviceId}|${fileName}|${size}`
   - Pamięć świeżych uploadów (60s)
   - Base64 encode → POST do `/api/railway/device-files/upload`

### 7.2 Electron userData

**Lokalizacja**: `C:\Users\[user]\AppData\Roaming\serwis-desktop\`

**Struktura**:
```
serwis-desktop/
├── serwis.db                      # Główna baza SQLite
├── serwis.db-shm                  # Shared memory (WAL)
├── serwis.db-wal                  # Write-Ahead Log
├── device-files/                  # Pliki urządzeń
│   ├── device-12/
│   │   ├── photo-1704461696123.jpg
│   │   └── ...
│   └── device-13/
├── backups/                       # Kopie zapasowe
│   ├── auto/                      # Auto-backup (7 ostatnich)
│   │   ├── auto-backup_2025-01-05_123456.db
│   │   └── ...
│   └── manual/                    # Ręczne backupy
└── secrets/                       # Klucze szyfrowania
    └── pin-key.bin                # Klucz AES-256 dla PIN
```

### 7.3 Railway Uploads

**Lokalizacja**: `desktop/railway-backend/uploads/` (serwer Railway)

**Struktura**:
```
uploads/
├── IMG_12345_timestamp.jpg
├── device-photo-67890.png
└── ...
```

**Obsługa**:
- Multer (in-memory) → zapis na dysk
- Limit: 10MB per file, 10 files max
- Statyczne serwowanie: `app.use('/uploads', express.static(UPLOADS_DIR))`

---

## 8. BEZPIECZEŃSTWO

### 8.1 Autentykacja

#### Desktop:
```javascript
// Hasła użytkowników (desktop)
bcrypt.hash(password, 10)  // 10 rounds

// Weryfikacja
bcrypt.compare(inputPassword, storedHash)
```

#### Railway:
```javascript
// Endpoint: /api/auth/login
POST /api/auth/login
{
  "username": "technik1",
  "pin": "1234"
}

// Weryfikacja PIN
bcrypt.compare(pin, user.mobile_pin_hash)
```

### 8.2 PIN Mobilny

**Dwupoziomowa Ochrona**:

1. **mobile_pin_hash** (bcrypt):
   - Używany do weryfikacji logowania
   - Nie da się odzyskać oryginału
   ```javascript
   mobile_pin_hash = bcrypt.hash("1234", 10)
   ```

2. **mobile_pin_encrypted** (AES-256-GCM):
   - Używany przez admina do podglądu PIN
   - Można odszyfrować
   ```javascript
   // Szyfrowanie (main.js 140-147)
   const key = crypto.randomBytes(32)  // Zapisany w pin-key.bin
   const iv = crypto.randomBytes(12)
   const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
   const encrypted = cipher.update(pin, 'utf8')
   const tag = cipher.getAuthTag()
   mobile_pin_encrypted = base64(iv + tag + encrypted)
   
   // Deszyfrowanie (main.js 149-160)
   const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
   decipher.setAuthTag(tag)
   const decrypted = decipher.update(encrypted)
   ```

### 8.3 CORS i Rate Limiting

#### Railway (server.js 42-66):
```javascript
// CORS - globalny dostęp
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

// Rate limiting
rateLimit({
  windowMs: 60 * 1000,      // 1 minuta
  max: 1000,                 // 1000 requestów
  skip: (req) => req.method === 'OPTIONS'
})
```

#### Desktop API (api-server.js 23-51):
```javascript
// CORS + Private Network Access
app.use(cors({
  origin: true,              // Odbij dowolny Origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}))

// Access-Control-Allow-Private-Network: true
// (dla HTTPS → localhost)
```

### 8.4 SQL Injection Protection

**Parametryzowane Zapytania**:

✅ **Bezpieczne**:
```javascript
// SQLite
db.get('SELECT * FROM users WHERE id = ?', [userId])

// PostgreSQL
db.query('SELECT * FROM users WHERE id = $1', [userId])
```

❌ **Niebezpieczne** (NIE UŻYWANE):
```javascript
db.get(`SELECT * FROM users WHERE id = ${userId}`)
```

---

## 9. PRZEPŁYW DANYCH - MAPA ZALEŻNOŚCI

### 9.1 Tworzenie Zlecenia (Desktop → Mobile)

```
┌──────────────────────────────────────────────────────────┐
│ 1. DESKTOP: Admin tworzy zlecenie                        │
├──────────────────────────────────────────────────────────┤
│   OrderFormModal.vue                                     │
│       ↓                                                   │
│   INSERT INTO service_orders (SQLite)                    │
│       order_number: "SRV-2025-001"                       │
│       client_id: 12                                      │
│       device_id: 34                                      │
│       assigned_user_id: 2 (technik)                      │
│       status: 'new'                                      │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 2. AUTO-SYNC (co 5 min)                                 │
├──────────────────────────────────────────────────────────┤
│   api-server.js → autoSyncReferenceData()               │
│       ↓                                                   │
│   POST ${RAILWAY_API}/sync/orders                        │
│   Body: [{                                               │
│     order_number: "SRV-2025-001",                       │
│     id: 123,                // desktop ID                │
│     client_email: "jan@example.com",  // dla mapowania  │
│     device_serial: "ABC123",          // dla mapowania  │
│     assigned_user_id: 2,              // desktop ID     │
│     ...                                                  │
│   }]                                                     │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 3. RAILWAY: Sync endpoint mapuje ID                     │
├──────────────────────────────────────────────────────────┤
│   sync.js → resolveClientIdSafe()                       │
│   SELECT id FROM clients WHERE email = 'jan@example.com'│
│       → client_id: 45 (Railway ID)                      │
│                                                          │
│   sync.js → resolveDeviceIdSafe()                       │
│   SELECT id FROM devices WHERE serial_number = 'ABC123' │
│       → device_id: 78 (Railway ID)                      │
│                                                          │
│   sync.js → resolveUserIdSafe()                         │
│   SELECT id FROM users WHERE external_id = 2            │
│       → assigned_user_id: 5 (Railway ID)                │
│                                                          │
│   INSERT INTO service_orders (PostgreSQL)               │
│       order_number: "SRV-2025-001"                      │
│       external_id: 123        // desktop ID             │
│       client_id: 45           // Railway ID             │
│       device_id: 78           // Railway ID             │
│       assigned_user_id: 5     // Railway ID             │
│       status: 'new'                                     │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 4. MOBILE: Technik loguje się                           │
├──────────────────────────────────────────────────────────┤
│   public/index.html → app.js                            │
│       ↓                                                   │
│   POST /api/auth/login                                  │
│   { username: "technik1", pin: "1234" }                 │
│       ↓                                                   │
│   Railway: auth.js                                       │
│   SELECT * FROM users WHERE username = 'technik1'       │
│   bcrypt.compare("1234", user.mobile_pin_hash)          │
│       → OK → return { user: {...}, orders: [...] }      │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 5. MOBILE: Technik widzi zlecenia                       │
├──────────────────────────────────────────────────────────┤
│   GET /api/orders/5  (Railway user ID)                  │
│       ↓                                                   │
│   Railway: orders.js                                     │
│   SELECT o.*, c.company_name, d.name, ...               │
│   FROM service_orders o                                  │
│   LEFT JOIN clients c ON o.client_id = c.id             │
│   LEFT JOIN devices d ON o.device_id = d.id             │
│   WHERE o.assigned_user_id = 5                          │
│     AND o.status IN ('new','assigned','in_progress')    │
│       ↓                                                   │
│   return [{ order_number: "SRV-2025-001", ... }]        │
└──────────────────────────────────────────────────────────┘
```

### 9.2 Kompletowanie Zlecenia (Mobile → Desktop)

```
┌──────────────────────────────────────────────────────────┐
│ 1. MOBILE: Technik kończy zlecenie                      │
├──────────────────────────────────────────────────────────┤
│   app.js → completeOrder()                              │
│       ↓                                                   │
│   POST /api/desktop/orders/123/complete                 │
│   Body: {                                                │
│     completedCategories: ["A1","B2"],                   │
│     workPhotos: [                                        │
│       { data: "base64...", name: "photo1.jpg" }        │
│     ],                                                   │
│     actualHours: 2.5,                                   │
│     notes: "Wszystko OK"                                │
│   }                                                      │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 2. DESKTOP: API server odbiera                          │
├──────────────────────────────────────────────────────────┤
│   api-server.js → POST /api/desktop/orders/:id/complete│
│       ↓                                                   │
│   1. Zapisuje zdjęcia do userData/device-files/         │
│   2. Kopiuje do BAZA_ZDJEC/device-{id}/photos/          │
│   3. Tworzy rekordy w device_files (SQLite)             │
│   4. UPDATE service_orders SET                           │
│        status = 'completed',                             │
│        completed_categories = '["A1","B2"]',            │
│        work_photos = '[{...}]',                         │
│        actual_hours = 2.5,                              │
│        completed_at = NOW()                             │
│      WHERE id = 123                                      │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 3. DESKTOP: Forward do Railway                          │
├──────────────────────────────────────────────────────────┤
│   api-server.js → proxy to Railway                      │
│       ↓                                                   │
│   POST ${RAILWAY_API}/desktop/orders/{railwayId}/complete│
│   Body: { (same as above) }                             │
│       ↓                                                   │
│   Railway: UPDATE service_orders SET ...                │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ 4. DESKTOP: Auto-import (co 30s)                        │
├──────────────────────────────────────────────────────────┤
│   api-server.js → autoImporter()                        │
│       ↓                                                   │
│   GET ${RAILWAY_API}/orders/pending-import              │
│       → [{ id: 456, order_number: "SRV-2025-001" }]    │
│       ↓                                                   │
│   POST localhost:5174/api/railway/import-order/456      │
│       ↓                                                   │
│   1. GET ${RAILWAY_API}/desktop/orders/by-id/456        │
│   2. Upsert do SQLite (UPDATE by order_number)          │
│   3. Import zdjęć z Railway                             │
│   4. Mark as imported on Railway                         │
└──────────────────────────────────────────────────────────┘
```

### 9.3 Upload Zdjęć

```
┌──────────────────────────────────────────────────────────┐
│ MOBILE: Technik robi zdjęcie                            │
├──────────────────────────────────────────────────────────┤
│   HTML5 Camera API                                       │
│   <input type="file" capture="camera">                  │
│       ↓                                                   │
│   Base64 encode                                          │
│   { data: "data:image/jpeg;base64,/9j/4AAQ...", ... }   │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ MOBILE → RAILWAY: Upload                                │
├──────────────────────────────────────────────────────────┤
│   POST /api/orders/{orderId}/photos                     │
│   Body: { photos: [{ data: "...", name: "..." }] }     │
│       ↓                                                   │
│   Railway: Decode base64 → Buffer                       │
│   fs.writeFile(`uploads/${filename}`, buffer)           │
│   INSERT INTO device_files                              │
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│ RAILWAY → DESKTOP: Import                               │
├──────────────────────────────────────────────────────────┤
│   Desktop auto-import (30s)                             │
│       ↓                                                   │
│   GET ${RAILWAY_API}/uploads/filename.jpg               │
│   Download → Buffer                                      │
│       ↓                                                   │
│   1. Save to userData/device-files/device-{id}/         │
│   2. Copy to BAZA_ZDJEC/device-{id}/photos/             │
│   3. INSERT INTO device_files (SQLite)                  │
└──────────────────────────────────────────────────────────┘
```

---

## 10. POTENCJALNE PROBLEMY

### 10.1 Synchronizacja

**Problem 1: Konflikty ID**
- Desktop SQLite autoincrement: 1, 2, 3...
- Railway PostgreSQL serial: 1, 2, 3...
- Mogą się różnić!

**Mitygacja**:
- Mapowanie przez unikalne klucze (email, serial_number, order_number)
- Kolumna `external_id` przechowuje desktop ID

**Problem 2: Duplikaty order_number**
- Desktop: order_number UNIQUE
- Railway: Może powstać wiele rekordów z tym samym order_number (historia zmian)

**Mitygacja**:
- Indeks: `UNIQUE INDEX ux_service_orders_order_number_active WHERE status <> 'archived'`
- Deduplikacja przez `ROW_NUMBER() OVER (PARTITION BY order_number ORDER BY updated_at DESC)`

**Problem 3: Race Conditions**
- Desktop i Railway mogą edytować to samo zlecenie jednocześnie

**Mitygacja**:
- Desktop jest "master" (jedyne źródło prawdy)
- Railway tylko odczyt + kompletowanie
- Sync Desktop→Railway co 5 min (overwrite)

### 10.2 Wydajność

**Problem 1: Wolne Zapytania**
- JOIN 3-4 tabel na każdym request

**Mitygacja**:
- Indeksy na FK: `client_id`, `device_id`, `assigned_user_id`
- LIMIT 200 na listach
- Deduplikacja przez window functions

**Problem 2: Duże Zdjęcia**
- Base64 → 33% większe niż oryginał
- Limit 50MB na request

**Mitygacja**:
- Kompresja zdjęć w mobilce (przed wysłaniem)
- Stream upload (chunked)
- CDN dla Railway uploads (opcjonalnie)

### 10.3 Bezpieczeństwo

**Problem 1: CORS origin: '*'**
- Każda domena może robić request

**Ryzyko**:
- CSRF (Cross-Site Request Forgery)
- Nie dotyczy, bo brak cookies/session

**Mitygacja**:
- Rate limiting (1000 req/min)
- Walidacja danych wejściowych

**Problem 2: PIN w plain text**
- mobile_pin_encrypted można odszyfrować

**Ryzyko**:
- Admin widzi PINy wszystkich techników
- Jeśli klucz wycieknie → wszystkie PINy dostępne

**Mitygacja**:
- Klucz AES w `secrets/pin-key.bin` (nie w repo)
- Tylko dla admina (UI gate)

### 10.4 Skalowanie

**Problem 1: SQLite Locks**
- Jeden writer na raz
- Multiple readers OK

**Mitygacja**:
- WAL mode (Write-Ahead Logging)
- Transakcje z retry (database locked)

**Problem 2: PostgreSQL Pool**
- Max 20 połączeń

**Ryzyko**:
- Pool exhaustion przy dużym ruchu

**Mitygacja**:
- Connection timeout: 2s
- Idle timeout: 30s
- Monitoring pool status

---

## 11. REKOMENDACJE

### 11.1 Krytyczne (Do Natychmiastowej Naprawy)

1. **Backup Strategy**
   - ✅ Auto-backup co 24h (7 kopii)
   - ❌ Brak backupu Railway PostgreSQL
   - **Rekomendacja**: Dodaj Railway DB dump (pg_dump) do cron job

2. **Error Handling**
   - ❌ Wiele `try-catch` z pustym catch block
   - **Rekomendacja**: Logowanie błędów do pliku/Sentry

3. **PIN Security**
   - ⚠️ mobile_pin_encrypted można odszyfrować
   - **Rekomendacja**: Rozważ usunięcie lub silniejszą ochronę klucza

### 11.2 Ważne (Krótkoterminowe)

4. **Synchronizacja**
   - ⚠️ Auto-sync co 5 min może przegapić zmiany
   - **Rekomendacja**: WebSocket/SSE dla real-time sync

5. **Monitoring**
   - ❌ Brak metryk wydajności
   - **Rekomendacja**: Dodaj Winston logger + metrics endpoint

6. **Testing**
   - ❌ Brak testów jednostkowych
   - **Rekomendacja**: Jest, Supertest dla API

7. **Documentation**
   - ⚠️ Komentarze tylko w niektórych miejscach
   - **Rekomendacja**: JSDoc dla wszystkich publicznych funkcji

### 11.3 Nice to Have (Długoterminowe)

8. **TypeScript**
   - Lepsze type safety
   - IDE autocomplete
   - Mniej błędów runtime

9. **GraphQL**
   - Zamiast REST API
   - Mniej over-fetching
   - Lepsze relacje

10. **Docker**
    - Łatwiejszy deployment
    - Konsystentne środowisko
    - Łatwiejsze testowanie

11. **CI/CD**
    - GitHub Actions
    - Auto-deploy do Railway
    - Auto-testy przed merge

### 11.4 Optymalizacje

12. **Database**
    - Dodaj więcej indeksów (composite)
    - Partycjonowanie starych zleceń
    - Archiwizacja

13. **Caching**
    - Redis dla często używanych danych
    - In-memory cache dla kategorii usług

14. **CDN**
    - Cloudinary/Imgix dla zdjęć
    - Kompresja + optimization

### 11.5 Bezpieczne Modernizowanie

**Zasady**:
1. **Nigdy nie usuwaj istniejących endpointów** - dodaj nowe jako v2
2. **Zawsze testuj na kopii bazy** przed produkcją
3. **Backup przed każdą większą zmianą**
4. **Migracje muszą być idempotentne** (można uruchomić wielokrotnie)
5. **Loguj wszystkie zmiany** w tabeli audit_log

**Workflow**:
```
1. Backup bazy (desktop + Railway)
2. Stwórz branch feature/nazwa
3. Implementuj zmiany
4. Test lokalnie
5. Deploy na Railway staging (opcjonalnie)
6. Test na produkcji z małą grupą
7. Merge do main
8. Monitor przez 24h
```

---

## PODSUMOWANIE

### Mocne Strony ✅

1. **Architektura**: Czytelny podział Desktop/Mobile
2. **Synchronizacja**: Inteligentne mapowanie ID
3. **Bezpieczeństwo**: bcrypt + AES-256, rate limiting
4. **Backup**: Automatyczne kopie zapasowe
5. **Pliki**: Trójpoziomowy system (userData → BAZA_ZDJEC → Railway)

### Obszary do Poprawy ⚠️

1. **Monitoring**: Brak logów + metryk
2. **Testing**: Brak testów automatycznych
3. **Documentation**: Niekompletna
4. **Error Handling**: Wiele pustych catch blocks
5. **Skalowanie**: Potencjalne bottlenecki (SQLite locks, PG pool)

### Następne Kroki 🚀

1. **Natychmiast**: Dodaj backup Railway DB
2. **Tydzień**: Implementuj proper error logging
3. **Miesiąc**: Napisz testy dla krytycznych endpointów
4. **Kwartał**: Refactor do TypeScript

---

## KONTAKT I WSPARCIE

**Ten dokument jest żywym dokumentem** - aktualizuj go przy każdej większej zmianie!

Przy jakichkolwiek pytaniach lub problemach:
1. Sprawdź logi: `userData/logs/`
2. Sprawdź backup: `userData/backups/`
3. Sprawdź BAZA_ZDJEC sync status
4. Sprawdź Railway dashboard: https://railway.app/

**Pamiętaj**: Backup to Twój najlepszy przyjaciel! 💾

---

*Koniec dokumentu - Wersja 1.0 - 2025-01-07*


