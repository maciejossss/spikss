# Frontend - System Serwisowy Palniki & Kotły

Frontend aplikacji zbudowany w **Vue.js 3** z **mobile-first** approach zgodnie z zasadami z `rules.txt`.

## 🚀 Technologie

- **Vue.js 3** - Framework JavaScript
- **Vite** - Build tool i dev server
- **Vue Router** - Routing
- **Pinia** - State management
- **Tailwind CSS** - Styling z mobile-first
- **Axios** - HTTP client
- **Lucide Vue** - Ikony
- **Vue Toastification** - Powiadomienia

## 📱 Mobile-First Design

Aplikacja została zaprojektowana z myślą o technikach pracujących w terenie:

- **Touch-friendly** - Wszystkie elementy min. 44px wysokości
- **Responsive** - Działa na telefonach, tabletach i desktopach
- **PWA-ready** - Przygotowana do instalacji jako aplikacja
- **Offline-capable** - Podstawowe funkcje działają bez internetu

## 🏗️ Struktura

```
frontend/
├── src/
│   ├── components/          # Komponenty wielokrotnego użytku
│   │   ├── layout/         # Layout (header, navigation)
│   │   └── ui/             # UI components (buttons, cards)
│   ├── views/              # Widoki stron
│   │   ├── modules/        # Widoki modułów systemu
│   │   ├── Dashboard.vue   # Dashboard główny
│   │   └── Login.vue       # Strona logowania
│   ├── stores/             # Pinia stores
│   │   └── auth.js         # Store autoryzacji
│   ├── services/           # Serwisy API
│   │   └── api.js          # Axios instance
│   ├── router/             # Vue Router
│   │   └── index.js        # Konfiguracja tras
│   ├── App.vue             # Główny komponent
│   ├── main.js             # Entry point
│   └── style.css           # Globalne style
├── package.json            # Zależności
├── vite.config.js          # Konfiguracja Vite
├── tailwind.config.js      # Konfiguracja Tailwind
└── index.html              # HTML template
```

## 🔐 Autoryzacja

System autoryzacji zintegrowany z backendem:

- **JWT tokens** z automatycznym odświeżaniem
- **Role-based access** - różne uprawnienia dla ról
- **Module permissions** - kontrola dostępu do modułów
- **Session persistence** - zapamiętywanie sesji

### Role użytkowników:
- **admin** - pełny dostęp do wszystkich modułów
- **manager** - dostęp do zarządzania i raportów
- **technician** - dostęp do serwisu i harmonogramu

## 📋 Moduły

### ✅ Zaimplementowane:
- **Dashboard** - Przegląd systemu i statystyki
- **Login** - Autoryzacja użytkowników
- **Klienci** - Zarządzanie bazą klientów (częściowo)

### 🚧 W przygotowaniu:
- **Urządzenia** - Katalog i historia urządzeń
- **Serwis** - Zlecenia i protokoły serwisowe
- **Harmonogram** - Planowanie wizyt i tras
- **Magazyn** - Części zamienne i zamówienia
- **Raporty** - Rozliczenia i statystyki

## 🛠️ Instalacja i uruchomienie

### Wymagania:
- Node.js 18+
- npm lub yarn

### Kroki:

1. **Instalacja zależności:**
```bash
cd frontend
npm install
```

2. **Konfiguracja środowiska:**
```bash
cp .env.example .env
# Edytuj .env według potrzeb
```

3. **Uruchomienie dev server:**
```bash
npm run dev
```

Aplikacja będzie dostępna pod: `http://localhost:8080`

### Inne komendy:

```bash
# Build produkcyjny
npm run build

# Preview build
npm run preview

# Testy
npm run test

# Linting
npm run lint
```

## 🔗 Integracja z Backend

Frontend komunikuje się z backendem przez REST API:

- **Base URL:** `http://localhost:3000/api/v1`
- **Autoryzacja:** Bearer token w headerze
- **Proxy:** Vite proxy przekierowuje `/api` na backend

### Przykład wywołania API:

```javascript
import api from '@/services/api'

// GET request
const response = await api.get('/clients')

// POST request
const response = await api.post('/auth/login', {
  username: 'admin',
  password: 'Admin123!'
})
```

## 🎨 Style i komponenty

### Tailwind CSS Classes:

```css
/* Buttons */
.btn-primary     /* Niebieski przycisk główny */
.btn-secondary   /* Szary przycisk drugorzędny */
.btn-success     /* Zielony przycisk sukcesu */
.btn-danger      /* Czerwony przycisk niebezpieczny */

/* Cards */
.card            /* Biała karta z cieniem */
.module-tile     /* Kafelek modułu na dashboard */

/* Forms */
.form-input      /* Input z focus states */
.form-label      /* Label dla inputów */

/* Mobile */
.touch-manipulation  /* Optymalizacja dotyku */
.safe-area-top       /* Safe area dla notch */
.safe-area-bottom    /* Safe area dla home indicator */
```

### Komponenty UI:

- **ModuleTile** - Kafelek modułu na dashboard
- **LoadingOverlay** - Overlay ładowania
- **AppHeader** - Header z menu użytkownika
- **MobileNavigation** - Dolna nawigacja mobilna

## 📱 PWA Features

Aplikacja jest przygotowana do działania jako PWA:

- **Responsive design** - działa na wszystkich urządzeniach
- **Touch-friendly** - optymalizacja dla dotyku
- **Offline-ready** - podstawowe funkcje bez internetu
- **App-like** - zachowanie jak natywna aplikacja

## 🔧 Konfiguracja

### Vite (vite.config.js):
- Proxy API na backend
- Aliasy ścieżek (@/ = src/)
- Build optimization

### Tailwind (tailwind.config.js):
- Mobile-first breakpoints
- Custom colors dla systemu
- Touch-friendly sizing
- Safe area utilities

### Vue Router:
- Lazy loading komponentów
- Guards autoryzacji
- Permission checking

## 🚀 Deployment

### Build produkcyjny:

```bash
npm run build
```

Pliki będą w folderze `dist/` gotowe do wdrożenia na serwer.

### Nginx config przykład:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📞 Wsparcie

W przypadku problemów sprawdź:

1. **Console** - błędy JavaScript
2. **Network** - błędy API
3. **Backend logs** - problemy serwera
4. **Browser compatibility** - wspierane przeglądarki

---

**System Serwisowy Palniki & Kotły v1.0.0**  
Frontend zbudowany zgodnie z zasadami z `rules.txt` 