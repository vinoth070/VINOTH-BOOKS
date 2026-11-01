/**
 * VINOTH BOOKS — Production Service Worker
 * 
 * Rules:
 * - Caches static assets for offline performance
 * - NEVER caches dynamic /api/* endpoints or authentication tokens
 * - Stale-while-revalidate for static scripts, fonts, and styles
 * - Offline navigation fallback to offline.html
 */

const CACHE_NAME = 'vinoth-books-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './icon.svg',
  './offline.html',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching some assets failed:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: NEVER cache API calls, Firebase endpoints, or OAuth tokens
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('razorpay')
  ) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('./offline.html') || caches.match('./');
      })
    );
    return;
  }

  // Stale-While-Revalidate for images, scripts, styles, and fonts
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fetch fails, nothing extra to do; cachedResponse is returned if present
        });

      return cachedResponse || fetchPromise;
    })
  );
});
