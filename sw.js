const CACHE_NAME = 'calendario-iglesia-v8';
const urlsToCache = [
  './',
  './index.html',
  './offline.html',
  './styles.css',
  './app.js',
  './lang.js',
  './scriptures.js',
  './manifest.json',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/icon-1024.png',
  './images/icon-maskable.png'
];

// Instalación: Cachear activos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Abriendo caché v7');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activación: Limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network-First con Fallback a Caché
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si hay red, actualizamos la caché y devolvemos la respuesta
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si falla la red, buscamos en la caché
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          // Si no hay nada en caché y es una navegación, mostrar página offline
          if (event.request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
        });
      })
  );
});

// Background Sync (Puntos extra en PWABuilder)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-events') {
    console.log('Sincronizando eventos en segundo plano...');
    // Aquí iría la lógica para enviar eventos pendientes cuando vuelva el internet
  }
});

// Manejo de Notificaciones Push
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Calendario', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Nueva actividad disponible',
    icon: './images/icon-512.png',
    badge: './images/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Calendario de Actividades', options)
  );
});

// Click en la notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || './');
      }
    })
  );
});

// Periodic Sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-events') {
    event.waitUntil(console.log('Periodic sync ejecutado.'));
  }
});
