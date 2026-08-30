// Raw Web Push Service Worker - tanpa Firebase SDK
// Lebih sederhana dan lebih reliable di Android PWA

self.addEventListener('push', function (event) {
  if (!event.data) return

  let title = 'GOKpop'
  let body = 'Ada pesan baru untuk Anda.'
  let data = {}

  try {
    const payload = event.data.json()
    // Firebase sends notification in these formats
    title = payload.notification?.title || payload.data?.title || title
    body  = payload.notification?.body  || payload.data?.body  || body
    data  = payload.data || {}
  } catch (e) {
    body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      data: data,
      badge: '/favicon.svg',
      tag: 'gokpop-notif',
      renotify: true
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
