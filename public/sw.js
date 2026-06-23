// Basic service worker for PWA functionality
const CACHE_NAME = 'mv-fashion-accessories-market-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  // Add other assets to cache as needed
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});