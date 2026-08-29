import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import { SlotProgress, SkeletonCard, EmptyState, StatusPill } from '../components/ui'
import { Plus, ChevronRight, Users, LayoutDashboard } from 'lucide-react'

export default function GOMDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [goList, setGoList]   = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState({ activeCount: 0, totalParticipants: 0 })

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'group_orders'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setGoList(list)

      const activeCount = list.filter(g => g.status === 'aktif').length
      const totalParticipants = list.reduce((sum, g) => sum + (g.participantCount || 0), 0)
      setStats({ activeCount, totalParticipants })
      setLoading(false)
    })
    return unsub
  }, [user])

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={20} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ fontSize: '1.125rem' }}>{t('gom_dashboard')}</h1>
        </div>
      </div>

      <div className="page">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            color: '#fff',
          }}>
            <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: 'var(--space-1)' }}>{t('active_go_count')}</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-headline)', lineHeight: 1 }}>
              {loading ? '–' : stats.activeCount}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-secondary" style={{ marginBottom: 'var(--space-1)' }}>{t('total_participants')}</p>
            <p style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-headline)', color: 'var(--color-primary)', lineHeight: 1 }}>
              {loading ? '–' : stats.totalParticipants}
            </p>
          </div>
        </div>

        {/* Create GO button */}
        <button
          className="btn btn-primary btn-full"
          style={{ marginBottom: 'var(--space-5)', fontSize: '1rem', padding: '14px' }}
          onClick={() => navigate('/gom/buat')}
        >
          <Plus size={18} />
          {t('create_go')}
        </button>

        {/* GO list */}
        <div className="section-header">
          <h2>{t('my_go_list')}</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading ? (
            Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : goList.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="Belum ada GO"
              description="Buat GO pertama kamu untuk mulai mengelola pesanan."
              action={
                <button className="btn btn-primary" onClick={() => navigate('/gom/buat')}>
                  {t('create_go')}
                </button>
              }
            />
          ) : (
            goList.map(go => (
              <GOMGoCard
                key={go.id}
                go={go}
                onClick={() => navigate(`/gom/go/${go.id}`)}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

function GOMGoCard({ go, onClick }) {
  const { t } = useTranslation()
  const filled = go.quota - (go.remainingSlots ?? go.quota)
  const deadlineDate = go.deadline?.toDate ? go.deadline.toDate() : new Date(go.deadline)

  return (
    <div className="card card-hover" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '0.9375rem', marginBottom: 4 }} className="truncate">{go.name}</h3>
          <p className="text-xs text-secondary">{go.artistGroup}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={go.status} />
          <ChevronRight size={16} style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }} />
        </div>
      </div>

      <SlotProgress filled={filled} total={go.quota} />

      <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-3)' }}>
        <div className="flex items-center gap-1">
          <Users size={13} style={{ color: 'var(--color-text-secondary)' }} />
          <span className="text-xs text-secondary">{go.participantCount || 0} peserta</span>
        </div>
        <span className="text-xs text-secondary">
          Tutup {deadlineDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
