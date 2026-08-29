import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
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
    const notifRef = collection(db, 'notifications', userId, 'items')
    await addDoc(notifRef, {
      ...payload,
      read: false,
      createdAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Gagal mengirim notifikasi:', error)
  }
}
