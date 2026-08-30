import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot, doc, writeBatch, getDocs, where } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import { Bell, Check, Trash2, Smartphone } from 'lucide-react'
import { getToken } from 'firebase/messaging'
import { getMessagingInstance, VAPID_KEY } from '../lib/firebase'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { t }    = useTranslation()
  const navigate = useNavigate()

  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [fcmEnabled, setFcmEnabled] = useState(false)
  const [fcmLoading, setFcmLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'notifications', user.uid, 'items'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [user])

  async function markAllRead() {
    const batch = writeBatch(db)
    const unread = notifs.filter(n => !n.read)
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', user.uid, 'items', n.id), { read: true })
    })
    await batch.commit()
  }

  async function deleteNotif(id) {
    try {
      const { deleteDoc } = await import('firebase/firestore')
      await deleteDoc(doc(db, 'notifications', user.uid, 'items', id))
    } catch (err) {
      console.error(err)
    }
  }

  async function enablePushNotifications() {
    try {
      setFcmLoading(true)
      const messaging = await getMessagingInstance()
      if (!messaging) {
        alert('Browser Anda tidak mendukung push notification.')
        return
      }

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        // Register SW with URL params for config
        const registration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}`
        )
        
        const token = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration 
        })
        
        if (token) {
          const { setDoc } = await import('firebase/firestore')
          await setDoc(doc(db, 'users', user.uid), { fcmToken: token }, { merge: true })
          
          // Send a test notification immediately
          const { createNotification } = await import('../lib/notifications')
          await createNotification(user.uid, {
            type: 'announcement',
            title: 'Notifikasi Aktif! 🎉',
            body: 'Selamat! HP Anda sekarang akan menerima pop-up otomatis saat ada pembaruan transaksi.'
          })

          setFcmEnabled(true)
          alert('Berhasil! Sistem baru saja menguji mengirim satu notifikasi ke Anda.')
        }
      } else {
        alert('Anda memblokir izin notifikasi di browser ini.')
      }
    } catch (error) {
      console.error('FCM Error:', error)
      alert('Gagal mengaktifkan notifikasi: ' + error.message)
    } finally {
      setFcmLoading(false)
    }
  }

  const unreadCount = notifs.filter(n => !n.read).length

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      <div className="page-header">
        <h1 style={{ fontSize: '1.125rem', flex: 1 }}>{t('notif_title')}</h1>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }} onClick={markAllRead}>
            <Check size={14} /> {t('mark_all_read')}
          </button>
        )}
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        
        {!fcmEnabled && (
          <div className="card" style={{ marginBottom: 'var(--space-4)', background: 'var(--color-primary-light)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ background: '#fff', padding: 8, borderRadius: '50%' }}>
              <Smartphone size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: 2 }}>Aktifkan Pop-up</h3>
              <p className="text-xs text-secondary">Terima notifikasi meski aplikasi ditutup.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={enablePushNotifications} disabled={fcmLoading}>
              {fcmLoading ? '...' : 'Aktifkan'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-secondary text-sm" style={{ textAlign: 'center', paddingTop: 'var(--space-8)' }}>Memuat...</p>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 'var(--space-12)' }}>
            <Bell size={40} style={{ color: 'var(--color-text-disabled)', margin: '0 auto var(--space-3)' }} />
            <p className="text-secondary">{t('notif_empty')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {notifs.map(n => <NotifItem key={n.id} notif={n} navigate={navigate} onDelete={() => deleteNotif(n.id)} />)}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

const TYPE_ICONS = {
  deadline:      '⏰',
  status_update: '📦',
  announcement:  '📢',
  war:           '⚔️',
  claim_success: '✅',
  claim_failed:  '❌',
  cancelled:     '🚫',
}

function NotifItem({ notif, navigate, onDelete }) {
  const date = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date()

  return (
    <div
      className="card"
      style={{
        background: notif.read ? 'var(--color-bg)' : 'var(--color-primary-light)',
        borderColor: notif.read ? 'var(--color-border)' : 'var(--color-primary-subtle)',
        position: 'relative'
      }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{ position: 'absolute', top: 8, right: 8, color: 'var(--color-text-disabled)', padding: 4 }}
      >
        <Trash2 size={14} />
      </button>

      <div className="flex gap-3" style={{ cursor: notif.goId ? 'pointer' : 'default', paddingRight: 20 }} onClick={() => notif.goId && navigate(`/go/${notif.goId}`)}>
        <div style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1.5 }}>
          {TYPE_ICONS[notif.type] || '🔔'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: notif.read ? 500 : 700, fontSize: '0.9375rem', marginBottom: 2 }}>
            {notif.title}
          </p>
          <p className="text-sm text-secondary">{notif.body}</p>
          <p className="text-xs text-secondary" style={{ marginTop: 6 }}>
            {date.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!notif.read && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />
        )}
      </div>
    </div>
  )
}
