import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { Home, ShoppingBag, Bell, User, LayoutDashboard } from 'lucide-react'

export default function BottomNav() {
  const { isGOM } = useAuth()
  const { t } = useTranslation()

  const navItems = isGOM
    ? [
        { to: '/',           icon: Home,            label: t('home') },
        { to: '/gom',        icon: LayoutDashboard, label: t('my_go') },
        { to: '/notifikasi', icon: Bell,            label: t('notifications') },
        { to: '/profil',     icon: User,            label: t('profile') },
      ]
    : [
        { to: '/',           icon: Home,            label: t('home') },
        { to: '/pesanan',    icon: ShoppingBag,     label: t('my_orders') },
        { to: '/notifikasi', icon: Bell,            label: t('notifications') },
        { to: '/profil',     icon: User,            label: t('profile') },
      ]

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
