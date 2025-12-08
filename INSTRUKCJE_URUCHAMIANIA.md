# 🚀 Instrukcje Uruchamiania - System Serwisowy

## Pliki Startowe

### 📝 **Desktop App** (Główna aplikacja)
- **`start-desktop.bat`** - kliknij 2x aby uruchomić
- **`start-desktop.ps1`** - wersja PowerShell (PPM → "Uruchom w PowerShell")

### 📱 **Mobile Server** (Serwer aplikacji mobilnej)  
- **`start-mobile.bat`** - kliknij 2x aby uruchomić

---

## 🎯 Jak uruchomić system?

### 1. **Uruchom Desktop App** 
```
🖱️ Kliknij 2x na: start-desktop.bat
```
- Automatycznie zatrzyma stare procesy 
- Uruchomi główną aplikację desktop
- Otworzy się okno aplikacji

### 2. **Uruchom Mobile Server** (opcjonalnie)
```  
🖱️ Kliknij 2x na: start-mobile.bat
```
- Uruchomi serwer na: http://localhost:3000
- Potrzebne tylko do lokalnego testowania mobile app

---

## 🔧 Rozwiązywanie problemów

### ❌ "Port 5173 is already in use"
- Zamknij wszystkie okna terminala
- Uruchom ponownie `start-desktop.bat`

### ❌ "npm not found"
- Sprawdź czy Node.js jest zainstalowany  
- Restart komputera może pomóc

### ❌ Aplikacja się nie otwiera
- Sprawdź konsolę terminala pod kątem błędów
- Spróbuj uruchomić `npm install` w folderze `desktop/`

---

## 📱 Aplikacja Mobile

**Railway (Produkcja):** https://web-production-fc58d.up.railway.app

**Lokalny serwer:** http://localhost:3000 (gdy uruchomiony `start-mobile.bat`)

---

## 💡 Wskazówki

- **Desktop app** zapisuje dane lokalnie (SQLite)
- **Mobile app** łączy się z Railway backend (PostgreSQL)  
- Zlecenia wysyłane z desktop automatycznie trafiają do Railway
- Zamknij desktop app przez **Ctrl+C** w terminalu lub X na oknie 