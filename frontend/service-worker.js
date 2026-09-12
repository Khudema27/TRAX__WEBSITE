const CACHE_NAME = 'trax-v4';
const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching app shell');
            return cache.addAll(SHELL_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // NEVER cache API calls — shipments, tracking, auth, push, etc. must
    // always be live data straight from the server. This is exactly what
    // was making newly created shipments (and other fresh data) look
    // "missing" on the web: the service worker was serving a stale
    // cached copy of the API response instead of re-fetching it.
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Static assets (HTML/CSS/JS/images/fonts): cache-first, for speed
    // and offline support.
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (event.request.method === 'GET' && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            return caches.match('/');
        })
    );
});

// ==================== PUSH NOTIFICATIONS ====================
self.addEventListener('push', event => {
    let payload = { title: 'ROUTE3 TRAX', body: 'You have a new notification.' };
    try {
        if (event.data) payload = event.data.json();
    } catch (e) {
        payload.body = event.data ? event.data.text() : payload.body;
    }

    const options = {
        body: payload.body,
        icon: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23064e3b\'/%3E%3Cpath fill=\'%2310b981\' d=\'M50 20L20 37v26l30 17 30-17V37L50 20z\' opacity=\'0.9\'/%3E%3C/svg%3E',
        badge: 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23064e3b\'/%3E%3C/svg%3E',
        tag: payload.tag || 'trax-notification',
        renotify: true,
        data: payload.data || { url: '/' }
    };

    event.waitUntil(self.registration.showNotification(payload.title || 'ROUTE3 TRAX', options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});