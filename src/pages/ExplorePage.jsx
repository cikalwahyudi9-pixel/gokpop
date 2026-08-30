import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import BottomNav from '../components/BottomNav'
import { SlotProgress, VerifiedBadge, SkeletonCard, EmptyState, Avatar } from '../components/ui'
import { Search, Bell, Clock, Package, Heart, ShoppingBag } from 'lucide-react'
import { format } from '../lib/utils'

const DEFAULT_FILTERS = ['BTS', 'TWICE', 'aespa', 'NewJeans', 'EXO', 'NCT']

export default function ExplorePage() {
  const { user, profile } = useAuth()
  const { cart } = useCart()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const queryParams = new URLSearchParams(location.search)
  const countryFilter = queryParams.get('country')

  const [goList, setGoList]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [searchText, setSearch]   = useState('')
  const [activeFilter, setFilter] = useState('Semua')

  useEffect(() => {
    const q = query(
      collection(db, 'group_orders'),
      where('status', '==', 'aktif'),
      orderBy('deadline', 'asc')
    )

    const unsub = onSnapshot(q, (snap) => {
      setGoList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return unsub
  }, [])

  const dynamicFilters = Array.from(new Set(goList.map(g => g.artistGroup).filter(Boolean)))
  const combinedFilters = Array.from(new Set([...DEFAULT_FILTERS, ...dynamicFilters]))
  const ARTIST_FILTERS = ['Semua', ...combinedFilters.sort()]

  const filtered = goList.filter(go => {
    const matchFilter = activeFilter === 'Semua' || go.artistGroup?.toLowerCase() === activeFilter.toLowerCase()
    const matchSearch = !searchText || go.name?.toLowerCase().includes(searchText.toLowerCase()) || go.artistGroup?.toLowerCase().includes(searchText.toLowerCase())
    const matchCountry = !countryFilter || go.originCountry?.toLowerCase() === countryFilter.toLowerCase()
    return matchFilter && matchSearch && matchCountry
  })

  async function toggleFollowArtist() {
    if (activeFilter === 'Semua' || !user) return
    try {
      const following = profile?.followingArtists || []
      const isFollowing = following.includes(activeFilter)
      const newFollowing = isFollowing 
        ? following.filter(a => a !== activeFilter)
        : [...following, activeFilter]
      
      await updateDoc(doc(db, 'users', user.uid), { followingArtists: newFollowing })
    } catch (err) {
      console.error('Failed to follow/unfollow artist:', err)
    }
  }

  const isFollowingActive = activeFilter !== 'Semua' && (profile?.followingArtists || []).includes(activeFilter)

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div style={{
              width: 28, height: 28,
              background: 'var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem', fontFamily: 'var(--font-headline)' }}>G</span>
            </div>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.0625rem', color: 'var(--color-primary)' }}>GOKpop</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/keranjang')} style={{ position: 'relative', padding: 'var(--space-1)', borderRadius: 'var(--radius-full)' }}>
              <ShoppingBag size={22} style={{ color: 'var(--color-text-secondary)' }} />
              {cart.length > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: 0, 
                  background: 'var(--color-danger)', color: '#fff', 
                  fontSize: 10, fontWeight: 700, padding: '2px 4px', borderRadius: 8,
                  lineHeight: 1
                }}>{cart.length}</span>
              )}
            </button>
            <button onClick={() => navigate('/notifikasi')} style={{ padding: 'var(--space-1)', borderRadius: 'var(--radius-full)' }}>
              <Bell size={22} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
            <Avatar src={user?.photoURL} name={user?.displayName} size="sm" />
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <Search size={16} style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }} />
          <input
            placeholder={t('search_go')}
            value={searchText}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="chip-list" style={{ flex: 1 }}>
            {ARTIST_FILTERS.map(f => (
              <button
                key={f}
                className={`chip ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {countryFilter && (
            <button 
              onClick={() => navigate('/')} 
              className="text-xs text-primary" 
              style={{ marginLeft: 8, whiteSpace: 'nowrap', fontWeight: 600, padding: '4px 8px', background: 'var(--color-primary-light)', borderRadius: 12 }}
            >
              Hapus Filter Negara ({countryFilter}) ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        <div className="section-header flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="flex items-center gap-2">
            <h2>{t('active_go')}</h2>
            {!loading && <span className="section-badge">{filtered.length}</span>}
          </div>
          {activeFilter !== 'Semua' && (
            <button 
              className={`btn btn-sm ${isFollowingActive ? 'btn-primary' : 'btn-outline'}`}
              onClick={toggleFollowArtist}
              style={{ padding: '0 8px', height: 28, fontSize: '0.75rem' }}
            >
              <Heart size={14} fill={isFollowingActive ? 'currentColor' : 'none'} style={{ marginRight: 4 }} />
              {isFollowingActive ? 'Diikuti' : 'Ikuti Artis'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading ? (
            Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title={t('no_go_found')}
              description="Belum ada GO aktif saat ini. Coba filter lain."
            />
          ) : (
            filtered.map(go => <GOCard key={go.id} go={go} onJoin={() => navigate(`/go/${go.id}`)} />)
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

function GOCard({ go, onJoin }) {
  const { t } = useTranslation()
  const filled = go.quota - (go.remainingSlots ?? go.quota)
  const deadlineDate = go.deadline?.toDate ? go.deadline.toDate() : new Date(go.deadline)
  const isAlmostFull = go.remainingSlots <= 3

  return (
    <div className="card card-hover animate-slide" style={{ cursor: 'pointer' }} onClick={onJoin}>
      {/* Top row */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-2)' }}>
        <h3 style={{ fontSize: '1rem', flex: 1, marginRight: 'var(--space-2)' }} className="truncate">
          {go.artistGroup}
        </h3>
        <span style={{
          background: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
          {t('deadline')} {deadlineDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>{go.name}</p>

      {/* Slot progress */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <SlotProgress filled={filled} total={go.quota} />
        {isAlmostFull && (
          <p className="text-xs text-danger" style={{ marginTop: 4 }}>⚡ Hampir penuh!</p>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar src={go.gomPhotoURL} name={go.gomName} size="sm" />
          <div>
            <p className="text-xs font-medium">{go.gomName}</p>
            <VerifiedBadge verified={go.gomVerified} small />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {go.minPrice && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Rp {go.minPrice.toLocaleString('id-ID')}
            </span>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={e => { e.stopPropagation(); onJoin(); }}
          >
            {t('join_go')}
          </button>
        </div>
      </div>
    </div>
  )
}
