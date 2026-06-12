// UK Docs Service Worker v2 - Full offline + Notifications
const CACHE_NAME = 'uk-docs-v2'
const OFFLINE_URLS = ['/']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  )
})

// Network-first for API, stale-while-revalidate for app shell
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return

  // Supabase API calls - network only (data cached in localStorage by app)
  if (url.hostname.includes('supabase')) return

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && url.protocol.startsWith('http')) {
            const resClone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})

// Push notifications
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'UK Docs', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'uk-docs',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(e.notification.data.url || '/')
    })
  )
})
