// CreatorKit Production PWA Service Worker
const CACHE_NAME = 'creatorkit-pwa-v5';

const STATIC_PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/logo.png',
  '/logo.svg',
  '/favicon.ico',
];

// Install Event — precache core assets (fault-tolerant: a single missing
// asset like /favicon.ico must not reject the whole install and break
// activation with "Failed to execute 'addAll' on 'Cache'")
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(STATIC_PRECACHE.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// Activate Event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event — Network-first for pages and API, Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore chrome-extension and non-GET requests
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Cross-origin requests (except web fonts) go straight to the network.
  // The SW must never intercept streamed downloads (e.g. Supabase edge
  // functions serving ad-gated media) — respondWith() cannot handle a
  // failed passthrough and the page would see a fake CORS/network error.
  const isFontHost = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
  if (url.origin !== self.location.origin && !isFontHost) {
    return;
  }

  // Offline / failure fallback — respondWith must ALWAYS receive a real
  // Response. Returning undefined (a cache miss inside a catch) makes the
  // page load die with "Failed to convert value to 'Response'".
  const offlineResponse = () =>
    new Response('CreatorKit is offline. Please reconnect to internet.', {
      status: 504,
      headers: { 'Content-Type': 'text/plain' },
    });

  // Handle Static Assets (images, fonts, scripts) with Cache-First / SWR
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|css|js)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
              .catch(() => { /* quota errors must not surface as SW failures */ });
          }
          return networkResponse;
        }).catch(() => cachedResponse || offlineResponse());

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Handle HTML Page navigation — Network-first with Offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => { /* quota errors must not surface as SW failures */ });
          }
          return response;
        })
        .catch(async () => {
          try {
            const cached = await caches.match(request);
            if (cached) return cached;
            const rootCached = await caches.match('/');
            if (rootCached) return rootCached;
          } catch { /* cache read failure — fall through */ }
          return offlineResponse();
        })
    );
    return;
  }

  // Default fetch — always resolve to a real Response
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
      .then((response) => response || offlineResponse())
  );
});
