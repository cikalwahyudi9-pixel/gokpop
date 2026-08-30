importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: new URL(location).searchParams.get('apiKey'),
  projectId: new URL(location).searchParams.get('projectId'),
  messagingSenderId: new URL(location).searchParams.get('messagingSenderId'),
  appId: new URL(location).searchParams.get('appId'),
}

if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig)
} else {
  // Fallback for some browsers that strip params
  firebase.initializeApp({
    messagingSenderId: '123456789'
  })
}

try {
  const messaging = firebase.messaging()
  
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload)
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Notifikasi'
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Ada pesan baru.',
      data: payload.data
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
} catch (e) {
  console.log('FCM SW initialization error', e)
}

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
