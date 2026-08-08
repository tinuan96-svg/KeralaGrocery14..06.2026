/**
 * Kerala Groceries — Service Worker
 */

const CACHE_VERSION = 'kg-v2'; // Bumped version
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/placeholder.webp',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Use individual add for each to prevent one failure blocking all
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Failed to cache: ${url}`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('kg-') && k !== STATIC_CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip non-http/https schemes (like chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // Skip Supabase, analytics, payment providers
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.hostname.includes('securetrading.net') ||
    url.hostname.includes('trustpayments.com') ||
    url.hostname.includes('google-analytics.com') ||
    url.hostname.includes('googletagmanager.com')
  ) {
    return;
  }

  // ── API Cache for Products (Offline Browsing) ────────────────────
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
     if (url.search.includes('select=') || url.pathname.includes('rpc/get_products') || url.pathname.includes('rpc/search_products')) {
        event.respondWith(staleWhileRevalidate(request, 'kg-api-cache'));
        return;
     }
     return;
  }

  // ── Images → cache-first ────────────
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/)
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // ── Static assets (JS, CSS, fonts) → stale-while-revalidate ────────────
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── HTML navigation → network-first ──────────────────
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? caches.match('/offline'))
        )
    );
    return;
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const url = new URL(request.url);
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && url.protocol.startsWith('http')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached ?? await fetchPromise ?? new Response('Not found', { status: 404 });
}

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title   = data.title   ?? 'Kerala Groceries';
  const options = {
    body:    data.body    ?? 'You have a new notification',
    icon:    data.icon    ?? '/icons/icon-192x192.png',
    badge:   data.badge   ?? '/icons/icon-96x96.png',
    image:   data.image,
    data:    { url: data.url ?? '/' },
    actions: data.actions ?? [
      { action: 'open',    title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
    requireInteraction: data.requireInteraction ?? false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  console.log('[SW] Background sync: order-sync');
}
