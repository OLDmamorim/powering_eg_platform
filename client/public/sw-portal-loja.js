const CACHE_NAME = 'poweringeg-portal-loja-v3';
const urlsToCache = [
  '/portal-loja',
  '/portal-loja-icon-192.png',
  '/portal-loja-icon-512.png',
  '/favicon.png',
  '/eglass-logo.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW Portal Loja v3] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('[SW Portal Loja v3] Erro ao abrir cache:', err);
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remover caches antigos do portal da loja
          if (cacheName.startsWith('poweringeg-portal-loja') && cacheName !== CACHE_NAME) {
            console.log('[SW Portal Loja v3] A remover cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia: Network First, Cache Fallback
self.addEventListener('fetch', (event) => {
  // Ignorar requests não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar requests de API (sempre ir à rede)
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
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Se não houver cache, retornar página offline (se existir)
          if (event.request.mode === 'navigate') {
            return caches.match('/portal-loja');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Receber mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notificações push
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nova notificação',
      icon: '/portal-loja-icon-192.png',
      badge: '/portal-loja-icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/portal-loja'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'Portal da Loja', options)
    );
  }
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/portal-loja';
  event.waitUntil(
    clients.openWindow(url)
  );
});
