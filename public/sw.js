// Unified Service Worker — handles both PWA caching and Push Notifications
// VitePWA will inject the precache manifest here

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// Precache all app assets (injected by VitePWA at build time)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ─── Push Notification Handler ─────────────────────────────────────────────
self.addEventListener('push', function (event) {
  if (!event.data) return

  let title = 'GOKpop'
  let body = 'Ada pesan baru untuk Anda.'
  let data = {}

  try {
    const payload = event.data.json()
    title = payload.notification?.title || payload.data?.title || title
    body  = payload.notification?.body  || payload.data?.body  || body
    data  = payload.data || {}
  } catch (e) {
    body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      tag: 'gokpop-notif',
      renotify: true
    })
  )
})

// ─── Notification Click Handler ────────────────────────────────────────────
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === urlToOpen && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen)
    })
  )
})
