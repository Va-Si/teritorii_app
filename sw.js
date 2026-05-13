const CACHE_NAME = 'teritorii-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        // Încearcă să ia varianta proaspătă de pe internet
        fetch(event.request).catch(() => {
            // Dacă nu are internet (dă eroare), arată din memorie
            return caches.match(event.request).then((response) => {
                if (response) return response;
                // Previne afișarea dinozaurului pentru pagini HTML
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
