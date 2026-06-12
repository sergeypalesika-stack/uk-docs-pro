// UK Docs Service Worker - Notifications + Offline
const CACHE_NAME = 'uk-docs-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
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

// Basic offline support
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone()
        caches.open(CACHE_NAME).then((cache) => {
          if (e.request.url.startsWith('http')) {
            cache.put(e.request, resClone)
          }
        })
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
