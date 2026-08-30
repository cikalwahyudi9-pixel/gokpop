import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import ProtectedRoute from './components/ProtectedRoute'
import { db } from './lib/firebase'
import './styles/index.css'
import './lib/i18n'

// Lazy-loaded pages
const LoginPage        = lazy(() => import('./pages/LoginPage'))
const ExplorePage      = lazy(() => import('./pages/ExplorePage'))
const MyOrdersPage     = lazy(() => import('./pages/MyOrdersPage'))
const GOMDashboard     = lazy(() => import('./pages/GOMDashboard'))
const CreateGOPage     = lazy(() => import('./pages/CreateGOPage'))
const EditGOPage       = lazy(() => import('./pages/EditGOPage'))
const GODetailPage     = lazy(() => import('./pages/GODetailPage'))
const GOMDetailPage    = lazy(() => import('./pages/GOMDetailPage'))
const WarPage          = lazy(() => import('./pages/WarPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const ProfilePage      = lazy(() => import('./pages/ProfilePage'))
const UploadPaymentPage = lazy(() => import('./pages/UploadPaymentPage'))
const CartPage          = lazy(() => import('./pages/CartPage'))
const CalculatorPage    = lazy(() => import('./pages/CalculatorPage'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', margin: '0 auto 12px' }} />
        <p className="text-secondary text-sm">Memuat...</p>
      </div>
    </div>
  )
}

// Auto-register FCM token when user is logged in & permission already granted
function AutoFCMRegister() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    // Delay 2s to let page and Service Worker fully load
    const timer = setTimeout(async () => {
      try {
        const { getMessagingInstance, VAPID_KEY } = await import('./lib/firebase')
        const { getToken, deleteToken } = await import('firebase/messaging')
        const messaging = await getMessagingInstance()
        if (!messaging) return

        const fbReg = await navigator.serviceWorker.register('/sw.js')
        // Wait for SW to be active with 3s timeout
        await new Promise((resolve) => {
          if (fbReg.active) { resolve(); return }
          const sw = fbReg.installing || fbReg.waiting
          if (sw) {
            sw.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') resolve()
            })
          }
          setTimeout(resolve, 3000)
        })

        try { await deleteToken(messaging) } catch (e) { /* ignore */ }
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: fbReg })
        if (token) {
          const { doc, setDoc } = await import('firebase/firestore')
          await setDoc(doc(db, 'users', user.uid), { 
            fcmToken: token,
            fcmTokenUpdatedAt: new Date().toISOString()
          }, { merge: true })
        }
      } catch (err) {
        console.error('Auto FCM registration failed:', err)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [user])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AutoFCMRegister />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

            {/* Peserta */}
            <Route path="/" element={
              <ProtectedRoute><ExplorePage /></ProtectedRoute>
            } />
            <Route path="/go/:goId" element={
              <ProtectedRoute><GODetailPage /></ProtectedRoute>
            } />
            <Route path="/pesanan" element={
              <ProtectedRoute><MyOrdersPage /></ProtectedRoute>
            } />
            <Route path="/pesanan/:goId/:participantId/bayar" element={
              <ProtectedRoute><UploadPaymentPage /></ProtectedRoute>
            } />
            <Route path="/go/:goId/war" element={
              <ProtectedRoute><WarPage /></ProtectedRoute>
            } />
            <Route path="/keranjang" element={
              <ProtectedRoute><CartPage /></ProtectedRoute>
            } />
            <Route path="/kalkulator" element={
              <ProtectedRoute><CalculatorPage /></ProtectedRoute>
            } />

            {/* GOM */}
            <Route path="/gom" element={
              <ProtectedRoute requireGOM><GOMDashboard /></ProtectedRoute>
            } />
            <Route path="/gom/buat" element={
              <ProtectedRoute requireGOM><CreateGOPage /></ProtectedRoute>
            } />
            <Route path="/gom/go/:goId/edit" element={
              <ProtectedRoute requireGOM><EditGOPage /></ProtectedRoute>
            } />
            <Route path="/gom/go/:goId" element={
              <ProtectedRoute requireGOM><GOMDetailPage /></ProtectedRoute>
            } />

            {/* Shared */}
            <Route path="/notifikasi" element={
              <ProtectedRoute><NotificationsPage /></ProtectedRoute>
            } />
            <Route path="/profil" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/profil/:uid" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
