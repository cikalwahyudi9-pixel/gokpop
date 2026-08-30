importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js')

// Hardcoded Firebase config for background message handling
// These are public client-side values, safe to commit
const firebaseConfig = {
  apiKey: "AIzaSyCXukXs8ehUdFoc4Vvqc0iksp8S_DfOqlA",
  authDomain: "gokpop-67f48.firebaseapp.com",
  projectId: "gokpop-67f48",
  storageBucket: "gokpop-67f48.firebasestorage.app",
  messagingSenderId: "722119221539",
  appId: "1:722119221539:web:ab9720a324353f2964ec96"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload)

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Notifikasi Baru'
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Ada pesan baru untuk Anda.',
    data: payload.data || {}
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

self.addEventListener('notificationclick', (event) => {
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
