# System Serwisowy Palniki & Kotły

Modularny system zarządzania serwisem urządzeń grzewczych z **Vue.js 3 frontend** i **Node.js backend**.

## 🏗️ Architektura

System składa się z dwóch głównych części:

### 🖥️ Backend (Node.js + Express)
- **API REST** - Centralne API dla wszystkich modułów
- **PostgreSQL** - Baza danych z connection pooling
- **JWT Auth** - Autoryzacja z refresh tokenami
- **Modular Design** - 6 izolowanych modułów biznesowych

### 🌐 Frontend (Vue.js 3)
- **Mobile-First** - Zaprojektowany dla techników w terenie
- **PWA-Ready** - Może działać jako aplikacja mobilna
- **Real-time** - Synchronizacja z backendem
- **Touch-Friendly** - Optymalizacja dla urządzeń dotykowych

## 📋 Moduły systemu

| Moduł | Backend | Frontend | Opis |
|-------|---------|----------|------|
| **Klienci** | ✅ API | ✅ Zaimplementowany | Zarządzanie bazą klientów |
| **Urządzenia** | ✅ API | 🚧 W przygotowaniu | Katalog i historia urządzeń |
| **Serwis** | ✅ API | 🚧 W przygotowaniu | Zlecenia i protokoły |
| **Harmonogram** | ✅ API | 🚧 W przygotowaniu | Planowanie wizyt |
| **Magazyn** | ✅ API | 🚧 W przygotowaniu | Części i zamówienia |
| **Raporty** | ✅ API | 🚧 W przygotowaniu | Rozliczenia i statystyki |

## 🚀 Szybki start

### Wymagania:
- **Node.js 18+**
- **PostgreSQL 12+**
- **npm** lub **yarn**

### 1. Klonowanie i setup:

```bash
git clone <repository>
cd system-serwisowy

# Backend setup
npm install
cp .env.example .env
# Edytuj .env z danymi bazy

# Frontend setup
cd frontend
npm install
cp .env.example .env
# Edytuj .env z URL API
```

### 2. Baza danych:

```bash
# Utwórz bazę danych PostgreSQL
createdb system_serwisowy

# Uruchom migracje
npm run migrate

# Załaduj dane testowe
npm run seed
```

### 3. Uruchomienie:

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Aplikacja będzie dostępna:**
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3000

### 4. Logowanie:

Użyj jednego z kont testowych:

| Login | Hasło | Rola |
|-------|-------|------|
| `admin` | `Admin123!` | Administrator |
| `technik1` | `Technik123!` | Technik |
| `kierownik` | `Kierownik123!` | Kierownik |

## 🔐 System autoryzacji

### Role i uprawnienia:

- **Administrator** - pełny dostęp do wszystkich modułów
- **Kierownik** - zarządzanie, raporty, harmonogram
- **Technik** - serwis, urządzenia, harmonogram (tylko odczyt raportów)

### Bezpieczeństwo:
- **JWT tokens** z automatycznym odświeżaniem
- **Bcrypt** hashowanie haseł
- **Rate limiting** ochrona przed atakami
- **CORS** konfiguracja dla bezpiecznych połączeń

## 📱 Mobile-First Design

Frontend zaprojektowany z myślą o technikach pracujących w terenie:

- **Touch-friendly** - elementy min. 44px wysokości
- **Responsive** - działa na telefonach, tabletach, desktopach
- **Offline-capable** - podstawowe funkcje bez internetu
- **PWA-ready** - może być zainstalowany jako aplikacja

### Główne funkcje mobilne:
- **Dashboard** z kafelkami modułów
- **Szybki dostęp** do najważniejszych funkcji
- **Intuicyjna nawigacja** dolna dla kciuka
- **Powiadomienia** push (w przygotowaniu)

## 🏗️ Struktura projektu

