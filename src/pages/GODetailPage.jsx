import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, collection, serverTimestamp, runTransaction } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import BottomNav from '../components/BottomNav'
import GODiscussion from '../components/GODiscussion'
import { SlotProgress, VerifiedBadge, Avatar } from '../components/ui'
import { ArrowLeft, Clock, Zap, Plus, Minus, ShoppingCart } from 'lucide-react'

export default function GODetailPage() {
  const { goId }   = useParams()
  const { user }   = useAuth()
  const { addToCart } = useCart()
  const { t }      = useTranslation()
  const navigate   = useNavigate()

  const [go, setGO]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelected] = useState({}) // { itemId: qty }
  const [joining, setJoining]   = useState(false)
  const [error, setError]       = useState('')
  const [joined, setJoined]     = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'group_orders', goId), (snap) => {
      if (!snap.exists()) { navigate('/'); return }
      setGO({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
    return unsub
  }, [goId])

  const totalAmount = go?.items?.reduce((sum, item) => {
    const qty = selectedItems[item.id || item.name] || 0
    return sum + (item.finalPrice || 0) * qty
  }, 0) || 0

  const totalQty = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0)
  const remainingSlots = go?.remainingSlots ?? go?.quota ?? 0

  function changeQty(itemId, delta) {
    if (delta > 0 && totalQty >= remainingSlots) {
      setError(t('slot_full'))
      return
    }

    const item = go.items.find(i => (i.id || i.name) === itemId)

    setSelected(prev => {
      const curr = prev[itemId] || 0
      const next = Math.max(0, curr + delta)
      
      if (delta > 0 && item?.stock != null && next > item.stock) {
        setError(`Stok ${item.name} sisa ${item.stock}`)
        return prev
      }

      setError('')
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: next }
    })
  }

  const hasSelection = Object.values(selectedItems).some(q => q > 0)

  async function handleAddToCart() {
    if (!hasSelection) return
    setJoining(true)
    
    // Validasi slot basic (hanya estimasi sebelum checkout)
    const currentRemaining = go.remainingSlots ?? go.quota ?? 0
    if (currentRemaining < totalQty) {
      setError(t('slot_full'))
      setJoining(false)
      return
    }

    addToCart({ id: goId, ...go }, selectedItems)
    navigate('/keranjang')
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}><p className="text-secondary">Memuat...</p></div>

  const deadlineDate = go.deadline?.toDate ? go.deadline.toDate() : new Date(go.deadline)
  const filled = go.quota - (go.remainingSlots ?? go.quota)

  return (
    <div style={{ background: 'var(--color-surface)', minHeight: '100dvh' }}>
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginLeft: -8 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: '1rem', flex: 1, textAlign: 'center' }} className="truncate">{go.artistGroup}</h1>
        <div style={{ width: 56 }} />
      </div>

      <div className="page" style={{ paddingTop: 'var(--space-4)' }}>
        {joined && (
          <div style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 'var(--space-4)', fontWeight: 600 }}>
            ✓ Berhasil join! Mengarahkan ke pesanan...
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 'var(--space-4)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {/* GO Info */}
        <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ marginBottom: 'var(--space-2)' }}>{go.name}</h2>
          {go.description && <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>{go.description}</p>}

          <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-3)', color: 'var(--color-warning)', fontSize: '0.875rem' }}>
            <Clock size={14} />
            <span>Deadline: {deadlineDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>

          <SlotProgress filled={filled} total={go.quota} />
        </div>

        {/* GOM info */}
        <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="flex items-center gap-3">
            <Avatar src={go.gomPhotoURL} name={go.gomName} size="md" />
            <div>
              <p className="font-semibold">{go.gomName}</p>
              <VerifiedBadge verified={go.gomVerified} />
            </div>
            <button
              style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 500 }}
              onClick={() => navigate(`/profil/${go.createdBy}`)}
            >
              Lihat profil →
            </button>
          </div>
        </div>

        {/* War notice */}
        {go.hasWar && go.warStartTime && (
          <div className="war-banner" style={{ marginBottom: 'var(--space-3)', cursor: 'pointer' }} onClick={() => navigate(`/go/${goId}/war`)}>
            <Zap size={20} style={{ color: 'var(--color-war)' }} />
            <div>
              <h3 style={{ color: 'var(--color-war)', fontSize: '0.9375rem' }}>⚔️ Ada War!</h3>
              <p className="text-xs" style={{ color: 'var(--color-war)' }}>
                {go.warStartTime?.toDate?.()?.toLocaleString('id-ID') || ''} — Tap untuk ikut war
              </p>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '0.9375rem', marginBottom: 'var(--space-4)' }}>Pilih Item</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {go.items?.map(item => (
              <div key={item.id || item.name} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--space-3)',
                border: `1.5px solid ${selectedItems[item.id || item.name] > 0 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-md)',
                background: selectedItems[item.id || item.name] > 0 ? 'var(--color-primary-light)' : 'var(--color-bg)',
                transition: 'all var(--transition)',
              }}>
                <div>
                  <p className="font-medium" style={{ fontSize: '0.9375rem' }}>{item.name}</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
                    Rp {item.finalPrice?.toLocaleString('id-ID')}
                    <span className="text-xs text-secondary font-medium"> (incl. ongkir)</span>
                  </p>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    <span>Harga: Rp {item.price?.toLocaleString('id-ID') || 0}</span>
                    <span style={{ margin: '0 4px' }}>·</span>
                    <span>Ongkir: Rp {item.shippingEstimate?.toLocaleString('id-ID') || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changeQty(item.id || item.name, -1)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-bg)',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                    {selectedItems[item.id || item.name] || 0}
                  </span>
                  <button
                    onClick={() => changeQty(item.id || item.name, 1)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={14} style={{ color: '#fff' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Discussion / Q&A */}
        <GODiscussion goId={goId} gomUid={go.createdBy} />

        {/* Join button */}
        {hasSelection && (
          <div style={{
            position: 'sticky',
            bottom: 'var(--space-4)',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
          }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
              <span className="text-sm text-secondary">Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.125rem' }}>Rp {totalAmount.toLocaleString('id-ID')}</span>
            </div>
            <button
              className="btn btn-primary btn-full"
              disabled={joining || remainingSlots <= 0}
              onClick={handleAddToCart}
            >
              <ShoppingCart size={16} />
              {joining ? 'Memproses...' : remainingSlots <= 0 ? 'Slot Penuh' : 'Tambah ke Keranjang'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
