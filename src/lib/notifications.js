import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore'
import { db } from './firebase'

/**
 * Buat notifikasi web (in-app) untuk seorang user
 * @param {string} userId - ID penerima notifikasi (bisa GOM atau peserta)
 * @param {object} payload - Detail notifikasi
 * @param {string} payload.type - Jenis notif ('status_update', 'cancelled', dll)
 * @param {string} payload.title - Judul notifikasi
 * @param {string} payload.body - Isi pesan notifikasi
 * @param {string} [payload.goId] - ID Group Order terkait (opsional)
 * @param {string} [payload.orderId] - ID Pesanan terkait (opsional)
 */
export async function createNotification(userId, payload) {
  if (!userId) return

  try {
    // 1. Save locally to Firestore
    await addDoc(collection(db, 'notifications', userId, 'items'), {
      ...payload,
      read: false,
      createdAt: serverTimestamp()
    })

    // 2. Fetch user's FCM token to send Push Notification via Vercel API
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      const userData = userDoc.data()
      if (userData.fcmToken) {
        fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: userData.fcmToken,
            title: payload.title,
            body: payload.body,
            goId: payload.goId
          })
        })
        .then(async (res) => {
          const result = await res.json()
          if (!res.ok) {
            console.error('[Push API Error]', result.error)
          } else if (result.reason === 'token_expired') {
            // Token hangus - hapus dari Firestore agar UI tampilkan tombol Aktifkan lagi
            const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore')
            const { db: firestoreDb } = await import('./firebase')
            await updateDoc(firestoreDoc(firestoreDb, 'users', userId), { fcmToken: null })
          }
        })
        .catch(err => console.error('Push fetch error:', err))
      }
    }
  } catch (error) {
    console.error('Gagal mengirim notifikasi:', error)
  }
}
