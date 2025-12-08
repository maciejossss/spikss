# 🚀 INSTRUKCJA URUCHAMIANIA - UPORZĄDKOWANA

## ⚠️ UWAGA: PRZESTAŃ MIESZAĆ KATALOGI!

### 🖥️ DESKTOP APP (GŁÓWNA APLIKACJA)
```bash
# ZAWSZE Z KATALOGU desktop/:
cd C:\programy\serwis\desktop
npm run dev

# LUB użyj gotowego skryptu:
cd C:\programy\serwis
.\START-DESKTOP-APP.bat
```

### 📱 MOBILE APP  
```
URL: https://web-production-fc58d.up.railway.app
(automatycznie działa po uruchomieniu desktop)
```

### ☁️ RAILWAY BACKEND
```
Automatycznie wdrażany z server.js w głównym katalogu
URL: https://web-production-fc58d.up.railway.app/api/health
```

---

## 🚫 NIE URUCHAMIAJ:

❌ `npm run dev` z katalogu głównego `C:\programy\serwis\`
❌ `npm run dev` z katalogu `spikss/`  
❌ Nie mieszaj plików między katalogami

## ✅ URUCHAMIAJ TYLKO:

✅ `cd desktop; npm run dev` 
✅ `.\START-DESKTOP-APP.bat`
✅ `.\SZYBKI-START.cmd`

---

## 📂 PODZIAŁ KATALOGÓW:

| Katalog | Przeznaczenie | Jak uruchomić |
|---------|---------------|---------------|
| `desktop/` | Aplikacja Electron | `cd desktop; npm run dev` |
| `server.js` | Backend Railway | Automatyczny deploy |
| `spikss/` | Backup/GitHub | NIE URUCHAMIAJ |
| `mobile/` | App mobilna | Przez Railway URL |

---

## 🔧 ROZWIĄZYWANIE PROBLEMÓW:

### Problem: "nodemon is not recognized"
**Przyczyna:** Uruchamiasz z błędnego katalogu  
**Rozwiązanie:** `cd desktop; npm run dev`

### Problem: "Port in use"  
**Rozwiązanie:** Zatrzymaj poprzednie procesy i uruchom ponownie

### Problem: Railway nie odpowiada
**Rozwiązanie:** Sprawdź czy poprawne pliki są na GitHub 