const CACHE_NAME = 'teritorii-cache-v4'; // Am forțat v3

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Șterge memoria veche
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorăm baza de date (Firebase) pentru a nu bloca funcția lui nativă de offline
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // 1. Network First pentru index.html
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return response;
        })
        .catch(() => {
            // Dacă nu avem net, dăm varianta salvată
            return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Cache First pentru "Unelte" (React, Tailwind, Iconițe)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; 
      }
      return fetch(event.request).then((networkResponse) => {
        // REPARAT: Am scos restricțiile dure. Acum permite salvarea resurselor externe (status 0 = Opaque)
        if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        console.warn('Ești offline și resursa nu e în cache:', event.request.url);
      });
    })
  );
});
