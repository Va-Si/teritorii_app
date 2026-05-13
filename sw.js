const CACHE_NAME = 'teritorii-cache-v2'; // Schimbat la v2 pentru a forța reînnoirea

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
            return caches.delete(cache); // Șterge memoria veche când apare o versiune nouă
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignorăm baza de date pentru a lăsa Firebase să se ocupe singur de ea
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // SOLUȚIA PROBLEMEI TALE (Network First pentru index.html):
  // Cand cerem fisierul principal de cod, incercam PRIMA DATA sa il luam de pe GitHub (internet)
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
            // Dacă am reușit să îl luăm de pe net, îl și salvăm în buzunar (cache) pentru când nu vom avea net
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return response;
        })
        .catch(() => {
            // Dacă NU avem internet deloc, dăm varianta veche din buzunar (cache)
            return caches.match(event.request);
        })
    );
    return;
  }

  // Pentru restul (Tailwind, Iconițe, Poze) folosim în continuare "Cache First" ca să se miște foarte rapid
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
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
