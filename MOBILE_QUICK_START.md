# 📱 APLIKACJA MOBILNA - SZYBKI START

## 🚀 **W 2 MINUTY NA TELEFONIE**

### **Krok 1: Uruchom serwery** 
```bash
# Terminal 1 - Desktop
npm run dev:desktop

# Terminal 2 - Mobile (nowe okno)
npm run dev:mobile-server
```

### **Krok 2: Na telefonie**
```
1. 📱 Otwórz przeglądarkę (Chrome/Safari)
2. 🌐 Wpisz: http://192.168.1.27:3001 
3. ➕ Menu → "Dodaj do ekranu głównego"
4. ✅ Ikona "Serwis" gotowa!
```

## 🎯 **CO DZIAŁA**

### **✅ LISTA ZLECEŃ**
- 3 demo zlecenia gotowe do testowania
- Status kolorowy (nowe/w trakcie/ukończone)
- Kliknij w zlecenie → szczegóły

### **✅ SZCZEGÓŁY ZLECENIA**
- **KAFELKI** prac do zaznaczania (A1, A3, B4...)
- **📷 ZDJĘCIA** - klik "Dodaj" → kamera telefonu
- **📞 TELEFON** - klik telefon → dzwoni do klienta
- **🗺️ NAWIGACJA** - klik kierunek → Google Maps
- **📝 UWAGI** - pole tekstowe
- **✅ ZAKOŃCZ** - gdy zaznaczone prace

### **✅ FUNKCJE TECHNICZNE**
- Działa **OFFLINE** po pierwszym załadowaniu
- **PWA** - wygląda jak natywna aplikacja
- **Responsive** - dopasowuje się do ekranu
- **Touch-friendly** - duże klikowalne obszary

## 📋 **DEMO ZLECENIA**

### **Zlecenie #1: Przegląd kotła Vaillant**
```
📍 ul. Kwiatowa 15, Kraków
📞 +48 123 456 789 (Jan Kowalski)
⚙️  Kocioł gazowy Vaillant VU 242/5-7
🔧 Prace: A1, A3, A4, A10, B4
⏱️  3h szacowane
```

### **Zlecenie #2: Awaria c.w.u.**
```
📍 ul. Różana 8, Warszawa  
📞 +48 987 654 321 (Anna Nowak)
⚙️  Kocioł Junkers Cerapur Smart
🔧 Prace: B4, B5, B8, G1
⏱️  2h szacowane
```

## 🔧 **KATEGORIE PRAC (KAFELKI)**

### **🔍 Przeglądy**
- **A1** - Czyszczenie palnika (mechaniczne)
- **A3** - Czyszczenie wymiennika (mechaniczne)  
- **A4** - Czyszczenie wymiennika (chemiczne)
- **A10** - Kontrola i wymiana uszczelek

### **🔧 Wymiana części**
- **B4** - Wymiana elektrody zapłonowej
- **B5** - Wymiana elektrody jonizacyjnej
- **B8** - Wymiana czujnika temperatury

### **⚠️ Awarie**
- **G1** - Diagnoza usterki

## 💡 **WSKAZÓWKI**

### **Workflow technika:**
```
1. 📱 Otwórz aplikację → lista zleceń
2. 🎯 Kliknij zlecenie → szczegóły
3. ▶️  "Rozpocznij pracę" (status → w trakcie)
4. ✅ Klikaj kafelki wykonanych prac
5. 📷 Dodaj zdjęcia (dokumentacja)
6. 📝 Wpisz uwagi
7. ✅ "Zakończ zlecenie" → gotowe!
```

### **Kamera:**
- Automatycznie tylna kamera (lepsza do dokumentacji)
- Zdjęcia zapisane jako base64 w aplikacji
- Klik "×" na zdjęciu → usuwa

### **Telefon/Nawigacja:**
- **📞** → otwiera aplikację telefonu
- **🗺️** → otwiera Google Maps/Apple Maps z adresem

## 🌐 **SIEĆ**

### **Demo mode (bez desktop):**
- 3 zlecenia demo zawsze dostępne
- Zmiany zapisywane lokalnie w przeglądarce
- Console.log pokazuje operacje

### **Połączenie z desktop:**
- Aplikacja próbuje łączyć się z localhost:5173
- Jeśli dostępne → pobiera prawdziwe zlecenia
- Jeśli nie → fallback do demo

## 🔄 **SYNCHRONIZACJA**

```
📱 MOBILE      🔄      🖥️ DESKTOP
    │                      │
    ├─ Pobiera zlecenia ←──┤
    ├─ Wysyła status ──────→
    ├─ Wysyła zdjęcia ─────→
    └─ Wysyła uwagi ───────→
```

## 🎨 **DESIGN MOBILE-FIRST**

- **Duże kafelki** - łatwe klikanie kciukiem
- **Kolory statusów** - szybka identyfikacja
- **Ikony FontAwesome** - czytelne symbole
- **Tailwind CSS** - responsywny design
- **Vue 3** - reaktywny interfejs

---

**✅ GOTOWE!** Aplikacja mobilna działa i jest gotowa do pracy w terenie! 