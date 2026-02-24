const CACHE_NAME = 'poweringeg-portal-gestor-v2';
const urlsToCache = [
  '/portal-gestor',
  '/poweringeg-ai-icon-192.png',
  '/poweringeg-ai-icon-512.png',
  '/manifest-portal-gestor.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PoweringEG Portal Gestor: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('PoweringEG Portal Gestor: Cache failed', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Estratégia: Network First, Cache Fallback
self.addEventListener('fetch', (event) => {
  // Ignorar requests não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requests de API (sempre ir à rede, nunca cache)
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Ignorar requests externos
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, guardar em cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar, tentar cache
        return caches.match(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('poweringeg-portal-gestor')) {
            console.log('PoweringEG Portal Gestor: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});
