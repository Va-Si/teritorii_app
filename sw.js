const CACHE_NAME = 'teritorii-cache-v1';

// Fisierele de baza pe care vrem sa le salvam instant
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

// 1. La instalare: Salvam structura de baza
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // Forteaza activarea imediata
});

// 2. La activare: Curatam versiunile vechi daca exista
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Aici e Magia Offline: Interceptam orice incarcare (inclusiv iconitele si Tailwind)
self.addEventListener('fetch', (event) => {
  // IMPORTANT: Ignoram traficul catre Baza de Date Firebase! (Asta are propriul ei mod offline pe care l-am activat in index.html)
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('securetoken.googleapis.com')
  ) {
    return; // Lasam Firebase sa-si faca treaba singur
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // DACA fisierul (design/iconita/script) este deja in telefon, il dam instant, FARA NET!
      if (cachedResponse) {
        return cachedResponse;
      }

      // DACA nu il avem, il descarcam de pe internet si il SALVAM in telefon pentru data viitoare cand nu vom avea net
      return fetch(event.request).then((networkResponse) => {
        // Verificam daca raspunsul e valid
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        // Clona raspunsului (una o dam browserului, una o punem in buzunar/cache)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Salvam in memorie (aici intra scriptul de Tailwind, React si fonturile de la Google)
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Aici ajunge daca nu e net DELOC si fisierul nu a fost salvat niciodata
        console.warn('Ești offline și resursa nu e în cache:', event.request.url);
      });
    })
  );
});
