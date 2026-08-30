import admin from 'firebase-admin'

// Inisialisasi Firebase Admin jika belum
if (!admin.apps.length) {
  try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!serviceAccountString) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable')
    }
    
    // Parse JSON string, pastikan valid
    const serviceAccount = JSON.parse(serviceAccountString)
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error)
  }
}

export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token, title, body, goId } = req.body

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' })
    }

    const link = goId 
      ? `https://gokpop.vercel.app/go/${goId}` 
      : 'https://gokpop.vercel.app/'

    const payload = {
      token: token,
      // webpush field specifically targets web/PWA browsers
      webpush: {
        notification: {
          title: title || 'Notifikasi Baru',
          body: body || 'Ada pembaruan untuk Anda.',
          icon: 'https://gokpop.vercel.app/favicon.svg',
          badge: 'https://gokpop.vercel.app/favicon.svg',
          tag: 'gokpop-notif',
          renotify: true,
          requireInteraction: false,
        },
        data: {
          goId: goId || '',
          url: link
        },
        fcmOptions: {
          link: link
        }
      }
    }

    // Kirim pesan melalui Firebase Admin SDK
    const response = await admin.messaging().send(payload)
    return res.status(200).json({ success: true, response })
  } catch (error) {
    console.error('Error sending push notification:', error)
    
    // Jika token sudah tidak valid, hapus dari Firestore
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      try {
        const { initializeApp: initApp, getApps, cert } = await import('firebase-admin/app')
        const { getFirestore } = await import('firebase-admin/firestore')
        
        // Cari dan hapus token dari koleksi users
        const db = getFirestore()
        const usersRef = db.collection('users')
        const snapshot = await usersRef.where('fcmToken', '==', req.body.token).get()
        const batch = db.batch()
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { fcmToken: null })
        })
        await batch.commit()
      } catch (cleanupErr) {
        console.error('Failed to cleanup stale token:', cleanupErr)
      }
      return res.status(200).json({ success: false, reason: 'token_expired' })
    }
    
    return res.status(500).json({ error: error.message })
  }
}
