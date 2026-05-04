/**
 * SafeCity AI — Service Worker for Web Push Notifications
 *
 * STATUS: Base implementation ready. To enable native push on Android/iOS,
 * the backend team (Cristian) must complete the VAPID integration steps below.
 *
 * ─── BACKEND INTEGRATION STEPS (VAPID) ──────────────────────────────────────
 *
 * STEP 1 — Add dependency in pom.xml:
 *   <dependency>
 *     <groupId>nl.martijndwars</groupId>
 *     <artifactId>web-push</artifactId>
 *     <version>5.1.1</version>
 *   </dependency>
 *
 * STEP 2 — Generate VAPID key pair (one-time, store in application.properties):
 *   PushService pushService = new PushService();
 *   KeyPair keyPair = PushUtils.generateVAPIDKeyPair();
 *   // Save keyPair.getPublic() and keyPair.getPrivate() as Base64 strings
 *
 * STEP 3 — Create endpoint POST /api/push/subscribe that receives a
 *   PushSubscription JSON body { endpoint, keys: { auth, p256dh } }
 *   and persists it to a push_subscriptions table associated to the user.
 *
 * STEP 4 — When a new report is published (after WS broadcast), send push:
 *   PushService.send(subscription, notification, privateKey, publicKey);
 *
 * STEP 5 — Frontend must call subscribeToPush() (in ToastContext or App.jsx)
 *   after Notification.requestPermission() returns 'granted'. The
 *   applicationServerKey must equal the VAPID public key from Step 2.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CACHE_NAME = 'safecity-cache-v1';
const STATIC_ASSETS = ['/', '/index.html'];

// ─── Install: pre-cache static shell ──────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: clear old caches ───────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: network-first strategy for API, cache-first for assets ─────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin API requests
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache valid responses for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Push: handle incoming push notification from server ─────────────────────

self.addEventListener('push', (event) => {
  let payload = { title: 'SafeCity AI', body: 'Nueva alerta de seguridad detectada.', type: 'alert' };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body || payload.message,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: `safecity-${payload.type || 'alert'}-${Date.now()}`,
    data: { url: '/', type: payload.type },
    actions: [
      { action: 'view', title: 'Ver en el mapa' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'SafeCity AI', options)
  );
});

// ─── Notification click: focus or open the app window ────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
