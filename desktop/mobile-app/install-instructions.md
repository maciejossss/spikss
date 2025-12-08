# 📱 INSTRUKCJA INSTALACJI APLIKACJI MOBILNEJ

## 🚀 Jak zainstalować aplikację na telefonie

### **WAŻNE:** Adres IP komputera
Twój komputer ma adres IP: **192.168.1.27**

### **Krok 1: Uruchom program desktop**
```
1. Uruchom aplikację desktop (npm run dev)
2. Sprawdź czy widzisz komunikat: "API Server uruchomiony na porcie 5174"
3. Pozostaw aplikację uruchomioną
```

### **Krok 2: Otwórz aplikację na telefonie**
```
1. Otwórz przeglądarkę na telefonie (Chrome/Safari)
2. Wejdź na adres: http://192.168.1.27:5174
3. Alternativnie: http://192.168.1.27:5174/mobile-app/
```

### **Krok 3: Zainstaluj jako aplikację (PWA)**

#### **Na Androidzie (Chrome):**
1. Otwórz stronę w Chrome
2. Naciśnij menu (3 kropki) → "Dodaj do ekranu głównego"
3. Potwierdź instalację
4. Ikona aplikacji pojawi się na pulpicie

#### **Na iOS (Safari):**
1. Otwórz stronę w Safari
2. Naciśnij przycisk "Udostępnij" (kwadrat ze strzałką)
3. Wybierz "Dodaj do ekranu głównego"
4. Potwierdź nazwę i naciśnij "Dodaj"

---

## 🔧 FUNKCJE APLIKACJI MOBILNEJ

### **✅ Dostępne funkcje:**
- 📋 **Lista zleceń** technika
- ▶️ **Rozpoczęcie pracy** nad zleceniem
- ✅ **Zakończenie pracy** z notatkami
- ⏱️ **Timer pracy** w czasie rzeczywistym
- 🔄 **Automatyczne odświeżanie** co 30 sekund
- 🌐 **Praca offline** (podstawowa)
- 📱 **Instalacja jako aplikacja** (PWA)

### **🔮 Przygotowane na przyszłość:**
- 📸 Upload zdjęć z prac
- 📍 Geolokalizacja
- 🔔 Push notifications
- 📤 Synchronizacja offline

---

## 🐛 ROZWIĄZYWANIE PROBLEMÓW

### **Problem: "Brak połączenia z serwerem"**
```
1. Sprawdź czy komputer i telefon są w tej samej sieci WiFi
2. Sprawdź czy aplikacja desktop jest uruchomiona
3. Spróbuj adresu: http://192.168.1.27:5174/api/health
4. Jeśli nie działa, sprawdź firewall Windows
```

### **Problem: "Nie mogę zainstalować aplikacji"**
```
1. Upewnij się że używasz Chrome (Android) lub Safari (iOS)
2. Odśwież stronę i spróbuj ponownie
3. Sprawdź ustawienia przeglądarki
```

### **Problem: "Nie widzę zleceń"**
```
1. Sprawdź czy jesteś zalogowany jako technik
2. W aplikacji desktop przypisz zlecenia do technika
3. Sprawdź w "Monitor Mobilny" (tylko admin)
```

---

## 📞 TESTOWANIE POŁĄCZENIA

### **Test 1: Podstawowe połączenie**
Wejdź na: `http://192.168.1.27:5174/api/test`
Powinieneś zobaczyć: `"Połączenie z telefonem działa prawidłowo! 📱"`

### **Test 2: Lista techników**
Wejdź na: `http://192.168.1.27:5174/api/technicians`
Powinieneś zobaczyć listę JSON z technikami

### **Test 3: Zlecenia technika**
Wejdź na: `http://192.168.1.27:5174/api/desktop/orders/2`
Powinieneś zobaczyć zlecenia dla technika o ID 2

---

## 🔐 DANE TESTOWE

### **Domyślni użytkownicy:**
- **Admin:** admin / admin123
- **Technik:** technik1 / tech123 (ID: 2)

### **Przykładowe zlecenia:**
- SRV-2025-001: Przegląd roczny kotła Vaillant
- SRV-2025-002: Naprawa awaryjna - brak ciepłej wody  
- SRV-2025-003: Przegląd pompy ciepła

---

## 📱 WORKFLOW TECHNIKA

1. **Logowanie:** Wybierz swojego użytkownika
2. **Lista zleceń:** Zobacz przypisane zlecenia
3. **Rozpocznij pracę:** Naciśnij "▶️ Rozpocznij"
4. **Timer:** Automatycznie liczy czas pracy
5. **Zakończ:** Naciśnij "✅ Zakończ" i dodaj notatki
6. **Synchronizacja:** Dane od razu trafiają do systemu

---

## 🌐 ADRESY TESTOWE

```
Aplikacja mobilna: http://192.168.1.27:5174/mobile-app/
API Health: http://192.168.1.27:5174/api/health
API Test: http://192.168.1.27:5174/api/test
Technicy: http://192.168.1.27:5174/api/technicians
```

**GOTOWE DO TESTOWANIA! 🚀** 