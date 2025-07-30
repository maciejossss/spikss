const CACHE_NAME = 'serwis-mobilny-v1.0.3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalacja Service Workera
self.addEventListener('install', event => {
  console.log('📱 Service Worker: Instalacja');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📱 Service Worker: Cache otwarty');
        return cache.addAll(urlsToCache);
      })
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', event => {
  console.log('📱 Service Worker: Aktywacja');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('📱 Service Worker: Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Obsługa żądań
self.addEventListener('fetch', event => {
  // Tylko dla GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Dla API requests - zawsze idź do sieci
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // W przypadku braku połączenia zwróć informację
          return new Response(
            JSON.stringify({
              error: 'Brak połączenia z serwerem',
              offline: true
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );
        })
    );
    return;
  }
  
  // Dla pozostałych zasobów - cache first
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Zwróć z cache jeśli znaleziono
        if (response) {
          return response;
        }
        
        // Pobierz z sieci
        return fetch(event.request)
          .then(response => {
            // Sprawdź czy response jest prawidłowy
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Sklonuj response
            const responseToCache = response.clone();
            
            // Dodaj do cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // Fallback dla offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Push notifications (przygotowane na przyszłość)
self.addEventListener('push', event => {
  console.log('📱 Service Worker: Push notification otrzymana');
  
  const options = {
    body: event.data ? event.data.text() : 'Nowe zlecenie serwisowe',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'Zobacz zlecenie',
        icon: 'icon-192.png'
      },
      {
        action: 'close',
        title: 'Zamknij'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Serwis Mobilny', options)
  );
});

// Obsługa kliknięć w notyfikacje
self.addEventListener('notificationclick', event => {
  console.log('📱 Service Worker: Kliknięcie w notyfikację');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Synchronizacja w tle (dla offline actions)
self.addEventListener('sync', event => {
  console.log('📱 Service Worker: Background sync');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('📱 Service Worker: Wykonywanie synchronizacji w tle');
  // Tu można dodać logikę synchronizacji offline actions
}
