# 🚀 Instrukcja uruchomienia systemu serwisowego

## ✅ Sprawdzenie środowiska

1. **Sprawdź wersję Node.js:**
```bash
node --version
# Wymagane: v18.0.0 lub wyższe
```

2. **Sprawdź npm:**
```bash
npm --version
# Zalecane: v9.0.0 lub wyższe
```

## 📦 Instalacja

### Krok 1: Instalacja zależności głównych
```bash
npm install
```

### Krok 2: Instalacja zależności dla aplikacji desktopowej
```bash
cd desktop
npm install
```

### Krok 3: Sprawdzenie instalacji
```bash
# Powrót do głównego katalogu
cd ..

# Sprawdzenie czy wszystkie workspace'y są gotowe
npm run setup
```

## 🖥️ Uruchomienie aplikacji desktopowej

### Tryb deweloperski:
```bash
# Z głównego katalogu
npm run dev:desktop

# LUB z katalogu desktop
cd desktop
npm run dev
```

### Pierwsze uruchomienie:
1. Aplikacja otworzy się w nowym oknie Electron
2. Zobaczysz ekran logowania
3. Użyj danych testowych:
   - **Użytkownik:** `admin`
   - **Hasło:** `admin123`

## 🎯 Test funkcjonalności

Po zalogowaniu powinieneś zobaczyć:
- [x] Górne menu nawigacyjne
- [x] Kafelki z opcjami (Klienci, Urządzenia, Zlecenia, etc.)
- [x] Statystyki w górnej części
- [x] Możliwość nawigacji między modułami

## 🔧 Rozwiązywanie problemów

### Problem: Błąd instalacji SQLite
```bash
# Windows - zainstaluj build tools
npm install --global windows-build-tools

# MacOS - zainstaluj Xcode command line tools
xcode-select --install

# Linux - zainstaluj zależności
sudo apt-get install build-essential
```

### Problem: Błąd z Electron
```bash
# Wyczyść cache i reinstaluj
npm cache clean --force
cd desktop
rm -rf node_modules package-lock.json
npm install
```

### Problem: Baza danych nie inicjalizuje się
1. Sprawdź czy folder `~/AppData/Roaming/serwis-desktop` (Windows) istnieje
2. Usuń plik `serwis.db` jeśli istnieje
3. Uruchom aplikację ponownie

## 📁 Struktura bazy danych

Po pierwszym uruchomieniu zostanie utworzona baza SQLite z:
- Użytkownik admin (admin/admin123)
- Podstawowe kategorie urządzeń
- Puste tabele dla klientów, urządzeń, zleceń

## 🎨 Interfejs

### Górne menu zawiera:
- Panel główny
- Klienci
- Urządzenia  
- Zlecenia
- Faktury
- Kalendarz
- Raporty

### Dashboard zawiera:
- Statystyki (liczba klientów, zleceń, urządzeń, faktur)
- Kafelki szybkiego dostępu do modułów

## 🔄 Następne kroki

Po uruchomieniu możesz:
1. Eksplorować interfejs
2. Kliknąć w kafelki (aktualnie pokazują "w budowie")
3. Testować nawigację
4. Sprawdzić menu użytkownika (prawy górny róg)

## 📞 Pomoc

Jeśli masz problemy:
1. Sprawdź czy Node.js jest poprawnie zainstalowany
2. Uruchom `npm run setup` ponownie
3. Sprawdź logi w terminalu
4. Sprawdź DevTools w aplikacji (F12) 