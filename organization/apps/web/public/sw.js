// CitadelBuy Service Worker
const CACHE_NAME = 'citadelbuy-v1';
const STATIC_CACHE = 'citadelbuy-static-v1';
const DYNAMIC_CACHE = 'citadelbuy-dynamic-v1';
const IMAGE_CACHE = 'citadelbuy-images-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests and external resources
  if (url.pathname.startsWith('/api') || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle image requests with cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Network-first strategy for pages
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful responses
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification from CitadelBuy',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'CitadelBuy';
      options.data = { ...options.data, ...data };
    } catch (e) {
      // Use default text
    }
  }

  event.waitUntil(
    self.registration.showNotification(options.title || 'CitadelBuy', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event.notification;

  if (action === 'dismiss') {
    return;
  }

  let url = '/';
  if (data?.url) {
    url = data.url;
  } else if (data?.orderId) {
    url = `/account/orders/${data.orderId}`;
  } else if (data?.productId) {
    url = `/products/${data.productId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for cart operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCart());
  }
  if (event.tag === 'wishlist-sync') {
    event.waitUntil(syncWishlist());
  }
});

async function syncCart() {
  const cache = await caches.open('citadelbuy-offline-operations');
  const operations = await cache.match('cart-operations');

  if (operations) {
    const ops = await operations.json();
    for (const op of ops) {
      try {
        await fetch(op.url, {
          method: op.method,
          headers: op.headers,
          body: JSON.stringify(op.body),
        });
      } catch (error) {
        console.error('[SW] Failed to sync cart operation:', error);
      }
    }
    await cache.delete('cart-operations');
  }
}

async function syncWishlist() {
  const cache = await caches.open('citadelbuy-offline-operations');
  const operations = await cache.match('wishlist-operations');

  if (operations) {
    const ops = await operations.json();
    for (const op of ops) {
      try {
        await fetch(op.url, {
          method: op.method,
          headers: op.headers,
          body: JSON.stringify(op.body),
        });
      } catch (error) {
        console.error('[SW] Failed to sync wishlist operation:', error);
      }
    }
    await cache.delete('wishlist-operations');
  }
}

console.log('[SW] Service Worker initialized');
