import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Home, ShoppingBag, Bell, User, LayoutDashboard } from 'lucide-react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function BottomNav() {
  const { user, isGOM } = useAuth()
  const { t } = useTranslation()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'notifications', user.uid, 'items'), where('read', '==', false))
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.docs.length))
    return unsub
  }, [user])

  const navItems = isGOM
    ? [
        { to: '/',           icon: Home,            label: t('home') },
        { to: '/gom',        icon: LayoutDashboard, label: t('my_go') },
        { to: '/notifikasi', icon: Bell,            label: t('notifications'), badge: unreadCount },
        { to: '/profil',     icon: User,            label: t('profile') },
      ]
    : [
        { to: '/',           icon: Home,            label: t('home') },
        { to: '/pesanan',    icon: ShoppingBag,     label: t('my_orders') },
        { to: '/notifikasi', icon: Bell,            label: t('notifications'), badge: unreadCount },
        { to: '/profil',     icon: User,            label: t('profile') },
      ]

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          style={{ position: 'relative' }}
        >
          <Icon />
          {badge > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 20, 
              width: 8, height: 8, borderRadius: '50%', background: 'var(--color-error)'
            }} />
          )}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
