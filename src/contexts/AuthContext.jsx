import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'
import { ADMIN_EMAILS } from '../config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const profileData = await fetchOrCreateProfile(firebaseUser)
        setProfile(profileData)

        // Silently update FCM token if permission is already granted
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const { getMessagingInstance, VAPID_KEY } = await import('../lib/firebase')
            const { getToken } = await import('firebase/messaging')
            const messaging = await getMessagingInstance()
            if (messaging) {
              await navigator.serviceWorker.register('/firebase-messaging-sw.js')
              const registration = await navigator.serviceWorker.ready
              const token = await getToken(messaging, { 
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
              })
              if (token) {
                await setDoc(doc(db, 'users', firebaseUser.uid), { fcmToken: token }, { merge: true })
              }
            }
          } catch (err) {
            console.error('Failed to silently register FCM token:', err)
          }
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function fetchOrCreateProfile(firebaseUser) {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)

    const isAdmin = ADMIN_EMAILS.includes(firebaseUser.email)

    if (snap.exists()) {
      const data = snap.data()
      // Paksa sinkronisasi jika dia admin tapi role-nya belum GOM
      if (isAdmin && data.role !== 'gom') {
        await setDoc(ref, { role: 'gom', verificationStatus: 'verified' }, { merge: true })
        return { ...data, role: 'gom', verificationStatus: 'verified' }
      }
      return data
    }

    // New user — create profile
    const newProfile = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || '',
      role: isAdmin ? 'gom' : 'peserta',
      verificationStatus: isAdmin ? 'verified' : 'unverified',
      whatsapp: '',
      bio: '',
      createdAt: serverTimestamp(),
    }
    await setDoc(ref, newProfile)
    return newProfile
  }

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  }

  async function logout() {
    await signOut(auth)
  }

  const isGOM = profile?.role === 'gom'
  const isVerified = profile?.verificationStatus === 'verified'

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, isGOM, isVerified }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
