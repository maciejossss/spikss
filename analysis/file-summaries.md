# File summaries (baseline)

- `desktop/src/electron/main.js`: Główny proces Electron. Tworzy okno, inicjalizuje bazę, uruchamia `APIServer` na porcie 5174, zarządza kopiami zapasowymi i IPC (użytkownicy, pliki, PDF, backupy).
- `desktop/src/electron/api-server.js`: Serwer Express dla mobilki PWA i integracji z Railway. Endpoints: `/api/desktop/*`, `/api/railway/*`, `/api/debug/*`, import/eksport zleceń/urządzeń/klientów, synchronizacja zdjęć i plików, timery pracy.
- `server.js`: Wejście dla Railway – startuje `desktop/railway-backend/server`.
- `database/connection.js`: Klient PostgreSQL (Railway) z metodami `query/get/all/run` i transakcjami.
- `desktop/package.json`: Skrypty dev/build Electron + Vite; zależności Vue 3, Electron, Tailwind.
- `package.json` (root): Skrypty i zależności dla backendu Railway (Express, PG, JWT, itp.).
