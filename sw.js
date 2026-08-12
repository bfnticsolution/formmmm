// sw.js — NTIC Solution Service Worker
const CACHE_NAME = 'ntic-solution-v1';
const OFFLINE_PAGE = '/offline.html';

// Fichiers à mettre en cache pour le mode hors ligne
const PRE_CACHE = [
    '/',
    '/offline.html',
    '/404.html',
    '/logo.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png'
];

// Installation
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRE_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activation
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes non GET
    if (event.request.method !== 'GET') return;

    // Ignorer les requêtes API
    if (event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Retourner le cache si trouvé
                if (cachedResponse) {
                    // Mettre à jour le cache en arrière-plan
                    fetch(event.request)
                        .then((response) => {
                            if (response && response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                            }
                        })
                        .catch(() => {});
                    return cachedResponse;
                }

                // Essayer le réseau
                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200) {
                            return response;
                        }
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                        return response;
                    })
                    .catch(() => {
                        // Pour les pages HTML, retourner la page offline
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match(OFFLINE_PAGE);
                        }
                        // Pour les autres ressources, erreur silencieuse
                        return new Response('', { status: 408 });
                    });
            })
    );
});