```
system-serwisowy/
├── src/                    # Backend (Node.js)
│   ├── shared/            # Współdzielone komponenty
│   │   ├── auth/          # System autoryzacji
│   │   ├── database/      # Baza danych i migracje
│   │   └── error/         # Obsługa błędów
│   ├── modules/           # Moduły biznesowe (placeholder)
│   └── app.js             # Główna aplikacja Express
├── frontend/              # Frontend (Vue.js 3)
│   ├── src/
│   │   ├── components/    # Komponenty Vue
│   │   ├── views/         # Widoki stron
│   │   ├── stores/        # Pinia stores
│   │   ├── services/      # API services
│   │   └── router/        # Vue Router
│   ├── package.json
│   └── vite.config.js
├── package.json           # Backend dependencies
├── README.md
└── rules.txt              # Zasady systemu
```

## 🛠️ Technologie

### Backend:
- **Node.js + Express** - Server i API
- **PostgreSQL** - Baza danych
- **JWT + bcrypt** - Autoryzacja
- **Winston** - Logowanie
- **Helmet, CORS** - Bezpieczeństwo

### Frontend:
- **Vue.js 3** - Framework JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling mobile-first
- **Pinia** - State management
- **Vue Router** - Routing
- **Axios** - HTTP client

## 📊 Baza danych

### Główne tabele:
- **users** - Użytkownicy systemu
- **clients** - Klienci (firmy i osoby prywatne)
- **devices** - Urządzenia grzewcze
- **service_records** - Protokoły serwisowe
- **appointments** - Harmonogram wizyt
- **inventory_items** - Pozycje magazynowe
- **stock_movements** - Ruchy magazynowe
- **report_templates** - Szablony raportów
- **generated_reports** - Wygenerowane raporty

## 🔧 Konfiguracja

### Backend (.env):
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=system_serwisowy
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Server
PORT=3000
NODE_ENV=development
```

### Frontend (.env):
```env
# API
VITE_API_URL=http://localhost:3000/api/v1

# App
VITE_APP_NAME="System Serwisowy Palniki & Kotły"
VITE_APP_VERSION=1.0.0
```

## 🚀 Deployment

### Backend (PM2):
```bash
npm run build
pm2 start ecosystem.config.js
```

### Frontend (Nginx):
```bash
cd frontend
npm run build
# Skopiuj dist/ na serwer
```

### Docker (opcjonalnie):
```bash
docker-compose up -d
```

## 📈 Roadmap

### Faza 1 (Aktualna):
- ✅ Backend API i autoryzacja
- ✅ Frontend framework i login
- ✅ Moduł Klienci (podstawowy)

### Faza 2:
- 🚧 Pełna implementacja modułu Klienci
- 🚧 Moduł Urządzenia
- 🚧 Moduł Serwis

### Faza 3:
- 📋 Moduł Harmonogram
- 📋 Moduł Magazyn
- 📋 Moduł Raporty

### Faza 4:
- 📋 PWA features
- 📋 Powiadomienia push
- 📋 Synchronizacja offline

## 🤝 Rozwój

### Uruchomienie dev:
```bash
# Backend z hot reload
npm run dev

# Frontend z hot reload
cd frontend
npm run dev

# Testy
npm test
cd frontend && npm test
```

### Dodawanie nowych modułów:

1. **Backend:** Dodaj endpoint w `src/app.js`
2. **Frontend:** Dodaj widok w `src/views/modules/`
3. **Router:** Dodaj trasę w `src/router/index.js`
4. **Permissions:** Skonfiguruj uprawnienia w store

## 📞 Wsparcie

W przypadku problemów:

1. Sprawdź logi backendu: `npm run logs`
2. Sprawdź console przeglądarki
3. Zweryfikuj połączenie z bazą danych
4. Sprawdź konfigurację CORS

---

**System Serwisowy Palniki & Kotły v1.0.0**  
Zbudowany zgodnie z zasadami z `rules.txt`

---

**System Serwisowy Palniki & Kotły** - Professional grade heating equipment service management system. 