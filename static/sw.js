// MiniERP Service Worker
const CACHE_NAME = 'minierp-v1';
const STATIC_ASSETS = [
    '/',
    '/static/js/app.js',
    '/static/js/crm.js',
    '/static/js/inventory.js',
    '/static/js/sales.js',
    '/static/js/suppliers.js',
    '/static/js/expenses.js',
    '/static/js/projects.js',
    '/static/js/invoices.js',
    '/static/js/calendar.js',
    '/static/js/deadlines.js',
    '/static/js/reports.js',
    '/static/js/lucide.js',
    '/static/js/tailwindcss.js',
    '/static/img/icon-192.png',
    '/static/img/icon-512.png',
    '/static/img/logo.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API calls: always network-first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Static assets: cache-first
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                // Update cache in background
                fetch(event.request).then((response) => {
                    if (response.ok) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response);
                        });
                    }
                }).catch(() => {});
                return cached;
            }
            return fetch(event.request);
        })
    );
});
