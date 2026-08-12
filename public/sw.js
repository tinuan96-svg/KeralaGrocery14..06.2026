/**
 * Kerala Groceries — Service Worker
 * Strategy:
 *   - App shell (HTML pages): Network-first, fall back to /offline
 *   - Static assets (JS/CSS/fonts/images): Stale-while-revalidate
 *   - API / Supabase calls: Network-only (never cache)
 *   - Notification support wired for future FCM web push
 */

const CACHE_VERSION = 'kg-v1';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/offline',
  '/manifest.json',
  '/image.png',
  '/placeholder.webp',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        // Non-fatal: some assets may not exist yet
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
  // Activate immediately without waiting for old SW to finish
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

  // ── 1. Never intercept non-GET or cross-origin API calls ──────────────────
  if (request.method !== 'GET') return;

  // Skip Supabase, analytics, payment providers
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.hostname.includes('stripe.com') ||
    url.hostname.includes('google-analytics.com') ||
    url.hostname.includes('googletagmanager.com')
  ) {
    return;
  }

  // ── 1.5 API Cache for Products (New: Offline Browsing) ────────────────────
  // We cache product list/detail RPC calls to ensure the shop is browsable offline
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
     // We only cache the read-only product queries
     if (url.search.includes('select=') || url.pathname.includes('rpc/get_products') || url.pathname.includes('rpc/search_products')) {
        event.respondWith(staleWhileRevalidate(request, 'kg-api-cache'));
        return;
     }
     return; // Post requests (orders, etc) should never be cached
  }

  // ── 2. Images → cache-first (serve stale, update in background) ────────────
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/)
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // ── 3. Static assets (JS, CSS, fonts) → stale-while-revalidate ────────────
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── 4. HTML navigation → network-first, offline fallback ──────────────────
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of successful HTML responses
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

// ── Stale-while-revalidate helper ─────────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
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

// ── Background sync (order retry) ────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'order-sync') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // Placeholder — wire to IndexedDB queue when offline order queuing is added
  console.log('[SW] Background sync: order-sync');
}
