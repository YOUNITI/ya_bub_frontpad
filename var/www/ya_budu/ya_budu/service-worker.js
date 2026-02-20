// Service Worker для ЯБУДУ PWA
// Версия кэша - меняйте при обновлении приложения
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `yabudu-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `yabudu-dynamic-${CACHE_VERSION}`;
const API_CACHE = `yabudu-api-${CACHE_VERSION}`;

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// API endpoints для кэширования
const API_ROUTES = [
  '/api/products',
  '/api/categories'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Установка...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Кэширование статических ресурсов');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[Service Worker] Ошибка кэширования:', error);
      })
  );
  
  // Принудительная активация нового SW
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Активация...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые версии кэша
          if (
            cacheName.startsWith('yabudu-static-') && cacheName !== STATIC_CACHE ||
            cacheName.startsWith('yabudu-dynamic-') && cacheName !== DYNAMIC_CACHE ||
            cacheName.startsWith('yabudu-api-') && cacheName !== API_CACHE
          ) {
            console.log('[Service Worker] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Берем контроль над всеми клиентами
  self.clients.claim();
});

// Обработка запросов (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }
  
  // Пропускаем внешние URL (не с localhost или нашего домена)
  if (!url.hostname.includes('localhost') && !url.hostname.includes('yabudu')) {
    return;
  }
  
  // Стратегия для API запросов - Stale While Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }
  
  // Стратегия для изображений - Cache First
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }
  
  // Стратегия для статических ресурсов - Cache First
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|woff|woff2)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Для HTML страниц - Network First с fallback на кэш
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
  
  // По умолчанию - Cache First
  event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
});

// Стратегия: Cache First
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[Service Worker] Ошибка fetch:', error);
    throw error;
  }
}

// Стратегия: Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Обновляем кэш в фоне
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  // Возвращаем кэшированную версию сразу, или ждем fetch если кэша нет
  return cached || fetchPromise;
}

// Стратегия: Network First с fallback на offline страницу
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Кэшируем успешный ответ
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Сеть недоступна, пробуем кэш...');
    
    // Пробуем получить из кэша
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Если нет в кэше, возвращаем offline страницу
    const offlineCache = await caches.open(STATIC_CACHE);
    const offlinePage = await offlineCache.match('/offline.html');
    
    if (offlinePage) {
      return offlinePage;
    }
    
    // Последняя надежда - простой ответ
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head><title>Нет интернета</title></head>
        <body>
          <h1>🍔 ЯБУДУ</h1>
          <p>Нет подключения к интернету</p>
          <button onclick="location.reload()">Повторить</button>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

// Фоновая синхронизация (для заказов офлайн)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    console.log('[Service Worker] Фоновая синхронизация заказов...');
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  console.log('[Service Worker] Синхронизация заказов...');
}

// Push уведомления (заготовка для будущего)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push получен:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Новое уведомление от ЯБУДУ!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Открыть'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('ЯБУДУ 🍔', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Клик по уведомлению:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Сообщения от клиента
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Сообщение от клиента:', event.data);
  
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Загружен');
