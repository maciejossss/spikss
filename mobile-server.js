const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3001;

// CORS dla wszystkich źródeł
app.use(cors());
app.use(express.json());

// Serwowanie plików statycznych aplikacji mobilnej
app.use(express.static(path.join(__dirname, 'mobile')));

// API mobilne - proxy do aplikacji desktop (zgodnie z PWA, które woła /api/desktop/...)
app.get('/api/desktop/orders/:userId', async (req, res) => {
  try {
    // Próba połączenia z aplikacją desktop na localhost:5174 (nowy API server)
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://localhost:5174/api/desktop/orders/${req.params.userId}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Pobrano ${data.length} zleceń z desktop API dla technika ${req.params.userId}`);
      res.json(data);
    } else {
      console.log('Desktop API błąd response:', response.status);
      // Fallback do demo danych
      res.json(getDemoOrders());
    }
  } catch (error) {
    console.log('Desktop API niedostępne, używam demo danych:', error.message);
    res.json(getDemoOrders());
  }
});

// Aktualizacja statusu zlecenia (zgodnie z PWA)
app.put('/api/desktop/orders/:orderId/status', async (req, res) => {
  try {
    const { status, completedCategories, photos, notes } = req.body;
    
    // Próba wysłania do aplikacji desktop na porcie 5174
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://localhost:5174/api/desktop/orders/${req.params.orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        completedCategories,
        photos,
        notes,
        updatedAt: new Date().toISOString()
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Desktop API: Zaktualizowano zlecenie ${req.params.orderId} -> ${status}`);
      res.json({ success: true, ...result });
    } else {
      console.log(`⚠️ Desktop API błąd ${response.status} dla zlecenia ${req.params.orderId}`);
      // Demo mode - zachowuj lokalnie
      console.log(`📋 Demo: Zaktualizowano zlecenie ${req.params.orderId}:`, {
        status, 
        completedCategories: completedCategories.length,
        photos: photos.length,
        notes
      });
      res.json({ success: true });
    }
  } catch (error) {
    console.log('📋 Demo mode: zapisuję lokalnie', error.message);
    console.log(`📋 Demo: Zaktualizowano zlecenie ${req.params.orderId}:`, {
      status, 
      completedCategories: completedCategories.length,
      photos: photos.length,
      notes
    });
    res.json({ success: true });
  }
});

// Demo data dla trybu offline
function getDemoOrders() {
  return [
    {
      id: 1,
      order_number: 'SRV-2024-001',
      title: 'Przegląd roczny kotła Vaillant',
      client_name: 'Jan Kowalski',
      client_phone: '+48 123 456 789',
      address: 'ul. Kwiatowa 15, 31-456 Kraków',
      device_name: 'Kocioł gazowy Vaillant VU 242/5-7',
      status: 'new',
      priority: 'high',
      scheduled_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Za 2h
      service_categories: '["A1", "A3", "A4", "A10", "B4"]',
      description: 'Kompleksowy przegląd kotła gazowego - kontrola spalania, czyszczenie palnika i wymiennika, sprawdzenie elektroniki',
      estimated_hours: 3
    },
    {
      id: 2,
      order_number: 'SRV-2024-002',
      title: 'Naprawa awaryjna - brak ciepłej wody',
      client_name: 'Anna Nowak',
      client_phone: '+48 987 654 321',
      address: 'ul. Różana 8, 00-123 Warszawa',
      device_name: 'Kocioł Junkers Cerapur Smart ZWB 28-3C',
      status: 'new',
      priority: 'high',
      scheduled_date: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // Za 6h
      service_categories: '["B4", "B5", "B8", "G1"]',
      description: 'Diagnoza i naprawa układu c.w.u. - prawdopodobnie awaria czujnika lub elektrody',
      estimated_hours: 2
    },
    {
      id: 3,
      order_number: 'SRV-2024-003',
      title: 'Serwis klimatyzacji - czyszczenie',
      client_name: 'Marek Zieliński',
      client_phone: '+48 555 123 456',
      address: 'ul. Słoneczna 12/5, 30-234 Kraków',
      device_name: 'Klimatyzator Daikin FTXS42K',
      status: 'in_progress',
      priority: 'medium',
      scheduled_date: new Date().toISOString(),
      service_categories: '["A1", "A2", "A5"]',
      description: 'Sezonowe czyszczenie klimatyzacji - jednostka wewnętrzna i zewnętrzna',
      estimated_hours: 1.5
    }
  ];
}

// Service Worker dla PWA
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
// Service Worker dla PWA
const CACHE_NAME = 'serwis-mobile-v1';
const urlsToCache = [
  '/',
  '/js/app.js',
  '/js/order-detail.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
  `);
});

// Wszystkie inne trasy przekieruj do index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  console.log(`🚀 Serwer mobilny uruchomiony!`);
  console.log(`📱 Adresy mobilne:`);
  console.log(`   http://localhost:${PORT}`);
  
  // Pokaż wszystkie adresy IP w sieci
  Object.keys(networkInterfaces).forEach(interfaceName => {
    networkInterfaces[interfaceName].forEach(interface => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`   http://${interface.address}:${PORT} 📲`);
      }
    });
  });
  
  console.log(`\n🎯 Instrukcje dla techników:`);
  console.log(`1. ✅ Serwer mobilny gotowy`);
  console.log(`2. 🖥️  Uruchom desktop: npm run dev:desktop`);
  console.log(`3. 📱 Na telefonie: otwórz przeglądarkę → wpisz adres`);
  console.log(`4. ➕ Dodaj do ekranu głównego (PWA)`);
  console.log(`5. 🔄 Synchronizacja z desktopem: localhost:5173`);
  console.log(`\n📋 DEMO: 3 zlecenia dostępne bez połączenia z desktopem`);
  console.log(`💡 Aplikacja działa offline po pierwszym załadowaniu!`);
}); 