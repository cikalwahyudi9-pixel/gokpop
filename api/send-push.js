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

    const payload = {
      token: token,
      notification: {
        title: title || 'Notifikasi Baru',
        body: body || 'Ada pembaruan untuk Anda.',
      },
      data: {
        goId: goId || '',
        url: goId ? `/go/${goId}` : '/'
      }
    }

    // Kirim pesan melalui Firebase Admin SDK
    const response = await admin.messaging().send(payload)
    
    return res.status(200).json({ success: true, response })
  } catch (error) {
    console.error('Error sending push notification:', error)
    return res.status(500).json({ error: error.message })
  }
}
