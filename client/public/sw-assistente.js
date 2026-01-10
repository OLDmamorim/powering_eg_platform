const CACHE_NAME = 'poweringeg-assistente-ia-v2';
const urlsToCache = [
  '/assistente-widget',
  '/assistente-pwa.html',
  '/poweringeg-ai-icon-192.png',
  '/poweringeg-ai-icon-512.png',
  '/favicon.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW Assistente] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW Assistente] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('[SW Assistente] Erro ao abrir cache:', err);
      })
  );
  self.skipWaiting();
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW Assistente] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remover caches antigos do assistente
          if (cacheName.startsWith('poweringeg-assistente') && cacheName !== CACHE_NAME) {
            console.log('[SW Assistente] A remover cache antigo:', cacheName);
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

// Receber mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
